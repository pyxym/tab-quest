import { defineBackground } from 'wxt/utils/define-background'

// Import background functionality
import '../background'

export default defineBackground(() => {
  console.log('[TabAI] Background service worker started')
})