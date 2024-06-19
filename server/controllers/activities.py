import random

from fastapi import HTTPException, status, Depends
from sqlalchemy import desc
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from starlette.status import HTTP_400_BAD_REQUEST

from controllers import rooms
from controllers.auth import verify_token
from logger import logger
from models import schemes
from models.core import User, Room, Message, Activity, ActivityUser, RoomUser
from models.database import get_async_session
from utils import get_password_hash, verify_password


async def create_activity(db: AsyncSession, room_id: int):
    room = await db.scalar(
        select(Room).where(Room.id == room_id).options(selectinload(Room.activity), selectinload(Room.room_users),
                                                       selectinload(Room.activity).selectinload(
                                                           Activity.activity_users)))
    activity = room.activity
    if activity:
        results = {activity_user.user_id: activity_user.right_answers
                   for activity_user in activity.activity_users
                   }
        for room_user in room.room_users:
            if room_user.user_id in results:
                room_user.last_score = results[room_user.user_id]
            else:
                room_user.last_score = 0
        await db.flush()
        last_winner = await db.scalar(
            select(RoomUser)
            .filter(RoomUser.room_id == room_id)
            .order_by(desc(RoomUser.last_score))
            .limit(1)
        )
        logger.debug(last_winner)
        logger.debug(type(last_winner))
        logger.debug(last_winner.user_id)
        logger.debug(last_winner.room_id)
        logger.debug(last_winner.last_score)
        logger.debug(last_winner.victories)
        last_winner.victories += max(0, last_winner.last_score)
        await db.delete(activity)
        await db.flush()
    new_activity = Activity(
        room=room
    )
    db.add(new_activity)
    room.activity = new_activity


async def join_activity(db: AsyncSession, activity: schemes.ActivityJoin, username: str):
    user = await db.scalar(select(User).where(User.username == username))
    if not user:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Wrong user'
        )
    room = await db.scalar(select(Room).where(Room.id == activity.room_id).options(selectinload(Room.users)))
    if user not in room.users:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='You are not a member of the room'
        )
    activity = await db.scalar(
        select(Activity).where(Activity.id == activity.activity_id).options(selectinload(Activity.users)))
    if not activity:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Wrong activity'
        )
    activity.users.append(user)
    await db.commit()
    logger.debug(activity.users)
    users = []
    for tmp_user in room.users:
        if tmp_user.preprocessed_voice_data:
            users.append((tmp_user.id, tmp_user.username))
    random_user_voice = random.choice(users)
    logger.debug(user.id)
    logger.debug(activity.id)
    activity_user = await db.scalar(
        select(ActivityUser).where(ActivityUser.user_id == user.id, ActivityUser.activity_id == activity.id))
    activity_user.other_voice_user_id = random_user_voice[0]
    logger.debug(random_user_voice)
    await db.commit()
    return schemes.ActivityGetWithVoices(
        activity_id=activity.id,
        is_participating=True,
        refused_participation=activity_user.refused_participation,
        dropped_voice_username=random_user_voice[1],
        voices=await rooms.get_voices(db, activity.room_id)
    )


async def leave_activity(db: AsyncSession, activity_id: int, username: str):
    user = await db.scalar(select(User).where(User.username == username))
    if not user:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Wrong user'
        )
    activity = await db.scalar(select(Activity).where(Activity.id == activity_id))
    if not activity:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Wrong activity'
        )
    activity_user = await db.scalar(
        select(ActivityUser).where(ActivityUser.user_id == user.id, ActivityUser.activity_id == activity.id))
    if not activity_user:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='You are not member of this activity'
        )
    activity_user.refused_participation = True
    await db.commit()


async def get_activity_participants(db: AsyncSession, activity_id: int, username: str):
    activity = await db.scalar(
        select(Activity).where(Activity.id == activity_id).options(
            selectinload(Activity.activity_users).selectinload(ActivityUser.user)))
    if not activity:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Wrong activity'
        )
    participant_names = [activity_user.user.username for activity_user in activity.activity_users if
                         not activity_user.refused_participation and activity_user.user.username != username]
    return participant_names


async def vote(db: AsyncSession, voting: schemes.ActivityVote, username: str):
    activity = await db.scalar(select(Activity).where(Activity.id == voting.activity_id).options(
        selectinload(Activity.activity_users), selectinload(Activity.activity_users).selectinload(ActivityUser.user),
        selectinload(Activity.activity_users).selectinload(ActivityUser.other_voice_user)))
    if not activity:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Wrong activity'
        )
    user = await db.scalar(select(User).where(User.username == username))
    if not user:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Wrong user'
        )
    right_voting = {activity_user.user.username: activity_user.other_voice_user.username for activity_user in
                    activity.activity_users if
                    not activity_user.refused_participation and activity_user.user.username != username}
    right_answers_number = 0
    logger.debug(right_voting)
    for actual_user in voting.votes:
        logger.debug('voting.votes')
        logger.debug(voting.votes)
        logger.debug('username:')
        logger.debug(actual_user)
        if right_voting[actual_user] == voting.votes[actual_user]:
            right_answers_number += 1
    activity_user = None
    for temp_activity_user in activity.activity_users:
        if temp_activity_user.user_id == user.id:
            activity_user = temp_activity_user
            break
    activity_user.right_answers = right_answers_number
    await db.commit()
    return {'right_answers_number': right_answers_number}
