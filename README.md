# SkySpot Website

Smart parking prediction app for MTU Cork Bishopstown campus. React frontend (Figma export) with a FastAPI backend, deployable to Azure Container Apps.

Original design: https://www.figma.com/design/JlzSalPAnJW7vdgO6okIfI/SkySpot-Website

## Project Structure

```
├── src/                  # React frontend (Vite + Tailwind + shadcn/ui)
├── backend/
│   ├── main.py           # FastAPI routes (/api/health, /api/data)
│   ├── database.py       # SQLAlchemy async engine (ready for PostgreSQL)
│   ├── models.py         # ParkingSpace model
│   ├── schemas.py        # Pydantic schemas
│   ├── requirements.txt
│   └── Dockerfile
├── Dockerfile            # Single container: Node build → Python + Nginx + FastAPI
├── nginx.conf            # Nginx serves frontend, proxies /api to FastAPI
├── supervisord.conf      # Runs Nginx + Uvicorn together
├── docker-compose.yml    # Local dev
├── azure-deploy.sh       # Azure Container Apps deployment (single app)
└── .env.example
```

## Local Development

### Without Docker

```bash
# Frontend
npm install --legacy-peer-deps
npm run dev

# Backend (in a separate terminal)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### With Docker Compose

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend:  http://localhost:8000
- API health: http://localhost:8000/api/health

## Azure Deployment

### Prerequisites

- Azure CLI installed and logged in (`az login`)
- Docker installed
- A GitHub account with a Personal Access Token (PAT) that has `write:packages` scope

### Deploy

```bash
export GHCR_USER="your-github-username"
export GHCR_TOKEN="ghp_your_pat_here"
chmod +x azure-deploy.sh
./azure-deploy.sh
```

The script will:
1. Build and push both images to `ghcr.io/<your-username>/`
2. Create a Container Apps environment (`liamapp-env`) in `LiamResG-ne` / `northeurope`
3. Deploy the backend with internal ingress (0.25 vCPU, 0.5Gi, scale 0-1)
4. Deploy the frontend with external ingress on port 80 (0.25 vCPU, 0.5Gi, scale 0-1)
5. Print the public frontend URL

Both apps scale to zero when idle to stay within the free tier.

---

## Connecting PostgreSQL Later

### 1. Provision Azure Database for PostgreSQL Flexible Server

```bash
az postgres flexible-server create \
  --resource-group LiamResG-ne \
  --name skyspot-db \
  --location northeurope \
  --admin-user skyspotadmin \
  --admin-password '<strong-password>' \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 32 \
  --version 16 \
  --public-access 0.0.0.0

az postgres flexible-server db create \
  --resource-group LiamResG-ne \
  --server-name skyspot-db \
  --database-name skyspot
```

### 2. Update the DATABASE_URL secret on the backend container app

```bash
az containerapp secret set \
  --name skyspot-backend \
  --resource-group LiamResG-ne \
  --secrets "database-url=postgresql+asyncpg://skyspotadmin:<password>@skyspot-db.postgres.database.azure.com:5432/skyspot"

az containerapp update \
  --name skyspot-backend \
  --resource-group LiamResG-ne \
  --set-env-vars "DATABASE_URL=secretref:database-url"
```

### 3. Enable the database connection in code

In `backend/main.py`, add startup initialization:

```python
from database import init_db

@app.on_event("startup")
async def startup():
    await init_db()
```

Replace the hardcoded `PARKING_SPACES` list in the `/api/data` route with a real query:

```python
from database import get_session
from models import ParkingSpace
from sqlalchemy import select

@app.get("/api/data", response_model=list[ParkingSpaceOut])
async def get_parking_data(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(ParkingSpace))
    return result.scalars().all()
```

### 4. Uncomment PostgreSQL in docker-compose.yml

Uncomment the `db` service and the `volumes` section at the bottom of `docker-compose.yml` for local development.

### 5. Run migrations with Alembic

```bash
cd backend
pip install alembic
alembic init alembic

# Edit alembic/env.py to import your Base and set target_metadata = Base.metadata
# Edit alembic.ini to set sqlalchemy.url (or use env var)

alembic revision --autogenerate -m "initial"
alembic upgrade head
```

For subsequent model changes:

```bash
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```
