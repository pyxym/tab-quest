// Service Worker 콘솔에서 실행할 빠른 테스트

// 1. 현재 TabTracker가 추적 중인지 확인
console.log('=== TabTracker 상태 확인 ===');

// 2. 수동으로 현재 탭 추적 시작
async function manualTrackCurrentTab() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab) {
    console.log('현재 활성 탭:', activeTab.url);
    
    // 수동으로 데이터 저장
    const domain = new URL(activeTab.url).hostname.replace(/^www\./, '');
    const testData = {
      [domain]: {
        url: activeTab.url,
        domain: domain,
        title: activeTab.title,
        category: 'uncategorized',
        firstSeen: Date.now(),
        lastAccessed: Date.now(),
        totalTimeSpent: 10000, // 10초
        accessCount: 1,
        activations: 1
      }
    };
    
    await chrome.storage.local.set({ tabUsageData: testData });
    console.log('✅ 테스트 데이터 저장 완료');
    
    // 저장된 데이터 확인
    const saved = await chrome.storage.local.get('tabUsageData');
    console.log('저장된 데이터:', saved);
  }
}

// 3. 이벤트 리스너 직접 등록 테스트
function testEventListeners() {
  chrome.tabs.onActivated.addListener((activeInfo) => {
    console.log('✅ [TEST] Tab activated:', activeInfo.tabId);
  });
  
  console.log('이벤트 리스너 등록 완료. 이제 탭을 전환해보세요.');
}

console.log('명령어:');
console.log('- manualTrackCurrentTab() : 현재 탭을 수동으로 추적');
console.log('- testEventListeners() : 이벤트 리스너 테스트');