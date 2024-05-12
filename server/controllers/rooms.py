from typing import Annotated

from fastapi import HTTPException, status, Depends
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from controllers.auth import verify_token
from logger import logger
from models import schemes
from models.core import User
from models.database import get_async_session


async def get_rooms(db: Annotated[AsyncSession, Depends(get_async_session)], token: Annotated[str, Depends(verify_token)]):
    user = await db.scalar(select(User).where(User.username == token.username))

    return user