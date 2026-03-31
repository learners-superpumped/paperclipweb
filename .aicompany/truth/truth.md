# paperclipweb — Truth Document

> 최종 업데이트: 2026-03-31

## 서비스 정의

paperclipweb은 Paperclip(오픈소스 AI 에이전트 오케스트레이션 플랫폼)의 호스팅 서비스다. 사용자가 직접 서버를 세팅하지 않아도 Paperclip을 바로 쓸 수 있게 해주는 웹 래퍼(wrapper)이며, Stripe 구독 + 토큰 사용량 기반 과금 하이브리드 모델로 수익화한다.

## Paperclip이란

- **정체**: Node.js 서버 + React UI로 구성된 AI 에이전트 오케스트레이션 플랫폼
- **용도**: AI 에이전트 팀을 조직도/목표/예산/거버넌스 구조로 관리하여 "제로 휴먼 회사"를 운영
- **라이선스**: MIT 오픈소스
- **개발자**: @dotta
- **GitHub Stars**: 30,000+ (2026년 3월 기준, 출시 3주 만에 달성)
- **요구사항**: Node.js 20+, pnpm 9+, PostgreSQL
- **핵심 기능**:
  - 조직도 기반 에이전트 위임 체계 (CEO → CTO → Engineer)
  - 목표 정렬 — 모든 태스크가 회사 미션에 연결
  - 거버넌스 + 롤백 — 승인 게이트, 설정 변경 버전관리
  - 멀티 컴퍼니 격리 — 하나의 배포에서 여러 회사 독립 운영
  - 회사 템플릿 내보내기/가져오기
  - Clipmart (예정) — 프리빌트 회사 템플릿 마켓

## 경쟁 환경

### PaperclipCloud (직접 경쟁사)
- URL: paperclipcloud.com
- 가격:
  - Hobby: $15/mo (1 company, 표준 서버)
  - Entrepreneur: $69/mo (5 companies, 빠른 서버, 주간 백업)
  - Scale: $149/mo (무제한 companies, 최고 서버, 일일 백업, 커스텀 도메인)
- 모델: BYOK (사용자가 AI API 키 직접 입력), 번들 크레딧 예정
- 3일 환불 보장

### 기타 경쟁/대안
- Railway/Hostinger/Zeabur 원클릭 배포 (직접 호스팅)
- Dify, CrewAI, AutoGen (다른 에이전트 프레임워크)
- Agent Zero (Docker 샌드박스 기반)

## paperclipweb 차별화

1. **토큰 기반 사용량 과금**: PaperclipCloud는 BYOK인데, paperclipweb은 토큰을 충전/소진하는 방식으로 AI API 비용까지 포함 (사용자가 별도 API 키 필요 없음)
2. **월 구독 + 사용량 하이브리드**: 기본 구독료 + 초과 사용량에 대한 토큰 과금
3. **원스톱**: 서버 + DB + AI API 키 + 모니터링을 한 번에 제공

## 검증된 사실 (Verified Claims)

- Paperclip은 MIT 라이선스 오픈소스다 (출처: GitHub)
- 2026년 3월 초 출시, 3주 만에 GitHub 30K+ stars (출처: eWeek, Medium)
- Node.js 20+ / pnpm 9+ / PostgreSQL 필요 (출처: 공식 문서)
- PaperclipCloud는 $15/$69/$149 월 구독 (출처: paperclipcloud.com)
- PaperclipCloud는 BYOK 모델, 번들 크레딧은 "coming soon" (출처: paperclipcloud.com)
- Paperclip은 챗봇이 아니고, 에이전트 프레임워크도 아니고, 워크플로우 빌더도 아님 (출처: GitHub README)

## 미검증 가설 (Unverified)

- 사용자들이 BYOK보다 토큰 번들을 선호할 것이다
- 월 $X 가격대에서 전환이 일어날 것이다
- Paperclip 사용자 중 셀프호스팅을 포기하고 호스팅으로 넘어오는 비율
