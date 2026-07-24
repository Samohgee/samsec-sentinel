import socket
import ssl
from typing import Any

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix='/api/v1/tools', tags=['tools'])


@router.get('/ip')
async def ip_lookup(host: str) -> dict[str, Any]:
    try:
        infos = socket.getaddrinfo(host, None)
        addrs = sorted({info[4][0] for info in infos})
        return {'host': host, 'addresses': addrs}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get('/dns')
async def dns_lookup(host: str) -> dict[str, Any]:
    # Basic A record lookup using getaddrinfo and MX via socket.getaddrinfo is not directly available.
    try:
        a_records = sorted({r[4][0] for r in socket.getaddrinfo(host, 0, proto=socket.IPPROTO_TCP)})
    except Exception:
        a_records = []
    # Try simple MX resolution via socket.getaddrinfo on mail.<host>
    mx_candidates = []
    try:
        for prefix in ('mail.', 'smtp.'):
            try:
                mx_infos = socket.getaddrinfo(prefix + host, 0, proto=socket.IPPROTO_TCP)
                mx_candidates.append({'host': prefix + host, 'addresses': sorted({i[4][0] for i in mx_infos})})
            except Exception:
                continue
    except Exception:
        mx_candidates = []
    return {'host': host, 'a': a_records, 'mx': mx_candidates}


@router.get('/ssl')
async def ssl_check(host: str, port: int = 443) -> dict[str, Any]:
    try:
        context = ssl.create_default_context()
        with socket.create_connection((host, port), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=host) as ssock:
                cert = ssock.getpeercert()
                return {
                    'host': host,
                    'port': port,
                    'subject': dict(x[0] for x in cert.get('subject', [])),
                    'issuer': dict(x[0] for x in cert.get('issuer', [])),
                    'notBefore': cert.get('notBefore'),
                    'notAfter': cert.get('notAfter'),
                    'version': cert.get('version'),
                    'serialNumber': cert.get('serialNumber')
                }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get('/portscan')
async def port_scan(host: str, ports: str = '22,80,443') -> dict[str, Any]:
    # ports is comma-separated list
    results = {}
    try:
        port_list = [int(p.strip()) for p in ports.split(',') if p.strip()]
    except Exception:
        raise HTTPException(status_code=400, detail='Invalid ports parameter')
    for p in port_list:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.settimeout(1.0)
                res = s.connect_ex((host, p))
                results[p] = 'open' if res == 0 else 'closed'
        except Exception as e:
            results[p] = f'error: {e}'
    return {'host': host, 'results': results}
