# Frontend - Skill Assessment Portal

## Tech Stack
- React + TypeScript (Vite)
- Redux (state management)
- shadcn/ui + Tailwind CSS
- Axios with interceptor (auto refresh JWT)
- Recharts (charts & reports)

## Features
- Login, Register, Logout (JWT cookies).
- Protected routes for Users & Admin.
- Dashboard with quizzes, attempts, and performance reports.
- Admin inline management for users, skills, and questions.
- Modern responsive UI with theme toggle.

## Setup
```bash
cd frontend
npm install
npm run dev
App runs at: http://localhost:5173

Environment Variables
Create .env file:

ini
Copy code
VITE_API_URL=http://localhost:4000
Deployment
Deploy on Vercel or Netlify.

For React Router: configure SPA fallback (/* → /index.html) in hosting platform.