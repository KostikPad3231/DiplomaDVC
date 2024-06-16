import io
import os
import tempfile

import torch.cuda
import torchaudio
from fastapi import HTTPException, status, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from starlette.status import HTTP_400_BAD_REQUEST

from .auth import create_access_token
from models.core import User
from models import schemes
from utils import get_password_hash, verify_password

from logger import logger


async def register(db: AsyncSession, user: schemes.UserCreate):
    if await db.scalar(select(User).where(User.username == user.username)):
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail={'username': 'User with this username already exists'}
        )
    if user.password1 != user.password2:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Passwords mismatch'
        )
    if len(user.password1) < 6:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Password too short'
        )
    hashed_password = get_password_hash(user.password1)
    new_user = User(
        username=user.username,
        hashed_password=hashed_password
    )
    db.add(new_user)
    await db.commit()


async def login(db: AsyncSession, form_data: OAuth2PasswordRequestForm):
    user = await db.scalar(select(User).where(User.username == form_data.username))
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not user:
        raise credentials_error
    if not verify_password(form_data.password, user.hashed_password):
        raise credentials_error

    access_token = create_access_token(data={'username': user.username})

    return {
        'access_token': access_token,
        'token_type': 'bearer'
    }


async def upload_voice(db: AsyncSession, file: UploadFile, username: str, knn_vc):
    if file.filename.split('.')[-1] != 'wav':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Wrong file format'
        )
    user: User = await db.scalar(select(User).where(User.username == username))
    if not user:
        raise HTTPException(
            status_code=HTTP_400_BAD_REQUEST,
            detail='Wrong user'
        )
    with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
        contents = await file.read()
        temp_file.write(contents)
        temp_file_path = temp_file.name
    try:
        matching_set = knn_vc.get_matching_set([temp_file_path])
        logger.debug(matching_set.size())
        buffer = io.BytesIO()
        torch.save(matching_set, buffer)
        user.preprocessed_voice_data = buffer.getvalue()
        await db.commit()
    finally:
        os.remove(temp_file_path)
        torch.cuda.empty_cache()
