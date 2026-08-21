# Safe Vitals XR — Backend API Server

<p align="center">
  <img src="https://nestjs.com/img/logo-small.svg" width="100" alt="Nest Logo" />
</p>

<p align="center">
  <strong>Production-Grade Workforce Management, Mobile Operations & Security Platform Backend</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/NestJS-11.0-E0234E?style=flat&logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-5.7-blue?style=flat&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=flat&logo=mongodb" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Auth-JWT%20%2B%20OTP%20%2B%20OAuth-F97316?style=flat" alt="Authentication" />
  <img src="https://img.shields.io/badge/Docs-Swagger%20%2F%20OpenAPI-85EA2D?style=flat&logo=swagger" alt="Swagger" />
</p>

---

## 📌 About The Project

**Safe Vitals XR Backend** is an enterprise-grade backend service built to power workforce management, employee administration, field workforce operations, and organizational security. 

It provides an end-to-end suite of RESTful APIs designed for both **modern web dashboards** and **cross-platform mobile applications** (React Native, Flutter, iOS, Android, and PWAs).

---

## 🚀 Key Features

### 📱 1. Mobile-First & Field Workforce Operations
- **Single-Roundtrip Mobile Dashboard (`/api/mobile/dashboard`)**: Aggregates employee profile, real-time clock-in/out status, today's schedule, pending tasks, and unread notifications into one fast request to minimize mobile battery and data consumption.
- **GPS Geolocation & Device Telemetry**: Mobile punch-in/out tracking capturing latitude, longitude, accuracy, reverse-geocoded address, and device metadata (iOS/Android platform, OS version, device ID).
- **Push Notification Token Management**: Endpoints to register/unregister FCM, APNs, and Expo push tokens for instant mobile alerts.
- **Touch-Friendly Swagger UI**: Responsive dark-themed API explorer at `/api/docs` optimized for mobile screens and tablets.

### 🔐 2. Enterprise Authentication & Security
- **Multi-Factor Authentication (2FA / OTP)**: Email-based OTP challenge flow for secure logins.
- **OAuth2 Integration**: GitHub OAuth authentication flow.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions per role (Super Admin, HR Admin, Manager, Employee, etc.).
- **Invitation Onboarding**: Secure tokenized onboarding for newly registered staff with permanent password setup.
- **Session & Identity Management**: JWT bearer tokens, active session revocation, and automated account suspension/reactivation.

### 👥 3. Workforce & Organization Structure
- **Atomic Employee ID Generation**: Sequential, zero-collision employee IDs (`EMP-000001`).
- **Hierarchical Modeling**: Departments, teams, positions, and direct manager reporting structures.
- **Employee Lifecycle**: Profile management, work schedule linking, status transitions (`ACTIVE`, `SUSPENDED`, `DEACTIVATED`).

### ⏱️ 4. Attendance, Leave & Shift Scheduling
- **Shift Attendance**: Daily check-in, check-out, multi-interval break tracking, and automatic working/break minute calculations.
- **Work Schedules**: Customizable recurring weekly shift schedules (start/end times, working days).
- **Leave Management**: Leave requests with full manager review workflows (Approve, Reject, Cancel).

### 📋 5. Operations, Tasks & Support Tickets
- **Task Management**: Assign tasks to employees or teams with priority and status transitions (`To Do`, `In Progress`, `Done`).
- **Support Ticketing**: Internal ticketing with threaded conversation messages and status resolution.
- **Access Requests**: Formal requests for elevated software/hardware system permissions.

### 📊 6. Reports, Cloud Storage & Audit Trail
- **Cloud File Attachments**: Multipart/form-data file uploads powered by **Supabase Storage**.
- **Report Approvals**: Multi-attachment incident or shift reports with reviewer workflows.
- **Immutable Audit Logging**: Automatic audit trail recording security and data modification events.

---

## 🛠️ Technology Stack

- **Framework**: [NestJS 11](https://nestjs.com/) (Node.js framework)
- **Language**: TypeScript 5.7
- **Database & ODM**: MongoDB with [Mongoose 9](https://mongoosejs.com/)
- **Authentication**: Passport.js (`passport-jwt`, `passport-github2`, `bcryptjs`)
- **Validation**: `class-validator` & `class-transformer`
- **Cloud Storage**: `@supabase/supabase-js`
- **Documentation**: `@nestjs/swagger` (OpenAPI 3.0)
- **Security & Reliability**: `@nestjs/throttler` (Rate limiting), `helmet`, custom Global Exception Filter, Request ID middleware

---

## 📁 Project Structure

```text
Safe-vitalXR-Backend/
├── src/
│   ├── access-requests/    # System access request workflows
│   ├── attendance/         # Check-in/out, breaks, GPS geolocation
│   ├── audit/              # Immutable audit logging
│   ├── auth/               # JWT, OTP, GitHub OAuth, invitation activation
│   ├── common/             # Global filters, middlewares, decorators, storage service
│   ├── departments/        # Department hierarchy
│   ├── employees/          # Employee directory, stats, lifecycle
│   ├── leave/              # Leave applications and approvals
│   ├── mobile/             # Unified mobile dashboard aggregator
│   ├── notifications/      # Notifications and push device tokens
│   ├── positions/          # Job positions and levels
│   ├── reports/            # File uploads and report submissions
│   ├── roles/              # RBAC roles and permissions
│   ├── schedules/          # Shift work schedules
│   ├── tasks/              # Task tracking and assignment
│   ├── teams/              # Team groupings under departments
│   ├── tickets/            # Support tickets & messaging
│   ├── users/              # Core user identity & password security
│   ├── app.module.ts       # Root module configuration
│   ├── main.ts             # Application entry point, Swagger, CORS
│   └── seed.ts             # Database seeder (roles, admin, defaults)
├── test/                   # End-to-end and integration tests
├── .env.example            # Environment variables template
└── package.json            # Dependencies and scripts
```

---

## ⚙️ Getting Started

### Prerequisites
- **Node.js**: v18 or higher (v20+ recommended)
- **MongoDB**: Local MongoDB server or MongoDB Atlas cluster connection string

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Environment Variables Configuration
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your settings:
```env
# Server
PORT=4000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/safevitals

# JWT & Session Secret
SESSION_SECRET=your_super_secret_random_jwt_key_here

# (Optional) Supabase Storage for Report Attachments
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# (Optional) GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:4000/api/auth/github/callback
FRONTEND_URL=http://localhost:3000
```

### 3. Database Seeding
Initialize the database with default roles, departments, positions, and a default Super Admin account:
```bash
npx ts-node -r tsconfig-paths/register src/seed.ts
```

> **Default Seeded Admin Credentials:**
> - **Email**: `admin@safevitals.com`
> - **Password**: `Password123!`

---

## 🏃 Running The Server

```bash
# Development (with auto-reload on file changes)
npm run start:dev

# Production Build & Run
npm run build
npm run start:prod
```

Once running:
- **API Root**: `http://localhost:4000/api`
- **Interactive Swagger Documentation**: `http://localhost:4000/api/docs`

---

## 📚 API Reference Overview

| Module | Route Prefix | Method Highlights |
| :--- | :--- | :--- |
| **Mobile** | `/api/mobile` | `GET /dashboard` (Single round-trip aggregated mobile state) |
| **Auth** | `/api/auth` | `POST /login`, `POST /verify-otp`, `POST /setup-password`, `GET /me`, `GET /github` |
| **Employees** | `/api/employees` | `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `PATCH /:id/suspend`, `GET /stats` |
| **Attendance** | `/api/attendance` | `POST /check-in/:id` (with GPS), `POST /check-out/:id`, `POST /break-start/:id`, `GET /me/today` |
| **Notifications**| `/api/notifications`| `GET /`, `PATCH /:id/read`, `POST /device-token` (FCM/APNs), `DELETE /device-token/:token` |
| **Leave** | `/api/leave` | `POST /` (Apply), `PATCH /:id/review` (Approve/Reject), `PATCH /:id/cancel` |
| **Tasks** | `/api/tasks` | `GET /`, `POST /`, `PUT /:id`, `PATCH /:id/status` |
| **Tickets** | `/api/tickets` | `GET /`, `POST /`, `POST /:id/messages`, `PATCH /:id/resolve` |
| **Reports** | `/api/reports` | `POST /` (Multipart upload with Supabase), `PATCH /:id/review` |
| **Schedules** | `/api/schedules` | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id` |
| **Roles & RBAC**| `/api/roles` | `GET /`, `POST /`, `PATCH /:id/permissions` |
| **Departments**| `/api/departments` | `GET /`, `POST /`, `PUT /:id`, `PATCH /:id/archive` |
| **Teams** | `/api/teams` | `GET /`, `POST /`, `PUT /:id`, `PATCH /:id/archive` |
| **Positions** | `/api/positions` | `GET /`, `POST /`, `PUT /:id` |
| **Audit Logs** | `/api/audit` | `GET /` (Paginated security audit trail) |

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Test coverage
npm run test:cov
```

---

## 📄 License
This project is proprietary and confidential to Safe Vitals XR.
