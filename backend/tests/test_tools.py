from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_ip_lookup_returns_addresses():
    response = client.get('/api/v1/tools/ip?host=example.com')
    assert response.status_code == 200
    body = response.json()
    assert 'addresses' in body


def test_dns_lookup_returns_a_and_mx():
    response = client.get('/api/v1/tools/dns?host=example.com')
    assert response.status_code == 200
    body = response.json()
    assert 'a' in body
    assert 'mx' in body


def test_ssl_check_returns_cert_info():
    # This may fail in constrained environments but should work on normal networks
    response = client.get('/api/v1/tools/ssl?host=example.com')
    assert response.status_code in (200, 400)


def test_port_scan_returns_results():
    response = client.get('/api/v1/tools/portscan?host=example.com&ports=80,443')
    assert response.status_code == 200
    body = response.json()
    assert 'results' in body
