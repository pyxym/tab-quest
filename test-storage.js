// Test script to check chrome.storage.local data
// Run this in the browser console on the extension's background page

async function checkStorageData() {
  console.log('=== TabAI Storage Debug ===');
  
  // Check all local storage data
  const localData = await chrome.storage.local.get(null);
  console.log('All local storage data:', localData);
  
  // Check specific keys
  const tabUsageData = await chrome.storage.local.get(['tabUsageData']);
  console.log('Tab usage data:', tabUsageData);
  
  const dailyStats = await chrome.storage.local.get(['dailyStats']);
  console.log('Daily stats:', dailyStats);
  
  // Check if TabTracker is tracking
  console.log('TabTracker active tab ID:', TabTracker?.activeTabId);
  console.log('TabTracker active start time:', TabTracker?.activeStartTime);
  
  // Get current active tab
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log('Current active tab:', activeTab);
  
  // Test if tab change triggers tracking
  if (activeTab?.id) {
    console.log('Simulating tab change to test tracking...');
    await TabTracker.handleTabChange(activeTab.id);
    
    // Wait a bit and check again
    setTimeout(async () => {
      const updatedData = await chrome.storage.local.get(['tabUsageData']);
      console.log('Updated tab usage data after simulation:', updatedData);
    }, 1000);
  }
}

// Run the check
checkStorageData();