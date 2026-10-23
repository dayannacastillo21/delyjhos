from datetime import datetime, timedelta, timezone
import hashlib
import secrets
from typing import Annotated
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pwdlib import PasswordHash
from sqlalchemy import select, func, delete
from sqlalchemy.orm import Session
from app.dependencies import get_db
from app.models import User, Role, AuthSession, LoginAttempt
from app.config import settings

password_hash = PasswordHash.recommended()
dummy_hash = password_hash.hash("invalid-account-password")
bearer = HTTPBearer(auto_error=False)
DB = Annotated[Session, Depends(get_db)]


def digest(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def utcnow():
    return datetime.now(timezone.utc)


def public_limit(db, request, kind, maximum=15):
    key = digest(
        f'public:{kind}:{request.client.host if request.client else "unknown"}'
    )
    count = db.scalar(
        select(func.count())
        .select_from(LoginAttempt)
        .where(
            LoginAttempt.identity == key,
            LoginAttempt.created_at > utcnow() - timedelta(hours=1),
        )
    )
    if count >= maximum:
        raise HTTPException(429, "Demasiadas solicitudes. Intenta más tarde.")
    db.add(LoginAttempt(identity=key))
    db.commit()


def authenticate(data, request: Request, db: Session):
    email = str(data.email).lower()
    identity = digest(f'{request.client.host if request.client else "unknown"}:{email}')
    cutoff = utcnow() - timedelta(minutes=15)
    # Persistent limit per account, plus source address, across server workers.
    account_key = digest("account:" + email)
    attempts = db.scalar(
        select(func.count())
        .select_from(LoginAttempt)
        .where(
            LoginAttempt.identity.in_([identity, account_key]),
            LoginAttempt.created_at > cutoff,
        )
    )
    if attempts >= 10:
        raise HTTPException(429, "Demasiados intentos. Espera 15 minutos.")
    user = db.scalar(select(User).where(User.email == email))
    valid = password_hash.verify(
        data.password, user.password_hash if user else dummy_hash
    )
    if not valid or not user or not user.is_active:
        db.add_all(
            [LoginAttempt(identity=identity), LoginAttempt(identity=account_key)]
        )
        db.commit()
        raise HTTPException(401, "Correo o contraseña incorrectos")
    db.execute(
        delete(LoginAttempt).where(
            LoginAttempt.created_at < utcnow() - timedelta(hours=1)
        )
    )
    token = secrets.token_urlsafe(48)
    db.add(
        AuthSession(
            token_hash=digest(token),
            user_id=user.id,
            expires_at=utcnow() + timedelta(hours=settings.session_hours),
        )
    )
    db.commit()
    return {"access_token": token, "token_type": "bearer", "user": user_data(user, db)}


def current_user(
    db: DB, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]
) -> User:
    if not credentials:
        raise HTTPException(
            401, "Inicia sesión", headers={"WWW-Authenticate": "Bearer"}
        )
    session = db.scalar(
        select(AuthSession).where(
            AuthSession.token_hash == digest(credentials.credentials),
            AuthSession.expires_at > utcnow(),
        )
    )
    user = db.get(User, session.user_id) if session else None
    if not user or not user.is_active:
        raise HTTPException(401, "Sesión inválida o vencida")
    return user


Actor = Annotated[User, Depends(current_user)]


def role_name(user, db):
    return db.get(Role, user.role_id).name


def require(user, db, *roles):
    if role_name(user, db) not in roles:
        raise HTTPException(403, "No tienes permiso para esta operación")


def user_data(user, db):
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": role_name(user, db),
        "is_active": user.is_active,
    }
