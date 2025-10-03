# TabQuest Documentation

## 📚 목차

### 핵심 문서
- [아키텍처 개요](./architecture.md) - 시스템 구조 및 설계
- [핵심 기능](./core-features.md) - 주요 기능 상세 설명
- [상태 관리](./state-management.md) - Zustand 스토어 구조
- [API 레퍼런스](./api-reference.md) - Chrome Extension API 사용

### 기능별 가이드
- [탭 정리 시스템](./tab-organization.md) - 탭 그룹화 로직
- [사용량 추적](./usage-tracking.md) - 탭 사용 시간 및 통계
- [카테고리 시스템](./category-system.md) - 카테고리 관리 및 매핑
- [AI 인사이트](./ai-insights.md) - 스마트 제안 시스템

### 개발 가이드
- [개발 환경 설정](./development-setup.md)
- [디버깅 가이드](./debugging.md)
- [배포 프로세스](./deployment.md)

## 🚀 빠른 시작

TabQuest는 WXT 프레임워크 기반의 Chrome Extension으로, 사용자의 탭을 스마트하게 관리하는 도구입니다.

### 주요 특징
- 🎯 **스마트 탭 정리**: 도메인 및 카테고리 기반 자동 그룹화
- 📊 **사용량 추적**: 실시간 탭 사용 시간 모니터링
- 🏷️ **카테고리 관리**: 커스텀 카테고리로 탭 분류
- 🤖 **AI 인사이트**: 생산성 향상을 위한 스마트 제안
- 🌍 **다국어 지원**: 한국어, 영어, 일본어 지원

### 프로젝트 구조
```
tab-quest/
├── docs/               # 📚 문서
├── src/
│   ├── entrypoints/   # 🚪 진입점 (popup, background, options)
│   ├── components/    # 🧩 React 컴포넌트
│   ├── store/         # 📦 상태 관리 (Zustand)
│   ├── utils/         # 🔧 유틸리티 함수
│   ├── lib/           # 📚 핵심 라이브러리
│   └── locales/       # 🌐 다국어 번역
└── public/            # 🖼️ 정적 자원
```

## 📖 상세 문서

각 문서는 특정 주제에 대해 깊이 있는 정보를 제공합니다. 개발을 시작하기 전에 [아키텍처 개요](./architecture.md)를 먼저 읽어보시는 것을 추천합니다.