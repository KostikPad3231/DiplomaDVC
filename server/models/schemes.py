from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_serializer


class UserBase(BaseModel):
    username: str


class UserCreate(UserBase):
    password1: str
    password2: str


class UserLogin(UserBase):
    password: str


class User(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    registered_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: str


class Room(BaseModel):
    id: int | None
    name: str


class RoomJoin(BaseModel):
    name: str
    password: str


class RoomCreate(Room):
    password: str


class RoomList(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rooms: list[Room]


class BaseMessage(BaseModel):
    text: str
    sender_username: str | None


class MessageGet(BaseMessage):
    id: int
    sent_at: datetime

    @field_serializer('sent_at')
    def serialize_dt(self, sent_at: datetime, _info):
        return sent_at.isoformat()


class MessageCreate(BaseMessage):
    room_id: int


class MessagesList(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    messages: list[MessageGet]
