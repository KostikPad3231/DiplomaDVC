from typing import Annotated

from fastapi import FastAPI, Depends
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from controllers import users
from controllers import auth
from controllers import rooms
from logger import logger
from models.database import get_async_session
from models import schemes

app = FastAPI()

origins = [
    'http://localhost:3000/',
    'http://localhost:3000',
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post('/auth/register', status_code=status.HTTP_201_CREATED)
async def register_user(user: schemes.UserCreate, db: Annotated[AsyncSession, Depends(get_async_session)]):
    return await users.register(db=db, user=user)


@app.post('/auth/login', response_model=schemes.Token)
async def login_user(form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
                     db: Annotated[AsyncSession, Depends(get_async_session)]):
    logger.debug('asdgsdhgdf')
    return await users.login(db=db, form_data=form_data)


@app.get('/api/get-user')
async def get_current_user(current_user: Annotated[schemes.User, Depends(auth.get_current_user)]):
    return {'current_user': current_user}

@app.get('/api/rooms')
async def get_current_user(room_list: Annotated[schemes.RoomList, Depends(rooms.get_rooms)]):
    return {'rooms': room_list}
