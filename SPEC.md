# StreamFlix Pro - Enhanced Movie & TV Streaming App

## Overview
A Netflix-like streaming application with user accounts, profiles, watch tracking, genre/source filtering, PWA support, and ad-free video playback.

## Features

### 1. Netflix-like Experience
- User account registration and login
- Multiple profiles per account (up to 5)
- Profile avatar and color customization
- Watch tracking for each profile

### 2. PWA Support (iOS Installation)
- Service worker for offline caching
- Web app manifest for home screen installation
- Apple touch icons for iOS
- Standalone display mode

### 3. Android APK
- Capacitor-based Android build
- Debug APK generation
- Native webview wrapper

### 4. Ad-Free Video Player
- Removed Vidking player (loaded ads)
- Native React Player integration
- Multiple free streaming source options
- No ads or redirects

### 5. Genre Filtering
- Filter movies by genre (Action, Comedy, Drama, etc.)
- TMDB genre integration
- Easy selection in filter bar

### 6. Content Source Filtering
- Filter by streaming provider
- Supported sources: Netflix, Disney+, HBO, Hulu, Prime Video, Apple TV+

## Tech Stack

### Frontend
- React 18
- React Router 6
- React Player
- Service Worker for PWA

### Backend
- Express.js
- LowDB (JSON database)
- JWT Authentication
- bcrypt password hashing

### Mobile
- Capacitor
- Android Gradle build

## Project Structure
```
movie-app/
├── server/
│   ├── index.js          # Express server
│   └── routes/
│       ├── auth.js       # Authentication routes
│       ├── profiles.js   # Profile management
│       └── watchlist.js  # Watch tracking
├── client/
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json  # PWA manifest
│   │   ├── sw.js          # Service worker
│   │   └── icons/         # App icons
│   └── src/
│       ├── pages/
│       │   ├── Home.js
│       │   ├── Watch.js
│       │   ├── Search.js
│       │   ├── Login.js
│       │   ├── Register.js
│       │   └── Profiles.js
│       ├── context/
│       │   ├── AuthContext.js
│       │   └── ProfileContext.js
│       ├── App.js
│       └── App.css
├── capacitor.config.json
├── package.json
└── README.md
```

## API Endpoints

### Authentication
- POST /api/auth/register - Register new user
- POST /api/auth/login - Login user
- GET /api/auth/verify - Verify JWT token

### Profiles
- GET /api/profiles - Get user profiles
- POST /api/profiles - Create new profile
- PUT /api/profiles/:id - Update profile
- DELETE /api/profiles/:id - Delete profile

### Watchlist
- GET /api/watchlist?profileId=xxx - Get watchlist
- POST /api/watchlist - Add to watchlist
- DELETE /api/watchlist/:mediaId - Remove from watchlist

### TMDB Proxy
- GET /api/trending - Trending movies/TV
- GET /api/search?query=xxx - Search content
- GET /api/discover?genre=xx&source=xxx - Discover by genre/source
- GET /api/movie/:id - Movie details
- GET /api/tv/:id - TV show details

## Environment Variables
```
TMDB_API_KEY=your_tmdb_api_key_here
JWT_SECRET=your_jwt_secret_here
PORT=3000
```

## Setup Instructions

### Development
```bash
npm install
cd client && npm install && cd ..
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Android APK
```bash
# After building web app
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "StreamFlix Pro" "com.streamflix.pro" --web-dir=client/build
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```

## Video Sources
The app uses free, ad-free streaming sources:
- Vidsrc (primary)
- AutoEmbed
- PlayerHub

Users can switch between sources if one doesn't work.