# GeoFinder

관광지/유명 구조물의 명칭을 검색하여 위도·경도 좌표를 찾고, 저장 목록을 관리하며 CSV로 내보낼 수 있는 웹 앱입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

빌드 결과물은 `dist/` 폴더에 생성됩니다.

## GitHub Pages 배포

이 프로젝트는 **Vite `base: './'` 설정**이 적용되어, GitHub Pages처럼 하위 경로에서 호스팅해도 정적 파일 경로가 깨지지 않도록 구성되어 있습니다.

### 방법 1) GitHub Actions로 자동 배포 (권장)

- `main` 브랜치에 push 하면 자동으로 빌드 후 GitHub Pages에 배포됩니다.
- 저장소 Settings → Pages에서 **Source를 GitHub Actions**로 설정하세요.

### 방법 2) 수동 배포

`dist/` 폴더 내용을 GitHub Pages가 서빙하는 브랜치/폴더에 업로드하면 됩니다.
