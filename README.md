# 구초뉴스

거위털·오리털 원자재 시장 데이터 대시보드. 내부용.

## 주요 기능

- **CFD 시세** — 중국우모협회 주간 도매가 (거위털·오리털, 70~95% 등급별)
- **실시간 환율** — CNY/USD/KRW/EUR, 통화 전환 지원
- **관세청 수입통계** — HS 0505100000 월별 수입량·금액·단가 추이
- **국내·해외 뉴스** — 네이버 뉴스 API / Google News RSS
- **네이버 쇼핑 트렌드** — 구스이불·구스베개·구스토퍼 상품 캐러셀 + 가격분포
- **네이버 쇼핑 인사이트** — 키워드별 월별 클릭 트렌드 + 기기별·성별·연령별 분포 (데이터랩 API)
- **의견 보내기** — SQLite(Turso) 저장

## 환경변수

`.env.local` 파일을 만들고 아래 값을 설정합니다.

```env
# JWT 서명 시크릿 (필수)
JWT_SECRET=your-secret-key

# 관세청 공공데이터 API (선택 — 없으면 수입통계 섹션 비활성)
# 발급: https://www.data.go.kr/data/15101609/openapi.do
CUSTOMS_API_KEY=

# 네이버 검색/쇼핑/데이터랩 API (선택 — 없으면 뉴스·쇼핑·인사이트 섹션 비활성)
# 발급: https://developers.naver.com/apps
# ※ 쇼핑인사이트 사용 시 앱 설정에서 "데이터랩(쇼핑인사이트)" 권한 추가 필요
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=

# Turso DB (선택 — 없으면 로컬 SQLite 파일 사용)
# 발급: https://turso.tech
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

## 로컬 실행

```bash
npm install
npm run dev
```

`http://localhost:3000` 에서 확인.

## 배포

Vercel에 연결 후 위 환경변수를 동일하게 추가하면 됩니다.

## 데이터 출처

| 소스 | 내용 | 갱신 주기 |
|------|------|----------|
| [CFD 중국우모협회](https://www.cfd.com.cn) | 거위털·오리털 도매 시세 | 주 1회 |
| [open.er-api.com](https://open.er-api.com) | CNY 기준 환율 | 시간 단위 |
| [관세청 data.go.kr](https://www.data.go.kr/data/15101609/openapi.do) | HS 0505100000 수입통계 | 월 1회 |
| 네이버 뉴스 API | 국내 뉴스 | 1시간 캐시 |
| Google News RSS | 해외 영문 뉴스 | 1시간 캐시 |
| 네이버 쇼핑 API | 상품 목록·가격분포 | 1시간 캐시 |
| 네이버 데이터랩 쇼핑인사이트 API | 키워드 클릭 트렌드·기기·성별·연령별 | 1시간 캐시 |

---

참고용 데이터입니다. 투자·구매 결정의 직접 근거로 사용하지 마세요.
