import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  outDir: '.output',
  dev: {
    server: {
      port: 3000,
    },
    // 자동 리로드 설정
    reloadCommand: 'Alt+R',
  },
  manifest: {
    name: 'TabAI - AI-Powered Tab Manager',
    version: '1.0.0',
    description: 'AI-powered browser tab management extension',
    permissions: ['tabs', 'storage', 'activeTab', 'tabGroups', 'windows', 'alarms'],
    action: {
      default_popup: 'popup.html',
      default_icon: 'icon/icon.svg'
    },
    icons: {
      '128': 'icon/icon.svg'
    },
    options_ui: {
      page: 'options.html',
      open_in_tab: true
    }
  },
});