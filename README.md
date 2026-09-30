# Dataset Request Desk

An internal web platform for robotics teleoperation data collection, dataset request fulfillment, and episode lifecycle management.

---

## Live Production Deployment (Render)

| Service | Live Production URL | Description |
| :--- | :--- | :--- |
| **Frontend Web App** | [https://drd-frontend.onrender.com](https://drd-frontend.onrender.com) | React 18 SPA (Light UI, Operations & Request Desk) |
| **Backend API** | [https://drd-backend-dv5r.onrender.com](https://drd-backend-dv5r.onrender.com) | FastAPI REST API with live health check |
| **Interactive API Docs** | [https://drd-backend-dv5r.onrender.com/docs](https://drd-backend-dv5r.onrender.com/docs) | Swagger OpenAPI UI |
| **Database** | Managed PostgreSQL 16 (Frankfurt) | Automated migrations & seeded data |

### Evaluation Credentials:
- **Administrator**: `admin@example.com` / `admin123` (Full RBAC, User Management, Operations)
- **Operator**: `ops1@example.com` / `ops123` (Episode Assignments, CSV Import, Analytics)
- **Client**: `client-a@example.com` / `client123` (Request Submission, Acceptance/Rejection)

---

## 1. Executive Summary & Purpose

In robot teleoperation, recording stations produce **episodes** (short video recordings and sensor metadata of robots performing tasks like picking cups, opening drawers, and sorting items). Clients submit **dataset requests** specifying task parameters, target episode counts, and deadlines. Internal operations teams fulfill these requests by assigning qualified episodes, moving requests through review stages, and delivering datasets.

**Dataset Request Desk** replaces fragile operational spreadsheets with a robust, secure, production-grade web application featuring:
- **Role-Based Access Control (RBAC):** Server-enforced permissions for `client`, `operator`, and `admin` roles.
- **Workflow State Machine:** Enforced transition rules with a tamper-proof audit trail for every status modification.
- **Assignment Integrity:** Quality-filtered, single-assignment exclusivity with strict delivery validation.
- **Resilient CSV Import Engine:** Idempotent, dirty-data tolerant parser with per-row skip reporting.
- **Database-Optimized Analytics:** Sub-second aggregate queries executed entirely inside PostgreSQL (`PERCENTILE_CONT`, `DATE_TRUNC`, index-backed filtering) designed to scale to 5M+ episodes.
- **Operational Observability:** Structured JSON request logging, latency tracking, and health checks.

---

## 2. Architecture & Technology Stack

```
                          ┌────────────────────────┐
                          │   React 18 + Vite UI   │
                          │ TypeScript / Tailwind  │
                          └───────────┬────────────┘
                                      │ HTTP / JSON
                                      ▼
                          ┌────────────────────────┐
                          │    FastAPI Backend     │
                          │ Python 3.11 / Pydantic │
                          └───────────┬────────────┘
                                      │ SQLAlchemy 2.0 (Async)
                                      ▼
                          ┌────────────────────────┐
                          │ PostgreSQL 16 Database │
                          │  Relational + Indexes  │
                          └────────────────────────┘
```

### Backend
- **Python 3.11** + **FastAPI**: Asynchronous REST API with automatic OpenAPI documentation.
- **SQLAlchemy 2.0 (Async)** + **Psycopg 3**: Asynchronous relational ORM with connection pooling.
- **Alembic**: Migration engine for database versioning and reproducible schema changes.
- **Pydantic v2**: Request/response serialization, typing, and input validation.
- **PyJWT & Passlib / Bcrypt**: Secure token-based authentication and salted password hashing.

### Frontend
- **React 18** + **TypeScript**: Type-safe component architecture.
- **Vite**: Rapid, optimized build pipeline.
- **Tailwind CSS**: Modern design system using curated slate/blue palettes and high-contrast badges.
- **Lucide React**: Crisp iconography for operations and analytics views.
- **Axios**: Token-injecting HTTP client with centralized error interception.

---

## 3. Quickstart with Docker (Recommended)

Start the entire stack—PostgreSQL database, schema migrations, seed users, sample episodes, backend API, and frontend—with a single command:

```bash
docker compose up --build
```

### Accessing the Services
| Service | URL | Description |
|---|---|---|
| **Frontend UI** | [http://localhost:5173](http://localhost:5173) or [http://localhost](http://localhost) | Interactive web application |
| **Backend API** | [http://localhost:8000](http://localhost:8000) | REST API endpoints |
| **API Docs (Swagger)** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive OpenAPI documentation |
| **Health Check** | [http://localhost:8000/health](http://localhost:8000/health) | Uptime and service status check |

---

## 4. Pre-Seeded Demo Accounts

The database seeds with the following user accounts:

| Email | Password | Role | Description |
|---|---|---|---|
| `admin@example.com` | `admin123` | **admin** | Full platform access, user management, and operational controls |
| `ops1@example.com` | `ops123` | **operator** | Fulfills requests, assigns episodes, imports CSVs, views analytics |
| `ops2@example.com` | `ops123` | **operator** | Secondary operations staff member |
| `client-a@example.com` | `client123` | **client** | Acme Robotics client; can only view and accept/reject their requests |
| `client-b@example.com` | `client123` | **client** | Beta Labs client; isolated from Acme Robotics data (IDOR protected) |

---

## 5. Running Automated Tests

Run the test suite with a single command:

### Option A: Using Docker (No local Python installation required)
```bash
docker compose run --rm backend pytest -v
```

### Option B: Running Locally with Python
```bash
cd backend
pytest -v
```

### Test Coverage Highlights
The test suite covers:
1. **Authorization Rules (`tests/test_authorization.py`):**
   - Insecure Direct Object References (IDOR) prevention (Client B cannot view or modify Client A's requests).
   - Role boundaries (Clients cannot assign episodes, update status to in_progress, or access analytics).
   - Inactive user token rejection.
2. **Workflow State Transitions (`tests/test_status_transitions.py`):**
   - Valid lifecycle progression: `submitted` → `in_progress` → `delivered` → `accepted`.
   - Rejection and rework loop: `delivered` → `rejected` → `in_progress`.
   - Rejection of invalid transitions (e.g. `submitted` directly to `delivered` or `accepted`).
   - Role ownership enforcement (only clients can accept/reject; only operators can progress work).
3. **Episode Assignment Rules (`tests/test_assignments.py`):**
   - Assignment exclusivity (an episode can belong to at most one request).
   - Quality gates (only `good` or `usable` episodes can be assigned; `bad` episodes are rejected).
   - Task matching validation.
   - Delivery restriction: requests cannot transition to `delivered` until `assigned_count >= requested_count`.
4. **CSV Import Idempotency (`tests/test_import.py`):**
   - Re-running the import with the same CSV results in zero duplicates.
   - Quality normalization (`GOOD`, ` usable `, etc.).
   - Explicit reporting of skipped rows and reasons.
5. **Analytics & Aggregation (`tests/test_analytics.py`):**
   - Verifies server-side SQL grouping and metrics calculation.

---

## 6. Local Manual Development Setup

If you wish to run the backend and frontend directly on your host machine:

### Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
pip install -r requirements-test.txt

# Run migrations
alembic upgrade head

# Seed initial data (users + seed/episodes.csv)
python -m scripts.seed

# Start dev server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 7. CSV Import Engine & Dirty Data Handling

The recording stations generate messy CSV exports (`seed/episodes.csv`). The platform's import engine (`import_service.py`) handles:
- **Header normalization:** Strips whitespace and handles case insensitivity.
- **Deduplication:** Deduplicates within the incoming file and skips episodes already present in the database.
- **Value normalization:** Cleans quality strings (`good`, `usable`, `bad`) and parses timestamp variations.
- **Audit report:** Returns an exact count of imported rows, skipped rows, and per-row error reasons (`ImportReport`).
- **Idempotency:** Safe to run repeatedly against overlapping data without duplicates.

---

## 8. Database-Level Analytics & Scaling to 5M Episodes

The analytics endpoint (`GET /api/analytics`) returns:
1. **Episodes recorded per day, per robot:** Grouped via `DATE_TRUNC('day', recorded_at)` and `robot_id`.
2. **Request fulfillment velocity:** Median elapsed hours from `submitted` to `delivered` calculated in-engine using `PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY delivered.changed_at - submitted.changed_at)`.
3. **Top 5 task names:** Filtered by `quality = 'good'`, grouped, counted, and ranked using SQL `LIMIT 5`.

### Performance at 5 Million Episodes
Zero episode rows are loaded into Python memory. In PostgreSQL:
- Composite index on `(quality, task_name)` enables the top tasks query to execute via an Index-Only Scan.
- Composite index on `(robot_id, recorded_at)` enables fast date-range filtering.
- At 5M+ episodes, table partitioning by `recorded_at` (`PARTITION BY RANGE (recorded_at)`) maintains sub-second query latency and isolates active query working sets in memory.

---

## 9. Observability & Health

- **Health Endpoint (`GET /health`):** Verifies application uptime and database connectivity.
- **Structured Request Logging:** Every incoming request produces a structured log containing:
  - HTTP method and path
  - Response status code
  - Execution duration in milliseconds
  - Authenticated user ID (if present)
  - Client IP address

---

## 10. Deployment (Render Blueprint)

The repository includes a production-ready `render.yaml` configuration file for zero-touch deployment on Render:
- **`drd-postgres`**: Managed PostgreSQL database.
- **`drd-backend`**: Containerized FastAPI service running migrations on startup with `/health` health checks.
- **`drd-frontend`**: Static web service with SPA rewrite rules and automatic backend URL binding.
