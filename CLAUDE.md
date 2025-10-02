# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**TabQuest** is an intelligent browser tab management extension that helps users organize, analyze, and optimize their browsing experience. The extension provides smart tab grouping, usage tracking, and productivity insights.

## Technology Stack

- **Framework**: WXT (Web Extension Tools) - Modern web extension framework
- **Frontend**: React 18 + TypeScript
- **State Management**: Zustand
- **Storage**: Chrome Storage API (sync and local)
- **Internationalization**: i18next + react-i18next
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
npm run package
```

## Project Structure

```
tab-quest/
├── src/
│   ├── entrypoints/      # WXT entry points
│   │   ├── popup.tsx     # Main popup entry
│   │   ├── popup-component.tsx  # Popup UI component
│   │   ├── options.tsx   # Options page
│   │   └── background.ts # Background service worker
│   ├── components/       # Shared React components
│   │   ├── CategoryManager.tsx  # Category management UI
│   │   ├── TabList.tsx          # Tab listing component
│   │   ├── HelpModal.tsx        # Help documentation
│   │   ├── LanguageSwitcher.tsx # Language selector
│   │   ├── DashboardModal.tsx   # Analytics dashboard
│   │   └── AIInsightCard.tsx    # AI insights display
│   ├── lib/             # Core libraries
│   │   ├── i18n.ts             # Internationalization setup
│   │   └── tabClassifier.ts   # Tab classification logic
│   ├── locales/         # Translation files
│   │   ├── en.json      # English translations
│   │   ├── ko.json      # Korean translations
│   │   └── ja.json      # Japanese translations
│   ├── store/           # Zustand stores
│   │   ├── categoryStore.ts  # Category state management
│   │   ├── tabStore.ts       # Tab state management
│   │   └── aiStore.ts        # AI features state
│   ├── utils/           # Utility functions
│   │   ├── storage.ts        # Chrome storage utilities
│   │   ├── tabTracker.ts     # Tab usage tracking
│   │   ├── tabAnalyzer.ts    # Tab analysis logic
│   │   ├── directOrganizer.ts # Direct tab organization
│   │   ├── unifiedOrganizer.ts # Unified organization logic
│   │   └── smartGrouping.ts  # Smart grouping algorithms
│   ├── types/           # TypeScript definitions
│   │   ├── category.ts  # Category types
│   │   └── css.d.ts     # CSS module types
│   └── tabs/            # Tab pages
│       └── dashboard.tsx # Dashboard tab page
├── public/              # Static assets
│   ├── icon/           # Extension icons (16, 32, 48, 128px)
│   └── _favicon/       # Favicon files
├── wxt.config.ts       # WXT configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── tsconfig.json      # TypeScript configuration
└── package.json       # Project dependencies
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
- **Sync Storage**: User preferences and settings
  - `categories`: User-defined tab categories
  - `categoryMapping`: Domain to category mappings
  - `language`: Selected interface language
- **Local Storage**: Usage data and statistics
  - `tabUsageData`: Tab usage metrics
  - `dailyStats`: Daily productivity statistics
  - `aiInsights`: AI-generated insights and suggestions

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
6. **Multi-language Support**: Available in English, Korean, and Japanese
7. **Direct Chrome API Integration**: Fast tab management without background script delays
8. **Real-time Analytics**: Monitor browsing patterns and productivity scores

## Chrome Extension Permissions

Current permissions in manifest:
- `tabs`: Access to tab information and management
- `tabGroups`: Create and manage tab groups
- `storage`: Store user preferences and usage data
- `activeTab`: Access to the currently active tab
- `windows`: Access to browser windows
- `alarms`: Schedule periodic tasks for tracking

## Development Tips

1. **WXT Development**:
   - Use `defineConfig` in wxt.config.ts for configuration
   - Entry points go in src/entrypoints/
   - Public assets in public/ folder
   - TypeScript configs are handled by WXT

2. **Storage Management**:
   - Use Chrome Storage API directly for persistence
   - Separate sync storage for preferences and local storage for data
   - Storage utilities defined in utils/storage.ts

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

## Internationalization

The extension supports multiple languages using i18next:
- Language files stored in `src/locales/`
- Dynamic language switching without reload
- Persistent language preference in sync storage
- Supports: English (en), Korean (ko), Japanese (ja)

## Recent Updates

- Added full i18n support for multi-language interface
- Refactored to use WXT framework for better development experience
- Implemented glass morphism design system
- Added real-time tab tracking and analytics
- Improved tab organization algorithms

## Future Considerations

- Migration to more advanced AI features
- Cross-browser support (Firefox, Safari)
- Cloud sync capabilities
- Advanced analytics dashboard
- Keyboard shortcuts support
- More languages support