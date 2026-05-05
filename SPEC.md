# Movie Stream WebApp Specification

## Project Overview
- **Project Name**: StreamFlix
- **Type**: Web Application (Single Page App)
- **Core Functionality**: Search movies/TV series from TMDB, get details, and stream via VidKing
- **Target Users**: Movie/TV enthusiasts looking for streaming

## UI/UX Specification

### Layout Structure
- **Header**: Fixed top navigation with logo and search bar
- **Hero Section**: Featured/trending content backdrop
- **Content Grid**: Responsive movie/TV cards
- **Detail Modal**: Overlay for movie details and streaming
- **Footer**: Minimal credits

### Responsive Breakpoints
- Mobile: < 640px (1 column grid)
- Tablet: 640px - 1024px (3 column grid)
- Desktop: > 1024px (5 column grid)

### Visual Design

#### Color Palette
- **Background**: `#0d0d0d` (near black)
- **Surface**: `#1a1a1a` (card backgrounds)
- **Surface Hover**: `#252525`
- **Primary Accent**: `#e50914` (Netflix red)
- **Secondary Accent**: `#ffd700` (gold for ratings)
- **Text Primary**: `#ffffff`
- **Text Secondary**: `#a0a0a0`
- **Border**: `#333333`

#### Typography
- **Font Family**: "Bebas Neue" for headings, "Source Sans Pro" for body
- **Headings**: 2rem - 3rem, bold
- **Body**: 0.9rem - 1rem
- **Search Input**: 1.1rem

#### Spacing
- **Container Padding**: 2rem
- **Card Gap**: 1.5rem
- **Section Margin**: 3rem

#### Visual Effects
- **Card Hover**: Scale 1.05, box-shadow glow
- **Buttons**: Red gradient on hover
- **Modal**: Backdrop blur, slide-in animation
- **Cards**: Poster with rating badge overlay

### Components

1. **Search Bar**
   - Large input with icon
   - Live search on typing (debounced 400ms)
   - Clear button when text present

2. **Movie/TV Card**
   - Poster image (TMDB image base URL)
   - Rating badge (top-right, gold)
   - Title overlay on hover
   - Media type badge (movie/TV)

3. **Detail Modal**
   - Large backdrop image
   - Title, year, rating, overview
   - Genre tags
   - Watch Now button (links to VidKing)
   - Close button

4. **Loading States**
   - Skeleton cards during search
   - Spinner during API calls

## Functionality Specification

### Core Features

1. **TMDB Search**
   - Endpoint: `https://api.themoviedb.org/3/search/multi`
   - Search movies and TV series
   - Display results in grid

2. **TMDB Trending**
   - Endpoint: `https://api.themoviedb.org/3/trending/all/week`
   - Show trending on load

3. **TMDB Details**
   - Get full movie/TV details
   - Images, overview, rating, genres

4. **VidKing Streaming**
   - Use TMDB ID to construct VidKing player URL
   - Format: `https://vidking.net/embed/{tmdb_id}`
   - Support both movie and TV series

### API Integration
- TMDB Base URL: `https://api.themoviedb.org/3`
- TMDB Image Base: `https://image.tmdb.org/t/p/w500`
- TMDB Backdrop Base: `https://image.tmdb.org/t/p/original`
- **Note**: User needs to provide their own TMDB API key

### User Interactions
- Type in search → debounced API call → results displayed
- Click card → modal with details
- Click "Watch Now" → opens VidKing in new tab
- Press Escape → close modal

## Acceptance Criteria

1. ✅ App loads and shows trending content
2. ✅ Search returns movie/TV results from TMDB
3. ✅ Clicking a result shows details modal
4. ✅ "Watch Now" opens VidKing player
5. ✅ Responsive on mobile/tablet/desktop
6. ✅ Works on Coolify deployment
7. ✅ Requires user to input TMDB API key

## Technical Stack
- Single HTML file with embedded CSS/JS
- No build step required
- Deploy-ready for Coolify