(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('research-data').textContent);
  const documents = data.documents;
  const normalize = (value) => value.normalize('NFKC').toLocaleLowerCase('ko').replace(/\s+/g, ' ').trim();
  const searchable = new Map(documents.map((doc) => [doc.id, normalize([doc.title, doc.description, doc.category, ...doc.tags, doc.searchText].join(' '))]));
  const rows = new Map([...document.querySelectorAll('[data-document]')].map((row) => [row.dataset.document, row]));
  const list = document.getElementById('document-list');
  const input = document.getElementById('search');
  const sort = document.getElementById('sort');
  const pagination = document.getElementById('pagination');
  const pageSize = Math.max(1, Number(data.pageSize) || 12);
  const state = { query: '', category: '', sort: 'updated', page: 1, view: 'list' };
  let toastTimer;
  function toast(message, duration = 2600) {
    const element = document.getElementById('toast');
    element.textContent = message;
    element.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { element.hidden = true; }, duration);
  }
  function fromURL() {
    const params = new URLSearchParams(location.search);
    state.query = params.get('q') || '';
    state.category = params.get('category') || '';
    state.sort = ['updated', 'oldest', 'title'].includes(params.get('sort')) ? params.get('sort') : 'updated';
    state.page = Math.max(1, parseInt(params.get('page'), 10) || 1);
    state.view = params.get('view') === 'grid' ? 'grid' : 'list';
    input.value = state.query;
    sort.value = state.sort;
  }
  function updateURL() {
    const params = new URLSearchParams();
    if (state.query) params.set('q', state.query);
    if (state.category) params.set('category', state.category);
    if (state.sort !== 'updated') params.set('sort', state.sort);
    if (state.page > 1) params.set('page', state.page);
    if (state.view === 'grid') params.set('view', state.view);
    const suffix = params.toString();
    history.replaceState(null, '', location.pathname + (suffix ? '?' + suffix : '') + location.hash);
  }
  function pageButton(label, page, disabled, className, accessibleLabel) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = `page-button ${className || ''}`;
    button.disabled = disabled;
    button.setAttribute('aria-label', accessibleLabel || `${page}페이지`);
    if (page === state.page && !className) { button.classList.add('active'); button.setAttribute('aria-current', 'page'); }
    button.addEventListener('click', () => { state.page = page; render(); document.querySelector('.board-heading').scrollIntoView({ behavior: 'auto', block: 'start' }); });
    return button;
  }
  function render(syncURL = true) {
    const terms = normalize(state.query).split(' ').filter(Boolean);
    const matches = documents.filter((doc) => (!state.category || doc.category === state.category) && terms.every((term) => searchable.get(doc.id).includes(term)));
    matches.sort((a, b) => state.sort === 'title' ? a.title.localeCompare(b.title, 'ko') : (state.sort === 'oldest' ? a.updatedAt.localeCompare(b.updatedAt) : b.updatedAt.localeCompare(a.updatedAt)) || a.title.localeCompare(b.title, 'ko'));
    const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
    state.page = Math.min(pageCount, Math.max(1, state.page));
    const start = (state.page - 1) * pageSize;
    rows.forEach((row) => { row.hidden = true; });
    matches.slice(start, start + pageSize).forEach((doc) => { const row = rows.get(doc.id); row.hidden = false; list.append(row); });
    document.getElementById('empty-state').hidden = matches.length !== 0;
    document.getElementById('total-count').textContent = matches.length;
    document.getElementById('result-summary').textContent = state.query || state.category ? `전체 ${documents.length}개 중 ${matches.length}개${state.query ? ` · “${state.query}”` : ''}` : `전체 ${documents.length}개의 자료`;
    document.querySelector('.board-caption').textContent = `${data.categories.length}개 분류 / ${state.sort === 'title' ? '제목순' : state.sort === 'oldest' ? '오래된순' : '업데이트순'}`;
    document.querySelector('.search-clear').hidden = !state.query;
    document.querySelector('.search-field kbd').hidden = !!state.query;
    document.querySelectorAll('[data-filter]').forEach((button) => { const selected = button.dataset.filter === state.category; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); });
    document.querySelectorAll('[data-category]').forEach((link) => { const selected = link.dataset.category === state.category; link.classList.toggle('active', selected); if (selected) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
    document.querySelectorAll('[data-view]').forEach((button) => { const selected = button.dataset.view === state.view; button.classList.toggle('selected', selected); button.setAttribute('aria-pressed', String(selected)); });
    list.classList.toggle('grid-view', state.view === 'grid');
    document.querySelector('.list-header').hidden = state.view === 'grid' || matches.length === 0;
    pagination.replaceChildren();
    pagination.append(pageButton('‹', state.page - 1, state.page === 1, 'prev', '이전 페이지'));
    const pages = [...new Set([1, state.page - 1, state.page, state.page + 1, pageCount])].filter((page) => page > 0 && page <= pageCount).sort((a, b) => a - b);
    pages.forEach((page, index) => { if (index && page - pages[index - 1] > 1) { const gap = document.createElement('span'); gap.textContent = '…'; gap.className = 'pagination-gap'; pagination.append(gap); } pagination.append(pageButton(String(page), page, false)); });
    pagination.append(pageButton('›', state.page + 1, state.page === pageCount, 'next', '다음 페이지'));
    if (syncURL && location.protocol !== 'file:') updateURL();
  }
  function reset() { state.query = ''; state.category = ''; state.page = 1; input.value = ''; render(); }
  input.addEventListener('input', () => { state.query = input.value; state.page = 1; render(); });
  sort.addEventListener('change', () => { state.sort = sort.value; state.page = 1; render(); });
  document.querySelector('.search-clear').addEventListener('click', () => { state.query = ''; state.page = 1; input.value = ''; render(); input.focus(); });
  document.getElementById('reset-filters').addEventListener('click', reset);
  document.querySelectorAll('[data-filter], [data-category]').forEach((control) => control.addEventListener('click', (event) => { if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return; event.preventDefault(); state.category = control.dataset.filter ?? control.dataset.category; state.page = 1; render(); }));
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => { state.view = button.dataset.view; render(); }));
  document.addEventListener('keydown', (event) => { if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && !document.activeElement.isContentEditable && !document.getElementById('add-guide').open) { event.preventDefault(); input.focus(); } });
  const dialog = document.getElementById('add-guide');
  document.querySelectorAll('[data-open-guide]').forEach((button) => button.addEventListener('click', () => dialog.showModal()));
  document.querySelectorAll('[data-close-guide]').forEach((button) => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('click', (event) => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); } });
  document.querySelector('.copy-link').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); toast('게시판 링크를 복사했습니다.'); }
    catch { window.prompt('이 주소를 복사해 공유하세요.', location.href); }
  });
  // Preserve the current search and category when returning from an individual document.
  list.addEventListener('click', (event) => { if (event.target.closest('a')) { try { sessionStorage.setItem('research-board-return', location.href); } catch { /* Storage may be disabled. */ } } });
  window.addEventListener('popstate', () => { fromURL(); render(false); });
  fromURL();
  render(false);
})();
