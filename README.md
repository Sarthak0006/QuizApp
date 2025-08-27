# Skill Assessment & Reporting Portal

A full-stack quiz platform with authentication, admin dashboard, skill-based quizzes, and performance reporting.

## Features
- User registration & login with JWT (HttpOnly cookies).
- Multi-role access (Admin / User).
- Quiz system with question bank, attempts, and scoring.
- Admin dashboard to manage users, skills, and questions.
- Performance reports (user progress, skill gaps, charts).
- Secure REST API with CSRF, CORS, and rate limiting.
- Responsive modern UI (React + shadcn/ui).

## Tech Stack
- **Frontend:** React, Vite, Redux, TypeScript, shadcn/ui, Recharts.
- **Backend:** Node.js, Express, TypeScript, MySQL.
- **Database:** MySQL with normalized schema.
- **Auth:** JWT (Access + Refresh), bcrypt password hashing.
- **Deployment:** Vercel (Frontend), Docker/Node (Backend).

## Project Structure
code/
├── backend/ # Node.js + Express server
├── frontend/ # React + Vite app
├── sql/ # Database migrations & seed
└── README.md # This file

markdown
Copy code

## Getting Started
- See [README_BACKEND.md](./backend/README.md) for backend setup.
- See [README_FRONTEND.md](./frontend/README.md) for frontend setup.