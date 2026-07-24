import hashlib
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr, Field

from .db import init_db
from .routers import admin_router, tools_router

SECRET_KEY = os.getenv('SECRET_KEY', 'samsec-labs-enterprise-grade-secret-key-2026')
ALGORITHM = 'HS256'
ACCESS_TOKEN_TTL_MINUTES = int(os.getenv('ACCESS_TOKEN_TTL_MINUTES', '60'))

app = FastAPI(title='SAMSEC LABS API', version='1.0.0')

app.include_router(admin_router)
app.include_router(tools_router)

init_db()

users_db: dict[str, dict[str, Any]] = {}


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = 'bearer'
    email: str
    full_name: str


class OverviewResponse(BaseModel):
    active_users: int
    deployments: int
    revenue: int
    threat_feed: int


class ServiceItem(BaseModel):
    slug: str
    name: str
    description: str


class ServiceResponse(BaseModel):
    services: list[ServiceItem]


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def create_token(subject: str) -> str:
    payload = {
        'sub': subject,
        'exp': datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_TTL_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@app.get('/health')
def health() -> dict[str, str]:
    return {'status': 'ok'}


@app.post('/auth/register', response_model=AuthResponse, status_code=201)
def register(payload: UserRegisterRequest) -> AuthResponse:
    if payload.email in users_db:
        raise HTTPException(status_code=409, detail='User already exists')

    users_db[str(payload.email)] = {
        'email': str(payload.email),
        'full_name': payload.full_name,
        'password_hash': hash_password(payload.password),
    }

    token = create_token(str(payload.email))
    return AuthResponse(
        access_token=token,
        refresh_token=token,
        email=str(payload.email),
        full_name=payload.full_name,
    )


@app.post('/auth/login', response_model=AuthResponse)
def login(payload: UserLoginRequest) -> AuthResponse:
    user = users_db.get(str(payload.email))
    if not user or user['password_hash'] != hash_password(payload.password):
        raise HTTPException(status_code=401, detail='Invalid credentials')

    token = create_token(str(payload.email))
    return AuthResponse(
        access_token=token,
        refresh_token=token,
        email=str(payload.email),
        full_name=user['full_name'],
    )


@app.get('/api/v1/overview', response_model=OverviewResponse)
def overview() -> OverviewResponse:
    return OverviewResponse(active_users=1824, deployments=97, revenue=2480000, threat_feed=24)


@app.get('/api/v1/services', response_model=ServiceResponse)
def services() -> ServiceResponse:
    payload = [
        ServiceItem(slug='pentesting', name='Penetration Testing', description='Red team assessments and remediation pathways.'),
        ServiceItem(slug='cloud', name='Cloud Security', description='Secure architecture reviews and hardening for AWS, Azure, and GCP.'),
        ServiceItem(slug='ai', name='AI Security Automation', description='Automate triage, detection, and incident workflows.'),
    ]
    return ServiceResponse(services=payload)
