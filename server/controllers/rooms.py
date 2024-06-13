from typing import Annotated

from fastapi import HTTPException, status, Depends
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from starlette.status import HTTP_400_BAD_REQUEST

from controllers.auth import verify_token
from logger import logger
from models import schemes
from models.core import User, Room
from models.database import get_async_session
from utils import get_password_hash, verify_password


async def get_rooms(db: AsyncSession, username: str):
    logger.debug(username)
    user = await db.scalar(select(User).where(User.username == username).options(selectinload(User.rooms)))
    rooms = user.rooms if user else []

    return rooms


async def create(db: AsyncSession, room: schemes.RoomJoin, username: str):
    if await db.scalar(select(Room).where(Room.name == room.name)):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail={'username': 'Room with this name already exists'}
        )
    user = await db.scalar(select(User).where(User.username == username))
    if not user:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Wrong creator'
        )
    if len(room.password) < 6:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Password too short'
        )
    hashed_password = get_password_hash(room.password)
    new_room = Room(
        name=room.name,
        creator=user,
        hashed_password=hashed_password
    )
    new_room.users.append(user)
    db.add(new_room)
    await db.commit()


async def join_room(db: AsyncSession, room_to_join: schemes.RoomJoin, username: str):
    user = await db.scalar(select(User).where(User.username == username))
    if not user:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Wrong user'
        )
    room = await db.scalar(select(Room).where(Room.name == room_to_join.name).options(selectinload(Room.users)))
    credentials_error = HTTPException(
        status_code=HTTP_400_BAD_REQUEST,
        detail='Wrong name or password'
    )
    if not room:
        raise credentials_error
    logger.debug(room_to_join.name)
    logger.debug(room_to_join.password)
    if not verify_password(room_to_join.password, room.hashed_password):
        raise credentials_error

    room.users.append(user)
    await db.commit()
