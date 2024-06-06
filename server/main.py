from typing import Annotated, List

import socketio
from fastapi import FastAPI, Depends
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

import asyncio
from aiortc import MediaStreamTrack, RTCPeerConnection, RTCSessionDescription
from aiortc.contrib.media import MediaBlackhole, MediaPlayer, MediaRecorder, MediaRelay

from controllers import users
from controllers import auth
from controllers import rooms
from controllers import chat
from logger import logger
from models.database import get_async_session, with_db_session
from models import schemes

origins = [
    'http://localhost:3000',
]

app = FastAPI()

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


# Rtc




@app.post('/auth/register', status_code=status.HTTP_201_CREATED)
async def register_user(user: schemes.UserCreate, db: Annotated[AsyncSession, Depends(get_async_session)]):
    logger.debug(1)
    return await users.register(db=db, user=user)


@app.post('/auth/login', response_model=schemes.Token)
async def login_user(form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
                     db: Annotated[AsyncSession, Depends(get_async_session)]):
    logger.debug(2)
    return await users.login(db=db, form_data=form_data)


@app.get('/api/get-user')
async def get_current_user(current_user: Annotated[schemes.User, Depends(auth.get_current_user)]):
    logger.debug(3)
    return {'current_user': current_user}


@app.get('/api/rooms', response_model=schemes.RoomList)
async def get_rooms(db: Annotated[AsyncSession, Depends(get_async_session)],
                    token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    logger.debug(4)
    room_list = await rooms.get_rooms(db=db, username=token.username)
    logger.debug(room_list)
    logger.debug(type(room_list))
    return {'rooms': room_list}


@app.post('/api/rooms', status_code=status.HTTP_201_CREATED)
async def create_room(room: schemes.RoomCreate, db: Annotated[AsyncSession, Depends(get_async_session)],
                      token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    logger.debug(5)
    return await rooms.create(db=db, room=room, username=token.username)


@app.post('/api/rooms/join', status_code=status.HTTP_204_NO_CONTENT)
async def join_room(room: schemes.RoomJoin, db: Annotated[AsyncSession, Depends(get_async_session)],
                    token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    return await rooms.join_room(db=db, room_to_join=room, username=token.username)


@sio.event
async def connect(sid, environ):
    room_id = environ['QUERY_STRING'].split('=')[1].split('&')[0]
    logger.debug(environ['QUERY_STRING'])
    logger.debug(f'connected to the room: {room_id}')
    await sio.enter_room(sid=sid, room=int(room_id))


@sio.on('messages:get')
@with_db_session
async def get_messages(sid, data, db: AsyncSession):
    logger.debug('get messages')
    logger.debug(data)
    messages = await chat.get_messages(db=db, room_id=data['roomId'])
    logger.debug(messages)
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


@sio.on('message:delete')
async def delete_message(data=None):
    logger.debug('delete messages')
    logger.debug(data)
    return 'delete'
