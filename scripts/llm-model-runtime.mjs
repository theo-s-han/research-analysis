// Runs before the comparison filters and charts. Existing 27 cell indexes stay stable.
export function installModelResearch(data) {
  const table = document.getElementById('tbl');
  const body = table.tBodies[0];
  const header = table.tHead.rows[0];
  const toolNames = { codex: 'Codex', 'claude-code': 'Claude Code' };
  const originalRows = [...body.rows];
  const modelMetricsStart = 28;
  const conditionColumn = 37;
  const metricDefinitions = [
    ['AA Intelligence ↑', 'number', 'Artificial Analysis Intelligence Index v4.3.2 종합 지능 지수. 높을수록 좋음. 코딩 에이전트 Index와 다른 평가. 최신 공개 실측만 표시하며 AA의 추정 Index는 제외.'],
    ['AA-Briefcase ↑', 'number', 'AA-Briefcase v1.1 지식 노동·업무 문제 해결의 Elo 점수. 높을수록 좋음. 같은 평가판·모델·추론·fallback 조건끼리 비교.'],
    ['Automation ↑', 'percent', 'AutomationBench-AA: SaaS REST API 업무 자동화의 목표 달성 점수(%). 안전 조건 위반은 0점이며 부분 달성이 반영될 수 있음. 코딩 작업의 무개입 완료율과 다름.'],
    ['AA Terminal 4.0 ↑', 'percent', 'AA 모델 평가 환경의 Terminal-Bench 4.0 성공률(%). 높을수록 좋음. 별도 코딩 에이전트 평가와 혼합 금지.'],
    ['SciCode ↑', 'percent', 'Python 과학·수치 계산 문제의 코딩 평가(%). 높을수록 좋음. 일반 저장소 개발 성능 전체를 대표하지 않음. AA가 현재 평가를 재검토(Under review) 중이며 공개값을 원문 그대로 기록.'],
    ['AA Cost / task ↓', 'money', 'AA 모델 평가의 작업당 USD 비용. 낮을수록 저렴. Codex·Claude Code 또는 Cursor의 작업당 비용과 구분. Gemini 출시 할인은 원문 조건 유지.'],
    ['CursorBench 4.0 ↑', 'percent', 'Cursor 환경의 코딩 작업 평가(%). 높을수록 좋음. AA 모델·네이티브 에이전트 평가와 다른 실행 환경.'],
    ['Cursor Cost ↓', 'money', 'CursorBench 평가의 작업당 USD 비용. 낮을수록 저렴. AA Cost/task와 직접 비교 불가.'],
    ['AA-LCR ↑', 'percent', 'AA-LCR v1.1: 약 10만 토큰 규모의 여러 장문 문서를 읽고 답하는 추론 평가(%). 코드 저장소 전용 평가가 아님. Context 최대 수용량과 구분.']
  ];
  const addHeader = (name, tip, unit) => {
    const cell = document.createElement('th');
    const label = document.createElement('span');
    label.className = 'metric-tip'; label.tabIndex = 0;
    label.dataset.tip = tip; label.textContent = name; cell.append(label);
    if (unit) {
      cell.dataset.type = 'num'; cell.dataset.chartUnit = unit;
      cell.dataset.basis = 'model';
    } else cell.dataset.chart = 'false';
    header.append(cell);
  };
  addHeader('사용 도구', '공식 모델 목록 기준. Codex는 ChatGPT 로그인, Claude Code는 Anthropic 직접 API 기준. 구독·제공자·관리자 정책·승인 권한에 따라 실제 선택 가능 여부가 다름.');
  metricDefinitions.forEach(([name, unit, tip]) => addHeader(name, tip, unit));
  addHeader('평가 조건 / 확인일', '모델 사용 가능 여부 확인일과 벤치마크 원문 기록 시점은 다름. 원문 기준일이 없는 값은 날짜를 추정하지 않음.');
  [
    ['무개입 완료율 ↑', '전체 배정 작업 중 사람의 추가 지시·수정 없이 검증까지 통과한 작업 비율(%). 동일 작업군·완료 기준의 실측만 비교. 미측정은 —이며 벤치마크 점수로 추정하지 않음.'],
    ['회귀 없는 수정 성공률 ↑', '전체 배정 작업 중 요구사항 검증과 기존 회귀 테스트를 모두 통과한 작업 비율(%). 테스트 범위 내 결과이며 제품 전체의 무결함을 뜻하지 않음. 미측정은 —.'],
    ['성공 1건당 총비용 ↓', '실패·재시도·도구 사용을 포함한 측정 기간의 총 USD 비용 ÷ 검증 완료 작업 수. AA 작업당 API 비용·월 구독료와 다른 지표. 완료 0건 또는 미측정은 —.']
  ].forEach(([name, tip]) => {
    addHeader(name, tip);
    header.lastElementChild.dataset.type = 'num';
    header.lastElementChild.dataset.basis = 'usage';
  });
  for (let index = 10; index <= 17; index += 1) header.cells[index].dataset.basis = 'agent';
  header.cells[10].querySelector('.metric-tip').textContent = 'Coding Agent Index ↑';
  header.cells[10].querySelector('.metric-tip').dataset.tip = 'AA 코딩 에이전트 종합 점수. v1.5는 DeepSWE v1.1·Terminal-Bench 4.0·SWE-Atlas-QnA 점수의 동일 가중 평균. 과거 평가판·출처 미명시 기록은 별도 차트. AA Intelligence와 다름.';
  header.cells[12].querySelector('.metric-tip').textContent = 'Agent Terminal-Bench ↑';
  header.cells[12].querySelector('.metric-tip').dataset.tip = '코딩 에이전트 환경의 Terminal-Bench 성공률(%). 버전은 평가 조건 열과 차트명에서 구분. AA 모델 평가의 Terminal 값과 다름.';
  header.cells[4].querySelector('.metric-tip').dataset.tip = '모델 사양, AA 모델 평가, 코딩 에이전트 평가 행을 구분. 서로 다른 평가 체계의 점수·비용을 혼합하지 않음.';
  header.cells[8].querySelector('.metric-tip').dataset.tip = '모델이 수용하는 최대 문맥 길이. 실제 대규모 저장소 이해·수정 성능이 아님. SWE-Atlas-QnA의 저장소 이해 평가와 구분.';
  header.cells[11].querySelector('.metric-tip').dataset.tip = 'DeepSWE: 실제 소프트웨어 저장소의 구현·버그 수정 작업 평가(%). 평가판은 조건 열에서 확인. 같은 평가판·실행 환경끼리 비교.';
  header.cells[13].querySelector('.metric-tip').dataset.tip = 'SWE-Atlas-QnA: 저장소 구조·동작을 읽고 답하는 기술 Q&A 평가(%). 대규모 코드 이해의 참고 지표이며 코드를 직접 수정하는 평가는 아님.';
  header.cells[14].querySelector('.metric-tip').dataset.tip = '코딩 에이전트 작업당 입력·출력 토큰 합계. 원문의 M은 백만 토큰. 캐시된 입력도 토큰 합계에 포함될 수 있어 비용과 정비례하지 않음.';
  header.cells[15].querySelector('.metric-tip').dataset.tip = '코딩 에이전트의 작업당 평균 실행 시간. 신규 v1.5 기록은 분 단위이며 모델 응답·도구 실행을 포함한 활성 에이전트 경과 시간. 환경 준비·채점 시간과 구분.';
  header.cells[17].querySelector('.metric-tip').dataset.tip = '코딩 에이전트 평가의 작업당 평균 API USD 비용. 캐시·재시도 등의 원문 가격 조건 반영. 성공 1건당 비용이나 Codex·Claude 구독 사용량을 뜻하지 않음.';

  const textCell = (row, index, value) => {
    row.cells[index].textContent = value ?? '—';
  };
  const linkTo = (row, href, label) => {
    const cell = row.cells[26];
    if ([...cell.querySelectorAll('a')].some(link => link.getAttribute('href') === href)) return;
    if (cell.textContent.trim() === '—') cell.replaceChildren();
    if (cell.childNodes.length) cell.append(document.createElement('br'));
    const link = document.createElement('a');
    link.href = href; link.textContent = label; link.target = '_blank'; link.rel = 'noopener'; cell.append(link);
  };
  const canonical = name => name.replace(/^Claude\s+/i, '').replace(/^GLM(?:-|\s)/i, 'GLM-').trim().toLowerCase();
  const matchModel = name => {
    const input = canonical(name);
    return data.availability.models.find(model => {
      const base = canonical(model.name);
      return input === base || (input.startsWith(base + ' ('));
    });
  };
  const factsOf = name => data.verifiedModels.records.filter(record => canonical(record.model) === canonical(name));
  const contextOf = name => {
    const official = matchModel(name)?.context;
    if (official) return official;
    const original = data.modelRows.find(record => canonical(record.model) === canonical(name))?.context;
    if (original && original !== '—') return original;
    const values = [...new Set(factsOf(name).map(record => record.contextTokens).filter(value => value != null))];
    if (values.length === 1) return values[0].toLocaleString('en-US');
    const existing = originalRows.find(row => canonical(row.cells[2].textContent) === canonical(name) && /\d/.test(row.cells[8].textContent));
    return existing?.cells[8].textContent || '—';
  };
  const addFacts = (row, name) => {
    const facts = factsOf(name);
    if (!facts.length) return;
    const dates = [...new Set(facts.map(record => record.release).filter(Boolean))];
    if (/^(—|미확인)?$/.test(row.cells[3].textContent.trim()) && dates.length === 1) {
      textCell(row, 3, dates[0]); row.cells[3].title = 'AA 모델 공개일 기록 · ' + facts[0].source;
    }
    if (/^(—|미확인)?$/.test(row.cells[8].textContent.trim())) {
      textCell(row, 8, contextOf(name));
      row.cells[8].title = '공식 제공 목록 / 동일 모델 AA 사양 · ' + facts[0].source;
    }
  };
  const availabilityText = model => toolNames[model.tool] + (model.restricted ? ' · 승인 계정' : model.status === '종료 예정' ? ' · 종료 예정' : '');
  const tagModel = (row, model) => {
    if (!model) return;
    row.dataset.tools = model.tool;
    row.dataset.modelId = model.id;
    row.dataset.availability = model.restricted ? 'restricted' : model.status === '종료 예정' ? 'ending' : 'active';
    row.dataset.status = model.status;
    textCell(row, 6, model.status);
    textCell(row, 27, availabilityText(model));
    row.cells[27].title = [model.id, model.note, '제공 여부 확인: ' + data.availability.verifiedAt].filter(Boolean).join('\n');
    linkTo(row, data.availability.sources[model.tool === 'codex' ? 'codex' : 'claudeCode'], '모델 선택');
    if (model.contextSource) linkTo(row, model.contextSource, 'Context 사양');
    if (model.provider === 'Anthropic') {
      linkTo(row, data.availability.sources.claudeLifecycle, '제공 상태');
      linkTo(row, data.availability.sources.claudeModels, '모델 사양');
    }
  };
  const extendRow = row => {
    while (row.cells.length < header.cells.length) {
      const cell = document.createElement('td'); cell.textContent = '—'; row.append(cell);
    }
  };
  originalRows.forEach(row => {
    extendRow(row);
    if (row.dataset.aa === '1') {
      row.dataset.benchmark = 'Agent v1.3';
      textCell(row, conditionColumn, 'Coding Agent Index v1.3 · Terminal-Bench v2 · 원문 기록');
    }
    tagModel(row, matchModel(row.cells[2].textContent));
  });

  const makeRow = (provider, name, type, benchmark = '') => {
    const row = document.createElement('tr');
    row.dataset.provider = provider; row.dataset.access = 'API/클라우드'; row.dataset.local = '0';
    row.dataset.tier = ''; row.dataset.status = '미확인'; row.dataset.aa = benchmark ? '1' : '0';
    row.dataset.benchmark = benchmark; row.dataset.research = type;
    extendRow(row);
    textCell(row, 1, provider); row.cells[1].className = 'provider';
    textCell(row, 2, name); row.cells[2].className = 'model';
    textCell(row, 4, type); textCell(row, 5, 'API/클라우드'); textCell(row, 7, '미공개');
    row.cells[25].className = 'notes'; row.cells[26].className = 'sources';
    body.append(row); tagModel(row, matchModel(name)); return row;
  };

  // All currently documented first-party models get a specification row, even without measured scores.
  data.availability.models.forEach(model => {
    let row = originalRows.find(item => canonical(item.cells[2].textContent) === canonical(model.name) && item.dataset.aa !== '1');
    if (!row) {
      row = makeRow(model.provider, model.name, '모델 사양');
      const peer = originalRows.find(item => matchModel(item.cells[2].textContent)?.id === model.id);
      if (peer) [3, 7, 8].forEach(index => textCell(row, index, peer.cells[index].textContent));
    }
    if (model.context) textCell(row, 8, model.context);
    if (model.release) textCell(row, 3, model.release);
    const note = [model.id, model.note || (model.tool === 'codex' ? 'Codex 제공은 요금제·관리자 정책에 따라 달라짐.' : 'Claude Code 전체 모델 ID 지정. 해당 API 사용 권한 필요.')];
    textCell(row, 25, [row.cells[25].textContent === '—' ? '' : row.cells[25].textContent, ...note].filter(Boolean).join(' · '));
    textCell(row, conditionColumn, '제공 여부: ' + data.availability.verifiedAt + ' · ' + (model.tool === 'codex' ? 'ChatGPT 로그인' : 'Anthropic 직접 API'));
    tagModel(row, model);
  });

  data.modelRows.forEach(record => {
    const row = makeRow(record.provider, record.model + ' (' + record.effort + ')', 'AA 모델 평가');
    row.dataset.aa = '1'; row.dataset.modelEvaluation = '1';
    row.dataset.recordId = record.id;
    textCell(row, 8, record.context); textCell(row, 20, '기존 리서치 원문'); textCell(row, 25, record.note);
    record.values.forEach((value, index) => {
      textCell(row, modelMetricsStart + index, value);
      const number = Number(String(value).replace(/[$%,]/g, ''));
      if (Number.isFinite(number)) row.cells[modelMetricsStart + index].dataset.sort = String(number);
    });
    textCell(row, conditionColumn, 'AA 모델 / Cursor 별도 평가 · 원문 기록: ' + record.observed);
    linkTo(row, record.source, '평가 원문');
  });
  // Refresh a complete, like-for-like AA measurement together. Previous guide values
  // remain in the source HTML and on the cell, never substituted for missing results.
  const usedModelRecords = new Set();
  const providerNames = {SpaceXAI:'xAI', Alibaba:'Alibaba / Qwen', 'Z AI':'Z.ai', Kimi:'Moonshot AI', Mistral:'Mistral AI'};
  const modelMetrics = [[28,'index'],[29,'briefcase'],[30,'automation'],[31,'terminal'],[32,'scicode'],[33,'cost'],[36,'lcr']];
  const money = value => '$' + (value < .01 ? Number(value.toPrecision(3)).toString() : value.toFixed(2));
  const installVerifiedModel = (record, row, original) => {
    row.dataset.aa = '1'; row.dataset.modelEvaluation = '1'; row.dataset.sourceId = record.sourceId;
    row.dataset.evaluationModel = record.model; row.dataset.evaluationEffort = record.effort;
    row.dataset.benchmark = data.verifiedModels.suite;
    if (!original) row.dataset.recordId = 'model:verified:' + record.sourceId;
    textCell(row, 2, record.name);
    textCell(row, 8, contextOf(record.model));
    if (record.isOpenWeights) {
      row.dataset.local = '1'; row.dataset.access = '오픈웨이트 + API'; textCell(row, 5, '오픈웨이트 + API');
      if (record.parameters != null) textCell(row, 7, record.parameters + 'B' + (record.activeParameters != null ? ' / ' + record.activeParameters + 'B' : ''));
    }
    modelMetrics.forEach(([column, key]) => {
      const cell = row.cells[column];
      const previous = original?.values[column === 36 ? 8 : column - 28];
      let value = key === 'index' && record.estimated ? null : record[key];
      if (['automation','terminal','scicode','lcr'].includes(key) && value != null) value *= 100;
      cell.textContent = value == null ? '—' : key === 'cost' ? money(value) : key === 'briefcase' ? Math.round(value).toLocaleString('en-US') : value.toFixed(1) + (column === 28 ? '' : '%');
      delete cell.dataset.sort; delete cell.dataset.chartValue;
      if (value != null) cell.dataset.sort = cell.dataset.chartValue = String(value);
      const notes = [data.verifiedModels.suite + ' · 확인 ' + data.verifiedModels.verifiedAt, record.source];
      if (key === 'index' && record.estimated) notes.push('AA가 추정한 종합 지수이므로 실측 값으로 표시하지 않음.');
      if (key === 'scicode') notes.push('AA 평가 재검토 중(Under review).');
      if (previous != null) {
        cell.dataset.previousValue = previous;
        notes.push('이전 조사 기록 (' + original.observed + '): ' + previous);
      }
      cell.title = notes.join('\n');
    });
    for (const column of [34,35]) {
      if (original) row.cells[column].title = 'CursorBench 4.0 · 이전 원문 기록 ' + original.observed + '\n' + original.source + '\nAA 모델 평가와 별도 실행 환경. 최신 Cursor 동일 조건 자료 미확인.';
    }
    textCell(row, 20, 'AA 공식 공개 평가');
    const configuration = record.name.includes('Fallback') ? record.name.match(/\(([^)]*)\)/)?.[1] : record.effort;
    textCell(row, 25, record.estimated ? '개별 공개 평가만 표시 · 추정 종합 Index 제외' : '동일 모델·추론 조건의 AA 공개 평가');
    if (original) { row.cells[25].dataset.previousValue = original.note; row.cells[25].title = '이전 조사 설명: ' + original.note; }
    textCell(row, conditionColumn, data.verifiedModels.suite + ' · ' + configuration + ' · 확인 ' + data.verifiedModels.verifiedAt + ' · 실행일 미명시' + (original && [6,7].some(index => /\d/.test(original.values[index])) ? ' · Cursor: 원문 기록 ' + original.observed : ''));
    linkTo(row, record.source, 'AA 세부 평가');
    addFacts(row, record.model);
    usedModelRecords.add(record.sourceId);
  };
  data.modelRows.forEach(original => {
    const candidates = data.verifiedModels.records.filter(record => record.model === original.model && (record.effort.toLowerCase() === original.effort.toLowerCase() || original.effort === '미명시'));
    // Multiple fallback / non-reasoning variants are never silently collapsed.
    if (candidates.length !== 1) return;
    const row = [...body.rows].find(item => item.dataset.recordId === original.id);
    installVerifiedModel(candidates[0], row, original);
  });
  data.verifiedModels.records.forEach(record => {
    if (usedModelRecords.has(record.sourceId)) return;
    const measurable = (!record.estimated && record.index != null) || modelMetrics.slice(1).some(([,key]) => record[key] != null);
    if (!measurable) return;
    const row = makeRow(providerNames[record.provider] || record.provider, record.name, 'AA 모델 평가');
    installVerifiedModel(record, row);
  });
  data.verifiedCursor.records.forEach(record => {
    const candidates = [...body.rows].filter(row => canonical(row.dataset.evaluationModel || '') === canonical(record.model) && row.dataset.evaluationEffort?.toLowerCase() === record.effort.toLowerCase());
    // A Cursor setting is independent of AA fallback variants. Ambiguity gets its own row.
    const row = candidates.length === 1 ? candidates[0] : makeRow(record.provider, record.model + ' (' + record.effort + ')', 'Cursor 평가', 'CursorBench 4.0');
    if (candidates.length !== 1) {
      row.dataset.aa = '0'; row.dataset.recordId = 'cursor:' + record.label;
      textCell(row, 8, contextOf(record.model));
      textCell(row, 20, 'Cursor 공식 공개 평가');
      textCell(row, conditionColumn, 'CursorBench 4.0 · ' + record.effort + ' · 확인 ' + data.verifiedCursor.verifiedAt + ' · 실행일 미명시');
    } else {
      // AA and Cursor stay in independent columns/charts, with independent conditions.
      textCell(row, conditionColumn, row.cells[conditionColumn].textContent.replace(/ · Cursor: 원문 기록 .+$/, '') + ' · CursorBench 4.0 확인 ' + data.verifiedCursor.verifiedAt);
    }
    row.dataset.cursorRecord = record.label;
    [[34,record.score,record.score.toFixed(1)+'%'],[35,record.costUsd,money(record.costUsd)]].forEach(([column,value,display]) => {
      const cell = row.cells[column];
      const previous = cell.textContent;
      cell.textContent = display; cell.dataset.sort = cell.dataset.chartValue = String(value);
      if (!cell.dataset.previousValue && /\d/.test(previous)) cell.dataset.previousValue = previous;
      cell.title = 'CursorBench 4.0 · 확인 ' + data.verifiedCursor.verifiedAt + '\n' + data.verifiedCursor.source + '\nCursor 실행 환경 · 평균 토큰 ' + record.tokens.toLocaleString('en-US') + ' / Steps ' + record.steps + '\nAA 모델·네이티브 코딩 에이전트의 비용/토큰/Turns와 별도.' + (cell.dataset.previousValue ? '\n이전 조사 기록: ' + cell.dataset.previousValue : '');
    });
    linkTo(row, data.verifiedCursor.source, 'Cursor 평가');
    addFacts(row, record.model);
  });
  data.agentRows.forEach(record => {
    const row = makeRow(record.provider, record.model + ' (' + record.effort + ')', '코딩 에이전트 평가', 'Agent · TB4.0');
    row.dataset.recordId = record.id;
    textCell(row, 8, record.context); textCell(row, 9, record.harness);
    [10, 11, 12, 13, 17, 15, 14].forEach((column, index) => textCell(row, column, record.values[index]));
    if (/h$/i.test(record.values[5])) row.cells[15].dataset.chartValue = String(parseFloat(record.values[5]) * 60);
    else row.cells[15].dataset.chartValue = String(parseFloat(record.values[5]));
    textCell(row, 20, '기존 리서치 원문');
    textCell(row, 25, '네이티브 코딩 에이전트 평가. AA 모델 Intelligence·비용과 구분.');
    textCell(row, conditionColumn, 'Agent · Terminal-Bench 4.0 · 원문 기준일 미명시');
    linkTo(row, record.source, '평가 원문');
  });
  const numberCell = (row, column, value, display) => {
    textCell(row, column, value == null ? '—' : display);
    if (value != null) row.cells[column].dataset.sort = row.cells[column].dataset.chartValue = String(value);
  };
  data.verifiedAgents.records.forEach(record => {
    const row = makeRow(record.provider, record.model + ' (' + record.effort + ')', '코딩 에이전트 평가', 'Agent v1.5');
    row.dataset.recordId = 'agent:v1.5:' + record.sourceId;
    textCell(row, 8, record.model.includes('+') ? '모델별 상이' : contextOf(record.model));
    if (record.model.includes('+')) row.cells[8].title = '서로 다른 모델을 조합한 평가. 단일 Context 수치로 합산·대체하지 않음.';
    textCell(row, 9, record.harness + ' ' + record.harnessVersion);
    row.cells[9].title = Object.entries(record.harnessVersions).map(([benchmark,version]) => benchmark + ': ' + version.min.version + (version.min.version === version.max.version ? '' : '–' + version.max.version)).join('\n');
    [[10, 'index'], [11, 'deepSWE'], [12, 'terminalBench'], [13, 'sweAtlas']].forEach(([column, key]) => numberCell(row, column, record[key], record[key].toFixed(1)));
    numberCell(row, 14, record.totalTokens, (record.totalTokens / 1e6).toFixed(2) + 'M');
    numberCell(row, 15, record.timeSeconds / 60, (record.timeSeconds / 60).toFixed(1) + 'm');
    numberCell(row, 16, record.turns, record.turns.toFixed(1));
    numberCell(row, 17, record.costUsd, '$' + record.costUsd.toFixed(2));
    textCell(row, 20, 'AA 공식 평가');
    const fallback = record.fallbackModels.length ? '대체 모델: ' + record.fallbackModels.join(', ') : '대체 모델 없음';
    textCell(row, 25, fallback + ' · 유지된 시도 ' + record.retainedAttempts + '회 · 실패를 포함한 평균 API 비용');
    textCell(row, conditionColumn, data.verifiedAgents.suite + ' · DeepSWE 1.1 / TB 4.0 / SWE-Atlas-QnA · 자료 확인 ' + data.verifiedAgents.verifiedAt + ' · 실행일 미명시 · ' + fallback);
    linkTo(row, data.verifiedAgents.source, 'AA 평가 원문');
    linkTo(row, data.verifiedAgents.methodology, '평가 방법');
    addFacts(row, record.model);
  });
  data.developerRows.forEach(record => {
    const row = makeRow(record.model.startsWith('GPT-') ? 'OpenAI' : record.model.startsWith('Claude ') ? 'Anthropic' : '기타', record.model + ' (' + record.effort + ')', '개발 실사용 측정');
    row.dataset.recordId = record.id;
    textCell(row, 9, record.harness);
    [record.unassistedRate, record.regressionFreeRate, record.costPerSuccess].forEach((value, index) => numberCell(row, 38 + index, value, value == null ? '—' : index === 2 ? '$' + value.toFixed(2) : value.toFixed(1) + '%'));
    textCell(row, 20, '실사용 검증 기록');
    textCell(row, 25, record.workload + ' · 테스트: ' + record.testSuite + ' · 배정 ' + record.totalTasks + '건 / 검증 완료 ' + record.completedTasks + '건');
    textCell(row, conditionColumn, '실사용 측정 ' + record.measuredAt + ' · 작업군: ' + record.workload + ' · 테스트: ' + record.testSuite);
    linkTo(row, record.source, '측정 근거');
  });
  [...body.rows].forEach((row, index) => {
    row.cells[0].textContent = String(index + 1); row.cells[0].dataset.sort = String(index + 1);
    if (row.dataset.research) addFacts(row, row.cells[2].textContent.replace(/\s*\([^)]*\)\s*$/, ''));
    [...row.cells].forEach((cell,column) => {
      if (!/^(—|미확인|미측정|미공개)?$/.test(cell.textContent.trim())) return;
      let reason = '공개 원문에서 동일 조건의 수치를 확인하지 못함.';
      if (column >= 38) reason = '동일 작업군·테스트·완료 기준의 실사용 측정 기록 없음. 다른 벤치마크 점수로 대신 계산하지 않음.';
      else if (column >= 10 && column <= 17 && !(row.dataset.benchmark || '').startsWith('Agent')) reason = '이 행은 코딩 에이전트 평가가 아님. 같은 모델의 코딩 에이전트 평가 행에 별도 기록.';
      else if ((column >= 28 && column <= 33 || column === 36) && row.dataset.modelEvaluation !== '1') reason = '이 행은 AA 모델 평가가 아님. 같은 모델·추론 설정의 AA 모델 평가 행에 별도 기록.';
      else if (column === 34 || column === 35) reason = '동일 모델·추론 설정의 CursorBench 4.0 공개 측정값 미확인. AA·Codex·Claude Code의 값으로 대체하지 않음.';
      else if (column >= 21 && column <= 24 && row.dataset.local !== '1') reason = '공개 가중치로 로컬 실행하는 모델이 아니므로 로컬 RAM 비교 대상 아님.';
      else if (column === 7 && row.dataset.local !== '1') reason = '공개된 파라미터 사양 없음. 비용·성능으로 파라미터 수를 추정하지 않음.';
      cell.title = [cell.title, reason].filter(Boolean).join('\n');
      cell.dataset.missing = '1';
    });
  });
  const status = document.getElementById('status');
  if (![...status.options].some(option => option.value === '종료 예정')) status.add(new Option('종료 예정', '종료 예정'));
  const updated = document.getElementById('llmUpdatedAt');
  if (updated) { updated.textContent = data.updatedAt; updated.setAttribute('datetime', data.updatedAt); }
  document.title = '주요 LLM·코딩 모델 통합 비교 — ' + data.updatedAt;
  table.dataset.updatedAt = data.updatedAt;
  table.dataset.availabilityVerified = data.availability.verifiedAt;
  table.dataset.modelRecords = String(data.modelRows.length);
  table.dataset.agentRecords = String(data.agentRows.length);
  table.dataset.verifiedAgentRecords = String(data.verifiedAgents.records.length);
  table.dataset.verifiedModelRecords = String(usedModelRecords.size);
  table.dataset.verifiedCursorRecords = String(data.verifiedCursor.records.length);
  table.dataset.developerRecords = String(data.developerRows.length);
}
