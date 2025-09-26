import { defineBackground } from 'wxt/utils/define-background'

// Import background functionality
import '../background'

export default defineBackground(() => {
  console.log('[TabQuest] Background service worker started')

  // Suppress WebSocket errors in development
  if (import.meta.env.DEV) {
    console.log('[TabQuest] Development mode - WebSocket errors are expected and can be ignored')
  }
})