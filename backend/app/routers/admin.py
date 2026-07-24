import os
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix='/api/v1/admin', tags=['admin'])


class AdminMetrics:
    @staticmethod
    def dashboard() -> dict[str, Any]:
        return {
            'total_users': 1824,
            'total_revenue': 248400,
            'active_orders': 142,
            'system_health': 99.8,
            'revenue_trend': 'up_8_percent',
            'user_trend': 'up_12_percent',
        }

    @staticmethod
    def users() -> dict[str, Any]:
        return {
            'total': 1824,
            'active': 1658,
            'inactive': 166,
            'users': [
                {'email': 'founder@samseclabs.com', 'name': 'Ava Rivera', 'role': 'admin', 'joined': '2026-01-15', 'status': 'active'},
                {'email': 'alex@company.com', 'name': 'Alex Kim', 'role': 'user', 'joined': '2026-02-10', 'status': 'active'},
                {'email': 'jordan@startup.io', 'name': 'Jordan Bell', 'role': 'user', 'joined': '2026-03-05', 'status': 'inactive'},
            ],
        }

    @staticmethod
    def products() -> dict[str, Any]:
        return {
            'total': 18,
            'published': 12,
            'draft': 6,
            'products': [
                {'name': 'Pro Plan', 'category': 'subscription', 'price': 99, 'stock': float('inf'), 'status': 'active'},
                {'name': 'Enterprise Package', 'category': 'security_services', 'price': None, 'stock': float('inf'), 'status': 'active'},
                {'name': 'AI Assistant Add-on', 'category': 'addon', 'price': 29, 'stock': float('inf'), 'status': 'draft'},
            ],
        }

    @staticmethod
    def orders() -> dict[str, Any]:
        return {
            'total': 482,
            'completed': 421,
            'pending': 42,
            'failed': 19,
            'orders': [
                {'order_id': 'ORD-2026-001', 'customer': 'Alex Rivera', 'amount': 99.00, 'date': '2026-07-20', 'status': 'completed'},
                {'order_id': 'ORD-2026-002', 'customer': 'Jordan Kim', 'amount': 149.00, 'date': '2026-07-22', 'status': 'pending'},
                {'order_id': 'ORD-2026-003', 'customer': 'Morgan Chase', 'amount': 29.00, 'date': '2026-07-23', 'status': 'completed'},
            ],
        }

    @staticmethod
    def analytics() -> dict[str, Any]:
        return {
            'revenue_trend': [45, 52, 48, 61, 55, 71, 67],
            'user_growth': [100, 110, 95, 115, 140, 165, 185],
            'traffic_source': {
                'organic': 45,
                'direct': 30,
                'paid': 20,
                'referral': 5,
            },
            'top_products': [
                {'name': 'Pro Plan', 'revenue': 89400},
                {'name': 'Enterprise Package', 'revenue': 124800},
                {'name': 'AI Assistant Add-on', 'revenue': 34200},
            ],
        }


@router.get('/dashboard')
async def get_dashboard() -> dict[str, Any]:
    return AdminMetrics.dashboard()


@router.get('/users')
async def get_users() -> dict[str, Any]:
    return AdminMetrics.users()


@router.post('/users')
async def create_user(email: str, name: str, role: str = 'user') -> dict[str, Any]:
    return {'email': email, 'name': name, 'role': role, 'status': 'active'}


@router.put('/users/{user_id}')
async def update_user(user_id: str, name: str = None, role: str = None) -> dict[str, Any]:
    return {'user_id': user_id, 'name': name, 'role': role, 'updated': True}


@router.delete('/users/{user_id}')
async def delete_user(user_id: str) -> dict[str, Any]:
    return {'user_id': user_id, 'deleted': True}


@router.get('/products')
async def get_products() -> dict[str, Any]:
    return AdminMetrics.products()


@router.post('/products')
async def create_product(name: str, category: str, price: int = 0) -> dict[str, Any]:
    return {'name': name, 'category': category, 'price': price, 'status': 'draft'}


@router.put('/products/{product_id}')
async def update_product(product_id: str, name: str = None, price: int = None) -> dict[str, Any]:
    return {'product_id': product_id, 'name': name, 'price': price, 'updated': True}


@router.delete('/products/{product_id}')
async def delete_product(product_id: str) -> dict[str, Any]:
    return {'product_id': product_id, 'deleted': True}


@router.get('/orders')
async def get_orders(status: str = None) -> dict[str, Any]:
    return AdminMetrics.orders()


@router.get('/orders/{order_id}')
async def get_order(order_id: str) -> dict[str, Any]:
    return {'order_id': order_id, 'customer': 'Sample Customer', 'amount': 99.00, 'status': 'completed', 'items': []}


@router.put('/orders/{order_id}')
async def update_order(order_id: str, status: str) -> dict[str, Any]:
    return {'order_id': order_id, 'status': status, 'updated': True}


@router.get('/analytics')
async def get_analytics() -> dict[str, Any]:
    return AdminMetrics.analytics()


@router.get('/settings')
async def get_settings() -> dict[str, Any]:
    return {
        'general': {
            'site_name': 'SAMSEC LABS',
            'site_url': 'https://samseclabs.com',
            'logo_url': '/assets/images/logo/favicon.png',
        },
        'email': {
            'smtp_host': os.getenv('SMTP_HOST', 'smtp.gmail.com'),
            'smtp_port': int(os.getenv('SMTP_PORT', '587')),
        },
        'security': {
            'two_factor_enabled': True,
            'force_https': True,
            'rate_limiting': True,
        },
    }


@router.put('/settings')
async def update_settings(key: str, value: Any) -> dict[str, Any]:
    return {'key': key, 'value': value, 'updated': True}
