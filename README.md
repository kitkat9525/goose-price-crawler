# 구초뉴스

거위털·오리털 원자재 시장 데이터 대시보드 (내부용)

CFD 시세·환율·관세청 수입통계·국내외 뉴스·네이버 쇼핑 트렌드·SNS 인사이트를 한 화면에서 확인합니다.

## 환경변수

`.env.local` 에 아래 값을 설정합니다. 선택 항목이 없으면 해당 섹션이 비활성화됩니다.

```env
JWT_SECRET=                  # 필수 — JWT 서명 시크릿

CUSTOMS_API_KEY=             # 관세청 공공데이터 API (data.go.kr)
NAVER_CLIENT_ID=             # 네이버 검색·쇼핑·데이터랩 API
NAVER_CLIENT_SECRET=         # ※ 데이터랩(쇼핑인사이트) 권한 별도 추가 필요
YOUTUBE_API_KEY=             # YouTube Data API v3

TURSO_DATABASE_URL=          # Turso DB (없으면 로컬 SQLite 사용)
TURSO_AUTH_TOKEN=
```

## 실행

```bash
npm install
npm run dev   # http://localhost:3000
```

배포는 Vercel에 연결 후 위 환경변수를 동일하게 추가하면 됩니다.

## 데이터 출처

| 소스 | 내용 | 갱신 |
|------|------|------|
| [CFD 중국우모협회](https://www.cfd.com.cn) | 거위털·오리털 도매 시세 | 주 1회 |
| [open.er-api.com](https://open.er-api.com) | 환율 (CNY 기준) | 시간 단위 |
| [관세청 data.go.kr](https://www.data.go.kr/data/15101609/openapi.do) | HS 0505100000 수입통계 | 월 1회 |
| 네이버 뉴스·쇼핑·데이터랩 API | 국내 뉴스·쇼핑·인사이트 | 1시간 캐시 |
| Google News RSS | 해외 영문 뉴스 | 1시간 캐시 |
| YouTube Data API v3 | 채널 최신 영상 | 1시간 캐시 |
| 네이버 쇼핑라이브 | 이불 최신 라이브 (iframe) | 실시간 |

참고용 데이터입니다. 투자·구매 결정의 직접 근거로 사용하지 마세요.
