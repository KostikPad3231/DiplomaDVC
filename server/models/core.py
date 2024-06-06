from datetime import datetime, timezone
from typing import List

from sqlalchemy import Column, Integer, ForeignKey, String, TIMESTAMP, LargeBinary, Table, Text
from sqlalchemy.orm import DeclarativeBase, relationship, Mapped


class Base(DeclarativeBase):
    pass


# class RoomUser(Base):
#     __tablename__ = 'UserRoom'
#
#     id = Column(Integer, primary_key=True)
#     room_id = Column(ForeignKey("Room.id"), primary_key=True),
#     user_id = Column(ForeignKey("User.id"), primary_key=True),


RoomUser = Table(
    'RoomUser',
    Base.metadata,
    Column('id', Integer, primary_key=True),
    Column('room_id', ForeignKey('Room.id', ondelete='CASCADE')),
    Column('user_id', ForeignKey('User.id', ondelete='CASCADE')),
    Column('victories', Integer)
)

ActivityUser = Table(
    'ActivityUser',
    Base.metadata,
    Column('id', Integer, primary_key=True),
    Column('activity_id', ForeignKey('Activity.id', ondelete='CASCADE')),
    Column('user_id', ForeignKey('User.id', ondelete='CASCADE')),
    Column('other_voice_user_id', ForeignKey('User.id', ondelete='SET NULL')),
    Column('right_answers', Integer)
)


class User(Base):
    __tablename__ = 'User'

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    registered_at = Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    preprocessed_voice_data = Column(LargeBinary)

    created_rooms = relationship('Room', back_populates='creator')
    rooms = relationship('Room', secondary=RoomUser, back_populates='users')

    messages = relationship('Message', back_populates='sender')

    activities = relationship('Activity', secondary=ActivityUser, back_populates='users',
                              primaryjoin='User.id == ActivityUser.c.user_id',
                              secondaryjoin='Activity.id == ActivityUser.c.activity_id')


class Room(Base):
    __tablename__ = 'Room'

    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    creator_id = Column(ForeignKey('User.id', ondelete='CASCADE'))
    creator = relationship('User', back_populates='created_rooms')

    users = relationship('User', secondary=RoomUser, back_populates='rooms')

    messages = relationship('Message', back_populates='room')

    activity = relationship('Activity', back_populates='room')


class Message(Base):
    __tablename__ = 'Message'

    id = Column(Integer, primary_key=True)
    text = Column(Text)
    sent_at = Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

    room_id = Column(ForeignKey('Room.id', ondelete='CASCADE'))
    room = relationship('Room', back_populates='messages')

    sender_id = Column(ForeignKey('User.id', ondelete='SET NULL'))
    sender = relationship('User', back_populates='messages')


class Activity(Base):
    __tablename__ = 'Activity'

    id = Column(Integer, primary_key=True)

    room_id = Column(ForeignKey('Room.id', ondelete='CASCADE'))
    room = relationship('Room', back_populates='activity')

    users = relationship('User', secondary=ActivityUser, back_populates='activities',
                         primaryjoin='Activity.id == ActivityUser.c.activity_id',
                         secondaryjoin='User.id == ActivityUser.c.user_id')

    created_at = Column(TIMESTAMP, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
