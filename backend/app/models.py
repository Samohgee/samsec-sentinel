import os
from sqlalchemy import Column, DateTime, Integer, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class UserORM(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default='user')
    created_at = Column(DateTime, nullable=False)


class ProductORM(Base):
    __tablename__ = 'products'

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    price = Column(Integer, default=0)
    category = Column(String(100), default='security')
    description = Column(Text, default='Premium digital product')


class CourseORM(Base):
    __tablename__ = 'courses'

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(255), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    level = Column(String(64), default='beginner')
    duration_hours = Column(Integer, default=8)


class OrderORM(Base):
    __tablename__ = 'orders'

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), nullable=False)
    status = Column(String(50), default='pending')
    total_cents = Column(Integer, default=0)


class TicketORM(Base):
    __tablename__ = 'tickets'

    id = Column(Integer, primary_key=True, index=True)
    subject = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    priority = Column(String(50), default='normal')
