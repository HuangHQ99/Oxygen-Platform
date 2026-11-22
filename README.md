# Oxygen development baseline

Oxygen is a data centre equipment maintenance platform for a service provider working across
multiple independent customers and data centres. W02-01 establishes a reproducible Spring Boot,
Vue and PostgreSQL development baseline. It intentionally contains no customer, asset, work order,
authentication or report feature.

## Required tools

- Java 21
- Node.js 24
- pnpm 11.25.0
- Docker Desktop with Docker Compose
- Git

The repository pins Java in `.java-version`, Node in `.nvmrc`, pnpm in `package.json`, Maven through
the Maven Wrapper and JavaScript dependencies through `pnpm-lock.yaml`.

## Local configuration

The checked-in defaults are for local development only. Copy `.env.example` to `.env` if ports or
local credentials need to change. Never commit `.env` or customer material.

| Variable | Default | Purpose |
|---|---:|---|
| `OXYGEN_DB_NAME` | `oxygen` | Local database name |
| `OXYGEN_DB_USER` | `oxygen` | Local database user |
| `OXYGEN_DB_PASSWORD` | local-only value | Local database password |
| `OXYGEN_DB_PORT` | `5432` | Published PostgreSQL port |
| `OXYGEN_API_PORT` | `8080` | Spring Boot port |
| `OXYGEN_WEB_PORT` | `5173` | Reserved Vite port |

## Start the system

Start PostgreSQL:

```bash
docker compose up -d postgres
docker compose ps
```

Start the API from the repository root:

```bash
./mvnw -pl backend/oxygen-boot -am spring-boot:run
```

In another terminal, install locked frontend dependencies and start the web application:

```bash
pnpm install --frozen-lockfile
pnpm --filter @oxygen/web dev
```

Open <http://localhost:5173>. Vite proxies `/api` and `/actuator` to the API on port 8080.

## Health checks

```bash
curl http://localhost:8080/actuator/health/liveness
curl http://localhost:8080/actuator/health/readiness
curl http://localhost:8080/api/v1/system/info
```

Liveness reports whether the application process is running. Readiness also includes the database
connection. Stopping PostgreSQL must make readiness unavailable without changing liveness.

## Verification

Backend unit and real PostgreSQL integration tests:

```bash
./mvnw --batch-mode --no-transfer-progress verify
```

Frontend formatting, lint, type checks, unit tests and build:

```bash
pnpm check
```

Desktop and mobile Chromium smoke tests:

```bash
pnpm --filter @oxygen/web exec playwright install chromium
pnpm test:e2e
```

GitHub Actions executes the same verification on pull requests and pushes to `main`.

## Repository layout

| Path | Responsibility |
|---|---|
| `apps/web` | Vue 3 responsive browser application |
| `backend/oxygen-domain` | Framework-independent business rules |
| `backend/oxygen-application` | Use cases and transaction orchestration |
| `backend/oxygen-infrastructure` | PostgreSQL and external service adapters |
| `backend/oxygen-worker` | Scheduling and report job entry points |
| `backend/oxygen-boot` | Spring Boot HTTP application and runtime wiring |
| `contracts/openapi` | Generated API contract and TypeScript client boundary |
| `db` | Database notes and future shared migration tooling |
| `infra` | AWS CDK implementation beginning in W02-03 |
| `docs` | Product rules, decisions, evidence and runbooks |

## Stop and reset local services

Stop containers while retaining the database volume:

```bash
docker compose down
```

Deleting the local database volume is destructive and is not part of the normal reset procedure.
