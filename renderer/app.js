'use strict';

const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const $ = (id) => document.getElementById(id);
let cfg = null;
let status = 'stopped';

// ====================== i18n (繁體 ⇄ 简体) ======================
// Source text is authored in Traditional. Default = Traditional. Switching to
// Simplified converts text nodes via a 繁→簡 char map; switching back restores originals.
const T2S = {
  '設':'设','啟':'启','動':'动','執':'执','錯':'误','誤':'误','偵':'侦','測':'测','載':'载','遊':'游','戲':'戏',
  '資':'资','約':'约','後':'后','語':'语','體':'体','簡':'简','過':'过','錄':'录','覽':'览','瀏':'浏','機':'机',
  '這':'这','電':'电','腦':'脑','區':'区','網':'网','連':'连','擬':'拟','線':'线','儲':'储','導':'导','標':'标',
  '選':'选','並':'并','簽':'签','產':'产','裝':'装','開':'开','時':'时','間':'间','發':'发','郵':'邮','頁':'页',
  '範':'范','匯':'汇','檔':'档','擇':'择','編':'编','輯':'辑','補':'补','戰':'战','個':'个','稱':'称','號':'号',
  '級':'级','別':'别','隊':'队','長':'长','費':'费','屑':'屑','羈':'羁','絆':'绊','證':'证','驗':'验','經':'经',
  '驟':'骤','轉':'转','狀':'状','態':'态','復':'复','進':'进','數':'数','強':'强','類':'类','題':'题','統':'统',
  '訂':'订','隨':'随','積':'积','歸':'归','佔':'占','請':'请','輸':'输','準':'准','備':'备','項':'项','緒':'绪',
  '面':'面','闆':'板','關':'关','閉':'闭','視':'视','窗':'窗','頭':'头','實':'实','際':'际','變':'变','數':'数',
  '當':'当','應':'应','將':'将','處':'处','點':'点','擊':'击','態':'态','獨':'独','創':'创','從':'从','體':'体',
  '無':'无','業':'业','權':'权','險':'险','員':'员','館':'馆','聯':'联','戰':'战','顯':'显','現':'现','觀':'观',
  '對':'对','齊':'齐','慢':'慢','滑':'滑','動':'动','畫':'画','浮':'浮','現':'现','離':'离','潔':'洁','淨':'净',
  '檢':'检','查':'查','備':'备','圖':'图','標':'标','籤':'签','屬':'属','於':'于','預':'预','設':'设','總':'总',
  '節':'节','約':'约','銷':'销','處':'处','錯':'错','麼':'么','歲':'岁','屬':'属','龍':'龙','寶':'宝','幣':'币',
  '滿':'满','關':'关','卡':'卡','獲':'获','贈':'赠','禮':'礼','劵':'券','張':'张','贈':'赠','當':'当','僅':'仅'
};
const t2s = (s) => s.replace(/[一-鿿]/g, (c) => T2S[c] || c);
let lang = 'tw'; // tw | cn
const _orig = new WeakMap();

function applyLang(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  let n; while ((n = walker.nextNode())) nodes.push(n);
  for (const node of nodes) {
    if (!_orig.has(node)) _orig.set(node, node.nodeValue);
    const o = _orig.get(node);
    node.nodeValue = lang === 'cn' ? t2s(o) : o;
  }
  // placeholders
  root.querySelectorAll && root.querySelectorAll('[placeholder]').forEach((el) => {
    const key = '__ph';
    if (el[key] === undefined) el[key] = el.getAttribute('placeholder');
    el.setAttribute('placeholder', lang === 'cn' ? t2s(el[key]) : el[key]);
  });
}
function setLang(l) {
  lang = l;
  document.documentElement.lang = l === 'cn' ? 'zh-Hans' : 'zh-Hant';
  $('langToggle').textContent = l === 'cn' ? '繁' : '简';
  applyLang(document.body);
  try { localStorage.setItem('lang', l); } catch {}
}
$('langToggle').addEventListener('click', () => setLang(lang === 'cn' ? 'tw' : 'cn'));
// localized text for dynamically built strings
const tr = (s) => (lang === 'cn' ? t2s(s) : s);

// ====================== API proxy (routed through Rust → no CORS) ======================
async function api(method, path, jsonBody) {
  const opts = { method, path };
  if (jsonBody !== undefined) { opts.body = JSON.stringify(jsonBody); opts.contentType = 'application/json'; }
  const res = await invoke('api_request', opts);
  let data = null;
  if (res.body) { try { data = JSON.parse(res.body); } catch { data = res.body; } }
  return { status: res.status, data, location: res.location };
}
async function apiForm(method, path, formObj) {
  const body = new URLSearchParams(formObj).toString();
  return invoke('api_request', { method, path, body, contentType: 'application/x-www-form-urlencoded' });
}

// ====================== toast ======================
let toastTimer = null;
function toast(msg, kind = 'ok') {
  const t = $('toast');
  t.textContent = tr(msg);
  t.className = 'toast show ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = 'toast'), 2400);
}

// ====================== tabs ======================
document.querySelectorAll('.tab').forEach((t) => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    $(t.dataset.tab).classList.add('active');
    if (t.dataset.tab === 'admin') onEnterAdmin();
    if (t.dataset.tab === 'apk') refreshApkTab();
  });
});
document.querySelectorAll('.subtab').forEach((t) => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.subtab').forEach((x) => x.classList.remove('active'));
    document.querySelectorAll('.subpanel').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    $('sub-' + t.dataset.sub).classList.add('active');
    if (t.dataset.sub === 'time') syncServerTime();
    if (t.dataset.sub === 'accounts') loadAccounts();
  });
});
function gotoTab(name) {
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x.dataset.tab === name));
  document.querySelectorAll('.panel').forEach((x) => x.classList.toggle('active', x.id === name));
}

// ====================== status + 控制頁動畫 ======================
const STATUS_LABEL = { stopped: '已停止', starting: '啟動中…', running: '執行中', error: '錯誤' };
function renderStatus(s) {
  status = s;
  $('statusDot').className = 'dot ' + s;
  $('statusText').textContent = tr(STATUS_LABEL[s] || s);
  const btn = $('toggle');
  btn.dataset.state = s;
  btn.textContent = tr((s === 'running' || s === 'starting') ? '停止' : '啟動');
  $('url').textContent = (s === 'running' && cfg) ? `http://${cfg.host}:${cfg.port}` : '';
  // running → button slides aside + live log appears; stopped → back to center
  $('controlStage').classList.toggle('running', s === 'running' || s === 'starting');
  updateAdminGate();
  if (s === 'running') startClock(); else stopClock();
}

// ====================== control (start with port check) ======================
$('toggle').addEventListener('click', async () => {
  if (status === 'running' || status === 'starting') { await invoke('stop_server'); return; }
  // 沒下載 CDN 時不要默默啟動一個跑不了遊戲的 server,先提示
  const st = await invoke('cdn_status');
  if (!st.present) { $('cdnGate').style.display = 'flex'; return; }
  await ensurePortThen(doStart);
});
$('cdnGateCancel').addEventListener('click', () => ($('cdnGate').style.display = 'none'));
$('cdnGateDownload').addEventListener('click', () => { $('cdnGate').style.display = 'none'; showFirstRun(true); });
$('cdnGateStart').addEventListener('click', () => { $('cdnGate').style.display = 'none'; ensurePortThen(doStart); });

async function doStart() {
  try { await invoke('start_server'); }
  catch (e) { appendLog('[launcher] ' + e); toast(String(e), 'err'); }
}

// Ensure the configured port is free; if not, prompt for a new one, then run `next`.
async function ensurePortThen(next) {
  const host = (cfg && cfg.host) || '127.0.0.1';
  const port = Number((cfg && cfg.port) || 8001);
  const free = await invoke('port_available', { host, port });
  if (free) { next(); return; }
  promptPort(port, next);
}

let portOnDone = null;
function promptPort(busyPort, onDone) {
  portOnDone = onDone || doStart;
  $('portModalMsg').textContent = tr(`連接埠 ${busyPort} 已被佔用,請改用其他埠號。`);
  $('portModalInput').value = String(busyPort + 1);
  $('portModal').style.display = 'flex';
  $('portModalInput').focus();
}
$('portModalCancel').addEventListener('click', () => { portOnDone = null; $('portModal').style.display = 'none'; });
$('portModalOk').addEventListener('click', async () => {
  const np = Number($('portModalInput').value.trim());
  if (!np || np < 1 || np > 65535) return toast('埠號無效', 'err');
  const host = (cfg && cfg.host) || '127.0.0.1';
  const free = await invoke('port_available', { host, port: np });
  if (!free) { $('portModalInput').value = String(np + 1); return toast(`埠號 ${np} 仍被佔用`, 'err'); }
  cfg = await invoke('save_config', { ui: { port: String(np) } });
  $('port').value = cfg.port;
  refreshApkTab();
  $('portModal').style.display = 'none';
  toast('已更換埠號');
  const cb = portOnDone; portOnDone = null; if (cb) cb();
});

// ====================== settings ======================
async function loadConfig() {
  cfg = await invoke('get_config');
  $('serverPath').value = cfg.serverPath || '';
  $('host').value = cfg.host || '';
  $('port').value = cfg.port || '';
  $('resVersion').value = cfg.resVersion || '';
}
$('pickDir').addEventListener('click', async () => {
  const dir = await invoke('pick_dir');
  if (dir) $('serverPath').value = dir;
});
$('detectIp').addEventListener('click', async () => {
  const ip = await invoke('local_ip');
  $('host').value = ip;
  toast('已偵測:' + ip);
});
$('cdnClear').addEventListener('click', async () => {
  if (!confirm(tr('確定刪除已下載的遊戲資源?(下次使用需重新下載或匯入)'))) return;
  try { await invoke('cdn_clear'); toast('已清除下載資源'); }
  catch (e) { toast(String(e), 'err'); }
});
$('save').addEventListener('click', async () => {
  cfg = await invoke('save_config', {
    ui: {
      serverPath: $('serverPath').value.trim(),
      host: $('host').value.trim(),
      port: $('port').value.trim(),
      resVersion: $('resVersion').value.trim(),
    },
  });
  $('saveMsg').textContent = tr('已儲存');
  setTimeout(() => ($('saveMsg').textContent = ''), 2000);
});

// ====================== 首啟精靈 + CDN 下載 ======================
let cdnDownloading = false;

function showFirstRun(show) {
  $('firstrun').style.display = show ? 'flex' : 'none';
  document.body.classList.toggle('firstrun-active', show); // 暗掉並停用上方 tab
}
async function checkFirstRun() {
  const st = await invoke('cdn_status');
  showFirstRun(!st.present);
}
$('wizSkip').addEventListener('click', () => showFirstRun(false));
$('wizLang').addEventListener('change', () => setLang($('wizLang').value === 's' ? 'cn' : 'tw'));
$('wizMirror').addEventListener('change', () => {
  const custom = $('wizMirror').value === '__custom';
  $('wizMirrorCustom').style.display = custom ? 'block' : 'none';
});
function getMirror() {
  const v = $('wizMirror').value;
  if (v === '__custom') { let m = $('wizMirrorCustom').value.trim(); if (m && !m.endsWith('/')) m += '/'; return m; }
  return v;
}

$('wizDownload').addEventListener('click', () => startCdn(() => invoke('cdn_download', { mirror: getMirror() })));
$('wizImport').addEventListener('click', async () => {
  const files = await invoke('pick_files_any');
  if (!files || files.length === 0) return;
  startCdn(() => invoke('cdn_import', { archivePaths: files }), '解壓中…');
});

function startCdn(action, label) {
  if (cdnDownloading) return;
  cdnDownloading = true;
  $('wizDownload').disabled = true;
  $('wizImport').disabled = true;
  $('wizProgWrap').style.display = 'block';
  $('wizProgText').style.color = '';
  $('wizProgText').textContent = tr(label || '準備中…');
  $('wizProgBar').style.width = '0%';
  action().catch((e) => cdnError(String(e)));
}
function fmtGB(b) { return (b / 1073741824).toFixed(2) + 'GB'; }
function cdnError(msg) {
  cdnDownloading = false;
  $('wizDownload').disabled = false;
  $('wizImport').disabled = false;
  $('wizProgText').style.color = 'var(--danger)';
  // 連線類錯誤(很可能 GitHub 被牆)→ 給明確指引,而非丟原始錯誤
  const netish = /tim(e|ed)\s?out|timeout|connect|dns|resolve|network|os error|sending request|reach|handshake|tls/i.test(msg);
  if (netish) {
    $('wizProgText').textContent = tr('無法連線到 GitHub(可能被牆)。請在「下載來源」改選鏡像,或用下方「匯入本地資源檔」。');
    toast('無法連線到 GitHub,可能被牆', 'err');
  } else {
    $('wizProgText').textContent = tr('錯誤:') + msg;
    toast(msg, 'err');
  }
}
listen('cdn-progress', (e) => {
  const p = e.payload;
  $('wizProgBar').style.width = p.percent + '%';
  $('wizProgText').style.color = '';
  $('wizProgText').textContent = p.phase === 'download'
    ? tr('下載') + ` ${fmtGB(p.current)} / ${fmtGB(p.total)} (${p.percent}%)`
    : tr('解壓') + ` ${p.current}${p.total ? '/' + p.total : ''} ` + tr('個項目');
});
listen('cdn-done', async () => {
  cdnDownloading = false;
  $('wizDownload').disabled = false;
  $('wizImport').disabled = false;
  $('wizProgBar').style.width = '100%';
  $('wizProgText').style.color = 'var(--primary)';
  $('wizProgText').textContent = tr('完成');
  toast('資源下載完成');
  // 下載完 → 收起精靈,跳到設定並自動偵測本機 IP
  setTimeout(async () => {
    showFirstRun(false);
    const ip = await invoke('local_ip');
    $('host').value = ip;
    cfg = await invoke('save_config', { ui: { host: ip } });
    gotoTab('settings');
    toast('已偵測本機 IP:' + ip);
  }, 900);
});
listen('cdn-error', (e) => cdnError(String(e.payload)));

// ====================== 打包 APK ======================
let apkPatching = false;
function refreshApkTab() { $('apkTarget').textContent = cfg ? `http://${cfg.host}:${cfg.port}` : '—'; }
$('apkPick').addEventListener('click', async () => {
  const f = await invoke('pick_file');
  if (f) $('apkPath').value = f;
});
$('apkPatch').addEventListener('click', async () => {
  if (apkPatching) return;
  const apkPath = $('apkPath').value.trim();
  if (!apkPath) return toast('請先選擇原始 APK', 'err');
  // 打包會把 host:port 寫死進 APK,先確保該埠可用(否則之後伺服器起不來)
  await ensurePortThen(() => doPatch(apkPath));
});
function doPatch(apkPath) {
  apkPatching = true;
  $('apkPatch').disabled = true;
  $('apkOut').textContent = '';
  $('apkProgWrap').style.display = 'block';
  $('apkProgText').style.color = '';
  $('apkProgText').textContent = tr('準備中…');
  $('apkProgBar').style.width = '0%';
  invoke('patch_apk', { apkPath }).catch((e) => apkError(String(e)));
}
function apkError(msg) {
  apkPatching = false;
  $('apkPatch').disabled = false;
  $('apkProgText').style.color = 'var(--danger)';
  $('apkProgText').textContent = tr('錯誤:') + msg;
  toast(msg, 'err');
}
listen('apk-progress', (e) => {
  const p = e.payload;
  const pct = p.total ? Math.round((p.current / p.total) * 100) : 0;
  $('apkProgBar').style.width = pct + '%';
  $('apkProgText').style.color = '';
  $('apkProgText').textContent = tr('步驟') + ` ${p.current}/${p.total} — ` + tr(p.label);
});
listen('apk-done', (e) => {
  apkPatching = false;
  $('apkPatch').disabled = false;
  $('apkProgBar').style.width = '100%';
  $('apkProgText').style.color = 'var(--primary)';
  $('apkProgText').textContent = tr('完成');
  const out = String(e.payload).replace(/\s*\(.*$/, '');
  $('apkOut').innerHTML = tr('已產出:') + `<code>${out}</code><br>` + tr('把它裝到模擬器 / 手機即可(若已裝舊版且簽章不同,需先解除安裝)。');
  toast('APK 打包完成');
});
listen('apk-error', (e) => apkError(String(e.payload)));

// ====================== 管理面板 ======================
const RESOURCE_FIELDS = [
  ['name', '名字'], ['comment', '個性簽名'], ['degreeId', '稱號/等級ID'], ['birth', '生日'],
  ['role', '性別/Role'], ['leaderCharacterId', '隊長角色ID'],
  ['freeVmoney', '星導石(免費)'], ['vmoney', '星導石(付費)'], ['freeMana', 'Mana(免費)'], ['paidMana', 'Mana(付費)'],
  ['stamina', '體力'], ['partySlot', '隊伍槽'], ['rankPoint', 'Rank'], ['starCrumb', '星屑'], ['bondToken', '羈絆證'],
  ['bossBoostPoint', 'Boss Boost'], ['boostPoint', 'Boost'], ['expPool', '經驗池'],
  ['tutorialStep', '教程步驟'], ['tutorialSkipFlag', '教程跳過(true/false)'], ['tutorialGachaCharacterId', '教程抽卡角色ID'],
  ['transitionState', '轉移狀態'], ['enableAuto3x', '自動3倍速(true/false)'],
  ['staminaHealTime', '體力恢復時間'], ['lastLoginTime', '最後登入時間'], ['expPooledTime', '經驗池時間'],
];
let currentPid = null;
let plPage = 0;
const PER_PAGE = 25;

function updateAdminGate() {
  const running = status === 'running';
  $('adminBlocked').style.display = running ? 'none' : 'flex';
  $('adminBody').classList.toggle('dimmed', !running);
}
let adminLoaded = false;
function onEnterAdmin() {
  updateAdminGate();
  if (status === 'running' && !adminLoaded) { adminLoaded = true; loadPlayers(0); }
}

function fmtDate(v) { if (!v) return '—'; try { return new Date(v).toISOString().slice(0, 10); } catch { return String(v); } }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function loadPlayers(page) {
  plPage = Math.max(0, page);
  const r = await api('GET', `/api/player/?page=${plPage}&perPage=${PER_PAGE}`);
  const list = Array.isArray(r.data) ? r.data : [];
  $('plPage').textContent = String(plPage + 1);
  $('plPrev').disabled = plPage === 0;
  $('plNext').disabled = list.length < PER_PAGE;
  const ul = $('playerList');
  if (list.length === 0) { ul.innerHTML = `<li class="empty">${tr('暫無玩家')}</li>`; return; }
  ul.innerHTML = list.map((p) => `
    <li class="pitem${p.id === currentPid ? ' active' : ''}" data-pid="${p.id}">
      <div class="pname">${escapeHtml(p.name || tr('(無名)'))}</div>
      <div class="pmeta">ID ${p.id} · Lv.${p.degreeId ?? 1} · ${fmtDate(p.lastLoginTime)}</div>
    </li>`).join('');
  ul.querySelectorAll('.pitem').forEach((li) => li.addEventListener('click', () => openPlayer(Number(li.dataset.pid))));
  applyLang(ul);
}
$('plReload').addEventListener('click', () => loadPlayers(plPage));
$('plPrev').addEventListener('click', () => loadPlayers(plPage - 1));
$('plNext').addEventListener('click', () => loadPlayers(plPage + 1));

// ---- 新建 / 匯入存檔 (#7) ----
$('newSaveTemplate').addEventListener('click', () => createSave('template'));
$('newSaveBlank').addEventListener('click', () => createSave('blank'));
async function createSave(mode) {
  const r = await api('POST', `/api/server/createSave?mode=${mode}`, {});
  if (r.status === 200 && r.data && r.data.ok) { toast(mode === 'template' ? '已建立範本存檔' : '已建立空白存檔'); loadPlayers(0); }
  else toast((r.data && r.data.error) || '建立失敗', 'err');
}
$('importSave').addEventListener('click', async () => {
  const f = await invoke('pick_file_any');
  if (!f) return;
  let text;
  try { text = await invoke('read_text_file', { path: f }); }
  catch (e) { return toast('讀取失敗:' + e, 'err'); }
  const res = await invoke('api_request', { method: 'POST', path: '/api/server/importSave', body: text, contentType: 'application/json' });
  let d = null; try { d = JSON.parse(res.body); } catch {}
  if (res.status === 200 && d && d.ok) { toast('已匯入存檔'); loadPlayers(0); }
  else toast((d && d.error) || '匯入失敗', 'err');
});

async function openPlayer(pid) {
  currentPid = pid;
  document.querySelectorAll('.pitem').forEach((li) => li.classList.toggle('active', Number(li.dataset.pid) === pid));
  const det = $('playerDetail');
  det.innerHTML = `<div class="detail-empty">${tr('載入中…')}</div>`;
  const r = await api('GET', `/api/player/save?id=${pid}`);
  if (r.status !== 200 || !r.data || !r.data.data) { det.innerHTML = `<div class="detail-empty">${tr('載入失敗')}</div>`; return; }
  const d = r.data.data;
  const p = d.player || {}, chars = d.characterList || {}, items = d.itemList || {}, equips = d.equipmentList || {};

  const fieldsHtml = RESOURCE_FIELDS.map(([key, label]) => `
    <div class="fld"><label>${label}</label>
      <input value="${escapeHtml(p[key] == null ? '' : p[key])}" onchange="editField('${key}', this.value, this)"></div>`).join('');
  const charRows = Object.entries(chars).map(([code, c]) => `
    <tr><td>${code}</td><td>${c.evolutionLevel ?? '—'}</td><td>${c.exp ?? '—'}</td><td>${c.entryCount ?? '—'}</td>
      <td><button class="x" onclick="delChar('${code}')">×</button></td></tr>`).join('');
  const itemRows = Object.entries(items).map(([iid, count]) => `
    <tr><td>${iid}</td><td><input class="cell" value="${count}" onchange="setItem('${iid}', this.value)"></td>
      <td><button class="x" onclick="delItem('${iid}')">×</button></td></tr>`).join('');
  const equipRows = Object.entries(equips).map(([eid, e]) => `
    <tr><td>${eid}</td><td>${e.level ?? '—'}</td><td>${e.enhancementLevel ?? '—'}</td></tr>`).join('');

  // 關卡進度 + 抽選紀錄
  const qp = d.questProgress || {};
  let qpRows = '', qpCount = 0;
  for (const [section, arr] of Object.entries(qp)) {
    for (const q of (arr || [])) {
      qpCount++;
      qpRows += `<tr><td>${section}</td><td>${q.questId}</td><td>${q.finished ? '是' : '—'}</td><td>${q.highScore ?? '—'}</td>
        <td><button class="x" onclick="delQuestProgress('${section}','${q.questId}')">×</button></td></tr>`;
    }
  }
  const dq = d.drawnQuestList || [];
  const dqRows = dq.map((x) => `<tr><td>${x.categoryId}</td><td>${x.questId}</td><td>${x.oddsId ?? '—'}</td>
    <td><button class="x" onclick="delDrawnQuest('${x.categoryId}','${x.questId}')">×</button></td></tr>`).join('');

  det.innerHTML = `
    <div class="detail-head">
      <h3>${escapeHtml(p.name || tr('(無名)'))} <span class="muted">#${pid}</span></h3>
      <div class="actions">
        <button class="mini" onclick="refill()">補充星導石</button>
        <button class="mini" onclick="resetChallenge()">重置每日挑戰</button>
        <button class="mini" onclick="exportSave()">匯出存檔</button>
        <button class="mini danger" onclick="clearMail()">清空信箱</button>
      </div>
    </div>
    <h4 class="sec">玩家欄位</h4>
    <div class="fldgrid">${fieldsHtml}</div>
    <h4 class="sec">角色 (${Object.keys(chars).length})</h4>
    <div class="addrow"><input id="addCharCode" placeholder="角色商務碼 (code)"><button class="mini" onclick="addChar()">新增角色</button></div>
    <table class="tbl"><thead><tr><th>code</th><th>進化</th><th>exp</th><th>entry</th><th></th></tr></thead>
      <tbody>${charRows || `<tr><td colspan="5" class="muted">${tr('暫無角色')}</td></tr>`}</tbody></table>
    <h4 class="sec">道具 (${Object.keys(items).length})</h4>
    <div class="addrow"><input id="addItemId" placeholder="道具 ID"><input id="addItemCount" placeholder="數量" value="9999"><button class="mini" onclick="addItem()">新增/設定</button></div>
    <table class="tbl"><thead><tr><th>ID</th><th>數量</th><th></th></tr></thead>
      <tbody>${itemRows || `<tr><td colspan="3" class="muted">${tr('暫無道具')}</td></tr>`}</tbody></table>
    <h4 class="sec">裝備 (${Object.keys(equips).length})</h4>
    <table class="tbl"><thead><tr><th>ID</th><th>等級</th><th>強化</th></tr></thead>
      <tbody>${equipRows || `<tr><td colspan="3" class="muted">${tr('暫無裝備')}</td></tr>`}</tbody></table>

    <h4 class="sec">關卡進度 (${qpCount}) <button class="mini danger" onclick="delAllQuestProgress()">清空全部</button></h4>
    <table class="tbl"><thead><tr><th>section</th><th>questId</th><th>已過</th><th>高分</th><th></th></tr></thead>
      <tbody>${qpRows || `<tr><td colspan="5" class="muted">${tr('暫無關卡記錄')}</td></tr>`}</tbody></table>

    <h4 class="sec">抽選紀錄 (${dq.length}) <button class="mini danger" onclick="delAllDrawnQuest()">清空全部</button></h4>
    <table class="tbl"><thead><tr><th>category</th><th>questId</th><th>oddsId</th><th></th></tr></thead>
      <tbody>${dqRows || `<tr><td colspan="4" class="muted">${tr('暫無抽選記錄')}</td></tr>`}</tbody></table>`;
  applyLang(det);
}

window.editField = async (field, value, el) => {
  const r = await api('PATCH', `/api/player/${currentPid}/field`, { field, value });
  if (r.status === 200) { if (el) { el.classList.add('ok'); setTimeout(() => el.classList.remove('ok'), 800); } toast('已更新 ' + field); }
  else { if (el) { el.classList.add('err'); setTimeout(() => el.classList.remove('err'), 1200); } toast((r.data && r.data.error) || '更新失敗', 'err'); }
};
window.addChar = async () => {
  const code = Number($('addCharCode').value.trim());
  if (!code) return toast('請輸入角色 code', 'err');
  const r = await api('POST', `/api/player/${currentPid}/character`, { code });
  if (r.status === 200) { toast('已新增角色'); openPlayer(currentPid); } else toast((r.data && r.data.error) || '新增失敗', 'err');
};
window.delChar = async (code) => {
  const r = await api('DELETE', `/api/player/${currentPid}/character/${code}`);
  if (r.status === 200) { toast('已刪除角色'); openPlayer(currentPid); } else toast((r.data && r.data.error) || '刪除失敗', 'err');
};
window.addItem = async () => {
  const id = Number($('addItemId').value.trim()), count = Number($('addItemCount').value.trim());
  if (!id) return toast('請輸入道具 ID', 'err');
  const r = await api('POST', `/api/player/${currentPid}/item`, { id, count });
  if (r.status === 200) { toast('已設定道具'); openPlayer(currentPid); } else toast((r.data && r.data.error) || '設定失敗', 'err');
};
window.setItem = async (itemId, value) => {
  const r = await api('POST', `/api/player/${currentPid}/item`, { id: Number(itemId), count: Number(value) });
  if (r.status === 200) toast(`道具 ${itemId} = ${Number(value)}`); else toast((r.data && r.data.error) || '設定失敗', 'err');
};
window.delItem = async (itemId) => {
  const r = await api('DELETE', `/api/player/${currentPid}/item/${itemId}`);
  if (r.status === 200) { toast('已刪除道具'); openPlayer(currentPid); } else toast((r.data && r.data.error) || '刪除失敗', 'err');
};
window.refill = async () => {
  const r = await api('POST', `/api/player/${currentPid}/refill_resources`, {});
  if (r.status === 200) { toast('已補充星導石'); openPlayer(currentPid); } else toast((r.data && r.data.error) || '失敗', 'err');
};
window.resetChallenge = async () => {
  const r = await api('POST', `/api/player/${currentPid}/reset_challenge`, {});
  if (r.status === 200) toast('已重置每日挑戰'); else toast((r.data && r.data.error) || '失敗', 'err');
};
window.clearMail = async () => {
  const r = await api('DELETE', `/api/player/${currentPid}/mail`);
  if (r.status === 200) toast(`已清空信箱 (刪除 ${r.data.deleted ?? 0})`); else toast((r.data && r.data.error) || '失敗', 'err');
};
window.delQuestProgress = async (section, questId) => {
  const r = await api('DELETE', `/api/player/${currentPid}/quest_progress/${section}/${questId}`);
  if (r.status === 200) { toast('已刪除關卡記錄'); openPlayer(currentPid); } else toast((r.data && r.data.error) || '失敗', 'err');
};
window.delAllQuestProgress = async () => {
  if (!confirm(tr('清空此玩家所有關卡進度?'))) return;
  const r = await api('DELETE', `/api/player/${currentPid}/quest_progress`);
  if (r.status === 200) { toast('已清空關卡進度'); openPlayer(currentPid); } else toast((r.data && r.data.error) || '失敗', 'err');
};
window.delDrawnQuest = async (cat, questId) => {
  const r = await api('DELETE', `/api/player/${currentPid}/drawn_quest/${cat}/${questId}`);
  if (r.status === 200) { toast('已刪除抽選記錄'); openPlayer(currentPid); } else toast((r.data && r.data.error) || '失敗', 'err');
};
window.delAllDrawnQuest = async () => {
  if (!confirm(tr('清空此玩家所有抽選紀錄?'))) return;
  const r = await api('DELETE', `/api/player/${currentPid}/drawn_quest`);
  if (r.status === 200) { toast('已清空抽選紀錄'); openPlayer(currentPid); } else toast((r.data && r.data.error) || '失敗', 'err');
};

// ====================== 伺服器時間 ======================
let clock = null, clockTimer = null, clockSyncCounter = 0;
async function syncServerTime() {
  const r = await api('GET', '/api/server/currentTime');
  if (r.status === 200 && r.data && r.data.date) {
    clock = { baseMs: Date.parse(r.data.date), t0: Date.now() };
    $('timeCustom').textContent = tr(r.data.isCustom ? '自訂' : '系統時間');
    $('timeCustom').className = 'badge ' + (r.data.isCustom ? 'warn' : '');
    renderClock();
  }
}
function renderClock() {
  if (!clock) { $('timeNow').textContent = '—'; return; }
  $('timeNow').textContent = new Date(clock.baseMs + (Date.now() - clock.t0)).toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
}
function startClock() {
  if (clockTimer) return;
  clockSyncCounter = 0; syncServerTime();
  clockTimer = setInterval(() => { renderClock(); if (++clockSyncCounter >= 30) { clockSyncCounter = 0; syncServerTime(); } }, 1000);
}
function stopClock() { if (clockTimer) { clearInterval(clockTimer); clockTimer = null; } clock = null; $('timeNow').textContent = '—'; }
$('timeSet').addEventListener('click', async () => {
  const t = $('timeInput').value.trim();
  if (!t) return toast('請輸入時間', 'err');
  const r = await api('GET', `/api/server/time?time=${encodeURIComponent(t)}`);
  if (r.status === 200) { toast('伺服器時間已設定'); syncServerTime(); } else toast((r.data && r.data.message) || '設定失敗', 'err');
});
$('timeReset').addEventListener('click', async () => { await api('GET', '/api/server/resetTime'); toast('已重置為系統時間'); syncServerTime(); });

// ====================== 群發郵件 ======================
// 只有 道具(1)/角色(5)/裝備(6) 需要附件 ID,其餘資源類型隱藏 ID 欄。
const MAIL_NEEDS_ID = ['1', '5', '6'];
function updateMailTypeId() { $('mailTypeIdRow').style.display = MAIL_NEEDS_ID.includes($('mailType').value) ? 'block' : 'none'; }
$('mailType').addEventListener('change', updateMailTypeId);
updateMailTypeId();

$('mailSend').addEventListener('click', async () => {
  const form = {
    type: $('mailType').value, type_id: $('mailTypeId').value.trim(),
    number: $('mailNumber').value.trim() || '1', subject: $('mailSubject').value.trim(), description: $('mailDesc').value.trim(),
  };
  const res = await apiForm('POST', '/api/mail/send', form);
  const loc = res.location || '';
  const m = decodeURIComponent((loc.match(/[?&](ok|error)=([^&]*)/) || [])[2] || '');
  const isErr = /error=/.test(loc);
  $('mailMsg').textContent = m || tr(res.status < 400 ? '已發送' : '失敗');
  $('mailMsg').style.color = isErr ? 'var(--danger)' : 'var(--primary)';
  if (m) toast(m, isErr ? 'err' : 'ok');
});

// ====================== 帳號 / 存檔管理 ======================
$('acctReload').addEventListener('click', loadAccounts);

async function loadAccounts() {
  const r = await api('GET', '/api/server/accounts');
  const list = Array.isArray(r.data) ? r.data : [];
  const wrap = $('acctList');
  if (list.length === 0) {
    wrap.innerHTML = `<div class="muted" style="padding:16px">${tr('暫無帳號(玩家首次登入遊戲後產生,或在「玩家」分頁新建)')}</div>`;
    return;
  }
  wrap.innerHTML = list.map((a) => `
    <div class="acct-card">
      <div class="acct-head">
        <b>帳號 #${a.id}</b> <span class="muted">${a.saves.length} 存檔</span>
        <span class="spacer"></span>
        <button class="mini" onclick="acctNewSave(${a.id})">新建存檔</button>
        <button class="mini danger" onclick="acctDeleteAccount(${a.id})">刪除帳號</button>
      </div>
      <table class="tbl"><thead><tr><th>ID</th><th>名字</th><th>Lv</th><th>角色</th><th>操作</th></tr></thead><tbody>
      ${a.saves.map((s) => `
        <tr>
          <td>${s.id}</td>
          <td>${escapeHtml(s.name || '')}${s.active ? ' <span class="badge warn">生效</span>' : ''}</td>
          <td>${s.level ?? 1}</td><td>${s.charCount}</td>
          <td class="acct-actions">
            <button class="mini" onclick="acctActivate(${s.id})" ${s.active ? 'disabled' : ''}>切換</button>
            <input class="cell" id="rn_${s.id}" placeholder="${escapeHtml(s.name || '')}">
            <button class="mini" onclick="acctRename(${s.id})">改名</button>
            <button class="mini" onclick="acctClone(${a.id}, ${s.id})">複製</button>
            <button class="mini danger" onclick="acctDeleteSave(${s.id})">刪除</button>
          </td>
        </tr>`).join('')}
      </tbody></table>
    </div>`).join('');
  applyLang(wrap);
}
async function acctPost(path) { const res = await invoke('api_request', { method: 'POST', path }); return res.status < 400; }
window.acctActivate = async (pid) => { (await acctPost(`/api/server/activateSave?playerId=${pid}`)) ? (toast('已切換生效存檔'), loadAccounts()) : toast('失敗', 'err'); };
window.acctClone = async (aid, pid) => { (await acctPost(`/api/server/cloneSave?playerId=${pid}&accountId=${aid}`)) ? (toast('已複製存檔'), loadAccounts()) : toast('失敗', 'err'); };
window.acctNewSave = async (aid) => { (await acctPost(`/api/server/newSave?accountId=${aid}`)) ? (toast('已新建存檔'), loadAccounts()) : toast('失敗', 'err'); };
window.acctDeleteSave = async (pid) => { if (!confirm(tr(`確定刪除存檔 #${pid}?`))) return; (await acctPost(`/api/server/deleteSave?playerId=${pid}`)) ? (toast('已刪除存檔'), loadAccounts()) : toast('失敗', 'err'); };
window.acctDeleteAccount = async (aid) => { if (!confirm(tr(`確定刪除帳號 #${aid} 及其所有存檔?`))) return; (await acctPost(`/api/server/deleteAccount?id=${aid}`)) ? (toast('已刪除帳號'), loadAccounts()) : toast('失敗', 'err'); };
window.acctRename = async (pid) => {
  const name = $('rn_' + pid).value.trim();
  if (!name) return toast('請輸入新名字', 'err');
  const res = await apiForm('POST', '/api/server/renameSave', { playerId: String(pid), name });
  res.status < 400 ? (toast('已改名'), loadAccounts()) : toast('改名失敗', 'err');
};

// 匯出單一玩家存檔 JSON
window.exportSave = async () => {
  const r = await invoke('api_request', { method: 'GET', path: `/api/player/save?id=${currentPid}` });
  if (r.status !== 200 || !r.body) return toast('匯出失敗', 'err');
  const saved = await invoke('save_text_file', { defaultName: `save_${currentPid}.json`, content: r.body });
  if (saved) toast('已匯出存檔');
};

// ====================== log ======================
// 日誌分頁 = 全部;控制頁的即時日誌 = 只 server(排除 [apk] / [cdn])。
function appendTo(id, line) { const el = $(id); el.textContent += line + '\n'; el.scrollTop = el.scrollHeight; }
function appendLog(line) {
  appendTo('allLogOut', line);
  if (!/^\[apk\]|^\[cdn\]/.test(line)) appendTo('logOut', line);
}
$('clearLog').addEventListener('click', () => ($('logOut').textContent = ''));
$('clearAllLog').addEventListener('click', () => ($('allLogOut').textContent = ''));
listen('server-log', (e) => appendLog(typeof e.payload === 'string' ? e.payload : JSON.stringify(e.payload)));
listen('server-state', (e) => renderStatus(e.payload));

// ====================== init ======================
(async () => {
  try { const saved = localStorage.getItem('lang'); if (saved) setLang(saved); } catch {}
  await loadConfig();
  // 首次啟動(host 仍是預設 127.0.0.1)→ 自動偵測本機 IP,
  // 即使使用者手動把 .cdn 貼進去而跳過下載精靈,也會把 IP 設好。
  if (!cfg.host || cfg.host === '127.0.0.1') {
    const ip = await invoke('local_ip');
    if (ip && ip !== '127.0.0.1') {
      cfg = await invoke('save_config', { ui: { host: ip } });
      $('host').value = cfg.host;
    }
  }
  const st = await invoke('server_state');
  renderStatus(st.status);
  await checkFirstRun();
})();
