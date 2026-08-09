# Security Notes

- Rotate the default JWT secret before production use.
- Set secure cookies and HTTPS-only transport in the hosting layer.
- Support rate limiting, CSRF protection, and input validation in future backend expansion.
- Keep PostgreSQL credentials, Cloudflare tokens, and provider secrets in a secure secret manager.
