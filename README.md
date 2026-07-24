# SAMSEC LABS

SAMSEC LABS is a premium enterprise cybersecurity SaaS platform that combines a polished user experience, a FastAPI backend, and a scalable deployment architecture.

## Highlights

- Premium landing experience with glassmorphism, neon cyber visuals, and animated metrics.
- Authentication-ready API with registration, login, and JWT support.
- PWA support via manifest and service worker.
- Docker and CI/CD scaffolding for deployment readiness.
- Modular frontend and backend structure for future expansion.

## Run locally

1. Create a virtual environment.
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Start the API:
   - `uvicorn backend.app.main:app --reload`
4. Open the frontend via the static files in the workspace root.

## Tests

Run:

- `pytest -q backend/tests/test_main.py`

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
