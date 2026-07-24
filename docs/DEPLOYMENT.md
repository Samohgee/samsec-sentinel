# Deployment Guide

## Local development

- Install Python dependencies from [requirements.txt](../requirements.txt).
- Copy [.env.example](../.env.example) to `.env` and adjust secrets and database values.
- Start the FastAPI app with:
  - `uvicorn backend.app.main:app --reload`

## Docker

- Build and run:
  - `docker compose up --build`
- The API is exposed on port 8000.

## Production notes

- Replace the default JWT secret and database credentials.
- Configure HTTPS termination behind Nginx or a reverse proxy.
- Add Cloudflare, object storage, and managed PostgreSQL in a production environment.
