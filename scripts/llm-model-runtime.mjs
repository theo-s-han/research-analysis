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
    ['AA Intelligence ↑', 'number', 'Artificial Analysis의 모델 종합 지능 지수. 높을수록 좋음. 코딩 에이전트 Index와 다른 평가. 기존 모델 리서치의 기록값.'],
    ['AA-Briefcase ↑', 'number', '지식 노동·업무 문제 해결 평가 점수. 높을수록 좋음. 원문과 동일한 모델·추론 설정의 기록값.'],
    ['Automation ↑', 'percent', '자동화·자율적 작업 수행 평가의 성공률(%). 높을수록 좋음. 모델 평가이며 Codex·Claude Code 실측과 구분.'],
    ['AA Terminal 4.0 ↑', 'percent', 'AA 모델 평가 환경의 Terminal-Bench 4.0 성공률(%). 높을수록 좋음. 별도 코딩 에이전트 평가와 혼합 금지.'],
    ['SciCode ↑', 'percent', '과학·수치 계산 코딩 문제 해결 평가(%). 높을수록 좋음. 같은 벤치마크 조건끼리 비교.'],
    ['AA Cost / task ↓', 'money', 'AA 모델 평가의 작업당 USD 비용. 낮을수록 저렴. Codex·Claude Code 또는 Cursor의 작업당 비용과 구분. Gemini 출시 할인은 원문 조건 유지.'],
    ['CursorBench 4.0 ↑', 'percent', 'Cursor 환경의 코딩 작업 평가(%). 높을수록 좋음. AA 모델·네이티브 에이전트 평가와 다른 실행 환경.'],
    ['Cursor Cost ↓', 'money', 'CursorBench 평가의 작업당 USD 비용. 낮을수록 저렴. AA Cost/task와 직접 비교 불가.'],
    ['AA-LCR ↑', 'percent', '장문·대규모 코드 문맥의 추론 평가(%). 높을수록 좋음. Context 최대 길이와 실제 이해 성능은 별도.']
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
  for (let index = 10; index <= 17; index += 1) header.cells[index].dataset.basis = 'agent';
  header.cells[10].querySelector('.metric-tip').textContent = 'Coding Agent Index ↑';
  header.cells[10].querySelector('.metric-tip').dataset.tip = 'AA 코딩 에이전트 종합 점수. 기존 v1.3(Terminal-Bench v2) 기록과 신규 Terminal-Bench 4.0 기반 기록은 별도 차트로 비교. AA 모델 Intelligence와 다름.';
  header.cells[12].querySelector('.metric-tip').textContent = 'Agent Terminal-Bench ↑';
  header.cells[12].querySelector('.metric-tip').dataset.tip = '코딩 에이전트 환경의 Terminal-Bench 성공률(%). 버전은 평가 조건 열과 차트명에서 구분. AA 모델 평가의 Terminal 값과 다름.';
  header.cells[4].querySelector('.metric-tip').dataset.tip = '모델 사양, AA 모델 평가, 코딩 에이전트 평가 행을 구분. 서로 다른 평가 체계의 점수·비용을 혼합하지 않음.';

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
  const canonical = name => name.replace(/^Claude\s+/i, '').trim().toLowerCase();
  const matchModel = name => {
    const input = canonical(name);
    return data.availability.models.find(model => {
      const base = canonical(model.name);
      return input === base || (input.startsWith(base + ' ('));
    });
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
  [...body.rows].forEach((row, index) => {
    row.cells[0].textContent = String(index + 1); row.cells[0].dataset.sort = String(index + 1);
  });
  const status = document.getElementById('status');
  if (![...status.options].some(option => option.value === '종료 예정')) status.add(new Option('종료 예정', '종료 예정'));
  document.title = '주요 LLM·코딩 모델 통합 비교 — ' + data.availability.verifiedAt;
  table.dataset.availabilityVerified = data.availability.verifiedAt;
  table.dataset.modelRecords = String(data.modelRows.length);
  table.dataset.agentRecords = String(data.agentRows.length);
}
