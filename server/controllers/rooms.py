from typing import Annotated

from fastapi import HTTPException, status, Depends
from sqlalchemy import desc
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from starlette.status import HTTP_400_BAD_REQUEST

from controllers import activities
from logger import logger
from models import schemes
from models.core import User, Room, Message, ActivityUser, Activity, RoomUser
from models.database import get_async_session
from utils import get_password_hash, verify_password


async def get_user_room_and_activity(db: AsyncSession, room: Room, user_id: int) -> schemes.RoomGet:
    activity = await db.scalar(select(Activity).where(Activity.room_id == room.id))
    activity_user = await db.scalar(select(ActivityUser).where(
        (ActivityUser.user_id == user_id) & (ActivityUser.activity_id == activity.id))) if activity else None
    other_voice_user = await db.scalar(
        select(User).where(User.id == activity_user.other_voice_user_id)) if activity_user else None
    return schemes.RoomGet(
        id=room.id,
        name=room.name,
        is_creator=room.creator_id == user_id,
        activity_id=activity.id if activity else None,
        is_participating=activity_user is not None,
        refused_participation=activity_user.refused_participation if activity_user else False,
        dropped_voice_username=other_voice_user.username if other_voice_user else None,
        can_vote=(activity_user.right_answers == -1) if activity_user is not None else False
    )


async def get_rooms(db: AsyncSession, username: str):
    logger.debug(username)
    user = await db.scalar(select(User).where(User.username == username).options(selectinload(User.rooms)))

    rooms = [await get_user_room_and_activity(db, room, user.id) for room in user.rooms] if user else []

    return rooms


async def create(db: AsyncSession, room: schemes.RoomJoin, username: str):
    if await db.scalar(select(Room).where(Room.name == room.name)):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail={'name': 'Room with this name already exists'}
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
            detail={'password': 'Password too short'}
        )
    hashed_password = get_password_hash(room.password)
    new_room = Room(
        name=room.name,
        creator=user,
        hashed_password=hashed_password
    )
    new_room.users.append(user)
    db.add(new_room)
    await db.flush()
    await activities.create_activity(db, new_room.id)
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
    if not verify_password(room_to_join.password, room.hashed_password):
        raise credentials_error

    room.users.append(user)
    await db.commit()


async def leave_room(db: AsyncSession, room_id: int, username: str):
    user = await db.scalar(select(User).where(User.username == username))
    if not user:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Wrong user'
        )
    room = await db.scalar(select(Room).where(Room.id == room_id).options(selectinload(Room.users)))
    room.users.remove(user)
    await db.commit()


async def delete_room(db: AsyncSession, room_id: int, username: str):
    room = await db.scalar(select(Room).where(Room.id == room_id))
    if not room:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Wrong room'
        )
    user = await db.scalar(select(User).where(User.username == username))
    wrong_user_exception = HTTPException(
        status_code=HTTP_400_BAD_REQUEST,
        detail='Wrong user'
    )
    if not user or user.id != room.creator_id:
        raise wrong_user_exception
    await db.delete(room)
    await db.commit()


async def get_voices(db: AsyncSession, room_id: int):
    room = await db.scalar(select(Room).where(Room.id == room_id).options(selectinload(Room.users)))
    if not room:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Wrong room'
        )
    return [user.username for user in room.users if user.preprocessed_voice_data]


async def get_leaderboard(db: AsyncSession, room_id: int):
    room = await db.scalar(select(Room).where(Room.id == room_id).options(selectinload(Room.room_users)))
    if not room:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Wrong room'
        )
    leaderboard = (await db.execute(
        select(User.username, RoomUser.victories)
        .join(RoomUser, User.id == RoomUser.user_id)
        .filter(RoomUser.room_id == room_id)
        .order_by(desc(RoomUser.victories))
    )).all()
    last_winner = (await db.execute(
        select(User.username, RoomUser.last_score)
        .join(RoomUser, User.id == RoomUser.user_id)
        .filter(RoomUser.room_id == room_id)
        .order_by(desc(RoomUser.last_score))
        .limit(1)
    )).first()
    logger.debug('last winner:')
    logger.debug(last_winner)
    return last_winner, leaderboard
