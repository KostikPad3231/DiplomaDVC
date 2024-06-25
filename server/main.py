import io
import json
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Annotated

import numpy as np
import socketio
import torchaudio.functional
from fastapi import FastAPI, Depends, WebSocket, UploadFile, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status
from starlette.websockets import WebSocketDisconnect
from apscheduler.schedulers.asyncio import AsyncIOScheduler

import torch
from logger import logger
from controllers import users, auth, rooms, chat, activities
from controllers.auth import verify_access_token
from models.core import User, Room
from models.database import get_async_session, with_db_session
from models import schemes

knn_vc = torch.hub.load('bshall/knn-vc', 'knn_vc', prematched=True, trust_repo=True, pretrained=True, device='cuda')

ngrok_url = '*'

origins = [
    'http://localhost:3000',
    ngrok_url
]


async def update_activities():
    async for db in get_async_session():
        all_rooms = await db.scalars(select(Room))
        for room in all_rooms:
            logger.debug(f'changing activity in room {room.name}')
            await activities.create_activity(db, room.id)
        await db.commit()


# scheduler = AsyncIOScheduler()
#
#
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     await update_activities()
#     scheduler.start()
#     scheduler.add_job(update_activities, 'cron', hour=0, minute=0)
#     yield
#     scheduler.shutdown()
#
#
# app = FastAPI(lifespan=lifespan)
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


@app.delete('/auth', status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(db: Annotated[AsyncSession, Depends(get_async_session)],
                         token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    return await users.delete_account(db=db, username=token.username)


@app.get('/api/get-user', response_model=schemes.User)
async def get_current_user(current_user: Annotated[schemes.User, Depends(auth.get_current_user)]):
    return current_user


@app.get('/api/rooms', response_model=schemes.RoomList)
async def get_rooms(db: Annotated[AsyncSession, Depends(get_async_session)],
                    token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    room_list = await rooms.get_rooms(db=db, username=token.username)
    return {'rooms': room_list}


@app.get('/api/rooms/{room_id}/leaderboard', response_model=schemes.Leaderboard)
async def get_room_leaderboard(room_id: int, db: Annotated[AsyncSession, Depends(get_async_session)],
                               token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    last_winner, leaderboard = await rooms.get_leaderboard(db=db, room_id=room_id)
    return {'leaderboard': leaderboard,
            'last_winner': last_winner}


@app.post('/api/rooms', status_code=status.HTTP_201_CREATED)
async def create_room(room: schemes.RoomJoin, db: Annotated[AsyncSession, Depends(get_async_session)],
                      token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    return await rooms.create(db=db, room=room, username=token.username)


@app.delete('/api/rooms/{room_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(room_id: int, db: Annotated[AsyncSession, Depends(get_async_session)],
                      token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    return await rooms.delete_room(db=db, room_id=room_id, username=token.username)


@app.post('/api/rooms/join', status_code=status.HTTP_204_NO_CONTENT)
async def join_room(room: schemes.RoomJoin, db: Annotated[AsyncSession, Depends(get_async_session)],
                    token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    return await rooms.join_room(db=db, room_to_join=room, username=token.username)


@app.post('/api/rooms/{room_id}/leave', status_code=status.HTTP_204_NO_CONTENT)
async def leave_room(room_id: int, db: Annotated[AsyncSession, Depends(get_async_session)],
                     token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    return await rooms.leave_room(db=db, room_id=room_id, username=token.username)


@app.get('/api/rooms/voices/{room_id}')
async def get_voices(room_id: int, db: Annotated[AsyncSession, Depends(get_async_session)],
                     token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    return await rooms.get_voices(db=db, room_id=room_id)


@app.post('/api/activities/join', response_model=schemes.ActivityGetWithVoices)
async def join_activity(activity: schemes.ActivityJoin, db: Annotated[AsyncSession, Depends(get_async_session)],
                        token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    logger.debug(activity)
    return await activities.join_activity(db=db, activity=activity, username=token.username)


@app.post('/api/activities/leave', status_code=status.HTTP_204_NO_CONTENT)
async def leave_activity(data: dict, db: Annotated[AsyncSession, Depends(get_async_session)],
                         token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    return await activities.leave_activity(db=db, activity_id=data['activity_id'], username=token.username)


@app.post('/api/upload-voice', status_code=status.HTTP_204_NO_CONTENT)
async def upload_voice(file: UploadFile, db: Annotated[AsyncSession, Depends(get_async_session)],
                       token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    return await users.upload_voice(db, file, token.username, knn_vc)


@app.post('/api/change-voice', status_code=status.HTTP_204_NO_CONTENT)
async def change_voice(room_id: str, user_to: str, db: Annotated[AsyncSession, Depends(get_async_session)],
                       token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    return await audio_manager.set_matching_set(db, room_id, token.username, user_to)


@app.get('/api/get-participants/{activity_id}')
async def get_activity_participants(activity_id: int, db: Annotated[AsyncSession, Depends(get_async_session)],
                                    token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    return await activities.get_activity_participants(db, activity_id, username=token.username)


@app.post('/api/activities/vote')
async def vote(voting: schemes.ActivityVote, db: Annotated[AsyncSession, Depends(get_async_session)],
               token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    return await activities.vote(db, voting, token.username)


class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, list[tuple[WebSocket, str]]] = dict()

    async def connect(self, websocket: WebSocket, room_id: str, username: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append((websocket, username))

    async def disconnect(self, websocket: WebSocket, room_id, user_from):
        self.active_connections[room_id] = [
            (ws, username)
            for ws, username in self.active_connections[room_id]
            if username != user_from
        ]


class AudioConnectionManager(ConnectionManager):
    def __init__(self):
        super().__init__()
        self.matching_sets: dict[str, dict[str, torch.Tensor | None]] = dict()

    async def set_matching_set(self, db: AsyncSession, room_id, from_username, to_username):
        user = await db.scalar(select(User).where(User.username == to_username))
        if user:
            if room_id not in self.matching_sets:
                self.matching_sets[room_id] = dict()
            self.matching_sets[room_id][from_username] = torch.load(io.BytesIO(user.preprocessed_voice_data))
        else:
            self.matching_sets[room_id][from_username] = None

    async def broadcast(self, data: bytes, room_id: str, user_from: str):
        user_from_bytes = user_from.encode('utf-8')
        user_from_length = len(user_from_bytes)

        if self.matching_sets.get(room_id, None) and user_from in self.matching_sets[room_id] and self.matching_sets[room_id][user_from] is not None:
            audio_np = np.frombuffer(data, dtype=np.float32)
            audio_tensor = torch.tensor(audio_np, device='cuda')

            query_sentence = knn_vc.get_features(audio_tensor)

            out_wav = knn_vc.match(query_sentence, self.matching_sets[room_id][user_from], topk=4)
            data = out_wav.cpu().numpy().tobytes()

        message = bytearray()
        message.extend(user_from_length.to_bytes())
        message.extend(user_from_bytes)
        message.extend(data)

        for ws, username in self.active_connections[room_id]:
            if username != user_from:
                await ws.send_bytes(message)

    async def disconnect(self, websocket: WebSocket, room_id, user_from):
        del self.matching_sets[room_id][user_from]
        await super().disconnect(websocket, room_id, user_from)


class VideoConnectionManager(ConnectionManager):
    async def disconnect(self, websocket: WebSocket, room_id, user_from):
        for ws, username in self.active_connections[room_id]:
            if username != user_from:
                await ws.send_text(json.dumps({
                    'type': 'disconnect-user',
                    'from': user_from
                }))
        await super().disconnect(websocket, room_id, user_from)


audio_manager = AudioConnectionManager()
video_manager = VideoConnectionManager()


@app.websocket('/ws/audio/{room_id}/{token}')
async def websock(websocket: WebSocket, user_to: str | None, room_id: str, token: str,
                  db: Annotated[AsyncSession, Depends(get_async_session)]):
    token = verify_access_token(token)
    await audio_manager.connect(websocket, room_id, token.username)
    logger.debug('User to')
    logger.debug(user_to)
    if user_to:
        await audio_manager.set_matching_set(db, room_id, token.username, user_to)
    try:
        while True:
            data = await websocket.receive_bytes()
            # logger.debug(f'received from {token.username}')
            await audio_manager.broadcast(data, room_id, token.username)
    except WebSocketDisconnect:
        await audio_manager.disconnect(websocket, room_id, token.username)


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
        await video_manager.disconnect(websocket, room_id, token.username)


@sio.event
async def connect(sid, environ):
    room_id = environ['QUERY_STRING'].split('=')[1].split('&')[0]
    await sio.enter_room(sid=sid, room=int(room_id))


@sio.on('messages:get')
@with_db_session
async def get_messages(sid, data: dict, db: AsyncSession):
    messages = await chat.get_messages(db=db, room_id=data['room_id'])
    await sio.emit('messages', data={'messages': messages.dict()}, room=data['room_id'])


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


@sio.on('message:delete')
@with_db_session
async def delete_message(sid, message: dict, db: AsyncSession):
    logger.debug(message)
    await chat.delete_message(db, message['message_id'], message['username'])
    messages = await chat.get_messages(db=db, room_id=message['room_id'])
    await sio.emit('messages', data={'messages': messages.dict()}, room=message['room_id'])
