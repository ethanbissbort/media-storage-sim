# Media Hoarder - Claude Code Documentation

## Project Overview

**Media Hoarder** is a web-based storage calculator that helps users estimate how many TV shows and movies they can store given a specific storage capacity and video quality profiles. Users can select quality profiles (720p, 1080p, 4K), specify total storage in TB, adjust allocation ratios between shows and movies, and view real-time calculations with Chart.js visualizations.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Solid.js | 1.6.10 | Reactive UI framework |
| TypeScript | 4.9.5 | Type-safe JavaScript |
| Vite | 4.1.1 | Build tool & dev server |
| Tailwind CSS | 3.2.7 | Utility-first CSS |
| Chart.js | 4.2.1 | Data visualization |
| Flowbite | 1.6.4 | UI component library |

## Project Structure

```
media-storage-sim/
├── src/
│   ├── App.tsx              # Main calculator component
│   ├── index.tsx            # Application entry point
│   ├── index.css            # Global styles (Tailwind)
│   ├── qualityProfiles.ts   # Video quality profile data
│   ├── logo.svg             # Logo asset
│   └── assets/
│       └── favicon.ico      # Favicon
├── index.html               # HTML entry point
├── package.json             # Dependencies & scripts
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite configuration
├── tailwind.config.js       # Tailwind configuration
└── postcss.config.js        # PostCSS configuration
```

## Key Components

### App.tsx
Main component containing:
- Quality profile selection (checkboxes for 720p, 1080p, 2160p)
- Storage input (TB)
- Ratio slider (shows vs movies allocation)
- Results display cards
- Chart.js line chart visualization

### qualityProfiles.ts
Defines video quality profiles with bitrate ranges (MB/min):
- 720p: 3-100 MB/min
- 1080p: 15-150 MB/min
- 2160p: 35-400 MB/min

## Calculation Logic

### Constants
- Average episode length: 24 minutes
- Average episodes per season: 25
- Average seasons per show: 8
- Average movie length: 90 minutes

### Formulas
```
averageSize = sum(selectedProfiles.map(p => (p[0] + p[1]) / 2))
showStorage = totalStorage * (1 - ratio/100)  # in MB
movieStorage = totalStorage * (ratio/100)     # in MB
totalShows = showStorage / (avgEpisodeSize * 25 * 8)
totalMovies = movieStorage / (avgMovieSize * 90)
```

## Commands

```bash
npm install     # Install dependencies
npm dev         # Start dev server (port 3000)
npm run build   # Production build
npm run serve   # Preview production build
```

## Architecture Notes

- Uses Solid.js signals for reactive state management
- Chart updates via `createEffect` hook on dependency changes
- Dark theme by default with Tailwind dark: classes
- Mobile-first responsive design with md/lg breakpoints
- Umami analytics integration for privacy-focused tracking

---

# Outstanding Issues

## Critical - Memory & Safety

### 1. Memory Leak: Chart Instance Not Destroyed
**File:** `src/App.tsx:96-97`
**Issue:** Chart instance is created but never destroyed on component unmount, causing memory leaks.
**Fix:** Add `onCleanup()` to destroy chart instance.

### 2. Potential Division by Zero
**File:** `src/App.tsx:70-71, 90-91`
**Issue:** When no profiles are selected, `averageShowSize()` or `averageMovieSize()` returns 0, causing division by zero resulting in `Infinity` or `NaN`.
**Fix:** Add guards to return 0 when denominator is 0.

### 3. Non-null Assertion on Potentially Undefined Values
**File:** `src/App.tsx:134`
**Issue:** `chartElmnt!` uses non-null assertion but canvas could be undefined.
**Fix:** Use proper null checking or optional chaining.

## Medium - Type Safety

### 4. Deprecated Type Package
**File:** `package.json:13`
**Issue:** `@types/chart.js` is deprecated; Chart.js 4.x includes built-in TypeScript definitions.
**Fix:** Remove `@types/chart.js` from devDependencies.

### 5. Uninitialized Chart Variable
**File:** `src/App.tsx:96`
**Issue:** `chart` is declared but uninitialized, accessed in `createEffect` before `onMount` runs.
**Fix:** Initialize as `undefined` with proper type or use conditional checks.

## Low - Code Quality

### 6. Magic Numbers
**File:** `src/App.tsx:67-68, 87-88, 144, 155`
**Issue:** `1_000_000` (TB to MB conversion) repeated multiple times.
**Fix:** Extract to named constant `TB_TO_MB = 1_000_000`.

### 7. Duplicate Logic
**File:** `src/App.tsx:51-61, 73-83`
**Issue:** `averageShowSize` and `averageMovieSize` have identical logic.
**Fix:** Extract to utility function `calculateAverageSize(profiles)`.

### 8. Duplicate Checkbox Handlers
**File:** `src/App.tsx:181-194, 225-238`
**Issue:** Nearly identical handlers for shows and movies checkboxes.
**Fix:** Extract to reusable handler function.

### 9. Wrong Package Name
**File:** `package.json:2`
**Issue:** Package name is still `vite-template-solid` instead of `media-hoarder`.
**Fix:** Update name to `media-hoarder`.

### 10. Chart Effect Duplicates Calculations
**File:** `src/App.tsx:137-162`
**Issue:** Chart effect recalculates storage values that already exist as signals.
**Fix:** Refactor to use existing computed signals.

## Low - Accessibility

### 11. Missing ARIA Labels
**File:** `src/App.tsx`
**Issue:** Form controls and chart canvas lack proper ARIA attributes.
**Fix:** Add aria-label, role, and description attributes.

---

# Feature Enhancements & New Capabilities

## High Priority

### 1. Custom Quality Profiles
Allow users to add/edit/delete custom quality profiles with their own bitrate ranges.

### 2. Customizable Show/Movie Parameters
Let users modify the default assumptions (episode length, seasons, episodes per season, movie length).

### 3. Storage Presets
Quick-select buttons for common storage sizes (1TB, 2TB, 4TB, 8TB, 16TB, etc.).

### 4. Local Storage Persistence
Save user preferences and last-used settings to localStorage.

### 5. Export/Share Results
Allow users to export calculations as image, PDF, or shareable link.

## Medium Priority

### 6. Multiple Scenario Comparison
Compare different storage configurations side-by-side.

### 7. Advanced Statistics
Show more detailed breakdowns:
- Hours of content
- Average file sizes
- Storage per quality level

### 8. Light/Dark Theme Toggle
User-selectable theme with system preference detection.

### 9. Pie/Donut Chart
Additional visualization showing storage allocation breakdown.

### 10. Unit Toggle
Switch between TB/GB/MB for storage input/output.

## Low Priority

### 11. PWA Support
Add service worker for offline capability and installability.

### 12. Keyboard Navigation
Full keyboard accessibility for all interactive elements.

### 13. Internationalization (i18n)
Support for multiple languages beyond number formatting.

### 14. Preset Media Libraries
Templates based on popular streaming services (Netflix-like, Plex defaults).

### 15. API Integration
Optional integration with media management tools (Sonarr, Radarr) for actual library analysis.

---

# Development Guidelines

## Code Style
- Use TypeScript strict mode
- Prefer const over let
- Use meaningful variable names
- Extract magic numbers to named constants
- Keep components focused and small

## Performance
- Memoize expensive calculations
- Debounce rapid state updates (especially for chart)
- Clean up resources on component unmount
- Avoid recreating arrays/objects in render

## Testing
- Unit tests for calculation logic
- Component tests for UI interactions
- E2E tests for user flows

## Git Workflow
- Feature branches from main
- Conventional commits (feat:, fix:, refactor:, etc.)
- PR reviews before merge
