# StreamFlix - Movie & TV Streaming App

## Overview
A clean streaming app that fetches movies/TV series from TMDB and plays them via VidKing.

## Features
- Search movies and TV shows via TMDB API
- Trending content on homepage
- Embedded video player via VidKing
- Responsive grid layout

## Tech Stack
- Vanilla HTML/CSS/JS (single file frontend)
- Node.js backend (server.js)
- TMDB API for content data
- VidKing for video playback

## Environment Variables
```
TMDB_API_KEY=your_tmdb_api_key
PORT=3000
```

## Setup
1. Get TMDB API key from https://www.themoviedb.org/settings/api
2. Deploy to Coolify with Node.js build pack
3. Set `TMDB_API_KEY` env var