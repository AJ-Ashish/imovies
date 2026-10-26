# IMovies - Movie Ticket Booking (MERN)

React (Vite) + Express + MongoDB + JWT auth.

## Run locally
1. Edit `server/.env` and set `MONGO_URI` (MongoDB Atlas free cluster, or `mongodb://127.0.0.1:27017/imovies`) and `JWT_SECRET`.
2. `cd server && npm install && npm start`   (runs on :5000, seeds demo movies on first start)
3. `cd client && npm install && npm run dev` (runs on :5173)

Admin login: `admin@imovies.com` / `admin123` (change after first deploy).

## Deploy (single service, e.g. Render)
- Build command: `npm run build`
- Start command: `npm start`
- Env vars: `MONGO_URI`, `JWT_SECRET`
Express serves the built React app, so no separate frontend host is needed.

## Features
Signup/login (JWT), movie list + search, show times by day, seat map with live "already booked" checks,
booking with total price, my bookings with cancel, admin add-movie (auto-creates shows).

## Tech stack (matches the course brief)
React.js, Bootstrap 5, HTML/CSS/JS, Node.js (18+), Express.js, MongoDB (Mongoose), JWT, async/await.

## API (test in Postman)
| Method | Route | Auth |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | - |
| GET | /api/movies, /api/movies/:id | - |
| POST | /api/movies | admin |
| GET | /api/shows/:id (seat availability, refreshed every 5s in the UI) | - |
| POST | /api/bookings | user |
| GET | /api/bookings/mine | user |
| DELETE | /api/bookings/:id | user |

## Submission on SkillWallet
- Demo Link: your deployed Render URL
- GitHub Link: your repository URL
