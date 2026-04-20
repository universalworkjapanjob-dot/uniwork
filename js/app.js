// ===== GLOBALS =====
let currentUser = null;
let currentPage = 'dashboard';
let dailyDate = new Date();
let monthlyMonth = new Date();
let wagesMonth = new Date();
let billingMonth = new Date();
let scheduleMonth = new Date();
let analyticsTab = 'overview';
let chartGoal = null, chartMonthly = null, chartWagesBar = null, chartWagesTrend = null, chartAnalytics = [];

// ===== LOGIN =====
function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value.trim();
  const accounts = [
    { user: 'admin', pass: 'admin123', name: '管理者', role: 'admin' },
    { user: 'staff', pass: 'staff123', name: '職員', role: 'staff' }
  ];
  const found = accounts.find(a => a.user === u && a.pass === p);
  if (!found) { showToast('ユーザー名またはパスワードが違います', 'error'); return; }
  currentUser = found;
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  document.getElementById('current-user-name').textContent = found.name;
  document.getElementById('header-date').textContent = formatDate(new Date());
  initApp();
}

function doLogout() {
  if (!confirm('ログアウトしますか？')) return;
  currentUser = null;
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

// ===== INIT =====
function initApp() {
  showPage('dashboard');
  checkCertAlerts();
  loadSettings();
}

function showPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  currentPage = page;
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  
  const navMap = {
    dashboard: 0, schedule: 1, daily: 2, monthly: 3,
    users: 4, certificates: 5, monitoring: 6,
    wages: 7, analytics: 8, billing: 9,
    board: 10, reports: 11, settings: 12, download: 13
  };
  const items = document.querySelectorAll('.nav-item');
  if (navMap[page] !== undefined && items[navMap[page]]) {
    items[navMap[page]].classList.add('active');
  }

  const titles = {
    dashboard: 'ダッシュボード', schedule: '出勤予定表', daily: '日別実績入力',
    monthly: '月次実績一覧', users: '利用者管理', certificates: '受給者証管理',
    monitoring: 'モニタリング', wages: '工賃管理', analytics: '分析',
    billing: '月次締め・請求', board: '情報共有ボード', reports: '帳票出力',
    settings: '設定・データ管理', download: '本体ダウンロード'
  };
  document.getElementById('header-title').textContent = titles[page] || page;

  switch(page) {
    case 'dashboard': renderDashboard(); break;
    case 'schedule': renderSchedule(); break;
    case 'daily': renderDaily(); break;
    case 'monthly': renderMonthly(); break;
    case 'users': renderUsers(); break;
    case 'certificates': renderCertificates(); break;
    case 'monitoring': renderMonitoringPage(); break;
    case 'wages': renderWages(); break;
    case 'analytics': renderAnalytics(); break;
    case 'billing': renderBilling(); break;
    case 'board': renderBoard(); break;
    case 'reports': renderReports(); break;
    case 'settings': renderSettings(); break;
    case 'download': /* 静的ページ */ break;
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ===== HELPERS =====
function formatDate(d) {
  return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日(${['日','月','火','水','木','金','土'][d.getDay()]})`;
}
function formatYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function formatYM(d) { return `${d.getFullYear()}年${d.getMonth()+1}月`; }
function formatYMKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function getDaysInMonth(year, month) { return new Date(year, month+1, 0).getDate(); }
function isWeekend(d) { const dow = d.getDay(); return dow === 0 || dow === 6; }
function uid() { return 'x' + Math.random().toString(36).substr(2,9); }
function getUserName(uid) { const u = DB.users.find(x=>x.id===uid); return u ? u.name : '不明'; }

function showToast(msg, type='') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => { t.classList.remove('show'); }, 3000);
}

function addAuditLog(action, detail) {
  const now = new Date();
  DB.auditLog.unshift({
    id: uid(),
    datetime: `${formatYMD(now)} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`,
    user: currentUser ? currentUser.name : '-',
    action, detail
  });
  if (DB.auditLog.length > 500) DB.auditLog = DB.auditLog.slice(0, 500);
  saveData(DB);
}

function openModal(html) {
  document.getElementById('modal-box').innerHTML = html;
  document.getElementById('modal-box').classList.add('open');
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal() {
  document.getElementById('modal-box').classList.remove('open');
  document.getElementById('modal-overlay').classList.remove('open');
}

// ===== DASHBOARD =====
function renderDashboard() {
  const today = new Date();
  const ym = formatYMKey(today);
  const monthRecords = DB.records.filter(r => r.date.startsWith(ym));
  const activeUsers = DB.users.filter(u => u.status === 'active');
  
  const totalDays = monthRecords.filter(r => ['attend','home','farm'].includes(r.status)).length;
  const goal = DB.settings.goal || 120;
  const goalRate = Math.round(totalDays / goal * 100);
  const totalWage = monthRecords.reduce((s,r) => s + (r.wage||0), 0);
  const attendRates = activeUsers.map(u => {
    const ur = monthRecords.filter(r => r.userId===u.id);
    const att = ur.filter(r => ['attend','home','farm'].includes(r.status)).length;
    return ur.length ? Math.round(att/ur.length*100) : 0;
  });
  const avgRate = attendRates.length ? Math.round(attendRates.reduce((a,b)=>a+b,0)/attendRates.length) : 0;
  
  const certAlerts = getCertAlerts();

  document.getElementById('kpi-grid').innerHTML = `
    <div class="kpi-card"><div class="kpi-label">在籍者数</div><div class="kpi-value">${activeUsers.length}</div><div class="kpi-sub">名</div></div>
    <div class="kpi-card"><div class="kpi-label">今月延べ人数</div><div class="kpi-value">${totalDays}</div><div class="kpi-sub">/ 目標 ${goal} 人</div></div>
    <div class="kpi-card"><div class="kpi-label">目標達成率</div><div class="kpi-value">${goalRate}%</div><div class="kpi-sub">${totalDays}/${goal}日</div></div>
    <div class="kpi-card"><div class="kpi-label">今月工賃総額</div><div class="kpi-value" style="font-size:20px;">¥${totalWage.toLocaleString()}</div><div class="kpi-sub">概算</div></div>
    <div class="kpi-card"><div class="kpi-label">平均出勤率</div><div class="kpi-value">${avgRate}%</div><div class="kpi-sub">在籍者平均</div></div>
    <div class="kpi-card" style="border-color:${certAlerts.length ? '#e53935' : '#4caf50'};"><div class="kpi-label">受給者証期限</div><div class="kpi-value" style="font-size:20px;color:${certAlerts.length?'#c62828':'#2e7d32'};">${certAlerts.length ? '⚠ '+certAlerts.length+'名' : '✓ 正常'}</div><div class="kpi-sub">60日以内</div></div>
  `;

  // 目標グラフ
  if (chartGoal) chartGoal.destroy();
  const gCtx = document.getElementById('chart-goal').getContext('2d');
  chartGoal = new Chart(gCtx, {
    type: 'bar',
    data: {
      labels: ['今月延べ人数'],
      datasets: [
        { label: '実績', data: [totalDays], backgroundColor: '#1565c0' },
        { label: '目標', data: [goal], backgroundColor: '#e8eaf6' }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
  });

  // 月別グラフ
  const months = [];
  const monthData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth()-i, 1);
    months.push(`${d.getMonth()+1}月`);
    const key = formatYMKey(d);
    const cnt = DB.records.filter(r => r.date.startsWith(key) && ['attend','home','farm'].includes(r.status)).length;
    monthData.push(cnt);
  }
  if (chartMonthly) chartMonthly.destroy();
  const mCtx = document.getElementById('chart-monthly').getContext('2d');
  chartMonthly = new Chart(mCtx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: '延べ人数', data: monthData, backgroundColor: '#42a5f5' },
        { label: '目標', data: months.map(()=>goal), type: 'line', borderColor: '#e53935', backgroundColor: 'transparent', pointRadius: 0, borderDash: [5,3] }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { beginAtZero: true } } }
  });

  // 今日の状況
  const todayStr = formatYMD(today);
  const todayRecords = DB.records.filter(r => r.date === todayStr);
  let todayHtml = '';
  if (todayRecords.length === 0) {
    todayHtml = '<p style="color:#aaa;font-size:13px;">本日の実績入力はまだありません</p>';
  } else {
    const att = todayRecords.filter(r=>r.status==='attend').length;
    const home = todayRecords.filter(r=>r.status==='home').length;
    const abs = todayRecords.filter(r=>r.status==='absent').length;
    const cancel = todayRecords.filter(r=>r.status==='cancel').length;
    todayHtml = `
      <div class="today-item"><span>通所</span><span class="badge badge-green">${att}名</span></div>
      <div class="today-item"><span>在宅</span><span class="badge badge-blue">${home}名</span></div>
      <div class="today-item"><span>欠席</span><span class="badge badge-red">${abs}名</span></div>
      <div class="today-item"><span>キャンセル</span><span class="badge badge-orange">${cancel}名</span></div>
    `;
  }
  document.getElementById('today-status').innerHTML = todayHtml;

  // モニタリング近日予定
  const soon = DB.monitoring
    .filter(m => { const d = new Date(m.nextDate); const diff = (d - today) / (1000*60*60*24); return diff >= 0 && diff <= 60; })
    .sort((a,b) => new Date(a.nextDate) - new Date(b.nextDate))
    .slice(0, 5);
  document.getElementById('monitoring-upcoming').innerHTML = soon.length ? soon.map(m =>
    `<div class="today-item"><span>${getUserName(m.userId)}</span><span>${m.nextDate}</span></div>`
  ).join('') : '<p style="color:#aaa;font-size:13px;">60日以内の予定はありません</p>';
}

// ===== SCHEDULE =====
function renderSchedule() {
  const y = scheduleMonth.getFullYear();
  const mo = scheduleMonth.getMonth();
  document.getElementById('schedule-month-label').textContent = `${y}年${mo+1}月`;
  
  const days = getDaysInMonth(y, mo);
  const activeUsers = DB.users.filter(u => u.status === 'active');
  
  let thead = '<tr><th class="name-col">利用者</th>';
  for (let d = 1; d <= days; d++) {
    const dt = new Date(y, mo, d);
    const dow = dt.getDay();
    const labels = ['日','月','火','水','木','金','土'];
    const cls = dow === 0 ? 'style="background:#fce4ec;"' : dow === 6 ? 'style="background:#e8eaf6;"' : '';
    thead += `<th ${cls}>${d}<br>${labels[dow]}</th>`;
  }
  thead += '</tr>';

  let tbody = '';
  activeUsers.forEach(u => {
    tbody += `<tr><td class="name-col">${u.name}</td>`;
    for (let d = 1; d <= days; d++) {
      const dt = new Date(y, mo, d);
      const dow = dt.getDay();
      const dateStr = `${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const sch = DB.schedules.find(s => s.userId === u.id && s.date === dateStr);
      const isHol = dow === 0;
      const isSat = dow === 6;
      const cellCls = isHol ? 'sc-holiday' : isSat ? 'sc-sat' : '';
      const label = sch ? getScheduleLabel(sch.type) : '';
      tbody += `<td class="${cellCls}" onclick="openScheduleCell('${u.id}','${dateStr}',this)">${label}</td>`;
    }
    tbody += '</tr>';
  });

  document.getElementById('schedule-table-wrap').innerHTML =
    `<table class="schedule-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

function getScheduleLabel(type) {
  const map = { am: '<span class="sc-am">午前</span>', pm: '<span class="sc-pm">午後</span>', full: '<span class="sc-full">終日</span>', home: '<span class="sc-home">在宅</span>', farm: '<span class="sc-farm">農場</span>', cancel: '<span class="sc-cancel">ｷｬ</span>', none: '' };
  return map[type] || '';
}

function schedulePrevMonth() { scheduleMonth = new Date(scheduleMonth.getFullYear(), scheduleMonth.getMonth()-1, 1); renderSchedule(); }
function scheduleNextMonth() { scheduleMonth = new Date(scheduleMonth.getFullYear(), scheduleMonth.getMonth()+1, 1); renderSchedule(); }

function openScheduleCell(userId, date, td) {
  const sch = DB.schedules.find(s => s.userId===userId && s.date===date);
  const userName = getUserName(userId);
  openModal(`
    <div class="modal-header">
      <h3><i class="fas fa-calendar-edit"></i> 予定設定：${userName} ${date}</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label>予定区分</label>
        <select id="sch-type" class="form-control">
          <option value="">未定</option>
          <option value="am" ${sch&&sch.type==='am'?'selected':''}>午前（10:00〜12:00）</option>
          <option value="pm" ${sch&&sch.type==='pm'?'selected':''}>午後（13:00〜15:00）</option>
          <option value="full" ${sch&&sch.type==='full'?'selected':''}>終日（10:00〜15:00）</option>
          <option value="home" ${sch&&sch.type==='home'?'selected':''}>在宅就労</option>
          <option value="farm" ${sch&&sch.type==='farm'?'selected':''}>農場</option>
          <option value="cancel" ${sch&&sch.type==='cancel'?'selected':''}>キャンセル</option>
        </select>
      </div>
      <div class="form-group">
        <label>変更理由（途中変更の場合）</label>
        <input type="text" id="sch-reason" class="form-control" placeholder="例：体調不良のため午後のみに変更" value="${sch&&sch.reason?sch.reason:''}">
      </div>
      <div class="form-group">
        <label>備考</label>
        <input type="text" id="sch-notes" class="form-control" value="${sch&&sch.notes?sch.notes:''}">
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger" onclick="deleteSchedule('${userId}','${date}')"><i class="fas fa-trash"></i> 削除</button>
      <button class="btn btn-secondary" onclick="closeModal()">閉じる</button>
      <button class="btn btn-primary" onclick="saveScheduleCell('${userId}','${date}')"><i class="fas fa-save"></i> 保存</button>
    </div>
  `);
}

function saveScheduleCell(userId, date) {
  const type = document.getElementById('sch-type').value;
  const reason = document.getElementById('sch-reason').value;
  const notes = document.getElementById('sch-notes').value;
  const idx = DB.schedules.findIndex(s => s.userId===userId && s.date===date);
  if (idx >= 0) {
    DB.schedules[idx] = { ...DB.schedules[idx], type, reason, notes, updatedAt: new Date().toISOString() };
  } else {
    DB.schedules.push({ id: uid(), userId, date, type, reason, notes, createdAt: new Date().toISOString() });
  }
  saveData(DB);
  closeModal();
  renderSchedule();
  showToast('予定を保存しました', 'success');
  addAuditLog('予定設定', `${getUserName(userId)} ${date} ${type}`);
}

function deleteSchedule(userId, date) {
  DB.schedules = DB.schedules.filter(s => !(s.userId===userId && s.date===date));
  saveData(DB);
  closeModal();
  renderSchedule();
  showToast('予定を削除しました');
}

function openBulkSchedule() {
  const activeUsers = DB.users.filter(u => u.status==='active');
  openModal(`
    <div class="modal-header"><h3>一括予定設定</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-group">
        <label>対象利用者</label>
        <select id="bulk-user" class="form-control">
          <option value="all">全員</option>
          ${activeUsers.map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>対象期間</label>
        <div style="display:flex;gap:8px;align-items:center;">
          <input type="date" id="bulk-from" class="form-control">
          <span>〜</span>
          <input type="date" id="bulk-to" class="form-control">
        </div>
      </div>
      <div class="form-group" style="display:flex;gap:8px;margin-bottom:4px;">
        <button class="btn btn-sm btn-outline" onclick="setBulkWeekdays()">平日のみ選択</button>
      </div>
      <div class="form-group">
        <label>予定区分</label>
        <select id="bulk-type" class="form-control">
          <option value="am">午前</option>
          <option value="pm">午後</option>
          <option value="full" selected>終日</option>
          <option value="home">在宅就労</option>
          <option value="farm">農場</option>
          <option value="cancel">キャンセル</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">閉じる</button>
      <button class="btn btn-primary" onclick="saveBulkSchedule()"><i class="fas fa-save"></i> 一括設定</button>
    </div>
  `);
  // デフォルト日付セット
  const y = scheduleMonth.getFullYear(), m = scheduleMonth.getMonth();
  document.getElementById('bulk-from').value = `${y}-${String(m+1).padStart(2,'0')}-01`;
  const last = getDaysInMonth(y, m);
  document.getElementById('bulk-to').value = `${y}-${String(m+1).padStart(2,'0')}-${String(last).padStart(2,'0')}`;
}

function setBulkWeekdays() {
  // 平日のみ（月〜金）を自動選択するためのガイド表示
  showToast('平日のみ設定は一括設定時に土日をスキップして適用します', 'info');
}

function saveBulkSchedule() {
  const userId = document.getElementById('bulk-user').value;
  const from = document.getElementById('bulk-from').value;
  const to = document.getElementById('bulk-to').value;
  const type = document.getElementById('bulk-type').value;
  
  if (!from || !to) { showToast('期間を設定してください', 'error'); return; }
  
  const targetUsers = userId === 'all' ? DB.users.filter(u=>u.status==='active').map(u=>u.id) : [userId];
  const start = new Date(from), end = new Date(to);
  let count = 0;
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // 土日スキップ
    const dateStr = formatYMD(new Date(d));
    
    targetUsers.forEach(uid => {
      const idx = DB.schedules.findIndex(s => s.userId===uid && s.date===dateStr);
      if (idx >= 0) {
        DB.schedules[idx].type = type;
      } else {
        DB.schedules.push({ id: uid(), userId: uid, date: dateStr, type, reason: '', notes: '', createdAt: new Date().toISOString() });
      }
      count++;
    });
  }
  
  saveData(DB);
  closeModal();
  renderSchedule();
  showToast(`${count}件の予定を設定しました`, 'success');
  addAuditLog('一括予定設定', `${userId==='all'?'全員':getUserName(userId)} ${from}〜${to} ${type}`);
}

// ===== DAILY =====
function renderDaily() {
  const dateStr = formatYMD(dailyDate);
  document.getElementById('daily-date-label').textContent = formatDate(dailyDate);
  
  const activeUsers = DB.users.filter(u => u.status === 'active');
  let html = `<table class="data-table">
    <thead><tr><th>氏名</th><th>状況</th><th>開始</th><th>終了</th><th>時間</th><th>工賃</th><th>欠席理由</th><th>備考</th></tr></thead>
    <tbody>`;
  
  activeUsers.forEach(u => {
    const rec = DB.records.find(r => r.date === dateStr && r.userId === u.id);
    // 実績未入力の場合は出勤予定を初期値として使用
    const sch = !rec ? DB.schedules.find(s => s.userId === u.id && s.date === dateStr) : null;
    const schDefaults = sch ? {
      attend: { status:'attend',  start:'10:00', end:'15:00' },
      am:     { status:'half_am', start:'10:00', end:'12:00' },
      pm:     { status:'half_pm', start:'13:00', end:'15:00' },
      home:   { status:'home',    start:'',      end:''      },
      farm:   { status:'farm',    start:'10:00', end:'15:00' },
      cancel: { status:'cancel',  start:'',      end:''      },
      full:   { status:'attend',  start:'10:00', end:'15:00' },
    }[sch.type] || { status:'', start:'', end:'' } : { status:'', start:'', end:'' };
    const status    = rec ? rec.status    : schDefaults.status;
    const startTime = rec ? rec.startTime : schDefaults.start;
    const endTime   = rec ? rec.endTime   : schDefaults.end;
    const absReason = rec ? rec.absenceReason : '';
    const notes     = rec ? rec.notes : '';
    const wage      = rec ? rec.wage  : 0;
    const hours     = rec ? rec.hours : 0;
    
    html += `<tr>
      <td><strong>${u.name}</strong></td>
      <td>
        <select id="d-status-${u.id}" class="form-control" style="min-width:110px;" onchange="updateDailyWage('${u.id}')">
          <option value="" ${status===''?'selected':''}>未入力</option>
          <option value="attend" ${status==='attend'?'selected':''}>通所</option>
          <option value="home" ${status==='home'?'selected':''}>在宅</option>
          <option value="farm" ${status==='farm'?'selected':''}>農場</option>
          <option value="absent" ${status==='absent'?'selected':''}>欠席</option>
          <option value="cancel" ${status==='cancel'?'selected':''}>キャンセル</option>
          <option value="half_am" ${status==='half_am'?'selected':''}>午前のみ</option>
          <option value="half_pm" ${status==='half_pm'?'selected':''}>午後のみ</option>
        </select>
      </td>
      <td><input type="time" id="d-start-${u.id}" value="${startTime}" class="form-control" style="width:100px;" onchange="updateDailyWage('${u.id}')"></td>
      <td><input type="time" id="d-end-${u.id}" value="${endTime}" class="form-control" style="width:100px;" onchange="updateDailyWage('${u.id}')"></td>
      <td id="d-hours-${u.id}" style="text-align:center;">${hours ? hours+'h' : '-'}</td>
      <td id="d-wage-${u.id}" style="text-align:right;color:#2e7d32;font-weight:700;">${wage ? '¥'+wage.toLocaleString() : '-'}</td>
      <td><input type="text" id="d-reason-${u.id}" value="${absReason}" class="form-control" style="width:120px;" placeholder="理由"></td>
      <td><input type="text" id="d-notes-${u.id}" value="${notes}" class="form-control" style="width:120px;" placeholder="備考"></td>
    </tr>`;
  });
  
  html += '</tbody></table>';
  document.getElementById('daily-table-wrap').innerHTML = html;
  // 予定から初期値をセットした行の時間・工賃を即時計算
  activeUsers.forEach(u => updateDailyWage(u.id));
}

function calcHoursAndWage(status, start, end, user) {
  let hours = 0, wage = 0, note = '';
  if (['attend', 'half_am', 'half_pm'].includes(status)) {
    const wageRate = user.wageCommute;
    const isHalf = status === 'half_am' || status === 'half_pm';
    const stdH = isHalf ? 2 : (parseFloat(user.maxHours) || 0);
    if (start && end) {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const mins = (eh*60+em) - (sh*60+sm);
      hours = Math.floor(mins / 30) * 0.5;
      if (hours < 0) hours = 0;
      // 遅刻・早退：実勤時間が標準より短い場合のみ表示
      const diff = Math.round((stdH - hours) * 10) / 10;
      if (diff > 0) note = `（${diff>=1?diff+'時間':diff*60+'分'}減）`;
    } else {
      // 時間未入力は標準時間で計算
      hours = stdH;
    }
    wage = Math.round(wageRate * hours);
  } else if (status === 'farm') {
    // 農場：通所時給で計算（個別設定がある場合はwageCommuteを使用）
    if (start && end) {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const mins = (eh*60+em) - (sh*60+sm);
      hours = Math.floor(mins / 30) * 0.5;
      if (hours < 0) hours = 0;
      const stdMins = user.maxHours * 60;
      if (hours * 60 < stdMins) {
        const diff = stdMins - hours*60;
        note = `（${diff>=60?diff/60+'時間':diff+'分'}減）`;
      }
    }
    wage = Math.round(user.wageCommute * hours);
  } else if (status === 'home') {
    hours = user.maxHours;
    wage = Math.round(user.wageHome * hours);
  }
  return { hours, wage, note };
}

function updateDailyWage(userId) {
  const status = document.getElementById('d-status-'+userId).value;
  const start  = document.getElementById('d-start-'+userId).value;
  const end    = document.getElementById('d-end-'+userId).value;
  const user   = DB.users.find(u=>u.id===userId);
  if (!user) return;

  const { hours, wage, note } = calcHoursAndWage(status, start, end, user);

  document.getElementById('d-hours-'+userId).innerHTML =
    hours ? `<span style="font-weight:700;">${hours}h</span><span style="font-size:11px;color:#e65100;">${note}</span>` : '-';
  document.getElementById('d-wage-'+userId).textContent = wage ? '¥'+wage.toLocaleString() : '-';
}

function dailyPrev() { dailyDate.setDate(dailyDate.getDate()-1); renderDaily(); }
function dailyNext() { dailyDate.setDate(dailyDate.getDate()+1); renderDaily(); }

function saveDaily() {
  const dateStr = formatYMD(dailyDate);
  const activeUsers = DB.users.filter(u => u.status === 'active');
  
  activeUsers.forEach(u => {
    const statusEl = document.getElementById('d-status-'+u.id);
    if (!statusEl) return;
    const status = statusEl.value;
    const startTime = document.getElementById('d-start-'+u.id).value;
    const endTime = document.getElementById('d-end-'+u.id).value;
    const absenceReason = document.getElementById('d-reason-'+u.id).value;
    const notes = document.getElementById('d-notes-'+u.id).value;
    
    const calc = calcHoursAndWage(status, startTime, endTime, u);
    const hours = calc.hours;
    const wage  = calc.wage;
    
    const existing = DB.records.findIndex(r => r.date===dateStr && r.userId===u.id);
    const rec = { id: uid(), date: dateStr, userId: u.id, status, startTime, endTime, hours, wage, absenceReason, notes };
    if (existing >= 0) { DB.records[existing] = { ...DB.records[existing], ...rec, id: DB.records[existing].id }; }
    else if (status) { DB.records.push(rec); }
  });
  
  saveData(DB);
  showToast('実績を保存しました', 'success');
  addAuditLog('日別実績保存', dateStr);
}

// ===== MONTHLY =====
function renderMonthly() {
  const y = monthlyMonth.getFullYear();
  const mo = monthlyMonth.getMonth();
  document.getElementById('monthly-month-label').textContent = formatYM(monthlyMonth);
  const ym = `${y}-${String(mo+1).padStart(2,'0')}`;
  const days = getDaysInMonth(y, mo);
  const activeUsers = DB.users.filter(u => u.status === 'active');
  const monthRecs = DB.records.filter(r => r.date.startsWith(ym));
  
  const labels = ['日','月','火','水','木','金','土'];
  let thead = '<tr><th>氏名</th>';
  for (let d = 1; d <= days; d++) {
    const dow = new Date(y, mo, d).getDay();
    const c = dow===0?'color:#e53935':dow===6?'color:#1565c0':'';
    thead += `<th style="${c};min-width:28px;">${d}</th>`;
  }
  thead += '<th>通所日</th><th>通所時間</th><th>通所工賃</th><th>在宅日</th><th>在宅時間</th><th>在宅工賃</th><th>農場日</th><th>農場時間</th><th>農場工賃</th><th>欠席</th><th>ｷｬﾝｾﾙ</th><th style="color:#e65100;">控除時間</th><th>出勤率</th><th>工賃合計</th></tr>';
  
  let tbody = '';
  activeUsers.forEach(u => {
    let attDays=0, attHours=0, attWage=0;
    let homeDays=0, homeHours=0, homeWage=0;
    let farmDays=0, farmHours=0, farmWage=0;
    let abs=0, cancel=0, deductHours=0;
    tbody += `<tr><td style="white-space:nowrap;font-weight:600;">${u.name}</td>`;
    for (let d = 1; d <= days; d++) {
      const dateStr = `${ym}-${String(d).padStart(2,'0')}`;
      const rec = monthRecs.find(r => r.userId===u.id && r.date===dateStr);
      const dow = new Date(y, mo, d).getDay();
      let cell = '', cls = '';
      if (dow===0||dow===6) { cls='background:#f5f5f5;'; cell='<span style="color:#ddd;">—</span>'; }
      else if (!rec || !rec.status) { cell=''; }
      else if (rec.status==='attend'||rec.status==='half_am'||rec.status==='half_pm') {
        attDays++; attHours+=rec.hours||0; attWage+=rec.wage||0;
        const stdH = parseFloat(u.maxHours)||0;
        const actH = rec.hours||0;
        const diff = Math.round((stdH - actH)*10)/10;
        if (diff > 0) { deductHours = Math.round((deductHours + diff)*10)/10; cell=`<span class="att-attend" style="color:#e65100;">○<small>-${diff}h</small></span>`; }
        else { cell='<span class="att-attend">○</span>'; }
      }
      else if (rec.status==='home') { homeDays++; homeHours+=rec.hours||0; homeWage+=rec.wage||0; cell='<span class="att-home">在</span>'; }
      else if (rec.status==='farm') {
        farmDays++; farmHours+=rec.hours||0; farmWage+=rec.wage||0;
        const stdH = parseFloat(u.maxHours)||0;
        const actH = rec.hours||0;
        const diff = Math.round((stdH - actH)*10)/10;
        if (diff > 0) { deductHours = Math.round((deductHours + diff)*10)/10; cell=`<span class="att-farm" style="color:#e65100;">農<small>-${diff}h</small></span>`; }
        else { cell='<span class="att-farm">農</span>'; }
      }
      else if (rec.status==='absent') { abs++; cell='<span class="att-absent">×</span>'; }
      else if (rec.status==='cancel') { cancel++; cell='<span class="att-cancel">ｷｬ</span>'; }
      tbody += `<td class="center" style="${cls}">${cell}</td>`;
    }
    const totalDays = attDays+homeDays+farmDays+abs+cancel;
    const rate = totalDays > 0 ? Math.round((attDays+homeDays+farmDays)/totalDays*100) : 0;
    const rateColor = rate>=80?'#2e7d32':rate>=60?'#f57f17':'#c62828';
    const totalWage = attWage+homeWage+farmWage;
    tbody += `
      <td class="center">${attDays}</td>
      <td class="center">${attHours}h</td>
      <td style="text-align:right;">¥${attWage.toLocaleString()}</td>
      <td class="center">${homeDays}</td>
      <td class="center">${homeHours}h</td>
      <td style="text-align:right;">¥${homeWage.toLocaleString()}</td>
      <td class="center">${farmDays}</td>
      <td class="center">${farmHours}h</td>
      <td style="text-align:right;">¥${farmWage.toLocaleString()}</td>
      <td class="center">${abs}</td>
      <td class="center">${cancel}</td>
      <td class="center" style="color:${deductHours>0?'#e65100':'#aaa'};font-weight:700;">${deductHours>0?'-'+deductHours+'h':'-'}</td>
      <td class="center" style="color:${rateColor};font-weight:700;">${rate}%</td>
      <td style="text-align:right;color:#2e7d32;font-weight:700;">¥${totalWage.toLocaleString()}</td></tr>`;
  });
  
  document.getElementById('monthly-table-wrap').innerHTML = `<table class="data-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

function monthlyPrev() { monthlyMonth = new Date(monthlyMonth.getFullYear(), monthlyMonth.getMonth()-1, 1); renderMonthly(); }
function monthlyNext() { monthlyMonth = new Date(monthlyMonth.getFullYear(), monthlyMonth.getMonth()+1, 1); renderMonthly(); }

function exportMonthlyCSV() {
  const y = monthlyMonth.getFullYear(), mo = monthlyMonth.getMonth();
  const ym = `${y}-${String(mo+1).padStart(2,'0')}`;
  const activeUsers = DB.users.filter(u => u.status === 'active');
  const monthRecs = DB.records.filter(r => r.date.startsWith(ym));
  const days = getDaysInMonth(y, mo);
  
  let rows = [['氏名', ...Array.from({length:days},(_,i)=>i+1+'日'), '通所日','通所時間','通所工賃','在宅日','在宅時間','在宅工賃','農場日','農場時間','農場工賃','欠席','ｷｬﾝｾﾙ','控除時間','出勤率','工賃合計']];
  activeUsers.forEach(u => {
    let row = [u.name];
    let attDays=0,attHours=0,attWage=0,homeDays=0,homeHours=0,homeWage=0,farmDays=0,farmHours=0,farmWage=0,abs=0,cancel=0;
    for (let d = 1; d <= days; d++) {
      const dateStr = `${ym}-${String(d).padStart(2,'0')}`;
      const rec = monthRecs.find(r => r.userId===u.id && r.date===dateStr);
      if (!rec||!rec.status) { row.push(''); continue; }
      if (['attend','half_am','half_pm'].includes(rec.status)) { attDays++; attHours+=rec.hours||0; attWage+=rec.wage||0; row.push('○'); }
      else if (rec.status==='home') { homeDays++; homeHours+=rec.hours||0; homeWage+=rec.wage||0; row.push('在'); }
      else if (rec.status==='farm') { farmDays++; farmHours+=rec.hours||0; farmWage+=rec.wage||0; row.push('農'); }
      else if (rec.status==='absent') { abs++; row.push('×'); }
      else if (rec.status==='cancel') { cancel++; row.push('ｷｬ'); }
      else row.push('');
    }
    const totalDays=attDays+homeDays+farmDays+abs+cancel;
    const rate = totalDays>0 ? Math.round((attDays+homeDays+farmDays)/totalDays*100)+'%' : '-';
    // CSV用控除時間計算
    const csvDeduct = monthRecs.filter(r => r.userId===u.id && ['attend','half_am','half_pm','farm'].includes(r.status)).reduce((acc,r)=>{
      const std = parseFloat(u.maxHours)||0; const act = r.hours||0; const d = Math.round((std-act)*10)/10; return d>0 ? Math.round((acc+d)*10)/10 : acc;
    }, 0);
    row.push(attDays,attHours+'h',attWage,homeDays,homeHours+'h',homeWage,farmDays,farmHours+'h',farmWage,abs,cancel,csvDeduct>0?'-'+csvDeduct+'h':'-',rate,attWage+homeWage+farmWage);
    rows.push(row);
  });
  downloadCSV(rows, `月次実績_${ym}.csv`);
  showToast('CSVをダウンロードしました', 'success');
}

// ===== USERS =====
function renderUsers() {
  const q = (document.getElementById('user-search')||{}).value || '';
  const filtered = DB.users.filter(u => u.name.includes(q) || (u.kana||'').includes(q));
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  const typeLabel = { commute: '通所', home: '在宅', farm: '農場' };
  const statusBadge = { active: 'badge-green', leave: 'badge-orange', inactive: 'badge-gray' };
  const statusLabel = { active: '在籍', leave: '休業', inactive: '退所' };
  tbody.innerHTML = filtered.map(u => `
    <tr>
      <td><strong>${u.name}</strong><br><small style="color:#888;">${u.kana||''}</small></td>
      <td><span class="badge badge-blue">${typeLabel[u.type]||u.type}</span></td>
      <td style="text-align:right;">¥${(u.wageCommute||0).toLocaleString()}</td>
      <td style="text-align:right;">¥${(u.wageHome||0).toLocaleString()}</td>
      <td style="text-align:center;">${u.maxHours}h</td>
      <td><span class="badge ${statusBadge[u.status]||'badge-gray'}">${statusLabel[u.status]||u.status}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="openUserModal('${u.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.id}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openUserModal(id) {
  const u = id ? DB.users.find(x=>x.id===id) : null;
  openModal(`
    <div class="modal-header"><h3>${u?'利用者編集':'利用者登録'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-group"><label>氏名 *</label><input type="text" id="u-name" class="form-control" value="${u?u.name:''}"></div>
      <div class="form-group"><label>ふりがな</label><input type="text" id="u-kana" class="form-control" value="${u?u.kana||'':''}"></div>
      <div class="form-group"><label>利用形態</label>
        <select id="u-type" class="form-control">
          <option value="commute" ${!u||u.type==='commute'?'selected':''}>通所</option>
          <option value="home" ${u&&u.type==='home'?'selected':''}>在宅</option>
          <option value="farm" ${u&&u.type==='farm'?'selected':''}>農場</option>
        </select>
      </div>
      <div class="form-group"><label>時給（通所）円</label><input type="number" id="u-wage-c" class="form-control" value="${u?u.wageCommute||850:850}"></div>
      <div class="form-group"><label>時給（在宅）円</label><input type="number" id="u-wage-h" class="form-control" value="${u?u.wageHome||0:0}"></div>
      <div class="form-group"><label>最大利用時間</label>
        <select id="u-maxh" class="form-control">
          <option value="2" ${u&&u.maxHours===2?'selected':''}>2時間</option>
          <option value="4" ${!u||u.maxHours===4?'selected':''}>4時間</option>
          <option value="5" ${u&&u.maxHours===5?'selected':''}>5時間（延長）</option>
        </select>
      </div>
      <div class="form-group"><label>障害区分</label><input type="text" id="u-disability" class="form-control" value="${u?u.disability||'':''}"></div>
      <div class="form-group"><label>保護者名</label><input type="text" id="u-guardian" class="form-control" value="${u?u.guardianName||'':''}"></div>
      <div class="form-group"><label>ステータス</label>
        <select id="u-status" class="form-control">
          <option value="active" ${!u||u.status==='active'?'selected':''}>在籍</option>
          <option value="leave" ${u&&u.status==='leave'?'selected':''}>休業</option>
          <option value="inactive" ${u&&u.status==='inactive'?'selected':''}>退所</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">閉じる</button>
      <button class="btn btn-primary" onclick="saveUser('${id||''}')"><i class="fas fa-save"></i> 保存</button>
    </div>
  `);
}

function saveUser(id) {
  const data = {
    name: document.getElementById('u-name').value.trim(),
    kana: document.getElementById('u-kana').value.trim(),
    type: document.getElementById('u-type').value,
    wageCommute: parseInt(document.getElementById('u-wage-c').value)||850,
    wageHome: parseInt(document.getElementById('u-wage-h').value)||0,
    maxHours: parseInt(document.getElementById('u-maxh').value)||4,
    disability: document.getElementById('u-disability').value.trim(),
    guardianName: document.getElementById('u-guardian').value.trim(),
    status: document.getElementById('u-status').value
  };
  if (!data.name) { showToast('氏名を入力してください', 'error'); return; }
  if (id) { const idx = DB.users.findIndex(u=>u.id===id); if(idx>=0) DB.users[idx] = {...DB.users[idx], ...data}; }
  else DB.users.push({ id: uid(), ...data });
  saveData(DB);
  closeModal();
  renderUsers();
  showToast('利用者情報を保存しました', 'success');
  addAuditLog(id?'利用者編集':'利用者登録', data.name);
}

function deleteUser(id) {
  const u = DB.users.find(x=>x.id===id);
  if (!confirm(`${u?u.name:'このユーザー'}を削除しますか？`)) return;
  DB.users = DB.users.filter(x=>x.id!==id);
  saveData(DB);
  renderUsers();
  showToast('削除しました');
}

// ===== CERTIFICATES =====
function getCertAlerts() {
  const today = new Date();
  return DB.certificates.filter(c => {
    const end = new Date(c.validTo);
    const diff = (end - today) / (1000*60*60*24);
    return diff <= 60;
  });
}

function checkCertAlerts() {
  const alerts = getCertAlerts();
  const banner = document.getElementById('cert-alert-banner');
  const badge = document.getElementById('cert-alert-badge');
  if (alerts.length) {
    banner.style.display = 'block';
    banner.innerHTML = `<i class="fas fa-exclamation-triangle"></i> 受給者証の有効期限が60日以内の方がいます（${alerts.map(c=>getUserName(c.userId)).join('、')}）`;
    badge.style.display = 'flex';
    badge.textContent = alerts.length;
  } else {
    banner.style.display = 'none';
    badge.style.display = 'none';
  }
}

function renderCertificates() {
  const filter = (document.getElementById('cert-filter')||{}).value || 'all';
  const today = new Date();
  const tbody = document.getElementById('cert-tbody');
  if (!tbody) return;
  let certs = DB.certificates;
  if (filter !== 'all') {
    certs = certs.filter(c => {
      const diff = (new Date(c.validTo) - today) / (1000*60*60*24);
      if (filter === 'danger') return diff <= 60;
      if (filter === 'warning') return diff <= 90;
      return true;
    });
  }
  tbody.innerHTML = certs.map(c => {
    const diff = Math.round((new Date(c.validTo) - today) / (1000*60*60*24));
    const cls = diff < 0 ? 'badge-red' : diff <= 30 ? 'badge-red' : diff <= 60 ? 'badge-orange' : diff <= 90 ? 'badge-orange' : 'badge-green';
    const diffText = diff < 0 ? '期限切れ' : diff+'日';
    return `<tr>
      <td><strong>${getUserName(c.userId)}</strong></td>
      <td>${c.number}</td>
      <td>${c.validFrom} 〜 ${c.validTo}</td>
      <td><span class="badge ${cls}">${diffText}</span></td>
      <td>${c.amount}日/月</td>
      <td><button class="btn btn-sm btn-outline" onclick="openCertModal('${c.id}')"><i class="fas fa-edit"></i></button></td>
    </tr>`;
  }).join('');
}

function openCertModal(id) {
  const c = DB.certificates.find(x=>x.id===id);
  if (!c) return;
  openModal(`
    <div class="modal-header"><h3>受給者証編集：${getUserName(c.userId)}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-group"><label>受給者証番号</label><input type="text" id="c-number" class="form-control" value="${c.number}"></div>
      <div class="form-group"><label>有効期間 開始</label><input type="date" id="c-from" class="form-control" value="${c.validFrom}"></div>
      <div class="form-group"><label>有効期間 終了</label><input type="date" id="c-to" class="form-control" value="${c.validTo}"></div>
      <div class="form-group"><label>支給量（日/月）</label><input type="number" id="c-amount" class="form-control" value="${c.amount}"></div>
      <div class="form-group"><label>備考</label><input type="text" id="c-notes" class="form-control" value="${c.notes||''}"></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">閉じる</button>
      <button class="btn btn-primary" onclick="saveCert('${id}')"><i class="fas fa-save"></i> 保存</button>
    </div>
  `);
}

function saveCert(id) {
  const idx = DB.certificates.findIndex(c=>c.id===id);
  if (idx < 0) return;
  DB.certificates[idx] = { ...DB.certificates[idx],
    number: document.getElementById('c-number').value,
    validFrom: document.getElementById('c-from').value,
    validTo: document.getElementById('c-to').value,
    amount: parseInt(document.getElementById('c-amount').value)||23,
    notes: document.getElementById('c-notes').value
  };
  saveData(DB);
  closeModal();
  renderCertificates();
  checkCertAlerts();
  showToast('受給者証を更新しました', 'success');
}

// ===== MONITORING =====
function renderMonitoringPage() {
  const tbody = document.getElementById('monitoring-tbody');
  if (!tbody) return;
  tbody.innerHTML = DB.monitoring.map(m => `
    <tr>
      <td><strong>${getUserName(m.userId)}</strong></td>
      <td>${m.date}</td>
      <td>${m.nextDate} ${!m.signed ? '<span class="badge badge-orange">署名待</span>' : ''}</td>
      <td>${m.goal1||'—'}</td>
      <td><span class="badge ${m.goal1Status==='達成'?'badge-green':'badge-blue'}">${m.goal1Status||'—'}</span></td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="openMonitoringModal('${m.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger" onclick="deleteMonitoring('${m.id}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6" style="text-align:center;color:#aaa;">記録がありません</td></tr>';
}

function openMonitoringModal(id) {
  const m = id ? DB.monitoring.find(x=>x.id===id) : null;
  const activeUsers = DB.users.filter(u=>u.status==='active');
  openModal(`
    <div class="modal-header"><h3>${m?'モニタリング編集':'新規モニタリング記録'}</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-group"><label>利用者</label>
        <select id="mo-user" class="form-control">${activeUsers.map(u=>`<option value="${u.id}" ${m&&m.userId===u.id?'selected':''}>${u.name}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>実施日</label><input type="date" id="mo-date" class="form-control" value="${m?m.date:''}"></div>
      <div class="form-group"><label>次回予定日</label><input type="date" id="mo-next" class="form-control" value="${m?m.nextDate:''}"></div>
      <div class="form-group"><label>支援目標①</label><input type="text" id="mo-g1" class="form-control" value="${m?m.goal1||'':''}"></div>
      <div class="form-group"><label>達成状況①</label>
        <select id="mo-g1s" class="form-control">
          <option value="取組中" ${!m||m.goal1Status==='取組中'?'selected':''}>取組中</option>
          <option value="達成" ${m&&m.goal1Status==='達成'?'selected':''}>達成</option>
          <option value="見直し" ${m&&m.goal1Status==='見直し'?'selected':''}>見直し</option>
        </select>
      </div>
      <div class="form-group"><label>支援目標②</label><input type="text" id="mo-g2" class="form-control" value="${m?m.goal2||'':''}"></div>
      <div class="form-group"><label>達成状況②</label>
        <select id="mo-g2s" class="form-control">
          <option value="取組中" ${!m||m.goal2Status==='取組中'?'selected':''}>取組中</option>
          <option value="達成" ${m&&m.goal2Status==='達成'?'selected':''}>達成</option>
          <option value="見直し" ${m&&m.goal2Status==='見直し'?'selected':''}>見直し</option>
        </select>
      </div>
      <div class="form-group"><label>備考</label><textarea id="mo-notes" class="form-control" rows="3">${m?m.notes||'':''}</textarea></div>
      <div class="form-group"><label><input type="checkbox" id="mo-signed" ${m&&m.signed?'checked':''}> 本人署名済み</label></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">閉じる</button>
      <button class="btn btn-primary" onclick="saveMonitoring('${id||''}')"><i class="fas fa-save"></i> 保存</button>
    </div>
  `);
}

function saveMonitoring(id) {
  const data = {
    userId: document.getElementById('mo-user').value,
    date: document.getElementById('mo-date').value,
    nextDate: document.getElementById('mo-next').value,
    goal1: document.getElementById('mo-g1').value,
    goal1Status: document.getElementById('mo-g1s').value,
    goal2: document.getElementById('mo-g2').value,
    goal2Status: document.getElementById('mo-g2s').value,
    notes: document.getElementById('mo-notes').value,
    signed: document.getElementById('mo-signed').checked
  };
  if (id) { const idx = DB.monitoring.findIndex(m=>m.id===id); if(idx>=0) DB.monitoring[idx]={...DB.monitoring[idx],...data}; }
  else DB.monitoring.push({ id: uid(), ...data });
  saveData(DB);
  closeModal();
  renderMonitoringPage();
  showToast('モニタリングを保存しました', 'success');
}

function deleteMonitoring(id) {
  if (!confirm('削除しますか？')) return;
  DB.monitoring = DB.monitoring.filter(m=>m.id!==id);
  saveData(DB);
  renderMonitoringPage();
  showToast('削除しました');
}

// ===== WAGES =====
function renderWages() {
  const y = wagesMonth.getFullYear(), mo = wagesMonth.getMonth();
  document.getElementById('wages-month-label').textContent = formatYM(wagesMonth);
  const ym = formatYMKey(wagesMonth);
  const prevYm = formatYMKey(new Date(y, mo-1, 1));
  
  const activeUsers = DB.users.filter(u => u.status==='active');
  const monthRecs = DB.records.filter(r => r.date.startsWith(ym));
  const prevRecs = DB.records.filter(r => r.date.startsWith(prevYm));
  
  const stats = activeUsers.map(u => {
    const ur = monthRecs.filter(r=>r.userId===u.id);
    const pr = prevRecs.filter(r=>r.userId===u.id);
    const attDays  = ur.filter(r=>['attend','half_am','half_pm'].includes(r.status)).length;
    const attHours = ur.reduce((s,r)=>['attend','half_am','half_pm'].includes(r.status)?s+(r.hours||0):s, 0);
    const attWage  = ur.reduce((s,r)=>['attend','half_am','half_pm'].includes(r.status)?s+(r.wage||0):s, 0);
    const homeDays  = ur.filter(r=>r.status==='home').length;
    const homeHours = ur.reduce((s,r)=>r.status==='home'?s+(r.hours||0):s, 0);
    const homeWage  = ur.reduce((s,r)=>r.status==='home'?s+(r.wage||0):s, 0);
    const farmDays  = ur.filter(r=>r.status==='farm').length;
    const farmHours = ur.reduce((s,r)=>r.status==='farm'?s+(r.hours||0):s, 0);
    const farmWage  = ur.reduce((s,r)=>r.status==='farm'?s+(r.wage||0):s, 0);
    // 控除時間：各日の（標準時間−実勤時間）の合計
    const deductHours = ur.filter(r=>['attend','half_am','half_pm','farm'].includes(r.status))
      .reduce((s,r)=>{ const d=u.maxHours-(r.hours||0); return s+(d>0?d:0); }, 0);
    const wage = attWage + homeWage + farmWage;
    const prevWage = pr.reduce((s,r)=>s+(r.wage||0), 0);
    return { user: u, attDays, attHours, attWage, homeDays, homeHours, homeWage, farmDays, farmHours, farmWage, deductHours, wage, prevWage };
  });
  
  // グラフ
  if (chartWagesBar) chartWagesBar.destroy();
  const bCtx = document.getElementById('chart-wages-bar').getContext('2d');
  chartWagesBar = new Chart(bCtx, {
    type: 'bar',
    data: {
      labels: stats.map(s=>s.user.name.split(' ')[0]),
      datasets: [{ label: '工賃（円）', data: stats.map(s=>s.wage), backgroundColor: '#43a047' }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
  
  // 推移グラフ
  const months6 = [], wageData6 = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(y, mo-i, 1);
    months6.push(`${d.getMonth()+1}月`);
    const key = formatYMKey(d);
    const total = DB.records.filter(r=>r.date.startsWith(key)).reduce((s,r)=>s+(r.wage||0),0);
    wageData6.push(total);
  }
  if (chartWagesTrend) chartWagesTrend.destroy();
  const tCtx = document.getElementById('chart-wages-trend').getContext('2d');
  chartWagesTrend = new Chart(tCtx, {
    type: 'line',
    data: {
      labels: months6,
      datasets: [{ label: '工賃総額', data: wageData6, borderColor: '#43a047', backgroundColor: 'rgba(67,160,71,0.1)', fill: true, tension: 0.3 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
  
  document.getElementById('wages-tbody').innerHTML = stats.map(s => {
    const diff = s.prevWage ? s.wage - s.prevWage : null;
    const diffText = diff === null ? '-' : (diff >= 0 ? '+' : '') + diff.toLocaleString() + '円';
    const diffColor = diff === null ? '#888' : diff >= 0 ? '#2e7d32' : '#c62828';
    return `<tr>
      <td><strong>${s.user.name}</strong></td>
      <td class="center">${s.attDays}</td>
      <td class="center">${s.attHours}h</td>
      <td style="text-align:right;">¥${s.attWage.toLocaleString()}</td>
      <td class="center">${s.homeDays}</td>
      <td class="center">${s.homeHours}h</td>
      <td style="text-align:right;">¥${s.homeWage.toLocaleString()}</td>
      <td class="center">${s.farmDays}</td>
      <td class="center">${s.farmHours}h</td>
      <td style="text-align:right;">¥${s.farmWage.toLocaleString()}</td>
      <td class="center" style="color:${s.deductHours>0?'#e65100':'#aaa'};font-weight:700;">${s.deductHours>0?'-'+s.deductHours+'h':'-'}</td>
      <td style="text-align:right;color:#2e7d32;font-weight:700;">¥${s.wage.toLocaleString()}</td>
      <td style="text-align:right;color:${diffColor};font-weight:600;">${diffText}</td>
    </tr>`;
  }).join('');
}

function wagesPrev() { wagesMonth = new Date(wagesMonth.getFullYear(), wagesMonth.getMonth()-1, 1); renderWages(); }
function wagesNext() { wagesMonth = new Date(wagesMonth.getFullYear(), wagesMonth.getMonth()+1, 1); renderWages(); }

function exportWagesCSV() {
  const ym = formatYMKey(wagesMonth);
  const activeUsers = DB.users.filter(u=>u.status==='active');
  const monthRecs = DB.records.filter(r=>r.date.startsWith(ym));
  const rows = [['氏名', '通所日数', '通所時間', '在宅日数', '在宅時間', '工賃合計']];
  activeUsers.forEach(u => {
    const ur = monthRecs.filter(r=>r.userId===u.id);
    rows.push([u.name,
      ur.filter(r=>['attend','half_am','half_pm','farm'].includes(r.status)).length,
      ur.reduce((s,r)=>['attend','half_am','half_pm','farm'].includes(r.status)?s+(r.hours||0):s, 0),
      ur.filter(r=>r.status==='home').length,
      ur.reduce((s,r)=>r.status==='home'?s+(r.hours||0):s, 0),
      ur.reduce((s,r)=>s+(r.wage||0), 0)
    ]);
  });
  downloadCSV(rows, `工賃集計_${ym}.csv`);
  showToast('CSVをダウンロードしました', 'success');
}

// ===== ANALYTICS =====
function showAnalyticsTab(tab, btn) {
  analyticsTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAnalytics();
}

function renderAnalytics() {
  const today = new Date();
  const ym = formatYMKey(today);
  const activeUsers = DB.users.filter(u=>u.status==='active');
  const monthRecs = DB.records.filter(r=>r.date.startsWith(ym));
  const el = document.getElementById('analytics-content');
  if (!el) return;
  
  chartAnalytics.forEach(c => { try { c.destroy(); } catch(e){} });
  chartAnalytics = [];
  
  if (analyticsTab === 'overview') {
    el.innerHTML = `<div class="grid-2">
      <div class="card"><div class="card-header"><h3>利用区分</h3></div><div class="card-body" style="height:200px;"><canvas id="c-type"></canvas></div></div>
      <div class="card"><div class="card-header"><h3>曜日別延べ人数（今月）</h3></div><div class="card-body" style="height:200px;"><canvas id="c-week"></canvas></div></div>
    </div>`;
    setTimeout(() => {
      const typeCount = {通所:0, 在宅:0, 農場:0};
      monthRecs.forEach(r => { if(r.status==='attend'||r.status==='half_am'||r.status==='half_pm') typeCount['通所']++; else if(r.status==='home') typeCount['在宅']++; else if(r.status==='farm') typeCount['農場']++; });
      const tc = document.getElementById('c-type');
      if (tc) { const chart = new Chart(tc.getContext('2d'), { type:'doughnut', data:{ labels:Object.keys(typeCount), datasets:[{data:Object.values(typeCount), backgroundColor:['#1565c0','#6a1b9a','#2e7d32']}] }, options:{ responsive:true, maintainAspectRatio:false } }); chartAnalytics.push(chart); }
      
      const weekLabels = ['月','火','水','木','金'];
      const weekData = [0,0,0,0,0];
      monthRecs.filter(r=>['attend','home','farm','half_am','half_pm'].includes(r.status)).forEach(r => {
        const d = new Date(r.date);
        const dow = d.getDay();
        if (dow >= 1 && dow <= 5) weekData[dow-1]++;
      });
      const wc = document.getElementById('c-week');
      if (wc) { const chart = new Chart(wc.getContext('2d'), { type:'bar', data:{ labels:weekLabels, datasets:[{label:'延べ人数',data:weekData,backgroundColor:'#42a5f5'}] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}} } }); chartAnalytics.push(chart); }
    }, 50);
    
  } else if (analyticsTab === 'attendance') {
    const stats = activeUsers.map(u => {
      const ur = monthRecs.filter(r=>r.userId===u.id);
      const att = ur.filter(r=>['attend','home','farm','half_am','half_pm'].includes(r.status)).length;
      const rate = ur.length ? Math.round(att/ur.length*100) : 0;
      return { name: u.name.split(' ')[0], rate };
    });
    el.innerHTML = `<div class="card"><div class="card-header"><h3>個人別出勤率（今月）</h3></div><div class="card-body" style="height:300px;"><canvas id="c-att"></canvas></div></div>`;
    setTimeout(() => {
      const c = document.getElementById('c-att');
      if (c) { const chart = new Chart(c.getContext('2d'), { type:'bar', data:{ labels:stats.map(s=>s.name), datasets:[{label:'出勤率(%)',data:stats.map(s=>s.rate),backgroundColor:stats.map(s=>s.rate>=80?'#2e7d32':s.rate>=60?'#f57f17':'#c62828')}] }, options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{x:{min:0,max:100}} } }); chartAnalytics.push(chart); }
    }, 50);
    
  } else if (analyticsTab === 'wages') {
    const months6 = [], wageData6 = [];
    for (let i=5;i>=0;i--) { const d=new Date(today.getFullYear(),today.getMonth()-i,1); months6.push(`${d.getMonth()+1}月`); const key=formatYMKey(d); const total=DB.records.filter(r=>r.date.startsWith(key)).reduce((s,r)=>s+(r.wage||0),0); wageData6.push(total); }
    el.innerHTML = `<div class="card"><div class="card-header"><h3>工賃推移（6ヶ月）</h3></div><div class="card-body" style="height:280px;"><canvas id="c-wages"></canvas></div></div>`;
    setTimeout(() => {
      const c = document.getElementById('c-wages');
      if (c) { const chart = new Chart(c.getContext('2d'), { type:'line', data:{ labels:months6, datasets:[{label:'工賃総額（円）',data:wageData6,borderColor:'#43a047',backgroundColor:'rgba(67,160,71,0.1)',fill:true,tension:0.3}] }, options:{ responsive:true, maintainAspectRatio:false } }); chartAnalytics.push(chart); }
    }, 50);
    
  } else if (analyticsTab === 'weekday') {
    const weekLabels = ['月','火','水','木','金'];
    const weekData = [0,0,0,0,0];
    const absData = [0,0,0,0,0];
    monthRecs.forEach(r => {
      const dow = new Date(r.date).getDay();
      if (dow >= 1 && dow <= 5) {
        if (['attend','home','farm','half_am','half_pm'].includes(r.status)) weekData[dow-1]++;
        else if (r.status==='absent') absData[dow-1]++;
      }
    });
    el.innerHTML = `<div class="card"><div class="card-header"><h3>曜日別出欠分布（今月）</h3></div><div class="card-body" style="height:280px;"><canvas id="c-wd"></canvas></div></div>`;
    setTimeout(() => {
      const c = document.getElementById('c-wd');
      if (c) { const chart = new Chart(c.getContext('2d'), { type:'bar', data:{ labels:weekLabels, datasets:[{label:'出席',data:weekData,backgroundColor:'#1565c0'},{label:'欠席',data:absData,backgroundColor:'#e53935'}] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}}, scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true}} } }); chartAnalytics.push(chart); }
    }, 50);
    
  } else if (analyticsTab === 'absence') {
    const reasons = {};
    DB.records.filter(r=>r.status==='absent'&&r.absenceReason).forEach(r => { reasons[r.absenceReason]=(reasons[r.absenceReason]||0)+1; });
    el.innerHTML = `<div class="card"><div class="card-header"><h3>欠席理由分布</h3></div><div class="card-body" style="height:280px;"><canvas id="c-abs"></canvas></div></div>`;
    setTimeout(() => {
      const c = document.getElementById('c-abs');
      if (c) { const chart = new Chart(c.getContext('2d'), { type:'doughnut', data:{ labels:Object.keys(reasons), datasets:[{data:Object.values(reasons),backgroundColor:['#e53935','#ff9800','#1565c0','#43a047','#9c27b0']}] }, options:{ responsive:true, maintainAspectRatio:false } }); chartAnalytics.push(chart); }
    }, 50);
    
  } else if (analyticsTab === 'goal') {
    const months6 = [], goalData = [], actualData = [];
    const goal = DB.settings.goal || 120;
    for (let i=5;i>=0;i--) { const d=new Date(today.getFullYear(),today.getMonth()-i,1); months6.push(`${d.getMonth()+1}月`); const key=formatYMKey(d); const cnt=DB.records.filter(r=>r.date.startsWith(key)&&['attend','home','farm','half_am','half_pm'].includes(r.status)).length; actualData.push(cnt); goalData.push(goal); }
    el.innerHTML = `<div class="card"><div class="card-header"><h3>目標 vs 実績（6ヶ月）</h3></div><div class="card-body" style="height:280px;"><canvas id="c-goal"></canvas></div></div>`;
    setTimeout(() => {
      const c = document.getElementById('c-goal');
      if (c) { const chart = new Chart(c.getContext('2d'), { type:'bar', data:{ labels:months6, datasets:[{label:'実績',data:actualData,backgroundColor:'#1565c0'},{label:'目標',data:goalData,type:'line',borderColor:'#e53935',backgroundColor:'transparent',pointRadius:4,borderDash:[5,3]}] }, options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom'}} } }); chartAnalytics.push(chart); }
    }, 50);
  }
}

// ===== BILLING =====
function renderBilling() {
  const y = billingMonth.getFullYear(), mo = billingMonth.getMonth();
  document.getElementById('billing-month-label').textContent = formatYM(billingMonth);
  const ym = formatYMKey(billingMonth);
  const monthRecs = DB.records.filter(r=>r.date.startsWith(ym));
  const attTotal = monthRecs.filter(r=>['attend','home','farm','half_am','half_pm'].includes(r.status)).length;
  const missingRecs = monthRecs.filter(r=>!r.status);
  
  document.getElementById('billing-content').innerHTML = `
    <h4 style="margin-bottom:16px;">請求前チェックリスト</h4>
    <div class="checklist-item"><input type="checkbox" id="chk1"><label for="chk1">全利用者の日別実績入力が完了している（当月延べ ${attTotal} 件）</label></div>
    <div class="checklist-item"><input type="checkbox" id="chk2"><label for="chk2">欠席理由が全て記入されている</label></div>
    <div class="checklist-item"><input type="checkbox" id="chk3"><label for="chk3">受給者証の有効期限を確認した</label></div>
    <div class="checklist-item"><input type="checkbox" id="chk4"><label for="chk4">工賃計算を確認した</label></div>
    <div class="checklist-item"><input type="checkbox" id="chk5"><label for="chk5">モニタリングが予定通り実施されている</label></div>
    <div style="margin-top:20px;">
      <button class="btn btn-primary" onclick="executeBilling('${ym}')"><i class="fas fa-lock"></i> 月次締め実行</button>
      <button class="btn btn-outline" style="margin-left:8px;" onclick="exportBillingCSV('${ym}')"><i class="fas fa-file-csv"></i> 請求データCSV</button>
    </div>
    <div style="margin-top:16px;padding:12px;background:#e8f5e9;border-radius:6px;">
      <strong>当月サマリー</strong><br>
      延べ人数: ${attTotal}件 ／ 工賃総額: ¥${monthRecs.reduce((s,r)=>s+(r.wage||0),0).toLocaleString()}
    </div>
  `;
}

function billingPrev() { billingMonth = new Date(billingMonth.getFullYear(), billingMonth.getMonth()-1, 1); renderBilling(); }
function billingNext() { billingMonth = new Date(billingMonth.getFullYear(), billingMonth.getMonth()+1, 1); renderBilling(); }

function executeBilling(ym) {
  if (!confirm(`${ym.replace('-','年')}月の月次締めを実行しますか？`)) return;
  showToast(`${ym}の月次締めを実行しました`, 'success');
  addAuditLog('月次締め', ym);
}

function exportBillingCSV(ym) {
  const monthRecs = DB.records.filter(r=>r.date.startsWith(ym));
  const rows = [['日付','利用者','状況','時間','工賃','欠席理由']];
  monthRecs.forEach(r => {
    rows.push([r.date, getUserName(r.userId), r.status, r.hours||0, r.wage||0, r.absenceReason||'']);
  });
  downloadCSV(rows, `請求データ_${ym}.csv`);
  showToast('CSVをダウンロードしました', 'success');
}

// ===== BOARD =====
function renderBoard() {
  const el = document.getElementById('board-list');
  if (!el) return;
  const sorted = [...DB.board].sort((a,b) => (b.pinned?1:0)-(a.pinned?1:0) || new Date(b.date)-new Date(a.date));
  const catLabel = { notice:'お知らせ', monitoring:'モニタリング', certificate:'受給者証', general:'一般', other:'その他' };
  const priColor = { high:'badge-red', medium:'badge-orange', low:'badge-green' };
  const priLabel = { high:'緊急', medium:'重要', low:'通常' };
  el.innerHTML = sorted.map(b => `
    <div class="board-item ${b.pinned?'pinned':''} ${b.priority}">
      ${b.pinned ? '<span style="font-size:11px;color:#f57f17;"><i class="fas fa-thumbtack"></i> ピン留め</span><br>' : ''}
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
        <strong>${b.title}</strong>
        <div style="display:flex;gap:6px;">
          <span class="badge ${priColor[b.priority]}">${priLabel[b.priority]}</span>
          <span class="badge badge-gray">${catLabel[b.category]||b.category}</span>
        </div>
      </div>
      <p style="font-size:13px;color:#555;">${b.content}</p>
      ${b.userId ? `<p style="font-size:11px;color:#888;">関連利用者: ${getUserName(b.userId)}</p>` : ''}
      <div class="board-meta">${b.date}
        <button class="btn btn-sm btn-outline" style="margin-left:8px;" onclick="togglePin('${b.id}')">${b.pinned?'ピン解除':'ピン留め'}</button>
        <button class="btn btn-sm btn-danger" style="margin-left:4px;" onclick="deleteBoard('${b.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `).join('') || '<p style="color:#aaa;">投稿がありません</p>';
}

function openBoardModal() {
  const activeUsers = DB.users.filter(u=>u.status==='active');
  openModal(`
    <div class="modal-header"><h3>新規投稿</h3><button class="modal-close" onclick="closeModal()">×</button></div>
    <div class="modal-body">
      <div class="form-group"><label>タイトル</label><input type="text" id="bd-title" class="form-control"></div>
      <div class="form-group"><label>内容</label><textarea id="bd-content" class="form-control" rows="4"></textarea></div>
      <div class="form-group"><label>カテゴリ</label>
        <select id="bd-cat" class="form-control">
          <option value="general">一般</option>
          <option value="notice">お知らせ</option>
          <option value="monitoring">モニタリング</option>
          <option value="certificate">受給者証</option>
          <option value="other">その他</option>
        </select>
      </div>
      <div class="form-group"><label>優先度</label>
        <select id="bd-pri" class="form-control">
          <option value="low">通常</option>
          <option value="medium">重要</option>
          <option value="high">緊急</option>
        </select>
      </div>
      <div class="form-group"><label>関連利用者（任意）</label>
        <select id="bd-user" class="form-control">
          <option value="">なし</option>
          ${activeUsers.map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label><input type="checkbox" id="bd-pin"> ピン留めする</label></div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="closeModal()">閉じる</button>
      <button class="btn btn-primary" onclick="saveBoard()"><i class="fas fa-paper-plane"></i> 投稿</button>
    </div>
  `);
}

function saveBoard() {
  const title = document.getElementById('bd-title').value.trim();
  if (!title) { showToast('タイトルを入力してください', 'error'); return; }
  DB.board.unshift({
    id: uid(),
    title,
    content: document.getElementById('bd-content').value,
    category: document.getElementById('bd-cat').value,
    priority: document.getElementById('bd-pri').value,
    userId: document.getElementById('bd-user').value || null,
    pinned: document.getElementById('bd-pin').checked,
    date: formatYMD(new Date())
  });
  saveData(DB);
  closeModal();
  renderBoard();
  showToast('投稿しました', 'success');
}

function togglePin(id) {
  const idx = DB.board.findIndex(b=>b.id===id);
  if (idx>=0) DB.board[idx].pinned = !DB.board[idx].pinned;
  saveData(DB);
  renderBoard();
}

function deleteBoard(id) {
  if (!confirm('削除しますか？')) return;
  DB.board = DB.board.filter(b=>b.id!==id);
  saveData(DB);
  renderBoard();
  showToast('削除しました');
}

// ===== REPORTS =====
function renderReports() {
  const el = document.getElementById('report-grid');
  if (!el) return;
  const reports = [
    { icon:'fas fa-table', title:'月次利用実績表', desc:'CSV出力', action:()=>exportMonthlyCSV() },
    { icon:'fas fa-yen-sign', title:'工賃支払台帳', desc:'CSV出力', action:()=>exportWagesCSV() },
    { icon:'fas fa-file-invoice', title:'請求データ', desc:'CSV出力', action:()=>exportBillingCSV(formatYMKey(new Date())) },
    { icon:'fas fa-id-card', title:'受給者証一覧', desc:'CSV出力', action:()=>exportCertCSV() },
    { icon:'fas fa-users', title:'利用者マスタ', desc:'CSV出力', action:()=>exportUsersCSV() },
    { icon:'fas fa-history', title:'監査ログ', desc:'CSV出力', action:()=>exportAuditCSV() }
  ];
  el.innerHTML = reports.map((r,i) => `
    <div class="report-card" onclick="reportActions[${i}]()">
      <i class="${r.icon}"></i>
      <div class="rc-title">${r.title}</div>
      <div class="rc-desc">${r.desc}</div>
    </div>
  `).join('');
  window.reportActions = reports.map(r=>r.action);
}

function exportCertCSV() {
  const today = new Date();
  const rows = [['氏名','受給者証番号','有効開始','有効終了','残日数','支給量']];
  DB.certificates.forEach(c => {
    const diff = Math.round((new Date(c.validTo) - today) / (1000*60*60*24));
    rows.push([getUserName(c.userId), c.number, c.validFrom, c.validTo, diff < 0 ? '期限切れ' : diff+'日', c.amount+'日/月']);
  });
  downloadCSV(rows, '受給者証一覧.csv');
  showToast('CSVをダウンロードしました', 'success');
}

function exportUsersCSV() {
  const rows = [['氏名','かな','利用形態','時給(通所)','時給(在宅)','最大時間','障害区分','ステータス']];
  DB.users.forEach(u => {
    rows.push([u.name, u.kana||'', u.type, u.wageCommute||0, u.wageHome||0, u.maxHours+'h', u.disability||'', u.status]);
  });
  downloadCSV(rows, '利用者マスタ.csv');
  showToast('CSVをダウンロードしました', 'success');
}

function exportAuditCSV() {
  const rows = [['日時','ユーザー','操作','詳細']];
  DB.auditLog.forEach(a => { rows.push([a.datetime, a.user, a.action, a.detail]); });
  downloadCSV(rows, '監査ログ.csv');
  showToast('CSVをダウンロードしました', 'success');
}

// ===== SETTINGS =====
function loadSettings() {
  const s = DB.settings;
  const fields = ['name','admin','number','goal','wage-commute','wage-home','oauth','gas-url','sheet-id','drive-id'];
  const keys = ['name','admin','number','goal','wageCommute','wageHome','oauthClientId','gasUrl','spreadsheetId','driveFolderId'];
  fields.forEach((f, i) => {
    const el = document.getElementById('s-' + f);
    if (el) el.value = s[keys[i]] || '';
  });
}

function renderSettings() {
  loadSettings();
  // 監査ログ
  const el = document.getElementById('audit-log-list');
  if (el) {
    el.innerHTML = DB.auditLog.slice(0, 100).map(a =>
      `<div style="padding:4px 0;border-bottom:1px solid #f0f0f0;"><span style="color:#888;">${a.datetime}</span> <span style="color:#1565c0;">[${a.user}]</span> ${a.action}：${a.detail}</div>`
    ).join('') || '<p style="color:#aaa;">ログがありません</p>';
  }
}

function saveSettings() {
  DB.settings.name = document.getElementById('s-name').value;
  DB.settings.admin = document.getElementById('s-admin').value;
  DB.settings.number = document.getElementById('s-number').value;
  DB.settings.goal = parseInt(document.getElementById('s-goal').value)||120;
  DB.settings.wageCommute = parseInt(document.getElementById('s-wage-commute').value)||850;
  DB.settings.wageHome = parseInt(document.getElementById('s-wage-home').value)||550;
  saveData(DB);
  showToast('設定を保存しました', 'success');
  addAuditLog('設定変更', '事業所設定を保存');
}

async function syncToGoogle() {
  // URLの取得順：設定画面入力欄 → DB.settings → 直接入力ダイアログ
  let gasUrl = '';

  // 設定画面の入力欄から直接取得（保存済みかどうかに関わらず）
  const inputEl = document.getElementById('s-gas-url');
  if (inputEl && inputEl.value.trim()) {
    gasUrl = inputEl.value.trim();
    // DBにも保存しておく
    DB.settings.gasUrl = gasUrl;
    saveData(DB);
  } else if (DB.settings.gasUrl) {
    gasUrl = DB.settings.gasUrl;
  }

  // それでもなければダイアログで入力
  if (!gasUrl) {
    gasUrl = prompt('Apps Script Web App URLを入力してください：\n（例：https://script.google.com/macros/s/.../exec）');
    if (!gasUrl) return;
    DB.settings.gasUrl = gasUrl.trim();
    saveData(DB);
  }

  const el = document.getElementById('sync-result');
  if (el) { el.style.display = 'block'; el.style.color = '#1565c0'; el.textContent = '同期中...しばらくお待ちください'; }
  showToast('Googleへ同期しています...', 'info');

  try {
    const res = await fetch(gasUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {'Content-Type':'text/plain'}, // GASのCORS対策でtext/plainを使用
      body: JSON.stringify({
        action: 'writeAll',
        data: {
          users: DB.users,
          certificates: DB.certificates,
          monitoring: DB.monitoring,
          records: DB.records,
          schedules: DB.schedules,
          board: DB.board,
          auditLog: DB.auditLog,
          settings: [DB.settings]
        }
      })
    });
    const json = await res.json();
    if (json.status === 'ok') {
      if (el) { el.style.color = '#2e7d32'; el.textContent = '✓ 同期完了！スプレッドシートにデータが書き込まれました'; }
      showToast('Googleへの同期が完了しました！', 'success');
      addAuditLog('Google同期', '全データをスプレッドシートへ送信');
    } else {
      if (el) { el.style.color = '#c62828'; el.textContent = 'エラー: ' + (json.message || JSON.stringify(json)); }
      showToast('同期エラー: ' + json.message, 'error');
    }
  } catch(e) {
    if (el) { el.style.color = '#c62828'; el.textContent = 'エラー: ' + e.message; }
    showToast('通信エラー: ' + e.message, 'error');
  }
}

function saveGoogleSettings() {
  DB.settings.oauthClientId = document.getElementById('s-oauth').value.trim();
  DB.settings.gasUrl = document.getElementById('s-gas-url').value.trim();
  DB.settings.spreadsheetId = document.getElementById('s-sheet-id').value.trim();
  DB.settings.driveFolderId = document.getElementById('s-drive-id').value.trim();
  saveData(DB);
  showToast('Google連携設定を保存しました', 'success');
  addAuditLog('設定変更', 'Google連携設定を保存');
}

// ===== DATA MANAGEMENT: BACKUP & RESTORE =====

/**
 * 全データをJSONファイルとしてダウンロードする
 */
function exportAllDataJSON() {
  const exportData = {
    _meta: {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser ? currentUser.name : '-',
      systemName: 'UNIWORK 就労継続支援B型 利用実績管理システム'
    },
    settings: DB.settings,
    users: DB.users,
    certificates: DB.certificates,
    monitoring: DB.monitoring,
    records: DB.records,
    schedules: DB.schedules,
    board: DB.board,
    auditLog: DB.auditLog
  };
  
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const today = formatYMD(new Date()).replace(/-/g, '');
  a.href = url;
  a.download = `UNIWORK_バックアップ_${today}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('バックアップJSONをダウンロードしました', 'success');
  addAuditLog('データバックアップ', 'JSONエクスポート実行');
}

/**
 * JSONファイルを読み込んでデータを復元する
 */
function importDataJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (!file.name.endsWith('.json')) {
    showToast('JSONファイルを選択してください', 'error');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      
      // 必須キーの確認
      const requiredKeys = ['users', 'records'];
      const missing = requiredKeys.filter(k => !imported[k]);
      if (missing.length > 0) {
        showToast('ファイル形式が正しくありません', 'error');
        return;
      }
      
      if (!confirm(`このJSONファイルを復元しますか？\n現在のデータは上書きされます。\n\n対象ファイル: ${file.name}`)) {
        event.target.value = '';
        return;
      }
      
      // データ復元
      if (imported.settings) DB.settings = imported.settings;
      if (imported.users) DB.users = imported.users;
      if (imported.certificates) DB.certificates = imported.certificates;
      if (imported.monitoring) DB.monitoring = imported.monitoring;
      if (imported.records) DB.records = imported.records;
      if (imported.schedules) DB.schedules = imported.schedules || [];
      if (imported.board) DB.board = imported.board;
      if (imported.auditLog) DB.auditLog = imported.auditLog;
      
      saveData(DB);
      event.target.value = '';
      
      showToast('データを復元しました！ページを再読み込みします...', 'success');
      addAuditLog('データ復元', `JSONインポート: ${file.name}`);
      
      setTimeout(() => { location.reload(); }, 2000);
      
    } catch(err) {
      console.error('JSONパースエラー:', err);
      showToast('JSONファイルの読み込みに失敗しました', 'error');
      event.target.value = '';
    }
  };
  reader.readAsText(file, 'utf-8');
}

// ===== APP DOWNLOAD =====

/**
 * アプリ本体ファイル一式をJSZipで正しいフォルダ構造のZIPとしてダウンロード
 */
async function downloadAppZip() {
  showToast('ZIPを作成しています...', 'info');
  try {
    const zip = new JSZip();

    const files = [
      { zipPath: 'index.html',    fetchUrl: 'index.html' },
      { zipPath: 'css/style.css', fetchUrl: 'css/style.css' },
      { zipPath: 'js/data.js',    fetchUrl: 'js/data.js' },
      { zipPath: 'js/app.js',     fetchUrl: 'js/app.js' },
      { zipPath: 'README.md',     fetchUrl: 'README.md' }
    ];

    for (const f of files) {
      const res  = await fetch(f.fetchUrl);
      const text = await res.text();
      zip.file(f.zipPath, text);
    }

    const blob    = await zip.generateAsync({ type: 'blob' });
    const today   = formatYMD(new Date()).replace(/-/g, '');
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    a.href        = url;
    a.download    = `UNIWORK_${today}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('ZIPダウンロード完了！', 'success');
    addAuditLog('本体ダウンロード', 'ZIPエクスポート実行');
  } catch(e) {
    showToast('ZIP生成に失敗しました: ' + e.message, 'error');
    console.error(e);
  }
}

/**
 * アプリ本体＋データを一括ダウンロード
 */
async function downloadAppAndData() {
  await downloadAppZip();
  await new Promise(r => setTimeout(r, 600));
  exportAllDataJSON();
}

// ===== CSV UTILITY =====
function downloadCSV(rows, filename) {
  const BOM = '\uFEFF';
  const csv = BOM + rows.map(r => r.map(cell => {
    const s = String(cell);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g,'""')}"` : s;
  }).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ===== KEYBOARD SHORTCUT =====
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ===== SYNC BUTTON =====
document.addEventListener('DOMContentLoaded', function() {
  const syncBtn = document.getElementById('sync-btn');
  if (syncBtn) {
    syncBtn.addEventListener('click', function() {
      syncToGoogle();
    });
  }
});
