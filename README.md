# CRESENIX SOLUTIONS — Internal Company Management System

> **Full-Stack Enterprise Management System**  
> **Frontend**: Angular 19+ · TypeScript · Angular Material · Modern Glassmorphism & Tokens  
> **Backend**: Go (Golang) · Chi Router · PostgreSQL · pgxpool · JWT Authentication  

---

## Overview

CRESENIX Solutions is an internal company operations portal organized into three core operational pillars:

1. **Task Management**: Workload tracking, Kanban boards, priority filters, checklists, and collaboration comments.
2. **Project Pipeline**: End-to-end stage tracking (Proposed → Planning → In Progress → Testing → Client Review → Delivered), milestone management, and risk mitigation.
3. **Meeting Management**: Schedule meetings, Google Meet / video links, agenda tracking, automated meeting minutes, and conversion of action items into tasks.

### User Roles
- **Super Admin**: Company-wide executive dashboard, team workload visibility, user administration, system-level audits.
- **Admin**: Project oversight, task assignments, review approvals, team workload monitoring.
- **Employee**: Focused work dashboard, personal task list, Kanban board, assigned meeting participation.

---

## Directory Organization

```
Employee_managment/
├── backend/                     # Dedicated Go (Golang) REST API
│   ├── cmd/api/main.go          # Server entry point
│   ├── db/migrations/           # PostgreSQL migrations (001 - 007)
│   ├── db/seed.sql              # Database seed script with 8 users across 3 roles
│   ├── internal/                # Domain packages (auth, projects, tasks, meetings, users, teams)
│   ├── Dockerfile               # Multi-stage production container
│   ├── Makefile                 # Build, run, test, and seed tasks
│   └── README.md                # Dedicated backend documentation
│
├── src/                         # Angular Frontend
│   ├── app/
│   │   ├── core/                # Auth, services, guards, interceptors, layout (app shell)
│   │   ├── features/            # Feature pages (dashboards, projects, tasks, meetings, employees)
│   │   └── shared/              # Reusable UI components, models, tokens
│   ├── environments/            # API environment configurations
│   └── styles.scss              # Global design system & theme tokens
│
├── angular.json                 # Angular CLI workspace config
├── package.json                 # Node dependencies & frontend scripts
└── README.md                    # Project root documentation
```

---

## Quick Start

### 1. Run the Backend (Go + PostgreSQL)

```bash
# Navigate to backend directory
cd backend

# Create database (PostgreSQL running locally)
createdb cresenix_db

# Run migrations and seed sample data
psql -d cresenix_db -f db/seed.sql

# Start the Go API server (runs on http://localhost:8080)
make run
# Or: go run ./cmd/api/...
```

Verify backend health:
```bash
curl http://localhost:8080/api/v1/health
# {"service":"cresenix-backend","status":"ok"}
```

---

### 2. Run the Frontend (Angular)

From the project root:

```bash
# Install dependencies
npm install

# Start development server
npm start
# Or: npx ng serve --port 8765
```

Open your browser to: **`http://localhost:8765`**

---

## Default Demo Credentials

All test accounts share the password: **`Admin@123`**

| Role | Email | Name | Designation |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@cresenix.com` | Super Admin | System Administrator |
| **Super Admin** | `superadmin@cresenix.com` | Rahul Sharma | CEO |
| **Admin** | `priya@cresenix.com` | Priya Mehta | Project Manager |
| **Admin** | `vikram@cresenix.com` | Vikram Singh | Engineering Lead |
| **Employee** | `arjun@cresenix.com` | Arjun Patel | Senior Developer |
| **Employee** | `kavita@cresenix.com` | Kavita Nair | UI/UX Designer |
| **Employee** | `ravi@cresenix.com` | Ravi Kumar | QA Engineer |
| **Employee** | `sneha@cresenix.com` | Sneha Joshi | Backend Developer |

---

## Key System Features

- **JWT Authentication & Refresh Tokens**: Secure token rotation with HTTP interceptor auto-refresh.
- **PostgreSQL Persistence**: 7 schema migrations covering users, roles, teams, projects, tasks, meetings, minutes, action items, notifications, and activity logs.
- **Robust Offline Fallback**: Angular services gracefully fall back to local mock data if the backend is ever offline.
- **Modern Responsive UI**: Custom design tokens, high-contrast dark accents, responsive sidebar navigation, breadcrumbs, search, and role switcher for demo testing.
