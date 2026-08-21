# SafeVitals XR — Backend API Server

> **Production-Hardened · Security-Audited · Containerized · Kubernetes-Ready**
>
> An enterprise-grade NestJS REST API powering the SafeVitals XR Workforce Command Center — managing employee lifecycle, biometric attendance, leave workflows, task sprints, support ticketing, full Role-Based Access Control, and immutable audit logging for modern XR/spatial computing organisations.

---

## Table of Contents

1. [What is this project?](#what-is-this-project)
2. [What changed — Production Hardening](#what-changed--production-hardening)
3. [Key Features](#key-features)
4. [Technology Stack](#technology-stack)
5. [Project Structure](#project-structure)
6. [Getting Started](#getting-started)
7. [Environment Variables](#environment-variables)
8. [Running the Server](#running-the-server)
9. [Docker](#docker)
10. [Kubernetes Deployment](#kubernetes-deployment)
11. [API Reference](#api-reference)
12. [Authentication Flow](#authentication-flow)
13. [RBAC — Roles & Permissions](#rbac--roles--permissions)
14. [Security Architecture](#security-architecture)
15. [Testing](#testing)
16. [Frontend](#frontend)
17. [License](#license)

---

## What is this project?

**SafeVitals XR Backend** is the server-side API powering the SafeVitals XR Workforce Command Center. It is built with [NestJS 11](https://nestjs.com/) and [MongoDB](https://www.mongodb.com/) (via Mongoose 9 / Atlas), and exposes a comprehensive set of REST endpoints for:

- **Authentication & Security** — JWT sessions, 2FA OTP (crypto-secure), GitHub OAuth2, invitation-based onboarding
- **Workforce Management** — Employee directory, department structures, team allocations, role-based access
- **Time & Attendance** — Daily punch in/out, multi-interval break tracking, GPS geolocation check-in
- **Leave Management** — Employee self-service leave requests with manager approval workflows
- **Tasks & Sprints** — Task assignment and Kanban status transitions (`To Do → In Progress → Done`)
- **Support Tickets** — Internal helpdesk with threaded messages and resolution tracking
- **Cloud File Storage** — Multipart report uploads backed by Supabase Storage
- **Audit Trail** — Immutable, tamper-evident logging of every security and data mutation event
- **Mobile Dashboard** — Single round-trip aggregated endpoint for mobile clients

---

## What changed — Production Hardening

This codebase was **fully security-audited and production-hardened**. Below is a summary of every improvement made.

### Security Fixes

| Area | Before | After |
|:---|:---|:---|
| OTP generation | `Math.random()` (predictable) | `crypto.randomInt()` (CSPRNG) |
| OTP in logs | Logged in plaintext | Never logged |
| `devOtp` / `devToken` in responses | Leaked in API response body | Removed — server-side only |
| Invitation token in response | Returned to caller on employee create | Removed — dispatched server-side via email only |
| JWT strategy | User status not re-validated | Checks `isActive` + resolves role, permissions, and employee ID per token |
| RBAC guards | Inconsistently applied | `RolesGuard` + `@Roles()` enforced on every protected controller |
| IDOR | Attendance / employees had no ownership check | Users can only act on their own records unless Admin/Manager |
| Pagination | Unbounded `limit` queries | Hard capped at 100 per request |
| Enumeration attacks | Auth errors revealed whether email exists | Constant-time, generic error messages throughout auth flow |

### Architecture & Reliability

| Area | Improvement |
|:---|:---|
| **Graceful shutdown** | `app.enableShutdownHooks()` — in-flight requests complete before container exit |
| **CORS hardening** | Whitelist-only via `ALLOWED_ORIGINS` / `FRONTEND_URL` env vars |
| **Global validation pipe** | `whitelist: true`, `forbidNonWhitelisted: true` — unknown fields rejected at the boundary |
| **Request tracing** | `X-Request-ID` middleware injects a UUID on every request for distributed log correlation |
| **Global exception filter** | Uniform error shape across all endpoints, never leaks stack traces |
| **Rate limiting** | `@nestjs/throttler` applied globally — brute-force protection on all routes |
| **Helmet** | Secure HTTP headers (CSP, HSTS, X-Frame-Options, etc.) set on every response |
| **Employee ID collision** | Sequential `SV-000001` generation uses atomic DB counter — zero collision |
| **AuthModule** | `Employee` + `Role` schemas registered so `JwtStrategy` populates full user context |

### Containerisation & Deployment

| Artifact | Detail |
|:---|:---|
| **Dockerfile** | Multi-stage build, non-root `node` user, `dumb-init` PID 1, production `node_modules` only |
| **`.dockerignore`** | Excludes `node_modules`, `dist`, `.env`, test files from build context |
| **`k8s/namespace.yaml`** | Isolated `safevitals` namespace |
| **`k8s/deployment.yaml`** | 2-replica Deployment with liveness/readiness probes, resource limits, `envFrom` Secret injection |
| **`k8s/service.yaml`** | ClusterIP Service on port 4000 |
| **`k8s/ingress.yaml`** | NGINX Ingress with TLS termination and `/api` path routing |
| **`k8s/hpa.yaml`** | HorizontalPodAutoscaler (2–10 replicas, 70% CPU target) |
| **`k8s/configmap.yaml`** | Non-sensitive config (PORT, NODE_ENV) separated from Secrets |
| **`k8s/secret.example.yaml`** | Kubernetes Secret template (base64 placeholders — never commit real values) |

---

## Key Features

### 1. Authentication & Identity Management
- **JWT Authentication** — Stateless bearer token auth with configurable expiry
- **2-Factor Authentication (OTP)** — Email-based, cryptographically secure time-limited OTP on every login
- **GitHub OAuth2** — Single-click social login for engineering teams
- **Invitation-Based Onboarding** — Tokenized invite links for new staff with secure first-time password setup
- **Session Management** — Active session tracking, token revocation, and device logout
- **Password Security** — `bcryptjs` hashing with 12+ salt rounds, secure reset flows
- **Enumeration-proof** — All auth errors return the same message regardless of whether an email exists

### 2. Role-Based Access Control (RBAC)
- Hierarchical roles: `Super Admin`, `HR Admin`, `Operations Manager`, `Standard Employee`
- Fine-grained permission strings (e.g., `employees.view`, `leave.review`, `audit.view`)
- `RolesGuard` + `@Roles()` enforced on every protected route
- `PermissionsGuard` + `@Permissions()` for fine-grained per-endpoint checks
- Roles and permission sets are fully manageable at runtime via the Roles API

### 3. Employee Directory & Lifecycle
- Sequential, zero-collision Employee ID generation (`SV-000001`)
- Full CRUD with profile fields: name, contact, avatar, department, team, position, work schedule
- Status transitions: `Active → Suspended → Deactivated`
- Aggregate stats endpoint: headcount, department breakdown, attendance rate
- Invitation token dispatched server-side only — never returned in response body

### 4. Attendance & Shift Tracking
- Daily `check-in` / `check-out` with GPS coordinates
- Multi-interval break tracking with automatic working-minutes and break-minutes calculation
- Work schedules: configurable recurring weekly shifts (start time, end time, working days)
- IDOR protection: employees can only modify their own attendance records
- Today's attendance summary endpoint for the mobile dashboard

### 5. Leave Management
- Employee self-service leave application (`Casual`, `Sick`, `Annual`)
- Manager review queue: `Approve`, `Reject`, `Cancel` actions
- Leave history and status tracking per employee

### 6. Tasks & Sprints
- Assign tasks to employees or teams with priority: `Urgent`, `High`, `Medium`, `Low`
- Kanban status transitions: `To Do → In Progress → Done`
- Overdue task detection and bulk status updates

### 7. Support & Helpdesk Ticketing
- Categorised ticket creation: `XR Hardware`, `IT Support`, `HR`, `Facilities`
- Threaded conversation messages per ticket
- Resolution workflow: `Open → Resolved`

### 8. Reports & Cloud Storage
- Multipart file upload for incident reports and shift documentation
- Files stored in **Supabase Storage** with signed URL access
- Report reviewer / approval workflows

### 9. Notifications
- In-app notification creation and read tracking
- FCM/APNs push device token registration for mobile push delivery

### 10. Audit Logging
- Every significant action (login, role change, employee update, leave approval) is auto-logged
- Paginated audit trail API with timestamp, actor, action type, and target resource
- Restricted to `Super Admin` and `Admin` roles

---

## Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | [NestJS 11](https://nestjs.com/) |
| **Language** | TypeScript 5.7 |
| **Database** | MongoDB via [Mongoose 9](https://mongoosejs.com/) + Atlas |
| **Authentication** | Passport.js (`passport-jwt`, `passport-github2`) |
| **Password Hashing** | `bcryptjs` (12+ salt rounds) |
| **OTP / 2FA** | `crypto.randomInt()` — Cryptographically Secure PRNG |
| **Validation** | `class-validator` + `class-transformer` |
| **Cloud Storage** | Supabase Storage (`@supabase/supabase-js`) |
| **API Docs** | Swagger / OpenAPI 3.0 (`@nestjs/swagger`) |
| **Rate Limiting** | `@nestjs/throttler` |
| **Security Headers** | `helmet` |
| **Containerisation** | Docker (multi-stage, non-root, `dumb-init`) |
| **Orchestration** | Kubernetes (Deployment, HPA, Ingress, ConfigMap, Secret) |
| **Unique IDs** | `uuid` |
| **Testing** | Jest + Supertest |

---

## Project Structure

```
Safe-vitalXR-Backend/
├── src/
│   ├── access-requests/    # Formal elevated permission request workflows
│   ├── attendance/         # Check-in, check-out, breaks, GPS location
│   ├── audit/              # Immutable audit log (auto-recorded, admin-only read)
│   ├── auth/               # JWT, OTP 2FA, GitHub OAuth, invitations, sessions
│   │   ├── dto/            # Login, OTP, setup-password DTOs
│   │   ├── guards/         # JWT auth guard
│   │   ├── schemas/        # Invitation, OTP, Session Mongoose schemas
│   │   └── strategies/     # Passport JWT & GitHub strategies (role-aware)
│   ├── common/
│   │   ├── config/         # ENV validation schema (Joi)
│   │   ├── decorators/     # @CurrentUser, @Permissions, @Public, @Roles
│   │   ├── filters/        # Global exception filter (sanitised error responses)
│   │   ├── guards/         # RolesGuard, PermissionsGuard
│   │   ├── middleware/     # X-Request-ID injection middleware
│   │   └── services/       # Supabase storage service
│   ├── departments/        # Department CRUD + archive
│   ├── employees/          # Employee directory, stats, lifecycle transitions
│   ├── health/             # Health check endpoint (liveness + DB probe)
│   ├── leave/              # Leave application + manager review workflow
│   ├── mobile/             # Unified mobile dashboard aggregator (single round-trip)
│   ├── notifications/      # In-app notifications + push device tokens
│   ├── positions/          # Job positions and levels
│   ├── reports/            # File upload reports + reviewer approval
│   ├── roles/              # RBAC roles and permission set management
│   ├── schedules/          # Work shift schedule configuration
│   ├── tasks/              # Task assignment + Kanban status transitions
│   ├── teams/              # Team groupings under departments
│   ├── tickets/            # Support tickets + threaded messages
│   ├── users/              # Core user identity and password management
│   ├── app.module.ts       # Root NestJS module
│   ├── main.ts             # Entry point (Swagger, CORS, Helmet, Shutdown hooks)
│   └── seed.ts             # Database seeder (roles, departments, default admin)
├── k8s/                    # Kubernetes manifests
│   ├── namespace.yaml
│   ├── deployment.yaml     # 2-replica Deployment + probes + resource limits
│   ├── service.yaml        # ClusterIP Service
│   ├── ingress.yaml        # NGINX Ingress + TLS
│   ├── hpa.yaml            # HorizontalPodAutoscaler (2–10 replicas)
│   ├── configmap.yaml      # Non-secret config
│   └── secret.example.yaml # Secret template (NEVER commit with real values)
├── test/                   # End-to-end tests
├── Dockerfile              # Multi-stage, non-root, dumb-init production image
├── .dockerignore
├── .env.example            # Environment variables template
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** v18+ (v20 LTS recommended)
- **MongoDB** — Local instance or [MongoDB Atlas](https://www.mongodb.com/atlas) cloud cluster
- **npm** v9+
- **Docker** (optional, for containerised runs)

### 1. Install Dependencies

```bash
cd Safe-vitalXR-Backend
npm install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Fill in your values — see [Environment Variables](#environment-variables) below.

### 3. Seed the Database

Initialize the database with default roles, departments, positions, and the Super Admin account:

```bash
npx ts-node -r tsconfig-paths/register src/seed.ts
```

> **Default Super Admin Credentials after seeding:**
> - Email: value from `SUPERADMIN_EMAIL` in `.env`
> - Default password: `Password123!`
>
> ⚠️ Change this password immediately after first login in production.

---

## Environment Variables

All variables are validated at startup via a Joi schema. The server **refuses to start** if required values are missing or malformed.

```env
# ─── Server ───────────────────────────────────────────────────────────────────
PORT=4000
NODE_ENV=development

# ─── Database ─────────────────────────────────────────────────────────────────
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/safevitals

# ─── Security ─────────────────────────────────────────────────────────────────
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
SESSION_SECRET=CHANGE_ME_USE_LONG_RANDOM_STRING_IN_PRODUCTION
OTP_SECRET=CHANGE_ME_OTP_SECRET

# ─── CORS ─────────────────────────────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
# ALLOWED_ORIGINS=https://app.safevitals.com,https://admin.safevitals.com

# ─── Supabase Storage ─────────────────────────────────────────────────────────
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# ─── Email ────────────────────────────────────────────────────────────────────
EMAIL_FROM=noreply@safevitals.com
EMAIL_PROVIDER_KEY=your_email_api_key

# ─── GitHub OAuth (optional) ──────────────────────────────────────────────────
GITHUB_CLIENT_ID=your_github_app_client_id
GITHUB_CLIENT_SECRET=your_github_app_client_secret
GITHUB_CALLBACK_URL=http://localhost:4000/api/auth/github/callback

# ─── Seeding ──────────────────────────────────────────────────────────────────
SUPERADMIN_EMAIL=admin@safevitals.com
```

> ⚠️ **Never commit your `.env` file.** It is in `.gitignore`. Use `.env.example` as the template.

---

## Running the Server

```bash
# Development mode (auto-reload on file changes)
npm run start:dev

# Production build + run
npm run build
npm run start:prod
```

Once running:

| Endpoint | URL |
| :--- | :--- |
| **API Base URL** | `http://localhost:4000/api` |
| **Swagger Docs** | `http://localhost:4000/api/docs` |
| **Health Check** | `http://localhost:4000/api/health` |

---

## Docker

### Build the Image

```bash
docker build -t safevitals-backend:latest .
```

### Run the Container

```bash
docker run -d \
  --name safevitals-backend \
  -p 4000:4000 \
  --env-file .env \
  safevitals-backend:latest
```

The Dockerfile uses a **multi-stage build**:

- **Stage 1 (builder)** — Compiles TypeScript and prunes devDependencies
- **Stage 2 (runner)** — Copies only `dist/` + production `node_modules` into a clean Alpine image

Security properties:

- Runs as the non-root **`node`** user
- Uses **`dumb-init`** as PID 1 for correct SIGTERM signal forwarding and graceful shutdown
- No source code, test files, or `.env` in the final image

---

## Kubernetes Deployment

All manifests live in [`k8s/`](k8s/).

### Quick Deploy

```bash
# 1. Create namespace
kubectl apply -f k8s/namespace.yaml

# 2. Create secrets (fill in secret.example.yaml — NEVER commit real values)
cp k8s/secret.example.yaml k8s/secret.yaml
# ... edit k8s/secret.yaml with base64-encoded values ...
kubectl apply -f k8s/secret.yaml -n safevitals

# 3. Apply remaining manifests
kubectl apply -f k8s/configmap.yaml  -n safevitals
kubectl apply -f k8s/deployment.yaml -n safevitals
kubectl apply -f k8s/service.yaml    -n safevitals
kubectl apply -f k8s/ingress.yaml    -n safevitals
kubectl apply -f k8s/hpa.yaml        -n safevitals
```

---

## API Reference

| Module | Route Prefix | Key Endpoints |
| :--- | :--- | :--- |
| **Auth** | `/api/auth` | `POST /login`, `POST /verify-otp`, `POST /setup-password`, `POST /resend-otp`, `GET /me`, `POST /logout`, `GET /github` |
| **Employees** | `/api/employees` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `PATCH /:id/suspend`, `DELETE /:id`, `GET /stats` |
| **Attendance** | `/api/attendance` | `POST /check-in/:id`, `POST /check-out/:id`, `POST /break-start/:id`, `POST /break-end/:id`, `GET /me/today` |
| **Leave** | `/api/leave` | `GET /`, `POST /`, `PATCH /:id/review`, `PATCH /:id/cancel` |
| **Tasks** | `/api/tasks` | `GET /`, `POST /`, `PUT /:id`, `PATCH /:id/status`, `DELETE /:id` |
| **Tickets** | `/api/tickets` | `GET /`, `POST /`, `POST /:id/messages`, `PATCH /:id/resolve` |
| **Reports** | `/api/reports` | `POST /`, `GET /`, `PATCH /:id/review` |
| **Roles** | `/api/roles` | `GET /`, `POST /`, `PUT /:id`, `PATCH /:id/permissions` |
| **Audit Logs** | `/api/audit` | `GET /` (paginated, Admin+ only) |
| **Mobile** | `/api/mobile` | `GET /dashboard` (aggregated state) |
| **Health** | `/api/health` | `GET /` (liveness probe) |

---

## Authentication Flow

1. **Login**: `POST /api/auth/login` → Server validates credentials → generates CSPRNG OTP → sends to email.
2. **Verify**: `POST /api/auth/verify-otp` → Returns `{ accessToken, user }`.
3. **Protected**: Include `Authorization: Bearer <accessToken>` header.

---

## RBAC — Roles & Permissions

- **Roles**: `Super Admin`, `HR Admin`, `Operations Manager`, `Standard Employee`.
- **Enforcement**: `RolesGuard` + `@Roles()` on all protected controllers.
- **Runtime-configurable**: Permissions are managed via the Roles API without redeploying.

---

## Security Architecture

- **OTP**: CSPRNG via `crypto.randomInt()`.
- **Hashing**: `bcryptjs` (12+ rounds).
- **Validation**: Global `ValidationPipe` with strict whitelisting.
- **Hardening**: `helmet`, rate limiting, IDOR ownership checks, non-root Docker execution.

---

## Testing

```bash
npm test          # Unit
npm run test:e2e  # E2E
```

---

## Frontend

The SafeVitals XR Frontend is a separate Next.js 16 application that connects to this backend at `http://localhost:4000/api`.

- **Frontend Repository**: `Safevital XR-frontend/`
- **Dev URL**: `http://localhost:3000`
- **Offline Mode**: Full offline standalone operation using Zustand + localStorage persistence — attendance, tasks, leave, and tickets are cached locally if the API is unreachable.

---

## License

This project is proprietary and confidential.  
**Property of Safe Vitals XR Inc.** — All Rights Reserved.
