# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TabQuest** is an intelligent browser tab management extension that helps users organize, analyze, and optimize their browsing experience. The extension provides smart tab grouping, usage tracking, and productivity insights.

## Technology Stack

- **Framework**: WXT (Web Extension Tools) - Modern web extension framework
- **Frontend**: React 18 + TypeScript
- **State Management**: Zustand
- **Storage**: WXT Storage Utilities (Chrome Storage API wrapper)
- **Styling**: Tailwind CSS with glass morphism design system
- **Build System**: WXT + Vite
- **Extension**: Chrome Extension Manifest V3

## Development Commands

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Package extension for distribution
npm run zip

# Package with source code (for store submission)
npm run zip:firefox
```

## Project Structure

```
tab-ai/
├── src/
│   ├── entrypoints/      # WXT entry points
│   │   ├── popup/        # Popup UI components
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── options/      # Options page
│   │   └── background.ts # Background service worker
│   ├── components/       # Shared React components
│   │   ├── CategoryManager.tsx
│   │   ├── Dashboard.tsx
│   │   ├── TabList.tsx
│   │   └── InfoTooltip.tsx
│   ├── store/           # Zustand stores
│   │   └── categoryStore.ts
│   ├── utils/           # Utility functions
│   │   ├── storage.ts        # WXT storage utilities
│   │   ├── tabTracker.ts     # Tab usage tracking
│   │   ├── tabAnalyzer.ts    # Tab analysis logic
│   │   ├── directOrganizer.ts # Direct tab organization
│   │   ├── smartGrouping.ts  # Smart grouping algorithms
│   │   └── debugTabTracker.ts # Debug utilities (dev only)
│   ├── types/           # TypeScript definitions
│   │   └── category.ts
│   └── styles/          # CSS files
│       ├── popup.css
│       ├── options.css
│       └── dashboard.css
├── public/              # Static assets
│   ├── icon/           # Extension icons
│   ├── popup.html      # Popup HTML
│   └── options.html    # Options HTML
├── wxt.config.ts       # WXT configuration
└── package.json
```

## Architecture Overview

### WXT Framework
- Modern web extension framework built on Vite
- Automatic manifest generation
- Hot Module Replacement in development
- TypeScript-first with full type safety
- Built-in storage utilities with type safety

### State Management
- **categoryStore**: Manages user-defined categories for tab organization
- Local React state for UI components
- Chrome Storage API for persistence via WXT utilities

### Storage Architecture
- **Sync Storage**: User preferences and categories
  - `sync:categories`: User-defined tab categories
  - `sync:categoryMapping`: Domain to category mappings
- **Local Storage**: Usage data and statistics
  - `local:tabUsageData`: Tab usage metrics
  - `local:dailyStats`: Daily productivity statistics

### Component Architecture
- Glass morphism design with Tailwind CSS
- Modular components for maintainability
- Responsive and accessible UI
- Dark mode compatible

## Key Features

1. **Smart Tab Organization**: AI-powered tab grouping based on domains and categories
2. **Usage Tracking**: Track time spent, access frequency, and productivity metrics
3. **Category Management**: Custom categories with drag-and-drop organization
4. **Duplicate Detection**: Automatically identify and remove duplicate tabs
5. **Productivity Insights**: Daily statistics and usage patterns
6. **Direct Chrome API Integration**: Fast tab management without background script delays

## Chrome Extension Permissions

Current permissions in manifest:
- `tabs`: Access to tab information and management
- `tabGroups`: Create and manage tab groups
- `storage`: Store user preferences and usage data

## Development Tips

1. **WXT Development**:
   - Use `defineConfig` in wxt.config.ts for configuration
   - Entry points go in src/entrypoints/
   - Public assets in public/ folder
   - TypeScript configs are handled by WXT

2. **Storage Management**:
   - Use WXT's storage utilities for type-safe storage access
   - Prefix keys with 'sync:' or 'local:' for storage area
   - Storage schema defined in utils/storage.ts

3. **Debugging**:
   - Debug utilities are conditionally loaded only in development
   - Use Chrome DevTools for extension debugging
   - Check background script logs in service worker console

4. **Performance**:
   - Direct Chrome API calls for instant tab operations
   - Efficient state management with Zustand
   - Tailwind CSS purged in production build

5. **Testing**:
   - Manual testing through Chrome extension developer mode
   - Use multiple browser profiles for testing different scenarios

## Common Issues & Solutions

1. **WebSocket Errors in Dev Mode**: Normal behavior for HMR, safely ignored
2. **TypeScript Errors**: Ensure proper type guards for optional Chrome API values
3. **Tab Group Ordering**: Use chrome.tabGroups.move() for consistent ordering
4. **Storage Type Safety**: Use generic types with storage utilities

## Build & Deployment

1. **Development Build**:
   ```bash
   npm run dev
   # Creates build in .output/chrome-mv3-dev/
   ```

2. **Production Build**:
   ```bash
   npm run build
   # Creates optimized build in .output/chrome-mv3/
   ```

3. **Loading in Browser**:
   - Open chrome://extensions
   - Enable Developer mode
   - Load unpacked from .output/chrome-mv3-dev/ (dev) or .output/chrome-mv3/ (prod)

## Code Style Guidelines

- Use TypeScript strict mode
- Prefer functional components with hooks
- Use proper type guards for Chrome API responses
- Follow existing component patterns
- Keep components small and focused
- Use Tailwind utility classes consistently

## Future Considerations

- Migration to more advanced AI features
- Cross-browser support (Firefox, Safari)
- Cloud sync capabilities
- Advanced analytics dashboard
- Keyboard shortcuts support