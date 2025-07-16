console.log('[TabAI] Simple background script loaded')

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[TabAI] Message received:', request)
  
  if (request.action === 'ping') {
    sendResponse({ success: true, message: 'pong from simple background' })
    return true
  }
  
  sendResponse({ error: 'Unknown action' })
  return true
})