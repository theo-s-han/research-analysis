import { escape as e, icon, jsonScript, urlPath } from './lib.mjs';

const tone = (category) => ({ '모델 리서치': 'blue', '벤치마크': 'violet', '업무 활용': 'green' })[category] || 'slate';
const categoryIcon = (category) => ({ '모델 리서치': 'layers', '벤치마크': 'chart', '업무 활용': 'spark' })[category] || 'file';
const date = (value) => value.replaceAll('-', '.');
const pageHead = (title, description, prefix = './') => `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${e(title)}</title>${description ? `<meta name="description" content="${e(description)}">` : ''}<meta name="theme-color" content="#162239"><link rel="icon" href="data:,"><link rel="stylesheet" href="${prefix}assets/site.css">`;

export function documentRow(doc, number, hidden = false) {
  return `<article class="document-row" data-document="${e(doc.id)}"${hidden ? ' hidden' : ''}>
    <div class="row-number">${String(number).padStart(2, '0')}</div>
    <div class="document-kind ${tone(doc.category)}">${icon(categoryIcon(doc.category))}</div>
    <div class="document-content"><div class="document-kicker"><span class="category-tag ${tone(doc.category)}">${e(doc.category)}</span>${doc.isLatest ? '<span class="latest-label">최근 업데이트</span>' : ''}</div>
      <h3><a class="document-title" href="./docs/${e(doc.slug)}/">${e(doc.title)}</a></h3><p>${e(doc.description)}</p>
      <div class="document-tags">${doc.tags.map((tag) => `<span>#${e(tag)}</span>`).join('')}</div>
    </div><div class="document-meta"><time datetime="${e(doc.updatedAt)}">${date(doc.updatedAt)}</time><span>${e(doc.author)}</span></div>
    <a class="document-open" href="./docs/${e(doc.slug)}/" aria-label="${e(doc.title)} 열기">${icon('arrow')}</a>
  </article>`;
}

export function board(config, documents, categories) {
  const latest = documents[0];
  return `${pageHead(config.title, config.description)}
<script id="research-data" type="application/json">${jsonScript({ documents, categories, pageSize: config.pageSize })}</script><script defer src="./assets/app.js"></script></head>
<body><a class="skip-link" href="#main">본문으로 이동</a>
<aside class="sidebar" aria-label="자료 탐색"><a class="brand" href="./" aria-label="${e(config.title)} 홈">${e(config.title)}</a>
  <div class="sidebar-divider"></div>
  <nav><a class="nav-home active" href="./" data-category="" aria-current="page">${icon('grid')}<span>자료 게시판</span><span class="nav-count">${documents.length}</span></a>
  <div class="nav-label category-label">분류</div><div class="category-navigation">${categories.map((category) => `<a href="?category=${encodeURIComponent(category.name)}" class="category-nav" data-category="${e(category.name)}">${icon(categoryIcon(category.name))}<span>${e(category.name)}</span><span class="nav-count">${category.count}</span></a>`).join('')}</div></nav>
  <div class="sidebar-bottom"><button class="guide-button" data-open-guide>${icon('book')}자료 추가 안내${icon('chevron')}</button></div>
</aside>
<div class="workspace"><header class="topbar"><div class="breadcrumb"><strong>${e(config.title)}</strong></div></header>
<main id="main"><section class="page-heading"><div><h1>${e(config.title)}<span class="heading-count">${documents.length}</span></h1></div><button class="button button-white copy-link" type="button">${icon('link')}게시판 링크 복사</button></section>
${latest ? `<section class="latest-document" aria-labelledby="latest-heading"><div class="latest-accent">${icon('file')}</div><div class="latest-body"><div class="latest-eyebrow"><span class="latest-dot"></span>최근 업데이트<span class="latest-date">${date(latest.updatedAt)}</span></div><h2 id="latest-heading"><a href="./docs/${e(latest.slug)}/">${e(latest.title)}</a></h2><p>${e(latest.description)}</p></div><a class="latest-open" href="./docs/${e(latest.slug)}/" aria-label="최근 자료 ${e(latest.title)} 읽기">자료 읽기${icon('arrow')}</a></section>` : ''}
<section class="board" aria-label="자료 목록"><div class="board-heading"><h2>전체 자료 <span id="total-count">${documents.length}</span></h2><span class="board-caption">${categories.length}개 분류<span class="separator">/</span>업데이트순</span></div>
<div class="board-toolbar"><div class="search-field">${icon('search')}<label class="sr-only" for="search">자료 검색</label><input type="search" id="search" autocomplete="off" placeholder="제목, 내용, 태그로 검색" aria-controls="document-list"><button class="search-clear" type="button" aria-label="검색어 지우기" hidden>${icon('close')}</button><kbd>/</kbd></div><div class="toolbar-options"><label class="sr-only" for="sort">정렬</label><select id="sort"><option value="updated">최근 업데이트순</option><option value="oldest">오래된순</option><option value="title">제목순</option></select><div class="view-switch" aria-label="보기 방식"><button class="view-button selected" type="button" data-view="list" aria-label="목록으로 보기" aria-pressed="true">${icon('list')}</button><button class="view-button" type="button" data-view="grid" aria-label="카드로 보기" aria-pressed="false">${icon('grid')}</button></div></div></div>
<div class="filter-tabs" role="group" aria-label="분류 필터"><button class="filter-tab selected" type="button" data-filter="" aria-pressed="true">전체<span>${documents.length}</span></button>${categories.map((category) => `<button class="filter-tab" type="button" data-filter="${e(category.name)}" aria-pressed="false">${e(category.name)}<span>${category.count}</span></button>`).join('')}</div>
<div class="list-header" aria-hidden="true"><span>번호</span><span>자료</span><span>수정일 · 작성자</span><span></span></div>
<div id="document-list" class="document-list">${documents.map((doc, index) => documentRow(doc, documents.length - index)).join('')}</div>
<div id="empty-state" class="empty-state"${documents.length ? ' hidden' : ''}>${icon('search')}<h3>찾으시는 자료가 없습니다</h3><p>다른 검색어를 입력하거나 분류를 바꿔보세요.</p><button class="button button-white" id="reset-filters" type="button">전체 자료 보기</button></div>
<div class="board-footer"><p id="result-summary" role="status" aria-live="polite">전체 ${documents.length}개의 자료</p><nav id="pagination" aria-label="자료 목록 페이지"></nav></div></section>
<footer class="page-footer">${latest ? `<span>마지막 자료 업데이트 ${date(latest.updatedAt)}</span>` : ''}<button class="mobile-guide" type="button" data-open-guide>${icon('book')}자료 추가 안내</button></footer>
<noscript><p class="noscript">검색·분류 기능을 사용하려면 JavaScript를 켜주세요. 아래 목록의 모든 자료는 바로 열 수 있습니다.</p></noscript>
</main></div>
<dialog id="add-guide" aria-labelledby="guide-title"><form method="dialog"><button class="dialog-close" aria-label="안내 닫기">${icon('close')}</button></form><div class="dialog-icon">${icon('book')}</div><h2 id="guide-title">새 자료 추가하기</h2><p>HTML 자료를 추가하면 제목을 읽어 게시판에 자동으로 등록합니다.</p><ol class="guide-steps"><li><strong>HTML 파일 준비</strong><span>제목이 포함된 HTML을 준비하세요. 이미지와 스타일 파일이 따로 있으면 함께 준비합니다.</span></li><li><strong>자료 폴더에 추가</strong><span>GitHub 저장소의 <code>content/</code>에 파일을 올리고 변경사항을 저장하세요. 폴더 구조는 그대로 유지합니다.</span></li><li><strong>자동 배포 확인</strong><span>배포가 완료되면 메인 목록과 개별 자료 주소가 함께 갱신됩니다.</span></li></ol><div class="guide-note">분류·요약·태그는 선택사항입니다. 관리자는 저장소의 README에서 상세한 추가 방법을 확인할 수 있습니다.</div><button class="button button-primary" type="button" data-close-guide>확인했습니다</button></dialog>
<div id="toast" class="toast" role="status" aria-live="polite" hidden></div>
</body></html>`;
}

export function reader(config, doc) {
  return `${pageHead(`${doc.title} · ${config.title}`, doc.description, '../../')}<script defer src="../../assets/reader.js"></script></head><body class="reader-page"><a class="skip-link" href="#document-frame">자료 본문으로 이동</a>
<header class="reader-toolbar"><a class="reader-back" href="../../" aria-label="자료 게시판으로 돌아가기">${icon('back')}<span>자료 게시판</span></a><div class="reader-divider"></div><div class="reader-heading"><div><span class="category-tag ${tone(doc.category)}">${e(doc.category)}</span><time datetime="${e(doc.updatedAt)}">${date(doc.updatedAt)}</time></div><h1>${e(doc.title)}</h1></div><div class="reader-actions"><button class="button button-white copy-link" type="button">${icon('link')}<span>링크 복사</span></button><a class="button button-white" href="../../materials/${urlPath(doc.file)}" target="_blank" rel="noopener">${icon('arrow')}<span>원문 열기</span></a></div></header>
<main class="reader-content"><iframe id="document-frame" src="../../materials/${urlPath(doc.file)}" title="${e(doc.title)}" referrerpolicy="strict-origin-when-cross-origin"></iframe></main><div id="toast" class="toast" role="status" aria-live="polite" hidden></div></body></html>`;
}

export function notFound(config) {
  return `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>자료를 찾을 수 없습니다 · ${e(config.title)}</title><style>body{font-family:system-ui,'Malgun Gothic',sans-serif;background:#f5f7fb;color:#17243b;margin:0;display:grid;min-height:100vh;place-items:center}main{max-width:540px;padding:40px}small{color:#456bec;font-weight:700}h1{font-size:30px}p{line-height:1.8;color:#586479}a{color:#315ade}</style><main><small>404</small><h1>자료를 찾을 수 없습니다</h1><p>주소가 변경되었거나 삭제된 자료일 수 있습니다.<br>게시판에서 원하는 자료를 다시 찾아보세요.</p><a id="home" href="./">자료 게시판으로 돌아가기 →</a></main><script>const parts=location.pathname.split('/').filter(Boolean);document.getElementById('home').href=location.hostname.endsWith('.github.io')&&parts.length?'/'+parts[0]+'/':'/';</script></html>`;
}
