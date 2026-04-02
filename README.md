# KAAACI Map

대한천식알레르기학회 병원 검색 데이터를 기반으로 알레르기 전문 진료 병원을 지도에서 탐색하는 정적 웹 서비스입니다.

- Repository: `lekis1020/kaaaci-map`
- Production URL: `https://lekis1020.github.io/kaaaci-map/`

## 주요 기능

- 지역/진료과/키워드 기반 병원 검색
- 지도 + 리스트 동시 탐색
- Jext/Firazyr 처방 가능 병원 필터
- GitHub Pages 자동 배포

## 로컬 실행

```bash
npm install
npm run dev
```

기본 접속: `http://localhost:3000`

## 빌드/검증

```bash
npm run lint
NEXT_PUBLIC_BASE_PATH=/kaaaci-map npm run build
```

## 배포

`main` 브랜치에 푸시하면 GitHub Actions가 정적 빌드(`out/`) 후 GitHub Pages로 자동 배포합니다.

- workflow: `.github/workflows/deploy-pages.yml`
- Pages URL 형식: `https://<username>.github.io/<repo>/`

## 데이터 소스 및 동기화 기준

- 원천: `https://www.allergy.or.kr/general/hospitalSearch`
- 실제 데이터 엔드포인트: `https://www.allergy.or.kr/general/data`
- 동기화 원칙: 온라인(학회) 데이터를 truth source로 간주

현재 리포지토리 데이터 파일:

- `data/allergy-hospitals.json`

## 데이터 스키마

각 병원 항목은 아래 필드를 포함합니다.

- `name`: 병원명
- `region`: 시/도
- `district`: 구/군/시
- `address`: 주소
- `depts`: 진료과 목록
- `doctors`: 진료과별 의료진 목록
- `tel`: 대표 전화
- `lat`, `lng`: 지도 좌표
- `jext`: Jext 처방 가능 여부
- `firazyr`: Firazyr 처방 가능 여부

## 디렉터리 구조

```text
app/                       # Next.js App Router UI
data/allergy-hospitals.json # 병원 데이터
public/                    # 정적 자산
.github/workflows/         # Pages 배포 파이프라인
```
