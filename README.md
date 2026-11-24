# ZIP Game — Full-Stack Puzzle Application

**Universidad Tecnológica de Durango (UTD)**  
**Course:** Development for Smart Devices (*Desarrollo para Dispositivos Inteligentes*) — Group 10°A BIS  
**Instructor:** Eng. Luis Ángel Martínez Vargas

A full-stack implementation of the **ZIP** logic puzzle game built with **Flutter**, **AdonisJS 6 (TypeScript)**, and **MySQL 8**. Players connect numbered checkpoints in ascending order across a $6 \times 6$ grid using a single continuous orthogonal path that visits every cell exactly once, with full server-side validation, procedural level generation, smart hints, scoring, and adaptive difficulty.

---

## Repository Structure

```text
zip_game/
├── database/                  # SQL setup, schema reference, and verification queries
│   ├── 01_create_database.sql
│   ├── 02_schema_reference.sql
│   └── 03_useful_queries.sql
├── zip_game_api/              # AdonisJS 6 REST API (TypeScript + Lucid ORM + Japa tests)
├── zip_game_frontend/         # Flutter client (Clean Architecture / feature-first)
└── README.md
```

---

## Tech Stack

* **Frontend:** Flutter, Dart, Material 3 (`material_ui`), `http`, `shared_preferences`
* **Backend:** AdonisJS 6, TypeScript, Lucid ORM, VineJS, Bearer Access Tokens
* **Database:** MySQL 8 (`users`, `auth_access_tokens`, `levels`, `game_sessions`, `game_moves`, `scores`)
* **Testing:** Japa (backend unit & functional tests), `flutter_test` (frontend tests)

---

## Architecture Overview

| Tier | Stack | Organization |
| :--- | :--- | :--- |
| **Frontend** | Flutter + Dart | Feature-first layered architecture (`presentation`, `domain`, `data`) + `core/` and `app/` |
| **Backend** | AdonisJS 6 + TypeScript | `controllers/` -> `validators/` -> `services/` -> `repositories/` -> `models/` |
| **Database** | MySQL 8 (`mysql2`) | Normalized relational schema managed via Lucid ORM migrations and seeders |

### Key Features

* **Authentication & Security:** User registration (`fullName`, `email`, `password`), login, logout, hashed passwords, Bearer access tokens, VineJS input validation, and protected API routes.
* **Levels & Procedural Generation:** Server-hosted $6 \times 6$ puzzles filtered by difficulty (`easy`, `medium`, `hard`), completion status tracking, and procedural generation of guaranteed-solvable boards.
* **Server-Authoritative Gameplay:** Path validation, smart hints, elapsed-time tracking, score computation, and adaptive difficulty recommendations handled by the backend.
* **Profile, History & Leaderboard:** Personal statistics, session history, and global player ranking ordered by total points, completed levels, and average completion time.

---

## Prerequisites

* **Node.js** 20+ and **npm**
* **MySQL Server** 8.x
* **Flutter SDK** 3.x and **Dart SDK**
* **Google Chrome** (for Web) or an **Android emulator / device**

---

## Installation & Setup

### 1. Database Setup (MySQL 8)

Run the initialization script located in `database/01_create_database.sql` using your MySQL client to create the database and user credentials.

### 2. Backend Setup (`zip_game_api`)

```bash
cd zip_game_api
npm install
```

Copy `.env.example` to `.env` and configure your MySQL connection variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`) and `APP_KEY`. Never commit `.env` to version control.

Run migrations and seed initial levels and demo users:

```bash
node ace migration:run
node ace db:seed
```

Start the API development server:

```bash
node ace serve --hmr
```

The API runs by default at `http://localhost:3333` (health check at `GET /`, API prefix at `/api`).

### 3. Frontend Setup (`zip_game_frontend`)

```bash
cd zip_game_frontend
flutter pub get
```

Run the application (with the backend running on port `3333`):

```bash
# Web (Chrome)
flutter run -d chrome

# Android Emulator (override API URL to reach host localhost)
flutter run --dart-define=API_URL=http://10.0.2.2:3333/api
```

---

## API Endpoints Overview

Base URL: `http://localhost:3333/api`

| Module | Method | Endpoint | Auth | Description |
| :--- | :---: | :--- | :---: | :--- |
| Health | `GET` | `/` | No | Service health status |
| Auth | `POST` | `/api/auth/register` | No | Register a new user (`fullName`, `email`, `password`) |
| Auth | `POST` | `/api/auth/login` | No | Authenticate and receive a Bearer token |
| Auth | `GET` | `/api/auth/me` | Yes | Return authenticated user data |
| Auth | `POST` | `/api/auth/logout` | Yes | Revoke current access token |
| Levels | `GET` | `/api/levels` | Yes | List levels with user completion status (optional `?difficulty=`) |
| Levels | `GET` | `/api/levels/recommended` | Yes | Get adaptive recommended difficulty |
| Levels | `POST` | `/api/levels/generate` | Yes | Procedurally generate and persist a valid level |
| Levels | `GET` | `/api/levels/:id` | Yes | Retrieve a single level without its solution |
| Sessions | `POST` | `/api/sessions` | Yes | Start a new game session |
| Sessions | `GET` | `/api/sessions/:id` | Yes | Retrieve session details |
| Sessions | `POST` | `/api/sessions/:id/moves` | Yes | Record and validate player moves |
| Sessions | `POST` | `/api/sessions/:id/hint` | Yes | Request a server-computed hint |
| Sessions | `POST` | `/api/sessions/:id/complete` | Yes | Submit and validate full path to compute score |
| Sessions | `POST` | `/api/sessions/:id/abandon` | Yes | Mark an active session as abandoned |
| Profile | `GET` | `/api/profile` | Yes | Get user stats and adaptive difficulty |
| History | `GET` | `/api/history` | Yes | Retrieve recent game session history |
| Leaderboard | `GET` | `/api/leaderboard` | Yes | Get global ranking ordered by points, levels, and average time |

---

## Running Automated Tests

**Backend (Japa):**

```bash
cd zip_game_api
node ace test
```

**Frontend (Flutter):**

```bash
cd zip_game_frontend
flutter analyze lib
flutter test
```

---

## Team Contributions
° *Ángel Geovany Arenas Reta*

° *Maria Fernanda Guerrero Calderón*

° *Jesús Ramiro Rivera Bracho*

° *César Fernando Sarmiento Solís*

° *Leonardo Vallejo Herrera*


* **Ángel Geovany Arenas Reta (Commits 01–05):** AdonisJS 6 initialization, MySQL configuration, migrations, Lucid models, repositories, and seeders.
* **Jesús Ramiro Rivera Bracho (Commits 06–10):** $6 \times 6$ board utilities, path validation, DFS/backtracking solver, procedural level generator, hints, scoring, and adaptive difficulty.
* **Leonardo Vallejo Herrera (Commits 11–15):** VineJS validators, auth middleware, REST controllers, routes, profile, history, leaderboard, and backend API tests.
* **Maria Fernanda Guerrero Calderón (Commits 16–20):** Flutter layered architecture, API client, token storage, authentication layers and screens, home, levels, profile, leaderboard, navigation, and project `README.md`.
* **César Fernando Sarmiento Solís (Commits 21–25):** ZIP game domain rules, remote game repository, game controller, interactive $6 \times 6$ board UI, HUD, results, integration tests, and technical documentation.
