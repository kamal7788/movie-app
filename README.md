# StreamFlix Pro - Enhanced Movie & TV Streaming App

## Quick Start for Coolify Deployment

### 1. Environment Variables (set in Coolify)
```
TMDB_API_KEY=your_tmdb_api_key_here
JWT_SECRET=your_super_secret_jwt_key_here
PORT=3000
```

Get your TMDB API key from: https://www.themoviedb.org/settings/api

### 2. Build Command
```
npm run build
```

### 3. Start Command
```
npm start
```

## Features

- Netflix-like user accounts and profiles
- Watch tracking for each profile
- Genre filtering (Action, Comedy, Drama, etc.)
- Content source filtering (Netflix, Disney+, HBO, Hulu, Prime Video, Apple TV+)
- PWA support for iOS/Android home screen installation
- Ad-free native video player
- Dark theme with smooth animations

## Tech Stack

- **Backend:** Express.js + LowDB (JSON file database)
- **Frontend:** React 18 + React Router 6
- **Authentication:** JWT + bcrypt
- **Video:** React Player (ad-free streaming sources)

## API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/profiles` - Get user profiles
- `POST /api/profiles` - Create profile
- `GET /api/watchlist` - Get watchlist
- `POST /api/watchlist` - Add to watchlist
- `GET /api/trending` - Trending movies/TV
- `GET /api/search?query=` - Search content
- `GET /api/discover?genre=&source=` - Filter by genre/source

## Video Sources

The app uses free, ad-free streaming sources (Vidsrc, AutoEmbed, PlayerHub).
Users can switch between sources for best playback experience.

## iOS PWA Installation

1. Open app in Safari
2. Tap the Share button
3. Scroll down and tap "Add to Home Screen"
4. Name the app and tap "Add"

## Project Structure

```
movie-app/
├── server/
│   ├── index.js          # Express server
│   └── routes/           # API routes
├── client/
│   ├── public/           # PWA assets
│   └── src/              # React components
├── package.json
└── .env.example
```