// 건축HUB 건축인허가정보 서비스 타입 (getApBasisOulnInfo)

// ─────────────────────────────────────────
// 요청 파라미터
// ─────────────────────────────────────────
export interface BuildingPermitRequest {
  serviceKey: string;      // 공공데이터포털에서 발급받은 인증키 (필수)
  sigunguCd: string;       // 시군구코드 - 행정표준코드 (필수, 예: 11680 = 강남구)
  bjdongCd: string;        // 법정동코드 - 행정표준코드 (필수, 예: 10300)
  platGbCd?: string;       // 대지구분코드 - 0:대지, 1:산, 2:블록 (선택)
  bun?: string;            // 번 - 지번의 '번' (선택, 예: 0012)
  ji?: string;             // 지 - 지번의 '지' (선택, 예: 0004)
  startDate?: string;      // 검색시작일 - YYYYMMDD 형식 (선택)
  endDate?: string;        // 검색종료일 - YYYYMMDD 형식 (선택)
  numOfRows?: number;      // 리스트수 - 페이지당 목록 수 (선택, 기본값: 10)
  pageNo?: number;         // 페이지번호 (선택, 기본값: 1)
}

// ─────────────────────────────────────────
// 응답 item (건축물 1건)
// ─────────────────────────────────────────
export interface BuildingPermitItem {
  rnum: number;                // 순번
  platPlc: string;             // 대지위치 (예: 서울특별시 강남구 개포동 12-4번지)
  sigunguCd: string;           // 시군구코드
  bjdongCd: string;            // 법정동코드
  platGbCd: string;            // 대지구분코드 (0:대지, 1:산, 2:블록)
  bun: string;                 // 번
  ji: string;                  // 지
  mgmPmsrgstPk: string;        // 관리허가대장PK - 건축물 고유 식별자
  bldNm: string;               // 건물명
  splotNm: string;             // 특수지명
  block: string;               // 블록
  lot: string;                 // 로트
  jimokCdNm: string;           // 지목코드명 (예: 대)
  jiyukCdNm: string;           // 지역코드명 (예: 상대보호구역)
  jiguCdNm: string;            // 지구코드명 (예: 대공방어협조구역)
  guyukCd: string;             // 구역코드
  guyukCdNm: string;           // 구역코드명 (예: 지구단위계획구역)
  jimokCd: string;             // 지목코드 (예: 08)
  jiyukCd: string;             // 지역코드 (예: UOA120)
  jiguCd: string;              // 지구코드 (예: UNE200)
  archGbCd: string;            // 건축구분코드 (예: 0700)
  archGbCdNm: string;          // 건축구분코드명 (예: 용도변경)
  platArea: number;            // 대지면적 (㎡)
  archArea: number;            // 건축면적 (㎡)
  bcRat: number;               // 건폐율 (%)
  totArea: number;             // 연면적 (㎡)
  vlRatEstmTotArea: number;    // 용적률산정연면적 (㎡)
  vlRat: number;               // 용적률 (%)
  mainBldCnt: number;          // 주건축물수
  atchBldDongCnt: number;      // 부속건축물동수
  mainPurpsCd: string;         // 주용도코드 (예: 03000)
  mainPurpsCdNm: string;       // 주용도코드명 (예: 제1종근린생활시설)
  hhldCnt: number;             // 세대수 (세대)
  hoCnt: number;               // 호수 (호)
  fmlyCnt: number;             // 가구수 (가구)
  totPkngCnt: number;          // 총주차수
  stcnsSchedDay: string;       // 착공예정일 (YYYYMMDD)
  stcnsDelayDay: string;       // 착공연기일 (YYYYMMDD)
  realStcnsDay: string;        // 실제착공일 (YYYYMMDD)
  archPmsDay: string;          // 건축허가일 (YYYYMMDD)
  useAprDay: string;           // 사용승인일 (YYYYMMDD)
  crtnDay: string;             // 생성일자 (YYYYMMDD)
}

// ─────────────────────────────────────────
// 응답 헤더 타입
// ─────────────────────────────────────────
export interface BuildingPermitHeader {
  resultCode: string;   // 결과코드 ("00" = 정상)
  resultMsg: string;    // 결과메시지 (예: "NORMAL SERVICE")
}

// ─────────────────────────────────────────
// 응답 body 타입
// ─────────────────────────────────────────
export interface BuildingPermitBody {
  items: {
    item: BuildingPermitItem | BuildingPermitItem[]; // 단건이면 객체, 복수면 배열
  };
  numOfRows: number;   // 페이지당 목록 수
  pageNo: number;      // 현재 페이지번호
  totalCount: number;  // 전체 데이터 수
}

// ─────────────────────────────────────────
// 최상위 응답 타입
// ─────────────────────────────────────────
export interface BuildingPermitResponse {
  response: {
    header: BuildingPermitHeader;
    body: BuildingPermitBody;
  };
}

