# 자료분석

HTML 조사 자료를 개별 주소로 공유하는 정적 자료실입니다. 검색, 분류, 정렬, 목록/카드 보기, 페이지 나누기, 링크 복사를 제공합니다. 원본 HTML의 표·차트·필터는 그대로 실행하며, 게시판과 자료 페이지를 함께 생성합니다.

저장소 이름은 여러 주제의 자료를 포괄하는 `research-analysis`, 사이트 표시 이름은 **자료분석**입니다.

- 공유 사이트: [자료 분석](https://theo-s-han.github.io/research-analysis/)
- 저장소: [theo-s-han/research-analysis](https://github.com/theo-s-han/research-analysis)
- Codex 가이드: [Codex 모델 선택 가이드](https://theo-s-han.github.io/research-analysis/docs/codex-model-guide-20260909/)

이 저장소와 게시 자료는 누구나 볼 수 있는 공개 자료입니다. 회사 기밀·개인정보·인증정보는 올리지 마세요. 다른 저장소의 공개 범위는 변경하지 않습니다.

## 새 HTML 추가하기

가장 간단한 방법은 GitHub 저장소의 `content/` 폴더에 HTML 파일을 업로드하고 `main`에 저장하는 것입니다. GitHub Actions가 게시판 목록과 개별 페이지를 만들고 Pages에 배포합니다. 메인 화면을 직접 수정할 필요가 없습니다.

1. `content/`를 열고 **Add file → Upload files**로 HTML을 추가합니다.
2. 별도 CSS·JS·이미지가 있다면 상대 경로를 유지해 함께 추가합니다. 예를 들어 `content/my-report/index.html`, `content/my-report/assets/chart.png`로 구성할 수 있습니다.
3. 변경사항을 저장한 뒤 저장소 **Actions**에서 배포 완료를 확인합니다.
4. 게시판에서 자료를 열고 **링크 복사**로 공유합니다.

배포 방식은 저장소 **Settings → Pages → Build and deployment → Source**의 **GitHub Actions**입니다. `main`의 자료·사이트 코드 변경 시 자동 배포되며 README와 검증 기록만 바꿀 때는 배포를 생략합니다. GitHub Pages에는 공개 사이트와 정적 파일만 게시되며 댓글·회원가입·브라우저 내 파일 업로드 기능은 포함하지 않습니다.

## 공유 폴더에서 한 번에 가져오기

Node.js 22 이상이면 추가 패키지 설치 없이 실행할 수 있습니다.

```powershell
npm run import -- --from "자료조사 폴더의 전체 경로"
npm run build
npm run check
npm run preview
```

가져오기는 원본을 변경하지 않고 HTML과 연결 파일을 `content/`에 복사합니다. 원본에서 빠진 기존 자료도 자동 삭제하지 않습니다. 게시용 파일이 별도로 수정되어 원본과 충돌하면 덮어쓰지 않고 중단합니다. 파일 서버를 실시간 감시하지 않으므로 공유 폴더를 바꾼 뒤에는 다시 가져와 저장소에 반영해야 합니다. 업로드·커밋·푸시는 가져오기 명령이 자동 실행하지 않습니다.

기본 가져오기 형식은 HTML, CSS, JS, 이미지, 폰트, PDF, CSV, MP4, WebM입니다. 자료에 필요한 다른 파일 형식은 `content/`에 직접 추가하거나 `scripts/import.mjs`의 형식 목록에 추가하세요. 불필요한 비공개 파일은 `content/`에 넣지 않습니다.

## 제목·분류·요약·태그

HTML의 `<title>`을 제목으로 읽습니다. 분류는 상위 폴더명, 폴더가 없으면 `일반 자료`입니다. 설명은 description 메타데이터 또는 첫 문단을 사용합니다. 분류는 새 이름이 생기면 자동으로 늘어납니다.

선택적으로 HTML의 `<head>`에 다음 메타데이터를 넣을 수 있습니다.

```html
<title>새로운 기술 조사</title>
<meta name="description" content="자료의 핵심 내용을 한두 문장으로 정리합니다.">
<meta name="research:category" content="기술 동향">
<meta name="research:tags" content="AI, 업무 자동화, 리서치">
<meta name="research:slug" content="new-technology-research">
```

원본 HTML을 수정하지 않고 관리하려면 `content/catalog.json`에 파일의 상대 경로를 키로 추가하세요. 이 파일의 설정이 HTML 메타데이터보다 우선합니다.

```json
{
  "새로운 기술 조사.html": {
    "slug": "new-technology-research",
    "title": "새로운 기술 조사",
    "description": "자료 요약",
    "category": "기술 동향",
    "tags": ["AI", "업무 자동화"],
    "author": "Theo"
  }
}
```

`slug`는 영문 소문자·숫자·하이픈으로 지정하는 주소 이름입니다. 지정하지 않으면 파일명과 고정 해시로 만듭니다. 파일명을 유지하면 내용이 바뀌어도 주소는 그대로입니다. 파일명을 바꿔도 기존 링크를 유지하려면 동일한 `slug`를 명시하세요. 같은 주소를 중복 지정하면 배포를 중단합니다.

게시판에 나올 필요가 없는 보조 HTML에는 `<meta name="research:listed" content="false">`를 넣을 수 있습니다. 보조 파일도 정적 파일로 공개되므로 이 설정은 접근 제한 기능이 아닙니다.

검색은 제목·태그·요약 및 자료 본문 앞부분(최대 180,000자)을 대상으로 합니다. 띄어 쓴 검색어는 모두 포함되는 자료를 찾습니다. 검색·분류·정렬·페이지 상태는 URL에 반영되어 그대로 공유할 수 있습니다. 기본 페이지당 자료 수는 12개이며 `site.config.json`에서 바꿀 수 있습니다.

## 자료 갱신과 날짜

같은 파일을 교체하면 동일한 개별 주소로 갱신됩니다. 자료를 제거하려면 `content/`에서 해당 HTML을 삭제하고 catalog 설정도 정리합니다. `dist/`는 빌드할 때 새로 생성하므로 삭제된 자료의 생성 페이지가 남지 않습니다.

공유 폴더에서 가져온 원본은 `.source-info.json`의 SHA-256과 수정 시각으로 원래 수정일을 표시합니다. 이후 GitHub에서 직접 수정하면 해당 파일의 마지막 Git 커밋 날짜를 사용합니다. 원문에 포함된 조사 기준일과 수치는 별도로 보존하며 빌드 시 사실 검증이나 최신화는 하지 않습니다.

## 구조

```text
content/              원본 HTML과 연결 파일
  catalog.json        선택적 제목·분류·주소 설정
  .source-info.json   가져온 원본 해시·수정 시각
web/                  게시판 스타일과 브라우저 스크립트
scripts/              가져오기·생성·미리보기·검증
site.config.json      게시판 이름, 설명, 작성자, 페이지 크기
.github/workflows/    GitHub Pages 자동 배포
dist/                 생성된 게시 사이트 (Git 추적 제외)
  index.html          게시판 메인
  docs/<slug>/        개별 자료 화면
  materials/          변경하지 않은 원본 HTML과 연결 파일
```

사이트의 모든 내부 링크는 상대 경로이므로 `https://계정.github.io/저장소/` 형태의 프로젝트 사이트에서도 작동합니다. 외부 리소스를 쓰는 새 HTML은 HTTPS URL을 사용하고, 로컬 파일 경로나 `/assets/...` 같은 도메인 루트 경로는 상대 경로로 바꾸세요. 파일명은 한글과 공백을 지원하며 Linux 배포 환경에서는 대소문자를 정확히 맞춰야 합니다.

## 로컬 미리보기

```powershell
npm run build
npm run preview
```

`http://127.0.0.1:4173/`에서 열립니다. 포트나 프로젝트 하위 경로를 바꿔 검증할 수 있습니다.

```powershell
npm run preview -- --port 4175 --base /research-analysis/
```

`dist/index.html`은 게시판의 정적 산출물입니다. 개별 자료 탐색은 위 미리보기 주소 또는 배포된 사이트에서 확인하세요. 링크 복사는 브라우저의 보안 정책에 따라 주소 복사 창으로 대체될 수 있습니다.

배포 설정은 [GitHub Pages 공식 사용자 지정 워크플로 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)를 따릅니다.
