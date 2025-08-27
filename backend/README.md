### 🛠️ Backend — `README_BACKEND.md`

```markdown
# Backend - Skill Assessment Portal

## Tech Stack
- Node.js + Express + TypeScript
- MySQL (with migrations & seed)
- JWT Authentication (HttpOnly cookies)
- CSRF Protection + Rate Limiting + Helmet
- Docker optional

## Features
- User registration/login (bcrypt hashed passwords).
- Role-based authorization (Admin/User).
- Manage skills, questions, and quiz attempts.
- Generate performance reports (weekly, monthly, overall).
- Secure API endpoints with validation.

## Setup
```bash
cd backend
npm install
npm run dev
Runs at: http://localhost:4000

Environment Variables
Create .env file:

ini
Copy code
PORT=4000
DATABASE_URL=mysql://root:password@localhost:3306/skill_portal
JWT_SECRET=supersecret
CORS_ORIGIN=http://localhost:5173
Database
Create DB:

sql
Copy code
CREATE DATABASE skill_portal;
Run seed:

bash
Copy code
npm run seed
Docker (Optional)
Build and run backend in Docker:

bash
Copy code
docker build -t quiz-backend .
docker run -p 4000:4000 quiz-backend
Routes Overview
POST /api/auth/register – Register user

POST /api/auth/login – Login

POST /api/auth/logout – Logout

GET /api/auth/me – Current user

GET /api/skills – Skills list

GET /api/questions – Questions by skill

POST /api/quiz/attempts – Submit attempt

GET /api/reports/user/:id/performance – User performance