from datetime import datetime

from pydantic import BaseModel, ConfigDict


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
    username: int


class Room(BaseModel):
    name: str


class RoomCreate(Room):
    password: str


class RoomList(BaseModel):
    rooms: list[Room]
