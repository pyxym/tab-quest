import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: '.output',
  dev: {
    server: {
      port: 3000,
    },
    reloadCommand: 'Alt+R',
  },
  manifest: {
    name: 'TabQuest - AI-Powered Tab Manager',
    version: '1.0.0',
    description: 'AI-powered browser tab management extension',
    permissions: ['tabs', 'storage', 'activeTab', 'tabGroups', 'windows', 'alarms'],
    action: {
      default_popup: 'popup.html',
      default_icon: {
        '16': 'icon/icon16.png',
        '32': 'icon/icon32.png',
        '48': 'icon/icon48.png',
        '128': 'icon/icon128.png'
      }
    },
    icons: {
      '16': 'icon/icon16.png',
      '32': 'icon/icon32.png',
      '48': 'icon/icon48.png',
      '128': 'icon/icon128.png'
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true
    }
  },
});