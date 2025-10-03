# 개발 환경 설정

## 필수 요구사항

- **Node.js**: v18.0.0 이상
- **npm**: v8.0.0 이상
- **Chrome 브라우저**: v88 이상 (Manifest V3 지원)

## 설치 및 실행

### 1. 프로젝트 클론

```bash
git clone https://github.com/yourusername/tab-quest.git
cd tab-quest
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
```

이 명령어는 WXT 개발 서버를 시작하며, 다음 기능을 제공합니다:
- Hot Module Replacement (HMR)
- 자동 리로드
- TypeScript 컴파일
- 개발용 빌드 생성 (`.output/chrome-mv3-dev/`)

### 4. Chrome에 로드

1. Chrome 브라우저에서 `chrome://extensions` 열기
2. 우측 상단의 "개발자 모드" 활성화
3. "압축해제된 확장 프로그램을 로드합니다" 클릭
4. `.output/chrome-mv3-dev/` 폴더 선택

## 개발 도구

### VS Code 확장 프로그램

프로젝트에는 추천 확장 프로그램이 설정되어 있습니다:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",        // ESLint
    "esbenp.prettier-vscode",         // Prettier
    "bradlc.vscode-tailwindcss",      // Tailwind CSS IntelliSense
    "ms-vscode.vscode-typescript-next", // TypeScript
    "christian-kohler.path-intellisense", // Path 자동완성
    "usernamehw.errorlens",          // 인라인 에러 표시
    "formulahendry.auto-rename-tag",  // HTML 태그 자동 변경
    "naumovs.color-highlight"        // 색상 하이라이트
  ]
}
```

### 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 코드 린트
npm run lint

# 코드 린트 및 자동 수정
npm run lint:fix

# 코드 포맷팅
npm run format

# 포맷팅 체크
npm run format:check

# 타입 체크
npm run typecheck

# 배포용 패키지 생성
npm run package
```

## 프로젝트 구조

```
tab-quest/
├── .vscode/              # VS Code 설정
│   ├── settings.json     # 에디터 설정
│   └── extensions.json   # 추천 확장
│
├── docs/                 # 문서
│   └── *.md             # 각종 문서 파일
│
├── public/              # 정적 파일
│   ├── icon/           # 확장 아이콘 (16, 32, 48, 128px)
│   └── _favicon/       # 파비콘
│
├── src/
│   ├── entrypoints/     # WXT 진입점
│   │   ├── background.ts
│   │   ├── popup.tsx
│   │   ├── popup-component.tsx
│   │   └── options.tsx
│   │
│   ├── components/      # React 컴포넌트
│   │   ├── CategoryManager.tsx
│   │   ├── TabList.tsx
│   │   ├── AIInsightCard.tsx
│   │   └── ...
│   │
│   ├── store/          # Zustand 스토어
│   │   ├── categoryStore.ts
│   │   ├── tabStore.ts
│   │   └── aiStore.ts
│   │
│   ├── utils/          # 유틸리티 함수
│   │   ├── storage.ts
│   │   ├── tabTracker.ts
│   │   ├── tabAnalyzer.ts
│   │   └── ...
│   │
│   ├── lib/            # 핵심 라이브러리
│   │   ├── i18n.ts
│   │   └── tabClassifier.ts
│   │
│   ├── locales/        # 번역 파일
│   │   ├── en.json
│   │   ├── ko.json
│   │   └── ja.json
│   │
│   ├── styles/         # 스타일
│   │   └── popup.css
│   │
│   └── types/          # TypeScript 타입
│       └── category.ts
│
├── .eslintrc.json      # ESLint 설정
├── .prettierrc         # Prettier 설정
├── tailwind.config.js  # Tailwind CSS 설정
├── tsconfig.json       # TypeScript 설정
├── wxt.config.ts       # WXT 설정
└── package.json        # 프로젝트 설정
```

## WXT 설정

`wxt.config.ts`:

```typescript
import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'TabQuest - Tab Assistant',
    description: '브라우저 탭 관리',
    version: '0.0.1',
    permissions: [
      'tabs',
      'tabGroups',
      'storage',
      'activeTab',
      'windows',
      'alarms'
    ]
  },
  runner: {
    startUrls: ['https://github.com']
  }
});
```

## 환경 변수

개발 환경에서는 특별한 환경 변수가 필요하지 않습니다. WXT가 자동으로 처리합니다.

### 개발/프로덕션 분기

```typescript
// WXT 제공 환경 변수
if (import.meta.env.DEV) {
  // 개발 환경 전용 코드
}

if (import.meta.env.PROD) {
  // 프로덕션 환경 전용 코드
}
```

## 디버깅

### Chrome DevTools

1. **Popup 디버깅**:
   - 확장 아이콘 우클릭 → "팝업 검사"

2. **Background Script 디버깅**:
   - `chrome://extensions` → TabQuest → "Service Worker" 클릭

3. **Options Page 디버깅**:
   - Options 페이지 열기 → F12

### Console 로깅

```typescript
// 개발 환경에서만 로그 출력
const log = (...args: any[]) => {
  if (import.meta.env.DEV) {
    console.log('[TabQuest]', ...args);
  }
};
```

### Storage 확인

```typescript
// 개발자 콘솔에서 실행
chrome.storage.sync.get(null, console.log);
chrome.storage.local.get(null, console.log);
```

## 테스팅

### 수동 테스트 시나리오

1. **탭 정리 테스트**:
   - 여러 도메인의 탭 열기
   - "Smart Organize" 클릭
   - 그룹이 올바르게 생성되는지 확인

2. **카테고리 관리**:
   - 새 카테고리 추가
   - 도메인 드래그 앤 드롭
   - 카테고리 삭제

3. **다국어 테스트**:
   - 언어 전환
   - 모든 UI 텍스트 확인

## 빌드 및 배포

### 프로덕션 빌드

```bash
npm run build
```

빌드 결과물은 `.output/chrome-mv3/` 폴더에 생성됩니다.

### 패키징

```bash
npm run package
```

이 명령어는 Chrome Web Store에 업로드할 수 있는 ZIP 파일을 생성합니다.

## 트러블슈팅

### 일반적인 문제

#### 1. HMR이 작동하지 않음
- **해결**: 확장 프로그램 리로드 (`chrome://extensions`에서 새로고침 버튼 클릭)

#### 2. TypeScript 에러
- **해결**: `npm run typecheck`로 타입 에러 확인

#### 3. Storage 권한 에러
- **해결**: manifest에 storage 권한 확인

#### 4. Tab Groups API 에러
- **해결**: Chrome 버전 확인 (v88 이상 필요)

### 개발 팁

1. **Chrome 프로필 분리**: 개발용 별도 프로필 사용 권장
2. **확장 ID 고정**: 개발 시 일관된 ID 유지
3. **로그 레벨 관리**: 프로덕션에서는 console.log 제거

## 리소스

- [WXT Documentation](https://wxt.dev)
- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/reference)
- [Manifest V3 Migration](https://developer.chrome.com/docs/extensions/mv3/intro)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Tailwind CSS](https://tailwindcss.com)