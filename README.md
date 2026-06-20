# StreamFlix

Netflix-style movie & series streaming platform with user accounts, favorites, watchlist, and progress tracking.

## Coolify Deployment

### 1. Push to GitHub (already done)

### 2. Create Application in Coolify

1. **Applications** → **+ New** → **Git Based** → **GitHub**
2. Select repo: `kamal7788/movie-app`, branch: `main`
3. **Build Pack:** Dockerfile
4. **Port:** `3000`

### 3. Set Environment Variables

Only 2 variables needed:

| Key | Value |
|---|---|
| `TMDB_API_KEY` | Your TMDB API Read Access Token from [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) |
| `JWT_SECRET` | Any random string, e.g. `openssl rand -hex 32` |

### 4. Deploy

Click **Deploy**. PostgreSQL is included in the compose file - no separate database setup needed.

---

## Features

- Netflix-like dark UI
- TMDB-powered movie & TV listings
- Streaming service filters (Netflix, Disney+, etc.)
- Genre, year, rating, sort filters
- VidKing.net embedded player
- User accounts (register/login)
- Favorites & watchlist
- Continue watching with progress tracking
- D-pad/remote control navigation for projectors & TVs
- Responsive (desktop, mobile, tablet, TV)

## Tech Stack

- Node.js + Express
- PostgreSQL (bundled in docker-compose)
- JWT auth
- TMDB v3 API + VidKing.net player
- Docker
