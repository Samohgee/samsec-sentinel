from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_admin_dashboard_returns_metrics():
    response = client.get('/api/v1/admin/dashboard')
    assert response.status_code == 200
    body = response.json()
    assert body['total_users'] == 1824
    assert body['system_health'] == 99.8


def test_admin_get_users_returns_list():
    response = client.get('/api/v1/admin/users')
    assert response.status_code == 200
    body = response.json()
    assert body['total'] == 1824
    assert len(body['users']) > 0


def test_admin_get_products_returns_list():
    response = client.get('/api/v1/admin/products')
    assert response.status_code == 200
    body = response.json()
    assert body['total'] == 18
    assert len(body['products']) > 0


def test_admin_get_orders_returns_list():
    response = client.get('/api/v1/admin/orders')
    assert response.status_code == 200
    body = response.json()
    assert body['total'] == 482
    assert len(body['orders']) > 0


def test_admin_get_analytics_returns_trends():
    response = client.get('/api/v1/admin/analytics')
    assert response.status_code == 200
    body = response.json()
    assert 'revenue_trend' in body
    assert 'traffic_source' in body


def test_admin_get_settings_returns_config():
    response = client.get('/api/v1/admin/settings')
    assert response.status_code == 200
    body = response.json()
    assert body['general']['site_name'] == 'SAMSEC LABS'
    assert body['security']['two_factor_enabled'] is True
