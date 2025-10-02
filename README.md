# TabQuest - Intelligent Tab Assistant

## 🚀 Overview

TabQuest is an intelligent browser tab management extension for Chrome and Edge that helps users organize, track, and optimize their browsing experience. Using smart categorization and usage analytics, TabQuest transforms chaotic browser sessions into organized, productive workspaces.

🌍 **Multi-language Support**: Available in English, Korean (한국어), and Japanese (日本語)

## ✨ Key Features

### 📊 Smart Tab Organization
- **Automatic Grouping**: Organize tabs into Chrome tab groups based on custom categories
- **Category Management**: Create, edit, and reorder categories with drag-and-drop
- **Domain Mapping**: Automatically assign domains to categories for consistent organization

### 📈 Usage Analytics
- **Tab Tracking**: Monitor time spent, access frequency, and usage patterns
- **Daily Statistics**: Track productivity with daily breakdowns and trends
- **Productivity Score**: Real-time productivity scoring based on browsing habits

### 🎯 Intelligent Insights
- **Duplicate Detection**: Identify and remove duplicate tabs with one click
- **Usage Patterns**: Discover browsing habits and optimization opportunities
- **Smart Recommendations**: Get actionable suggestions to improve productivity

### 🎨 Modern UI/UX
- **Glass Morphism Design**: Beautiful, modern interface with blur effects and gradients
- **Multi-language Interface**: Switch between English, Korean, and Japanese
- **Responsive Layout**: Adapts to different screen sizes and contexts
- **Smooth Animations**: Polished interactions with careful attention to detail

## 🛠️ Technology Stack

- **Framework**: [WXT](https://wxt.dev/) - Next-gen web extension framework
- **Frontend**: React 18 + TypeScript
- **State Management**: Zustand
- **Internationalization**: i18next + react-i18next
- **Styling**: Tailwind CSS with Glass Morphism
- **Build Tool**: Vite
- **Extension**: Chrome Extension Manifest V3

## 📦 Installation

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tab-quest.git
   cd tab-quest
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Load extension in Chrome/Edge**
   - Open `chrome://extensions` (or `edge://extensions`)
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `.output/chrome-mv3-dev` folder

### Production Build

```bash
# Build for production
npm run build

# Package extension
npm run package
```

The production build will be in `.output/chrome-mv3/`

## 🎯 Usage Guide

### Getting Started

1. **Click the TabQuest icon** in your browser toolbar
2. **Select your preferred language** from the language switcher
3. **View your current tabs** organized by detected patterns
4. **Click "Smart Organize"** to automatically group tabs into categories

### Managing Categories

1. Navigate to the **Categories** tab
2. Click **"+ Add Category"** to create custom categories
3. Assign colors and domains to each category
4. Drag categories to reorder them

### Tab Assignment

1. Go to the **Assign** tab
2. Select a category for each domain
3. Changes are saved automatically
4. Use **Smart Organize** to apply categorization

### Viewing Analytics

1. Check the **Dashboard** for usage statistics
2. Monitor your productivity score
3. Review daily trends and patterns
4. Act on AI-generated insights

## 🏗️ Project Structure

```
tab-quest/
├── src/
│   ├── entrypoints/      # WXT entry points
│   │   ├── popup.tsx     # Main popup entry
│   │   ├── options.tsx   # Options page
│   │   └── background.ts # Service worker
│   ├── components/       # React components
│   ├── lib/              # Core libraries
│   │   ├── i18n.ts       # Internationalization
│   │   └── tabClassifier.ts
│   ├── locales/          # Translation files
│   │   ├── en.json       # English
│   │   ├── ko.json       # Korean
│   │   └── ja.json       # Japanese
│   ├── store/            # State management
│   ├── utils/            # Utilities
│   └── types/            # TypeScript types
├── public/               # Static assets
├── wxt.config.ts         # WXT configuration
└── package.json
```

## 🔧 Configuration

### WXT Configuration
The extension is configured through `wxt.config.ts`:
- Manifest settings
- Build options
- Development server configuration

### Storage Schema
TabQuest uses Chrome's storage API with two areas:
- **Sync Storage**: User preferences and categories
- **Local Storage**: Usage data and statistics

## 🐛 Troubleshooting

### Common Issues

1. **Extension not loading**
   - Ensure you're in developer mode
   - Check that the correct folder is selected
   - Rebuild if necessary: `npm run build`

2. **Tabs not grouping**
   - Verify Chrome/Edge supports tab groups
   - Check browser permissions
   - Ensure categories are properly configured

3. **Data not persisting**
   - Check storage permissions in manifest
   - Verify Chrome sync is enabled
   - Check browser console for errors

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow existing code style and patterns
- Write meaningful commit messages
- Update documentation for new features
- Test thoroughly before submitting PR

## 📝 Roadmap

### Near Term
- [x] Multi-language support (EN, KO, JA)
- [ ] Keyboard shortcuts support
- [ ] Export/import settings
- [ ] Session management
- [ ] Advanced search and filtering

### Long Term
- [ ] Firefox and Safari support
- [ ] Cloud synchronization
- [ ] Team collaboration features
- [ ] AI-powered auto-categorization
- [ ] Natural language commands
- [ ] More language support (Chinese, Spanish, French)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- Built with [WXT](https://wxt.dev/) framework
- Icons from [Heroicons](https://heroicons.com/)
- UI inspiration from modern glass morphism designs

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/tab-quest/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/tab-quest/discussions)
- **Email**: support@tabquest.app

---

Made with ❤️ by the TabQuest Team