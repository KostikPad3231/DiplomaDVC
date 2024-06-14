from datetime import datetime, timezone, timedelta
from typing import Annotated

from fastapi import HTTPException, status, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from logger import logger
from models import schemes
from models.core import User
from models.database import get_async_session

SECRET_KEY = 'eacf6cd2fcb0bf311182fb8cb103cd4dd8ee0f999a5bc0a310529b73917acebe'
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 7 * 24 * 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl='token')


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({'exp': expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_access_token(token: str) -> schemes.TokenData:
    logger.debug('verify_access_token')
    logger.debug(token)
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail='Invalid authentication credentials',
        headers={'WWW-Authenticate': 'Bearer'}
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=ALGORITHM)
        username = payload.get('username')
        if username is None:
            raise credentials_exception
        token_data = schemes.TokenData(username=username)
    except JWTError:
        raise credentials_exception

    return token_data


def verify_token(token: Annotated[str, Depends(oauth2_scheme)]):
    token = verify_access_token(token)
    return token


async def get_current_user(db: Annotated[AsyncSession, Depends(get_async_session)],
                           token: Annotated[str, Depends(oauth2_scheme)]):
    logger.debug('get_current_user')
    token = verify_access_token(token)
    logger.debug(1)
    user = await db.scalar(select(User).where(User.username == token.username))
    logger.debug(2)
    return user
