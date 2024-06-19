from datetime import datetime, timezone

from sqlalchemy import Column, Integer, ForeignKey, String, TIMESTAMP, LargeBinary, Table, Text, Boolean
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class RoomUser(Base):
    __tablename__ = 'RoomUser'

    room_id = Column(ForeignKey('Room.id', ondelete='CASCADE'), nullable=False, primary_key=True)
    user_id = Column(ForeignKey('User.id', ondelete='CASCADE'), nullable=False, primary_key=True)
    victories = Column(Integer, default=0)
    last_score = Column(Integer, default=0)

    room = relationship('Room', back_populates='room_users', foreign_keys=[room_id], viewonly=True)
    user = relationship('User', back_populates='room_users', foreign_keys=[user_id], viewonly=True)


class ActivityUser(Base):
    __tablename__ = 'ActivityUser'

    activity_id = Column(ForeignKey('Activity.id', ondelete='CASCADE'), nullable=False, primary_key=True)
    user_id = Column(ForeignKey('User.id', ondelete='CASCADE'), nullable=False, primary_key=True)
    other_voice_user_id = Column(ForeignKey('User.id', ondelete='SET NULL'))

    refused_participation = Column(Boolean, default=False)
    right_answers = Column(Integer, default=-1)

    activity = relationship('Activity', back_populates='activity_users', foreign_keys=[activity_id], viewonly=True)
    user = relationship('User', back_populates='activity_users', foreign_keys=[user_id], viewonly=True)
    other_voice_user = relationship('User', foreign_keys=[other_voice_user_id])


class User(Base):
    __tablename__ = 'User'

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    registered_at = Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    preprocessed_voice_data = Column(LargeBinary)

    created_rooms = relationship('Room', back_populates='creator', cascade='all, delete-orphan')

    room_users = relationship(RoomUser, back_populates='user', foreign_keys=[RoomUser.user_id], viewonly=True)
    rooms = relationship('Room', secondary='RoomUser', back_populates='users')

    messages = relationship('Message', back_populates='sender')

    activity_users = relationship('ActivityUser', back_populates='user', foreign_keys=[ActivityUser.user_id],
                                  viewonly=True)
    activities = relationship('Activity', secondary='ActivityUser', back_populates='users',
                              primaryjoin='User.id == ActivityUser.user_id',
                              secondaryjoin='Activity.id == ActivityUser.activity_id')


class Room(Base):
    __tablename__ = 'Room'

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    creator_id = Column(ForeignKey('User.id', ondelete='CASCADE'), nullable=False)
    creator = relationship('User', back_populates='created_rooms')

    room_users = relationship(RoomUser, back_populates='room', foreign_keys=[RoomUser.room_id], viewonly=True)
    users = relationship('User', secondary='RoomUser', back_populates='rooms')

    messages = relationship('Message', back_populates='room', cascade='all, delete-orphan')

    activity = relationship('Activity', back_populates='room', uselist=False, cascade='all, delete-orphan')


class Message(Base):
    __tablename__ = 'Message'

    id = Column(Integer, primary_key=True)
    text = Column(Text)
    sent_at = Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    room_id = Column(ForeignKey('Room.id', ondelete='CASCADE'), nullable=False)
    room = relationship('Room', back_populates='messages')

    sender_id = Column(ForeignKey('User.id', ondelete='SET NULL'))
    sender = relationship('User', back_populates='messages')


class Activity(Base):
    __tablename__ = 'Activity'

    id = Column(Integer, primary_key=True)

    room_id = Column(ForeignKey('Room.id', ondelete='CASCADE'), unique=True, nullable=False)
    room = relationship('Room', back_populates='activity', single_parent=True, uselist=False)

    activity_users = relationship('ActivityUser', back_populates='activity', foreign_keys=[ActivityUser.activity_id],
                                  viewonly=True)
    users = relationship('User', secondary='ActivityUser', back_populates='activities',
                         primaryjoin='Activity.id == ActivityUser.activity_id',
                         secondaryjoin='User.id == ActivityUser.user_id')

    created_at = Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
