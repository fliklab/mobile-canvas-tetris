# Mobile Canvas Arcade

Canvas 기반 모바일 웹 미니게임 아케이드입니다. 홈의 게임 셀렉터에서 게임을 고르고, 각 게임 화면의 HOME 버튼으로 목록으로 돌아갈 수 있습니다.

## Games

- **Tetris Touch**: 블록 회전/라인 클리어 테트리스
- **Snake Bite**: 먹이를 먹고 길어지는 스네이크

## Features

- TypeScript + Vite 기반 정적 프론트엔드
- 홈 게임 셀렉터 구조
- 게임별 Canvas 2D 렌더링
- 모바일 화면 최적화 레이아웃
- 화면 내 조이스틱과 게임 버튼
- 키보드 지원: 방향키, Space, P, R, Escape
- Vitest 기반 핵심 게임 로직 테스트

## Development

```bash
npm install
npm run dev
npm test
npm run build
```

## Deploy

Vercel 정적 사이트로 배포됩니다.
