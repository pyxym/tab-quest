// TabAI 진단 스크립트
// Service Worker 콘솔에서 직접 실행하세요

// 1. 현재 저장된 데이터 확인
async function checkStoredData() {
  const data = await chrome.storage.local.get(['tabUsageData', 'dailyStats']);
  console.log('=== 저장된 데이터 ===');
  console.log('Tab Usage Data:', data.tabUsageData);
  console.log('Daily Stats:', data.dailyStats);
  return data;
}

// 2. 테스트 데이터 주입
async function injectTestData() {
  const testData = {
    'github.com': {
      url: 'https://github.com',
      domain: 'github.com',
      title: 'GitHub',
      category: 'work',
      firstSeen: Date.now() - 3600000,
      lastAccessed: Date.now(),
      totalTimeSpent: 900000, // 15분
      accessCount: 20,
      activations: 10
    },
    'youtube.com': {
      url: 'https://youtube.com',
      domain: 'youtube.com',
      title: 'YouTube',
      category: 'entertainment',
      firstSeen: Date.now() - 7200000,
      lastAccessed: Date.now() - 600000,
      totalTimeSpent: 1800000, // 30분
      accessCount: 35,
      activations: 20
    },
    'stackoverflow.com': {
      url: 'https://stackoverflow.com',
      domain: 'stackoverflow.com',
      title: 'Stack Overflow',
      category: 'productivity',
      firstSeen: Date.now() - 1800000,
      lastAccessed: Date.now() - 300000,
      totalTimeSpent: 600000, // 10분
      accessCount: 15,
      activations: 8
    }
  };
  
  const today = new Date().toISOString().split('T')[0];
  const dailyStats = {
    [today]: {
      date: today,
      totalTabs: 15,
      totalTimeSpent: 3300000, // 55분
      categoryBreakdown: {
        work: 900000,
        entertainment: 1800000,
        productivity: 600000
      },
      domainBreakdown: {
        'github.com': 900000,
        'youtube.com': 1800000,
        'stackoverflow.com': 600000
      },
      productivityScore: 45
    }
  };
  
  // 지난 6일간의 데이터도 추가 (생산성 추이 그래프용)
  for (let i = 1; i <= 6; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    dailyStats[dateStr] = {
      date: dateStr,
      totalTabs: 10 + Math.floor(Math.random() * 20),
      totalTimeSpent: 1800000 + Math.floor(Math.random() * 3600000),
      categoryBreakdown: {
        work: 600000 + Math.floor(Math.random() * 1200000),
        entertainment: 600000 + Math.floor(Math.random() * 1200000),
        productivity: 300000 + Math.floor(Math.random() * 600000)
      },
      domainBreakdown: {},
      productivityScore: 30 + Math.floor(Math.random() * 40)
    };
  }
  
  await chrome.storage.local.set({ 
    tabUsageData: testData,
    dailyStats: dailyStats
  });
  
  console.log('✅ 테스트 데이터가 주입되었습니다!');
  console.log('이제 TabAI 팝업을 열고 Analytics를 확인하세요.');
}

// 3. 모든 데이터 삭제
async function clearAllData() {
  await chrome.storage.local.remove(['tabUsageData', 'dailyStats']);
  console.log('🗑️ 모든 추적 데이터가 삭제되었습니다.');
}

// 4. TabTracker 상태 확인
function checkTabTrackerStatus() {
  console.log('=== TabTracker 상태 확인 ===');
  
  // 이벤트 리스너 확인
  if (chrome.tabs.onActivated.hasListeners()) {
    console.log('✅ Tab activation listener is active');
  } else {
    console.log('❌ Tab activation listener is NOT active');
  }
  
  if (chrome.tabs.onUpdated.hasListeners()) {
    console.log('✅ Tab update listener is active');
  } else {
    console.log('❌ Tab update listener is NOT active');
  }
  
  if (chrome.windows.onFocusChanged.hasListeners()) {
    console.log('✅ Window focus listener is active');
  } else {
    console.log('❌ Window focus listener is NOT active');
  }
}

// 실행 가이드
console.log('=== TabAI 진단 도구 ===');
console.log('다음 명령어를 사용하세요:');
console.log('1. checkStoredData() - 현재 저장된 데이터 확인');
console.log('2. injectTestData() - 테스트 데이터 주입 (즉시 데이터 확인 가능)');
console.log('3. clearAllData() - 모든 데이터 삭제');
console.log('4. checkTabTrackerStatus() - TabTracker 상태 확인');
console.log('');
console.log('예: injectTestData() 실행 후 팝업에서 Analytics 확인');