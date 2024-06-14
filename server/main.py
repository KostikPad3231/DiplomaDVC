import json
from typing import Annotated

import socketio
from fastapi import FastAPI, Depends, WebSocket, UploadFile, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from starlette.websockets import WebSocketDisconnect

import torch

from controllers import users
from controllers import auth
from controllers import rooms
from controllers import chat
from controllers.auth import verify_access_token
from logger import logger
from models.database import get_async_session, with_db_session
from models import schemes

# knn_vc = torch.hub.load('bshall/knn-vc', 'knn_vc', prematched=True, trust_repo=True, pretrained=True, device='cuda')

ngrok_url = 'https://782f2704cb37e311962eac07a46eda66.serveo.net'

origins = [
    'http://localhost:3000',
    ngrok_url
]

app = FastAPI()

rooms_connections = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chat

sio = socketio.AsyncServer(
    cors_allowed_origins=[],
    async_mode="asgi"
)
socket_app = socketio.ASGIApp(sio)
app.mount('/socket.io', socket_app)


@app.post('/auth/register', status_code=status.HTTP_201_CREATED)
async def register_user(user: schemes.UserCreate, db: Annotated[AsyncSession, Depends(get_async_session)]):
    return await users.register(db=db, user=user)


@app.post('/auth/login', response_model=schemes.Token)
async def login_user(form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
                     db: Annotated[AsyncSession, Depends(get_async_session)]):
    return await users.login(db=db, form_data=form_data)


@app.get('/api/get-user')
async def get_current_user(current_user: Annotated[schemes.User, Depends(auth.get_current_user)]):
    return {'current_user': current_user}


@app.get('/api/rooms', response_model=schemes.RoomList)
async def get_rooms(db: Annotated[AsyncSession, Depends(get_async_session)],
                    token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    room_list = await rooms.get_rooms(db=db, username=token.username)
    return {'rooms': room_list}


@app.post('/api/rooms', status_code=status.HTTP_201_CREATED)
async def create_room(room: schemes.RoomJoin, db: Annotated[AsyncSession, Depends(get_async_session)],
                      token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    return await rooms.create(db=db, room=room, username=token.username)


@app.post('/api/rooms/join', status_code=status.HTTP_204_NO_CONTENT)
async def join_room(room: schemes.RoomJoin, db: Annotated[AsyncSession, Depends(get_async_session)],
                    token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    return await rooms.join_room(db=db, room_to_join=room, username=token.username)


# @app.post('/api/upload-voice', status_code=status.HTTP_204_NO_CONTENT)
# async def upload_voice(file: UploadFile, db: Annotated[AsyncSession, Depends(get_async_session)],
#                        token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
#     logger.debug(file.filename)
#     return await users.upload_voice(db, file, token.username, knn_vc)


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[tuple[WebSocket, str]]] = dict()

    async def connect(self, websocket: WebSocket, room_id: str, username: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append((websocket, username))

    def disconnect(self, websocket: WebSocket, room_id):
        self.active_connections[room_id] = [
            (ws, username)
            for ws, username in self.active_connections[room_id]
            if ws != websocket
        ]


class AudioConnectionManager(ConnectionManager):
    async def broadcast(self, data: bytes, room_id: str, user_from: str):
        user_from_bytes = user_from.encode('utf-8')
        user_from_length = len(user_from_bytes)

        message = bytearray()
        message.extend(user_from_length.to_bytes())
        message.extend(user_from_bytes)
        message.extend(data)

        for ws, username in self.active_connections[room_id]:
            if username != user_from:
                await ws.send_bytes(message)

    async def disconnect(self, websocket: WebSocket, room_id):
        for ws, username in self.active_connections[room_id]:
            if ws != websocket:
                await ws.send_text(json.dumps({
                    'type': 'disconnect-user',
                    'from': username
                }))
        super().disconnect(websocket, room_id)


audio_manager = AudioConnectionManager()
video_manager = ConnectionManager()


@app.websocket('/ws/audio/{room_id}/{token}')
async def websock(websocket: WebSocket, room_id: str, token: str):
    token = verify_access_token(token)
    await audio_manager.connect(websocket, room_id, token.username)
    try:
        while True:
            data = await websocket.receive_bytes()
            await audio_manager.broadcast(data, room_id, token.username)
    except WebSocketDisconnect:
        audio_manager.disconnect(websocket, room_id)


@app.websocket('/ws/video/{room_id}/{token}')
async def websock(websocket: WebSocket, room_id: str, token: str):
    token = verify_access_token(token)
    await video_manager.connect(websocket, room_id, token.username)
    try:
        while True:
            message = await websocket.receive_json()
            if message['type'] == 'join':
                for ws, user in video_manager.active_connections[room_id]:
                    if ws != websocket:
                        await ws.send_text(json.dumps({'type': 'new-user', 'from': token.username}))
                await websocket.send_text(json.dumps({
                    'type': 'users',
                    'users': [user for _, user in video_manager.active_connections[room_id] if user != token.username]
                }))
            elif message['type'] == 'signal':
                logger.debug(message)
                for ws, user in video_manager.active_connections[room_id]:
                    if user == message['to']:
                        await ws.send_text(json.dumps(message))
                        break
    except WebSocketDisconnect:
        video_manager.disconnect(websocket, room_id)


@sio.event
async def connect(sid, environ):
    room_id = environ['QUERY_STRING'].split('=')[1].split('&')[0]
    await sio.enter_room(sid=sid, room=int(room_id))


@sio.on('messages:get')
@with_db_session
async def get_messages(sid, data, db: AsyncSession):
    messages = await chat.get_messages(db=db, room_id=data['roomId'])
    await sio.emit('messages', data={'messages': messages.dict()}, room=data['roomId'])


@sio.on('message:send')
@with_db_session
async def send_message(sid, message: dict, db: AsyncSession):
    await chat.send_message(db, schemes.MessageCreate(
        text=message['text'],
        sender_username=message['sender_username'],
        room_id=message['room_id']
    ))
    messages = await chat.get_messages(db=db, room_id=message['room_id'])
    await sio.emit('messages', data={'messages': messages.dict()}, room=message['room_id'])
