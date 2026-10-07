(() => {
  'use strict';
  const table = document.getElementById('tbl');
  const toolbar = document.querySelector('.toolbar');
  const rows = () => [...table.tBodies[0].rows];
  const headers = [...table.tHead.rows[0].cells];
  const menus = [];
  const groups = [];
  let openMenu = null;
  const defaultColumns = new Set([1, 2, 4, 8, 9, 11, 12, 13, 15, 17, 28, 37]);
  const selectedColumns = new Set(defaultColumns);
  const empty = document.createElement('div'); empty.id = 'llmTableEmpty'; empty.className = 'llm-table-empty';
  empty.textContent = '조건에 맞는 모델 없음'; empty.hidden = true; table.after(empty);
  const columnWidths = headers.map((header, index) => ({0:45,1:105,2:240,3:115,4:150,6:100,8:110,9:165,18:300,25:300,26:220,27:170,37:320})[index] || Math.max(120, header.textContent.trim().length * 8 + 30));
  const colgroup = document.createElement('colgroup');
  const columns = headers.map((_, index) => {
    const column = document.createElement('col'); column.style.width = columnWidths[index] + 'px'; colgroup.append(column); return column;
  });
  table.prepend(colgroup);

  function closeMenu(restoreFocus = false) {
    if (!openMenu) return;
    const previous = openMenu;
    previous.panel.hidden = true; previous.button.setAttribute('aria-expanded', 'false'); openMenu = null;
    if (restoreFocus) previous.button.focus();
  }
  function positionMenu(menu) {
    const bounds = menu.button.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const width = Math.min(300, viewportWidth - 24);
    const below = window.innerHeight - bounds.bottom - 12;
    const above = bounds.top - 12;
    const upwards = below < 180 && above > below;
    menu.panel.style.width = width + 'px';
    menu.panel.style.maxHeight = Math.max(100, Math.min(440, upwards ? above - 8 : below - 8)) + 'px';
    menu.panel.style.left = Math.max(12, Math.min(bounds.left, viewportWidth - width - 12)) + 'px';
    menu.panel.style.top = '';
    menu.panel.style.bottom = '';
    if (upwards) menu.panel.style.bottom = (window.innerHeight - bounds.top + 6) + 'px';
    else menu.panel.style.top = bounds.bottom + 6 + 'px';
  }
  function createMenu({id, label, items, selected, onChange, allLabel, partialLabel, stableLabel = false}) {
    const wrapper = document.createElement('div'); wrapper.className = 'llm-filter';
    const button = document.createElement('button'); button.type = 'button'; button.id = id + '-button';
    button.className = 'llm-filter-button'; button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false'); button.setAttribute('aria-controls', id + '-panel');
    button.setAttribute('aria-label', label);
    const caption = document.createElement('span'); button.append(caption);
    const arrow = document.createElement('span'); arrow.className = 'llm-filter-arrow'; arrow.textContent = '⌄'; arrow.setAttribute('aria-hidden','true'); button.append(arrow);
    const panel = document.createElement('div'); panel.id = id + '-panel'; panel.className = 'llm-filter-panel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', label);
    const allRow = document.createElement('label'); allRow.className = 'llm-filter-all';
    const all = document.createElement('input'); all.type = 'checkbox'; all.id = id + '-all';
    const allText = document.createElement('span'); allText.textContent = '전체 선택'; allRow.append(all, allText); panel.append(allRow);
    const list = document.createElement('div'); list.className = 'llm-filter-options'; panel.append(list);
    let lastGroup = null;
    const checks = items.map((item, index) => {
      if (item.group && item.group !== lastGroup) {
        const heading = document.createElement('div'); heading.className = 'llm-filter-group';
        heading.textContent = item.group; list.append(heading); lastGroup = item.group;
      }
      const row = document.createElement('label'); row.className = 'llm-filter-option';
      const input = document.createElement('input'); input.type = 'checkbox'; input.value = String(item.value); input.id = id + '-option-' + index;
      input.disabled = Boolean(item.locked);
      const text = document.createElement('span'); text.textContent = item.label; row.append(input,text); list.append(row);
      input.addEventListener('change', () => {
        if (input.checked) selected.add(item.value); else selected.delete(item.value);
        refresh(); onChange();
      });
      return {input,item};
    });
    function refresh() {
      checks.forEach(({input,item}) => {input.checked = selected.has(item.value);});
      const editable = items.filter(item=>!item.locked);
      const total = editable.filter(item=>selected.has(item.value)).length;
      all.checked = total === editable.length; all.indeterminate = total > 0 && total < editable.length;
      all.setAttribute('aria-checked', all.indeterminate ? 'mixed' : String(all.checked));
      const allSelected = items.every(item=>selected.has(item.value));
      const chosen = items.filter(item=>selected.has(item.value));
      caption.textContent = stableLabel ? allLabel : allSelected ? allLabel : chosen.length === 1 ? chosen[0].label : chosen.length ? partialLabel : partialLabel + ' 없음';
      button.classList.toggle('is-filtered', !allSelected);
    }
    all.addEventListener('change', () => {
      items.forEach(item => {if (item.locked || all.checked) selected.add(item.value); else selected.delete(item.value);});
      refresh(); onChange();
    });
    wrapper.append(button,panel);
    const menu = {wrapper,button,panel,selected,items,refresh}; menus.push(menu);
    const show = focus => {
      if (openMenu === menu) {closeMenu();return;}
      closeMenu(); openMenu = menu; panel.hidden = false; button.setAttribute('aria-expanded', 'true'); positionMenu(menu);
      if (focus) all.focus();
    };
    button.addEventListener('click', () => show(false));
    button.addEventListener('keydown', event => {if (event.key === 'ArrowDown') {event.preventDefault(); if (openMenu !== menu) show(true); else all.focus();}});
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') {event.preventDefault();closeMenu(true);}
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const available = [...panel.querySelectorAll('input:not(:disabled)')];
        const index = available.indexOf(document.activeElement);
        event.preventDefault(); available[(index + (event.key === 'ArrowDown' ? 1 : -1) + available.length) % available.length]?.focus();
      }
    });
    refresh(); return menu;
  }
  function applyRows() {
    const query = document.getElementById('search').value.trim().toLowerCase();
    const localOnly = document.getElementById('localOnly').checked;
    const aaOnly = document.getElementById('aaOnly').checked;
    let count = 0;
    rows().forEach(row => {
      const visible = (!query || row.textContent.toLowerCase().includes(query))
        && groups.every(group => group.menu.selected.has(row.dataset[group.key] || ''))
        && (!localOnly || row.dataset.local === '1') && (!aaOnly || row.dataset.aa === '1');
      row.style.display = visible ? '' : 'none'; if (visible) count += 1;
    });
    const status = document.getElementById('count'); status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
    status.textContent = count.toLocaleString() + '개 행 표시';
    empty.hidden = count > 0;
    table.dispatchEvent(new Event('llm:filtered'));
  }
  const configurations = [
    ['tool','tools','사용 도구 필터','모든 사용 도구','사용 도구 선택','기타 / 미확인'],
    ['provider','provider','모델 개발사 필터','모든 모델 개발사','모델 개발사 선택','미확인'],
    ['access','access','모델 이용 방식 필터','모든 모델 이용 방식','모델 이용 방식 선택','미확인'],
    ['tier','tier','종합 위치 필터','모든 위치','위치 선택','미평가'],
    ['status','status','모델 제공 상태 필터','모든 모델 제공 상태','모델 제공 상태 선택','미확인']
  ];
  configurations.forEach(([id,key,label,allLabel,partialLabel,missing]) => {
    const original = document.getElementById(id);
    const items = [...original.options].filter(option=>option.value).map(option=>({value:option.value,label:option.textContent}));
    new Set(rows().map(row=>row.dataset[key] || '')).forEach(value => {
      if (!items.some(item=>item.value === value)) items.push({value,label:value || missing});
    });
    const selected = new Set(items.map(item=>item.value));
    const menu = createMenu({id:'filter-'+id,label,items,selected,onChange:applyRows,allLabel,partialLabel});
    original.replaceWith(menu.wrapper); groups.push({key,menu});
  });

  function applyColumns() {
    const currentRows = rows();
    let left = 0;
    let width = 0;
    headers.forEach((header,index) => {
      const visible = selectedColumns.has(index);
      [header,columns[index],...currentRows.map(row=>row.cells[index])].forEach(cell=>{
        cell.hidden = !visible; cell.classList.toggle('hidden-col',!visible);
      });
      if (index < 3) {
        [header,...currentRows.map(row=>row.cells[index])].forEach(cell=>{cell.style.left = left + 'px';});
        if (visible) left += columnWidths[index];
      }
      if (visible) width += columnWidths[index];
    });
    table.style.tableLayout = 'fixed'; table.style.minWidth = width + 'px'; table.style.width = width + 'px';
    const tooltip = document.getElementById('llmChartTooltip'); if (tooltip) tooltip.hidden = true;
    const focused = document.activeElement;
    if (focused?.closest('#tbl .hidden-col')) document.getElementById('filter-columns-button').focus();
  }
  const columnMenu = createMenu({
    id:'filter-columns',label:'비교 항목 선택',allLabel:'비교 항목 선택',partialLabel:'비교 항목 선택',stableLabel:true,
    items:[
      ['모델 정보', [1, 2, 3, 4, 5, 6, 8, 27, 37]],
      ['코딩 에이전트', [9, 10, 11, 12, 13, 14, 15, 16, 17]],
      ['개발 실사용', [38, 39, 40]],
      ['모델·Cursor 평가', [28, 29, 30, 31, 32, 33, 34, 35, 36]],
      ['기타', [0, 7, 18, 19, 20, 21, 22, 23, 24, 25, 26]]
    ].flatMap(([group, indexes]) => indexes.map(index => ({value:index,label:headers[index].textContent.replace(/[↑↓]/g,'').trim(),locked:index === 2,group}))),
    selected:selectedColumns,onChange:applyColumns
  });
  toolbar.insertBefore(columnMenu.wrapper,document.getElementById('localOnly').parentElement);
  document.addEventListener('pointerdown', event=>{if (openMenu && !openMenu.wrapper.contains(event.target)) closeMenu();});
  document.addEventListener('focusin', event=>{if (openMenu && !openMenu.wrapper.contains(event.target)) closeMenu();});
  document.addEventListener('keydown', event=>{if (event.key === 'Escape' && openMenu) {event.preventDefault();closeMenu(true);}});
  window.addEventListener('resize',()=>{if(openMenu) positionMenu(openMenu);});
  window.addEventListener('scroll',()=>{
    if (!openMenu) return;
    const bounds = openMenu.button.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > window.innerHeight) closeMenu();
    else positionMenu(openMenu);
  },{passive:true});
  ['search','localOnly','aaOnly'].forEach(id=>document.getElementById(id).addEventListener(id === 'search' ? 'input' : 'change',applyRows));
  document.getElementById('reset').onclick = () => {
    closeMenu(); document.getElementById('search').value = '';
    document.getElementById('localOnly').checked = false; document.getElementById('aaOnly').checked = false;
    groups.forEach(group=>{group.menu.selected.clear();group.menu.items.forEach(item=>group.menu.selected.add(item.value));group.menu.refresh();});
    selectedColumns.clear();defaultColumns.forEach(index=>selectedColumns.add(index));columnMenu.refresh();applyColumns();applyRows();
  };
  let sortState = {index:-1,ascending:true};
  table.tHead.addEventListener('click',event=>{
    const header = event.target.closest('th'); if (!header) return;
    const index = header.cellIndex,ascending = sortState.index === index ? !sortState.ascending : true;
    sortState = {index,ascending};
    const sorted = rows().sort((left,right)=>{
      const a = left.cells[index]?.dataset.sort ?? left.cells[index]?.textContent.trim() ?? '';
      const b = right.cells[index]?.dataset.sort ?? right.cells[index]?.textContent.trim() ?? '';
      if (header.dataset.type === 'num') {
        const first = parseFloat(a),second = parseFloat(b);
        if (Number.isNaN(first)) return Number.isNaN(second) ? 0 : 1;
        if (Number.isNaN(second)) return -1;
        return (first-second) * (ascending ? 1 : -1);
      }
      return a.localeCompare(b,'ko',{numeric:true,sensitivity:'base'}) * (ascending ? 1 : -1);
    });
    sorted.forEach(row=>table.tBodies[0].append(row));
  });
  document.getElementById('csv').onclick = () => {
    const visible = rows().filter(row=>row.style.display !== 'none');
    const indexes = headers.map((_,index)=>index).filter(index=>selectedColumns.has(index));
    const escape = value=>'"'+value.replaceAll('"','""')+'"';
    const lines = [indexes.map(index=>escape(headers[index].textContent.trim())).join(',')];
    visible.forEach(row=>lines.push(indexes.map(index=>escape(row.cells[index].textContent.trim())).join(',')));
    const blob = new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob),link = document.createElement('a');link.href=url;link.download='llm_comparison_filtered.csv';link.click();URL.revokeObjectURL(url);
  };
  table.addEventListener('llm:data-change',applyRows);
  applyColumns();applyRows();
})();
