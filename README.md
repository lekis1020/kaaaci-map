# KAAACI Allergy Map (GitHub Pages)

알레르기 전문 진료 가능 병원 지도 서비스의 독립 배포 저장소입니다.

## 1) 로컬 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 2) GitHub Pages 배포

이 저장소는 `main` 브랜치에 push 하면 GitHub Actions가 자동으로 정적 빌드(`out/`)를 생성해 Pages로 배포합니다.

필수 설정:

1. GitHub 저장소 `Settings > Pages > Source`를 `GitHub Actions`로 설정
2. `main` 브랜치에 코드 push
3. Actions의 `Deploy to GitHub Pages` 워크플로 완료 확인

배포 URL 형식:

`https://<github-username>.github.io/<repository-name>/`

## 3) 데이터 업데이트

병원 데이터 파일: `data/allergy-hospitals.json`
