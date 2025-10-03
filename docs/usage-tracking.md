# 탭 사용량 추적 시스템

## 개요

TabQuest의 사용량 추적 시스템은 사용자의 브라우징 패턴을 분석하여 생산성 향상을 위한 인사이트를 제공합니다.

## TabTracker 클래스

### 초기화 및 이벤트 리스너

```typescript
class TabTracker {
  private static activeTabId: number | null = null;
  private static activeStartTime: number | null = null;

  static async initialize() {
    // 1. 탭 활성화 추적
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      await this.handleTabChange(activeInfo.tabId);
    });

    // 2. URL 변경 추적
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
      if (changeInfo.url && tabId === this.activeTabId) {
        await this.handleTabChange(tabId);
      }
    });

    // 3. 윈도우 포커스 추적
    chrome.windows.onFocusChanged.addListener(async (windowId) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        await this.stopTracking();
      } else {
        const [activeTab] = await chrome.tabs.query({
          active: true,
          currentWindow: true
        });
        if (activeTab?.id) {
          await this.handleTabChange(activeTab.id);
        }
      }
    });

    // 4. 주기적 업데이트 (6초마다)
    chrome.alarms.create('tabTrackerUpdate', {
      periodInMinutes: 0.1
    });

    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'tabTrackerUpdate') {
        this.updateActiveTabTime();
      }
    });
  }
}
```

## 데이터 구조

### TabUsageData
```typescript
interface TabUsageData {
  url: string;              // 전체 URL
  domain: string;           // 도메인 (예: github.com)
  title: string;            // 탭 제목
  category: string;         // 카테고리 ID
  firstSeen: number;        // 최초 방문 시간
  lastAccessed: number;     // 마지막 접근 시간
  totalTimeSpent: number;   // 총 사용 시간 (밀리초)
  accessCount: number;      // 접근 횟수
  activations: number;      // 활성화 횟수
}
```

### DailyStats
```typescript
interface DailyStats {
  date: string;                           // YYYY-MM-DD 형식
  totalTabs: number;                      // 총 탭 수
  totalTimeSpent: number;                 // 총 사용 시간
  categoryBreakdown: Record<string, number>; // 카테고리별 시간
  domainBreakdown: Record<string, number>;   // 도메인별 시간
  productivityScore: number;              // 생산성 점수
}
```

## 추적 프로세스

### 1. 탭 변경 처리

```typescript
static async handleTabChange(newTabId: number) {
  // 이전 탭 추적 중지
  await this.stopTracking();

  // 새 탭 정보 가져오기
  const tab = await chrome.tabs.get(newTabId);

  if (!this.shouldTrackTab(tab)) {
    return;
  }

  // 새 탭 추적 시작
  this.activeTabId = newTabId;
  this.activeStartTime = Date.now();

  // 접근 횟수 증가
  await this.incrementTabAccess(tab);
}
```

### 2. 시간 추적

```typescript
static async stopTracking() {
  if (!this.activeTabId || !this.activeStartTime) {
    return;
  }

  const timeSpent = Date.now() - this.activeStartTime;

  // 최소 시간 체크 (1초 이상만 기록)
  if (timeSpent >= 1000) {
    await this.updateTabUsage(this.activeTabId, timeSpent);
  }

  this.activeTabId = null;
  this.activeStartTime = null;
}
```

### 3. 사용량 데이터 업데이트

```typescript
static async updateTabUsage(tabId: number, timeSpent: number) {
  const tab = await chrome.tabs.get(tabId);
  const domain = new URL(tab.url).hostname.replace(/^www\./, '');

  // 카테고리 결정
  const { getCategoryForDomain } = useCategoryStore.getState();
  const category = getCategoryForDomain(domain);

  // Storage에서 기존 데이터 가져오기
  const tabUsageData = await storageUtils.getTabUsageData();
  const key = `${domain}_${category}`;

  // 데이터 업데이트
  if (tabUsageData[key]) {
    tabUsageData[key].totalTimeSpent += timeSpent;
    tabUsageData[key].lastAccessed = Date.now();
  } else {
    tabUsageData[key] = {
      url: tab.url,
      domain,
      title: tab.title,
      category,
      firstSeen: Date.now(),
      lastAccessed: Date.now(),
      totalTimeSpent: timeSpent,
      accessCount: 1,
      activations: 1
    };
  }

  // Storage에 저장
  await storageUtils.saveTabUsageData(tabUsageData);

  // 일별 통계 업데이트
  await this.updateDailyStats(category, domain, timeSpent);
}
```

## 일별 통계 관리

### 통계 업데이트

```typescript
static async updateDailyStats(
  category: string,
  domain: string,
  timeSpent: number
) {
  const today = new Date().toISOString().split('T')[0];
  const dailyStats = await storageUtils.getDailyStats();

  if (!dailyStats[today]) {
    dailyStats[today] = {
      date: today,
      totalTabs: 0,
      totalTimeSpent: 0,
      categoryBreakdown: {},
      domainBreakdown: {},
      productivityScore: 100
    };
  }

  const todayStats = dailyStats[today];

  // 시간 업데이트
  todayStats.totalTimeSpent += timeSpent;

  // 카테고리별 시간
  todayStats.categoryBreakdown[category] =
    (todayStats.categoryBreakdown[category] || 0) + timeSpent;

  // 도메인별 시간
  todayStats.domainBreakdown[domain] =
    (todayStats.domainBreakdown[domain] || 0) + timeSpent;

  // 생산성 점수 재계산
  todayStats.productivityScore = this.calculateProductivityScore(todayStats);

  await storageUtils.saveDailyStats(dailyStats);
}
```

### 생산성 점수 계산

```typescript
static calculateProductivityScore(stats: DailyStats): number {
  let score = 100;

  const categoryWeights = {
    work: 2,
    productivity: 1,
    learning: 1,
    entertainment: -1,
    social: -2,
    uncategorized: 0
  };

  // 카테고리별 가중치 적용
  Object.entries(stats.categoryBreakdown).forEach(([category, time]) => {
    const weight = categoryWeights[category] || 0;
    const hours = time / (1000 * 60 * 60);
    score += weight * hours * 10;
  });

  // 총 사용 시간 고려
  const totalHours = stats.totalTimeSpent / (1000 * 60 * 60);
  if (totalHours > 8) {
    score -= (totalHours - 8) * 5; // 8시간 초과 시 감점
  }

  return Math.max(0, Math.min(100, score));
}
```

## 데이터 정리

### 오래된 데이터 삭제

```typescript
static async cleanupOldData() {
  const RETENTION_DAYS = 30;
  const cutoffDate = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);

  // 탭 사용량 데이터 정리
  const tabUsageData = await storageUtils.getTabUsageData();

  Object.keys(tabUsageData).forEach(key => {
    if (tabUsageData[key].lastAccessed < cutoffDate) {
      delete tabUsageData[key];
    }
  });

  await storageUtils.saveTabUsageData(tabUsageData);

  // 일별 통계 정리
  const dailyStats = await storageUtils.getDailyStats();
  const cutoffDateStr = new Date(cutoffDate).toISOString().split('T')[0];

  Object.keys(dailyStats).forEach(date => {
    if (date < cutoffDateStr) {
      delete dailyStats[date];
    }
  });

  await storageUtils.saveDailyStats(dailyStats);
}
```

## 통계 조회

### 도메인별 통계

```typescript
async function getDomainStats(): Promise<DomainStats[]> {
  const tabUsageData = await storageUtils.getTabUsageData();

  const domainMap = new Map<string, DomainStats>();

  Object.values(tabUsageData).forEach(data => {
    if (!domainMap.has(data.domain)) {
      domainMap.set(data.domain, {
        domain: data.domain,
        totalTime: 0,
        accessCount: 0,
        category: data.category
      });
    }

    const stats = domainMap.get(data.domain)!;
    stats.totalTime += data.totalTimeSpent;
    stats.accessCount += data.accessCount;
  });

  return Array.from(domainMap.values())
    .sort((a, b) => b.totalTime - a.totalTime);
}
```

### 카테고리별 통계

```typescript
async function getCategoryStats(): Promise<CategoryStats[]> {
  const dailyStats = await storageUtils.getDailyStats();
  const today = new Date().toISOString().split('T')[0];
  const todayStats = dailyStats[today];

  if (!todayStats) {
    return [];
  }

  return Object.entries(todayStats.categoryBreakdown)
    .map(([category, time]) => ({
      category,
      time,
      percentage: (time / todayStats.totalTimeSpent) * 100
    }))
    .sort((a, b) => b.time - a.time);
}
```

## 시각화 데이터 준비

### 시간대별 사용량

```typescript
function getHourlyUsage(dailyStats: DailyStats): HourlyData[] {
  const hourlyData: number[] = new Array(24).fill(0);

  // 시간대별 집계 로직
  // ...

  return hourlyData.map((value, hour) => ({
    hour: `${hour}:00`,
    value
  }));
}
```

### 주간 트렌드

```typescript
function getWeeklyTrend(): WeeklyTrend {
  const weekData: DailyStats[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const stats = dailyStats[dateStr] || {
      date: dateStr,
      totalTimeSpent: 0,
      productivityScore: 0
    };

    weekData.push(stats);
  }

  return {
    dates: weekData.map(d => d.date),
    timeSpent: weekData.map(d => d.totalTimeSpent),
    productivity: weekData.map(d => d.productivityScore)
  };
}
```

## 성능 고려사항

### 1. 배치 업데이트
- 6초마다 한 번씩 업데이트하여 Storage API 호출 최소화

### 2. 데이터 압축
- 도메인+카테고리 조합으로 키 생성하여 중복 제거

### 3. 메모리 관리
- 30일 이상 된 데이터 자동 삭제
- 필요한 데이터만 메모리에 로드

### 4. 비동기 처리
- 모든 Storage 작업은 비동기로 처리
- UI 블로킹 방지

## 프라이버시 고려사항

1. **로컬 저장**: 모든 데이터는 사용자의 로컬에만 저장
2. **민감 정보 제외**: URL 파라미터, 개인 정보 제외
3. **도메인 수준 집계**: 상세 URL이 아닌 도메인 수준으로 집계
4. **사용자 제어**: 언제든지 데이터 삭제 가능