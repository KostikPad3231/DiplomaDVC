import json
from typing import Annotated, List

import socketio
from fastapi import FastAPI, Depends, WebSocket
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

import cv2
import asyncio
from aiortc import MediaStreamTrack, RTCPeerConnection, RTCSessionDescription
from aiortc.contrib.media import MediaRelay
from av import VideoFrame
from starlette.websockets import WebSocketDisconnect

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

rooms_connections = {}

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chat

# sio = socketio.AsyncServer(
#     cors_allowed_origins=[],
#     async_mode="asgi"
# )
# socket_app = socketio.ASGIApp(sio)
# app.mount('/socket.io', socket_app)

# Rtc

relay = MediaRelay()


class VideoTransformTrack(MediaStreamTrack):
    kind = 'video'

    def __init__(self, track, transform):
        super().__init__()
        self.track = track
        self.transform = transform

    async def recv(self):
        frame = await self.track.recv()
        if self.transform == 'cartoon':
            img = frame.to_ndarray(format='bgr24')
            img_color = cv2.pyrDown(cv2.pyrDown(img))
            for _ in range(6):
                img_color = cv2.bilateralFilter(img_color, 9, 9, 7)
            img_color = cv2.pyrUp(cv2.pyrUp(img_color))

            img_edges = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY)
            img_edges = cv2.adaptiveThreshold(
                cv2.medianBlur(img_edges, 7),
                255,
                cv2.ADAPTIVE_THRESH_MEAN_C,
                cv2.THRESH_BINARY,
                9,
                2
            )
            img_edges = cv2.cvtColor(img_edges, cv2.COLOR_GRAY2RGB)

            img = cv2.bitwise_and(img_color, img_edges)

            new_frame = VideoFrame.from_ndarray(img, format='bgr24')
            new_frame.pts = frame.pts
            new_frame.time_base = frame.time_base

            return new_frame
        else:
            return frame


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
async def create_room(room: schemes.RoomCreate, db: Annotated[AsyncSession, Depends(get_async_session)],
                      token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    return await rooms.create(db=db, room=room, username=token.username)


@app.post('/api/rooms/join', status_code=status.HTTP_204_NO_CONTENT)
async def join_room(room: schemes.RoomJoin, db: Annotated[AsyncSession, Depends(get_async_session)],
                    token: Annotated[schemes.TokenData, Depends(auth.verify_token)]):
    return await rooms.join_room(db=db, room_to_join=room, username=token.username)


# @app.websocket("/ws/{room_id}")
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.debug(1)

    # if room_id not in rooms_connections:
    #     logger.debug(2)
    #     rooms_connections[room_id] = []
    # rooms_connections[room_id].append(websocket)

    pcs = set()

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message['type'] == 'offer':
                pc = RTCPeerConnection()
                pcs.add(pc)

                @pc.on("datachannel")
                def on_datachannel(channel):
                    @channel.on("message")
                    def on_message(message):
                        logger.debug(f"Message received: {message}")
                        channel.send("Response from server")

                @pc.on('track')
                def on_track(track):
                    if track.kind == 'video':
                        local_video = VideoTransformTrack(relay.subscribe(track), transform='cartoon')
                        pc.addTrack(local_video)

                offer = RTCSessionDescription(sdp=message['sdp'], type=message['type'])
                await pc.setRemoteDescription(offer)

                answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)

                await websocket.send_text(json.dumps({
                    'sdp': pc.localDescription.sdp,
                    'type': pc.localDescription.type
                }))

                # for peer in rooms_connections[room_id]:
                #     logger.debug(peer)
                #     # if peer != websocket:
                #     await peer.send_text(json.dumps({
                #         'type': pc.localDescription.type,
                #         'sdp': pc.localDescription.sdp,
                #         # 'room_id': room_id
                #     }))
            elif 'candidate' in message:
                candidate = message['candidate']
                await pc.addIceCandidate(candidate)
            # elif message['type'] == 'new-peer':
            #     logger.debug(13)
            #     new_pc = RTCPeerConnection()
            #     pcs.add(new_pc)
            #
            #     @new_pc.on('icecandidate')
            #     def on_icecandidate(candidate):
            #         logger.debug(14)
            #         websocket.send_text(json.dumps({'candidate': candidate}))
            #
            #     @new_pc.on('track')
            #     def on_track(track):
            #         logger.debug(15)
            #         if track.kind == 'video':
            #             logger.debug(16)
            #             local_video = VideoTransformTrack(relay.subscribe(track), transform='cartoon')
            #             new_pc.addTrack(local_video)
            #
            #     logger.debug(17)
            #     offer = RTCSessionDescription(sdp=message['sdp'], type=message['type'])
            #     await pc.setRemoteDescription(offer)
            #
            #     logger.debug(18)
            #     answer = await pc.createAnswer()
            #     await pc.setLocalDescription(answer)
            #
            #     logger.debug(19)
            #     await websocket.send_text(json.dumps({
            #         'sdp': pc.localDescription.sdp,
            #         'type': pc.localDescription.type
            #     }))
    except WebSocketDisconnect as e:
        logger.debug(e)
        # rooms_connections[room_id].remove(websocket)
        for pc in pcs:
            await pc.close()
        pcs.clear()


# @sio.event
# async def connect(sid, environ):
#     room_id = environ['QUERY_STRING'].split('=')[1].split('&')[0]
#     logger.debug(environ['QUERY_STRING'])
#     logger.debug(f'connected to the room: {room_id}')
#     await sio.enter_room(sid=sid, room=int(room_id))
#
#
# @sio.on('messages:get')
# @with_db_session
# async def get_messages(sid, data, db: AsyncSession):
#     logger.debug('get messages')
#     logger.debug(data)
#     messages = await chat.get_messages(db=db, room_id=data['roomId'])
#     logger.debug(messages)
#     await sio.emit('messages', data={'messages': messages.dict()}, room=data['roomId'])
#
#
# @sio.on('message:send')
# @with_db_session
# async def send_message(sid, message: dict, db: AsyncSession):
#     await chat.send_message(db, schemes.MessageCreate(
#         text=message['text'],
#         sender_username=message['sender_username'],
#         room_id=message['room_id']
#     ))
#     messages = await chat.get_messages(db=db, room_id=message['room_id'])
#     await sio.emit('messages', data={'messages': messages.dict()}, room=message['room_id'])
