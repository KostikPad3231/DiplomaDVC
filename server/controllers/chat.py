from typing import Annotated

from fastapi import HTTPException, status, Depends
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from starlette.status import HTTP_400_BAD_REQUEST

from controllers.auth import verify_token
from logger import logger
from models import schemes
from models.core import User, Room, Message
from models.database import get_async_session
from utils import get_password_hash


async def get_messages(db: AsyncSession, room_id: int):
    messages = await db.execute(
        select(Message).options(selectinload(Message.sender)).where(Message.room_id == room_id)
    )
    messages = messages.scalars().all()
    messages = [
        schemes.MessageGet(
            id=message.id,
            text=message.text,
            sent_at=message.sent_at,
            sender_username=message.sender.username if message.sender else None
        )
        for message in messages
    ]
    return schemes.MessagesList(messages=messages)


async def send_message(db: AsyncSession, message: schemes.MessageCreate):
    print(message)
    room = await db.scalar(select(Room).where(Room.id == message.room_id))
    if not room:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Wrong room'
        )
    user = await db.scalar(select(User).where(User.username == message.sender_username))
    if not user:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Wrong user'
        )
    if len(message.text) < 1:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail={'text': 'Message too short'}
        )
    new_message = Message(
        text=message.text,
        sender=user,
        room=room
    )
    db.add(new_message)
    await db.commit()


async def delete_message(db: AsyncSession, message_id: int, username: str):
    message = await db.scalar(select(Message).where(Message.id == message_id))
    if not message:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Wrong message'
        )
    user = await db.scalar(select(User).where(User.username == username))
    wrong_user_exception = HTTPException(
        status_code=HTTP_400_BAD_REQUEST,
        detail='Wrong user'
    )
    if not user or user.id != message.sender_id:
        raise wrong_user_exception
    await db.delete(message)
    await db.commit()
