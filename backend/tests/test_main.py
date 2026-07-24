from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_health_endpoint_returns_ok():
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_register_creates_user_and_returns_token():
    payload = {
        'email': 'founder@samseclabs.com',
        'password': 'StrongPass123!',
        'full_name': 'Ava Rivera',
    }

    response = client.post('/auth/register', json=payload)

    assert response.status_code == 201
    body = response.json()
    assert body['email'] == payload['email']
    assert body['token_type'] == 'bearer'
    assert 'access_token' in body


def test_login_returns_token_for_registered_user():
    response = client.post(
        '/auth/login',
        json={'email': 'founder@samseclabs.com', 'password': 'StrongPass123!'},
    )

    assert response.status_code == 200
    body = response.json()
    assert body['token_type'] == 'bearer'
    assert 'access_token' in body
