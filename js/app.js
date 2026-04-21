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
    case 'download': break;
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
  const map = { 
    am: '<span class="sc-am">午前</span>', 
    pm: '<span class="sc-pm">午後</span>', 
    full: '<span class="sc-full">終日4h</span>', 
    full5: '<span class="sc-full">終日5h</span>', 
    home_am: '<span class="sc-home">在(前)</span>', 
    home_pm: '<span class="sc-home">在(後)</span>', 
    farm: '<span class="sc-farm">農場</span>', 
    cancel: '<span class="sc-cancel">ｷｬ</span>', 
    none: '' 
  };
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
          <option value="am"      ${sch&&sch.type==='am'     ?'selected':''}>午前（10:00〜12:00）</option>
          <option value="pm"      ${sch&&sch.type==='pm'     ?'selected':''}>午後（13:00〜15:00）</option>
          <option value="full"    ${sch&&sch.type==='full'   ?'selected':''}>終日4h（10:00〜14:00）</option>
          <option value="full5"   ${sch&&sch.type==='full5'  ?'selected':''}>終日5h（10:00〜16:00）</option>
          <option value="home_am" ${sch&&sch.type==='home_am'?'selected':''}>在宅午前（10:00〜12:00）</option>
          <option value="home_pm" ${sch&&sch.type==='home_pm'?'selected':''}>在宅午後（13:00〜15:00）</option>
          <option value="farm"    ${sch&&sch.type==='farm'   ?'selected':''}>農場</option>
          <option value="cancel"  ${sch&&sch.type==='cancel' ?'selected':''}>キャンセル</option>
        </select>
      </div>
      <div class="form-group">
        <label>変更理由</label>
        <input type="text" id="sch-reason" class="form-control" value="${sch&&sch.reason?sch.reason:''}">
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
      <div class="form-group">
        <label>予定区分</label>
        <select id="bulk-type" class="form-control">
          <option value="am">午前</option>
          <option value="pm">午後</option>
          <option value="full" selected>終日</option>
          <option value="home_am">在宅午前</option>
          <option value="home_pm">在宅午後</option>
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
  const y = scheduleMonth.getFullYear(), m = scheduleMonth.getMonth();
  document.getElementById('bulk-from').value = `${y}-${String(m+1).padStart(2,'0')}-01`;
  const last = getDaysInMonth(y, m);
  document.getElementById('bulk-to').value = `${y}-${String(m+1).padStart(2,'0')}-${String(last).padStart(2,'0')}`;
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
    if (dow === 0 || dow === 6) continue;
    const dateStr = formatYMD(new Date(d));
    targetUsers.forEach(uid => {
      const idx = DB.schedules.findIndex(s => s.userId===uid && s.date===dateStr);
      if (idx >= 0) { DB.schedules[idx].type = type; }
      else { DB.schedules.push({ id: uid(), userId: uid, date: dateStr, type, reason: '', notes: '', createdAt: new Date().toISOString() }); }
      count++;
    });
  }
  saveData(DB);
  closeModal();
  renderSchedule();
  showToast(`${count}件の予定を設定しました`, 'success');
}

// ===== DAILY (日別実績入力) =====
function renderDaily() {
  const dateStr = formatYMD(dailyDate);
  document.getElementById('daily-date-label').textContent = formatDate(dailyDate);
  const activeUsers = DB.users.filter(u => u.status === 'active');
  let html = `<table class="data-table">
    <thead><tr><th>氏名</th><th>午前</th><th>開始</th><th>終了</th><th>午後</th><th>開始</th><th>終了</th><th>時間計</th><th>工賃計</th><th>欠席理由</th><th>備考</th></tr></thead>
    <tbody>`;
  
  activeUsers.forEach(u => {
    const rec = DB.records.find(r => r.date === dateStr && r.userId === u.id);
    const sch = DB.schedules.find(s => s.userId === u.id && s.date === dateStr);

    const schMap = {
      am:      { am:'att_am',  amS:'10:00', amE:'12:00', pm:'',       pmS:'',      pmE:''      },
      pm:      { am:'',        amS:'',      amE:'',      pm:'att_pm', pmS:'13:00', pmE:'15:00' },
      full:    { am:'att_am',  amS:'10:00', amE:'12:00', pm:'att_pm', pmS:'13:00', pmE:'15:00' },
      full5:   { am:'att_am',  amS:'10:00', amE:'12:00', pm:'att_pm', pmS:'13:00', pmE:'16:00' },
      attend:  { am:'att_am',  amS:'10:00', amE:'12:00', pm:'att_pm', pmS:'13:00', pmE:'15:00' },
      home_am: { am:'home_am', amS:'10:00', amE:'12:00', pm:'',       pmS:'',      pmE:''      },
      home_pm: { am:'',        amS:'',      amE:'',      pm:'home_pm',pmS:'13:00', pmE:'15:00' },
      farm:    { am:'farm_am', amS:'10:00', amE:'12:00', pm:'farm_pm',pmS:'13:00', pmE:'15:00' },
      cancel:  { am:'cancel',  amS:'',      amE:'',      pm:'cancel', pmS:'',      pmE:''      },
    };

    const isUnfilled = !rec || (!rec.amStatus && !rec.pmStatus);
    const sd = (isUnfilled && sch) ? (schMap[sch.type] || {}) : {};

    const amStatus = (rec && rec.amStatus) ? rec.amStatus : (sd.am || '');
    const amStart  = (rec && rec.amStart)  ? rec.amStart  : (sd.amS || '');
    const amEnd    = (rec && rec.amEnd)    ? rec.amEnd    : (sd.amE || '');
    const pmStatus = (rec && rec.pmStatus) ? rec.pmStatus : (sd.pm || '');
    const pmStart  = (rec && rec.pmStart)  ? rec.pmStart  : (sd.pmS || '');
    const pmEnd    = (rec && rec.pmEnd)    ? rec.pmEnd    : (sd.pmE || '');
    const absReason = rec ? (rec.absenceReason||'') : '';
    const notes     = rec ? (rec.notes||'') : '';

    function statusOpts(sel) {
      return [['','未入力'],['att_am','通所'],['home_am','在宅'],['farm_am','農場'],['absent','欠席'],['cancel','ｷｬﾝｾﾙ']]
        .map(([v,l])=>`<option value="${v}" ${sel===v?'selected':''}>${l}</option>`).join('');
    }

    html += `<tr>
      <td><strong>${u.name}</strong></td>
      <td><select id="d-am-${u.id}" class="form-control" onchange="updateDailyTotal('${u.id}')">${statusOpts(amStatus)}</select></td>
      <td><input type="time" id="d-ams-${u.id}" value="${amStart}" class="form-control" onchange="updateDailyTotal('${u.id}')"></td>
      <td><input type="time" id="d-ame-${u.id}" value="${amEnd}"   class="form-control" onchange="updateDailyTotal('${u.id}')"></td>
      <td><select id="d-pm-${u.id}" class="form-control" onchange="updateDailyTotal('${u.id}')">${statusOpts(pmStatus)}</select></td>
      <td><input type="time" id="d-pms-${u.id}" value="${pmStart}" class="form-control" onchange="updateDailyTotal('${u.id}')"></td>
      <td><input type="time" id="d-pme-${u.id}" value="${pmEnd}"   class="form-control" onchange="updateDailyTotal('${u.id}')"></td>
      <td id="d-hours-${u.id}" style="text-align:center;font-weight:700;">-</td>
      <td id="d-wage-${u.id}"  style="text-align:right;color:#2e7d32;font-weight:700;">-</td>
      <td><input type="text" id="d-reason-${u.id}" value="${absReason}" class="form-control" placeholder="理由"></td>
      <td><input type="text" id="d-notes-${u.id}"  value="${notes}"     class="form-control" placeholder="備考"></td>
    </tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('daily-table-wrap').innerHTML = html;
  activeUsers.forEach(u => updateDailyTotal(u.id));
}

function calcSlotHW(status, start, end, user) {
  if (!status || status==='absent' || status==='cancel') return { hours:0, wage:0 };
  if (start && end) {
    const [sh,sm] = start.split(':').map(Number);
    const [eh,em] = end.split(':').map(Number);
    const mins = (eh*60+em)-(sh*60+sm);
    const hours = mins > 0 ? Math.floor(mins/30)*0.5 : 0;
    const isHome = status.startsWith('home_');
    const isFarm = status.startsWith('farm_');
    const rate = isHome ? (user.wageHome||0) : isFarm ? (user.wageFarm||user.wageCommute||0) : (user.wageCommute||0);
    return { hours, wage: Math.round(rate * hours) };
  }
  return { hours:0, wage:0 };
}

function updateDailyTotal(userId) {
  const user = DB.users.find(u=>u.id===userId);
  if (!user) return;
  const am = calcSlotHW(document.getElementById('d-am-'+userId).value, document.getElementById('d-ams-'+userId).value, document.getElementById('d-ame-'+userId).value, user);
  const pm = calcSlotHW(document.getElementById('d-pm-'+userId).value, document.getElementById('d-pms-'+userId).value, document.getElementById('d-pme-'+userId).value, user);
  const totalH = Math.round((am.hours + pm.hours)*10)/10;
  const totalW = am.wage + pm.wage;
  document.getElementById('d-hours-'+userId).textContent = totalH > 0 ? totalH+'h' : '-';
  document.getElementById('d-wage-'+userId).textContent  = totalH > 0 ? '¥'+totalW.toLocaleString() : '-';
}

function dailyPrev() { dailyDate.setDate(dailyDate.getDate()-1); renderDaily(); }
function dailyNext() { dailyDate.setDate(dailyDate.getDate()+1); renderDaily(); }

function saveDaily() {
  const dateStr = formatYMD(dailyDate);
  const activeUsers = DB.users.filter(u => u.status === 'active');
  activeUsers.forEach(u => {
    const amStatus = document.getElementById('d-am-'+u.id).value;
    const pmStatus = document.getElementById('d-pm-'+u.id).value;
    const am = calcSlotHW(amStatus, document.getElementById('d-ams-'+u.id).value, document.getElementById('d-ame-'+u.id).value, u);
    const pm = calcSlotHW(pmStatus, document.getElementById('d-pms-'+u.id).value, document.getElementById('d-pme-'+u.id).value, u);
    const existing = DB.records.findIndex(r => r.date===dateStr && r.userId===u.id);
    const rec = { 
      id: uid(), date: dateStr, userId: u.id,
      amStatus, amStart: document.getElementById('d-ams-'+u.id).value, amEnd: document.getElementById('d-ame-'+u.id).value,
      pmStatus, pmStart: document.getElementById('d-pms-'+u.id).value, pmEnd: document.getElementById('d-pme-'+u.id).value,
      status: amStatus || pmStatus || '', hours: Math.round((am.hours + pm.hours)*10)/10, wage: am.wage + pm.wage,
      absenceReason: document.getElementById('d-reason-'+u.id).value, notes: document.getElementById('d-notes-'+u.id).value
    };
    if (existing >= 0) { DB.records[existing] = { ...DB.records[existing], ...rec, id: DB.records[existing].id }; }
    else if (amStatus || pmStatus) { DB.records.push(rec); }
  });
  saveData(DB);
  showToast('実績を保存しました', 'success');
}

// ===== MONTHLY =====
function renderMonthly() {
  const y = monthlyMonth.getFullYear(), mo = monthlyMonth.getMonth();
  document.getElementById('monthly-month-label').textContent = formatYM(monthlyMonth);
  const ym = `${y}-${String(mo+1).padStart(2,'0')}`, days = getDaysInMonth(y, mo), activeUsers = DB.users.filter(u => u.status === 'active'), monthRecs = DB.records.filter(r => r.date.startsWith(ym));
  let thead = '<tr><th>氏名</th>';
  for (let d = 1; d <= days; d++) {
    const dow = new Date(y, mo, d).getDay();
    thead += `<th style="${dow===0?'color:#e53935':dow===6?'color:#1565c0':''};min-width:28px;">${d}</th>`;
  }
  thead += '<th>通所日</th><th>通所時間</th><th>通所工賃</th><th>在宅日</th><th>在宅時間</th><th>在宅工賃</th><th>農場日</th><th>農場時間</th><th>農場工賃</th><th>欠席</th><th>ｷｬﾝｾﾙ</th><th style="color:#e65100;">控除時間</th><th>出勤率</th><th>工賃合計</th></tr>';
  let tbody = '';
  activeUsers.forEach(u => {
    let attD=0, attH=0, attW=0, homeD=0, homeH=0, homeW=0, farmD=0, farmH=0, farmW=0, abs=0, can=0, dedH=0;
    tbody += `<tr><td style="white-space:nowrap;font-weight:600;">${u.name}</td>`;
    for (let d = 1; d <= days; d++) {
      const rec = monthRecs.find(r => r.userId===u.id && r.date===(ym+'-'+String(d).padStart(2,'0')));
      const dow = new Date(y, mo, d).getDay();
      let cell = '', cls = (dow===0||dow===6)?'background:#f5f5f5;':'';
      if (rec && rec.status) {
        if (rec.status==='absent') { abs++; cell='<span class="att-absent">×</span>'; }
        else if (rec.status==='cancel') { can++; cell='<span class="att-cancel">ｷｬ</span>'; }
        else {
          const aH = rec.hours || 0, aW = rec.wage || 0;
          if (rec.amStatus.startsWith('att_') || rec.pmStatus.startsWith('att_')) { attD++; attH+=aH; attW+=aW; cell='<span class="att-attend">○</span>'; }
          else if (rec.amStatus.startsWith('home_') || rec.pmStatus.startsWith('home_')) { homeD++; homeH+=aH; homeW+=aW; cell='<span class="att-home">在</span>'; }
          else if (rec.amStatus.startsWith('farm_') || rec.pmStatus.startsWith('farm_')) { farmD++; farmH+=aH; farmW+=aW; cell='<span class="att-farm">農</span>'; }
          const diff = Math.round(((u.maxHours||4)-aH)*10)/10;
          if (diff>0) { cell += `<br><span style="color:#e65100;font-size:10px;">-${diff}h</span>`; dedH += diff; }
        }
      }
      tbody += `<td class="center" style="${cls}">${cell}</td>`;
    }
    const rate = (attD+homeD+farmD+abs+can) > 0 ? Math.round((attD+homeD+farmD)/(attD+homeD+farmD+abs+can)*100) : 0;
    tbody += `<td class="center">${attD}</td><td class="center">${attH}h</td><td style="text-align:right;">¥${attW.toLocaleString()}</td><td class="center">${homeD}</td><td class="center">${homeH}h</td><td style="text-align:right;">¥${homeW.toLocaleString()}</td><td class="center">${farmD}</td><td class="center">${farmH}h</td><td style="text-align:right;">¥${farmW.toLocaleString()}</td><td class="center">${abs}</td><td class="center">${can}</td><td class="center" style="color:#e65100;">${dedH>0?'-'+dedH+'h':'-'}</td><td class="center" style="font-weight:700;">${rate}%</td><td style="text-align:right;color:#2e7d32;font-weight:700;">¥${(attW+homeW+farmW).toLocaleString()}</td></tr>`;
  });
  document.getElementById('monthly-table-wrap').innerHTML = `<table class="data-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

function monthlyPrev() { monthlyMonth = new Date(monthlyMonth.getFullYear(), monthlyMonth.getMonth()-1, 1); renderMonthly(); }
function monthlyNext() { monthlyMonth = new Date(monthlyMonth.getFullYear(), monthlyMonth.getMonth()+1, 1); renderMonthly(); }

function exportMonthlyCSV() {
  const ym = formatYMKey(monthlyMonth), activeUsers = DB.users.filter(u => u.status === 'active'), monthRecs = DB.records.filter(r => r.date.startsWith(ym)), days = getDaysInMonth(monthlyMonth.getFullYear(), monthlyMonth.getMonth());
  let rows = [['氏名', ...Array.from({length:days},(_,i)=>i+1+'日'), '工賃合計']];
  activeUsers.forEach(u => {
    let row = [u.name];
    let totalW = 0;
    for (let d = 1; d <= days; d++) {
      const rec = monthRecs.find(r => r.userId===u.id && r.date===(ym+'-'+String(d).padStart(2,'0')));
      row.push(rec ? rec.status : '');
      totalW += (rec ? rec.wage : 0);
    }
    row.push(totalW);
    rows.push(row);
  });
  downloadCSV(rows, `月次実績_${ym}.csv`);
}

// ===== USERS =====
function renderUsers() {
  const q = (document.getElementById('user-search')||{}).value || '';
  const filtered = DB.users.filter(u => u.name.includes(q) || (u.kana||'').includes(q));
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;
  tbody.innerHTML = filtered.map(u => `
    <tr>
      <td><strong>${u.name}</strong><br><small>${u.kana||''}</small></td>
      <td><span class="badge badge-blue">${u.type}</span></td>
      <td style="text-align:right;">¥${(u.wageCommute||0).toLocaleString()}</td>
      <td style="text-align:right;">¥${(u.wageHome||0).toLocaleString()}</td>
      <td style="text-align:right;">¥${(u.wageFarm||0).toLocaleString()}</td>
      <td style="text-align:center;">${u.maxHours}h</td>
      <td><span class="badge ${u.status==='active'?'badge-green':'badge-gray'}">${u.status}</span></td>
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
          <option value="commute" ${u&&u.type==='commute'?'selected':''}>通所</option>
          <option value="home" ${u&&u.type==='home'?'selected':''}>在宅</option>
          <option value="farm" ${u&&u.type==='farm'?'selected':''}>農場</option>
        </select>
      </div>
      <div class="form-group"><label>時給（通所）</label><input type="number" id="u-wage-c" class="form-control" value="${u?u.wageCommute:850}"></div>
      <div class="form-group"><label>時給（在宅）</label><input type="number" id="u-wage-h" class="form-control" value="${u?u.wageHome:0}"></div>
      <div class="form-group"><label>時給（農場）</label><input type="number" id="u-wage-f" class="form-control" value="${u?u.wageFarm:0}"></div>
      <div class="form-group"><label>最大時間</label><input type="number" id="u-maxh" class="form-control" value="${u?u.maxHours:4}"></div>
      <div class="form-group"><label>ステータス</label>
        <select id="u-status" class="form-control">
          <option value="active" ${u&&u.status==='active'?'selected':''}>在籍</option>
          <option value="inactive" ${u&&u.status==='inactive'?'selected':''}>退所</option>
        </select>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">閉じる</button><button class="btn btn-primary" onclick="saveUser('${id||''}')">保存</button></div>
  `);
}

function saveUser(id) {
  const data = {
    name: document.getElementById('u-name').value, kana: document.getElementById('u-kana').value,
    type: document.getElementById('u-type').value, wageCommute: parseInt(document.getElementById('u-wage-c').value),
    wageHome: parseInt(document.getElementById('u-wage-h').value), wageFarm: parseInt(document.getElementById('u-wage-f').value),
    maxHours: parseInt(document.getElementById('u-maxh').value), status: document.getElementById('u-status').value
  };
  if (id) { const idx = DB.users.findIndex(u=>u.id===id); DB.users[idx] = {...DB.users[idx], ...data}; }
  else { DB.users.push({ id: uid(), ...data }); }
  saveData(DB); closeModal(); renderUsers(); showToast('保存しました', 'success');
}

function deleteUser(id) {
  if (confirm('削除しますか？')) { DB.users = DB.users.filter(u=>u.id!==id); saveData(DB); renderUsers(); }
}

// ===== CERTIFICATES =====
function getCertAlerts() {
  const today = new Date();
  return DB.certificates.filter(c => (new Date(c.validTo) - today) / (1000*60*60*24) <= 60);
}

function checkCertAlerts() {
  const alerts = getCertAlerts(), banner = document.getElementById('cert-alert-banner'), badge = document.getElementById('cert-alert-badge');
  if (alerts.length) { banner.style.display = 'block'; banner.innerHTML = `受給者証の期限切れ間近が${alerts.length}名います`; badge.style.display = 'flex'; badge.textContent = alerts.length; }
  else { banner.style.display = 'none'; badge.style.display = 'none'; }
}

function renderCertificates() {
  const tbody = document.getElementById('cert-tbody'); if (!tbody) return;
  tbody.innerHTML = DB.certificates.map(c => `<tr><td>${getUserName(c.userId)}</td><td>${c.number}</td><td>${c.validTo}</td><td>${Math.round((new Date(c.validTo)-new Date())/(1000*60*60*24))}日</td><td>${c.amount}日/月</td><td><button class="btn btn-sm btn-outline" onclick="openCertModal('${c.id}')">編集</button></td></tr>`).join('');
}

function openCertModal(id) {
  const c = DB.certificates.find(x=>x.id===id);
  openModal(`<div class="modal-header"><h3>受給者証編集</h3></div><div class="modal-body"><div class="form-group"><label>有効期限</label><input type="date" id="c-to" class="form-control" value="${c.validTo}"></div></div><div class="modal-footer"><button class="btn btn-primary" onclick="saveCert('${id}')">保存</button></div>`);
}

function saveCert(id) {
  const idx = DB.certificates.findIndex(c=>c.id===id);
  DB.certificates[idx].validTo = document.getElementById('c-to').value;
  saveData(DB); closeModal(); renderCertificates(); checkCertAlerts();
}

// ===== MONITORING =====
function renderMonitoringPage() {
  const tbody = document.getElementById('monitoring-tbody'); if (!tbody) return;
  tbody.innerHTML = DB.monitoring.map(m => `<tr><td>${getUserName(m.userId)}</td><td>${m.date}</td><td>${m.nextDate}</td><td>${m.goal1}</td><td>${m.goal1Status}</td><td><button class="btn btn-sm btn-outline" onclick="openMonitoringModal('${m.id}')">編集</button></td></tr>`).join('');
}

function openMonitoringModal(id) {
  const m = id ? DB.monitoring.find(x=>x.id===id) : null;
  openModal(`<div class="modal-header"><h3>モニタリング記録</h3></div><div class="modal-body"><div class="form-group"><label>支援目標</label><input type="text" id="mo-g1" class="form-control" value="${m?m.goal1:''}"></div></div><div class="modal-footer"><button class="btn btn-primary" onclick="saveMonitoring('${id||''}')">保存</button></div>`);
}

function saveMonitoring(id) {
  const data = { userId: DB.users[0].id, date: formatYMD(new Date()), nextDate: '', goal1: document.getElementById('mo-g1').value, goal1Status: '取組中' };
  if (id) { const idx = DB.monitoring.findIndex(m=>m.id===id); DB.monitoring[idx] = {...DB.monitoring[idx], ...data}; }
  else { DB.monitoring.push({ id: uid(), ...data }); }
  saveData(DB); closeModal(); renderMonitoringPage();
}

// ===== WAGES =====
function renderWages() {
  const ym = formatYMKey(wagesMonth), activeUsers = DB.users.filter(u => u.status==='active'), monthRecs = DB.records.filter(r => r.date.startsWith(ym));
  const stats = activeUsers.map(u => {
    const ur = monthRecs.filter(r=>r.userId===u.id);
    const wage = ur.reduce((s,r)=>s+(r.wage||0), 0);
    return { name: u.name, wage };
  });
  if (chartWagesBar) chartWagesBar.destroy();
  chartWagesBar = new Chart(document.getElementById('chart-wages-bar').getContext('2d'), {
    type: 'bar', data: { labels: stats.map(s=>s.name), datasets: [{ label: '工賃', data: stats.map(s=>s.wage), backgroundColor: '#43a047' }] },
    options: { responsive: true, maintainAspectRatio: false }
  });
  document.getElementById('wages-tbody').innerHTML = stats.map(s => `<tr><td>${s.name}</td><td style="text-align:right;">¥${s.wage.toLocaleString()}</td></tr>`).join('');
}

function wagesPrev() { wagesMonth = new Date(wagesMonth.getFullYear(), wagesMonth.getMonth()-1, 1); renderWages(); }
function wagesNext() { wagesMonth = new Date(wagesMonth.getFullYear(), wagesMonth.getMonth()+1, 1); renderWages(); }

// ===== ANALYTICS (分析) =====
function showAnalyticsTab(tab, btn) {
  analyticsTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderAnalytics();
}

function renderAnalytics() {
  const today = new Date(), ym = formatYMKey(today), activeUsers = DB.users.filter(u=>u.status==='active'), monthRecs = DB.records.filter(r=>r.date.startsWith(ym)), el = document.getElementById('analytics-content');
  if (!el) return;
  chartAnalytics.forEach(c => { try { c.destroy(); } catch(e){} });
  chartAnalytics = [];

  if (analyticsTab === 'overview') {
    el.innerHTML = `<div class="grid-2"><div class="card"><div class="card-header"><h3>利用区分</h3></div><div class="card-body" style="height:200px;"><canvas id="c-type"></canvas></div></div><div class="card"><div class="card-header"><h3>曜日別（今月）</h3></div><div class="card-body" style="height:200px;"><canvas id="c-week"></canvas></div></div></div>`;
    setTimeout(() => {
      const typeCount = {通所:0, 在宅:0, 農場:0};
      monthRecs.forEach(r => { if(r.amStatus.startsWith('att') || r.pmStatus.startsWith('att')) typeCount['通所']++; else if(r.amStatus.startsWith('home') || r.pmStatus.startsWith('home')) typeCount['在宅']++; else if(r.amStatus.startsWith('farm') || r.pmStatus.startsWith('farm')) typeCount['農場']++; });
      chartAnalytics.push(new Chart(document.getElementById('c-type').getContext('2d'), { type:'doughnut', data:{ labels:Object.keys(typeCount), datasets:[{data:Object.values(typeCount), backgroundColor:['#1565c0','#6a1b9a','#2e7d32']}] }, options:{ responsive:true, maintainAspectRatio:false } }));
      const weekData = [0,0,0,0,0];
      monthRecs.forEach(r => { const dow = new Date(r.date).getDay(); if (dow>=1 && dow<=5) weekData[dow-1]++; });
      chartAnalytics.push(new Chart(document.getElementById('c-week').getContext('2d'), { type:'bar', data:{ labels:['月','火','水','木','金'], datasets:[{label:'延べ人数',data:weekData,backgroundColor:'#42a5f5'}] }, options:{ responsive:true, maintainAspectRatio:false } }));
    }, 50);
  } else if (analyticsTab === 'attendance') {
    const stats = activeUsers.map(u => {
      const ur = monthRecs.filter(r=>r.userId===u.id), att = ur.filter(r=>r.status!=='absent'&&r.status!=='cancel'&&r.status!=='').length;
      return { name: u.name, rate: ur.length ? Math.round(att/ur.length*100) : 0 };
    });
    el.innerHTML = `<div class="card"><div class="card-header"><h3>個人別出勤率</h3></div><div class="card-body" style="height:300px;"><canvas id="c-att"></canvas></div></div>`;
    setTimeout(() => {
      chartAnalytics.push(new Chart(document.getElementById('c-att').getContext('2d'), { type:'bar', data:{ labels:stats.map(s=>s.name), datasets:[{label:'出勤率(%)',data:stats.map(s=>s.rate),backgroundColor:'#2e7d32'}] }, options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, scales:{x:{min:0,max:100}} } }));
    }, 50);
  } else if (analyticsTab === 'wages') {
    const months6 = [], wageData6 = [];
    for (let i=5;i>=0;i--) { const d=new Date(today.getFullYear(),today.getMonth()-i,1), key=formatYMKey(d); months6.push(`${d.getMonth()+1}月`); wageData6.push(DB.records.filter(r=>r.date.startsWith(key)).reduce((s,r)=>s+(r.wage||0),0)); }
    el.innerHTML = `<div class="card"><div class="card-header"><h3>工賃推移</h3></div><div class="card-body" style="height:280px;"><canvas id="c-wages"></canvas></div></div>`;
    setTimeout(() => {
      chartAnalytics.push(new Chart(document.getElementById('c-wages').getContext('2d'), { type:'line', data:{ labels:months6, datasets:[{label:'総額',data:wageData6,borderColor:'#43a047',fill:true}] }, options:{ responsive:true, maintainAspectRatio:false } }));
    }, 50);
  } else if (analyticsTab === 'weekday') {
    const weekLabels = ['月','火','水','木','金'], attendD = [0,0,0,0,0], absentD = [0,0,0,0,0];
    monthRecs.forEach(r => { const dow = new Date(r.date).getDay(); if (dow>=1 && dow<=5) { if(r.status==='absent') absentD[dow-1]++; else if(r.status!=='') attendD[dow-1]++; } });
    el.innerHTML = `<div class="card"><div class="card-header"><h3>曜日別出欠分布</h3></div><div class="card-body" style="height:280px;"><canvas id="c-wd"></canvas></div></div>`;
    setTimeout(() => {
      chartAnalytics.push(new Chart(document.getElementById('c-wd').getContext('2d'), { type:'bar', data:{ labels:weekLabels, datasets:[{label:'出席',data:attendD,backgroundColor:'#1565c0'},{label:'欠席',data:absentD,backgroundColor:'#e53935'}] }, options:{ responsive:true, maintainAspectRatio:false, scales:{x:{stacked:true},y:{stacked:true}} } }));
    }, 50);
  } else if (analyticsTab === 'absence') {
    const reasons = {};
    DB.records.filter(r=>r.status==='absent'&&r.absenceReason).forEach(r => { reasons[r.absenceReason]=(reasons[r.absenceReason]||0)+1; });
    el.innerHTML = `<div class="card"><div class="card-header"><h3>欠席理由分布</h3></div><div class="card-body" style="height:280px;"><canvas id="c-abs"></canvas></div></div>`;
    setTimeout(() => {
      chartAnalytics.push(new Chart(document.getElementById('c-abs').getContext('2d'), { type:'doughnut', data:{ labels:Object.keys(reasons), datasets:[{data:Object.values(reasons),backgroundColor:['#e53935','#ff9800','#1565c0','#43a047']}] }, options:{ responsive:true, maintainAspectRatio:false } }));
    }, 50);
  } else if (analyticsTab === 'goal') {
    const goal = DB.settings.goal || 120, months6 = [], actualData = [];
    for (let i=5;i>=0;i--) { const d=new Date(today.getFullYear(),today.getMonth()-i,1), key=formatYMKey(d); months6.push(`${d.getMonth()+1}月`); actualData.push(DB.records.filter(r=>r.date.startsWith(key)&&!['absent','cancel',''].includes(r.status)).length); }
    el.innerHTML = `<div class="card"><div class="card-header"><h3>目標 vs 実績</h3></div><div class="card-body" style="height:280px;"><canvas id="c-goal"></canvas></div></div>`;
    setTimeout(() => {
      chartAnalytics.push(new Chart(document.getElementById('c-goal').getContext('2d'), { type:'bar', data:{ labels:months6, datasets:[{label:'実績',data:actualData,backgroundColor:'#1565c0'},{label:'目標',data:months6.map(()=>goal),type:'line',borderColor:'#e53935'}] }, options:{ responsive:true, maintainAspectRatio:false } }));
    }, 50);
  }
}

// ===== BILLING =====
function renderBilling() {
  const ym = formatYMKey(billingMonth), monthRecs = DB.records.filter(r=>r.date.startsWith(ym)), attTotal = monthRecs.filter(r=>!['absent','cancel',''].includes(r.status)).length;
  document.getElementById('billing-content').innerHTML = `<h4>請求前チェック</h4><p>当月延べ人数: ${attTotal}名</p><button class="btn btn-primary" onclick="executeBilling('${ym}')">月次締め実行</button>`;
}

function billingPrev() { billingMonth = new Date(billingMonth.getFullYear(), billingMonth.getMonth()-1, 1); renderBilling(); }
function billingNext() { billingMonth = new Date(billingMonth.getFullYear(), billingMonth.getMonth()+1, 1); renderBilling(); }
function executeBilling(ym) { alert(ym + ' 締め完了'); addAuditLog('月次締め', ym); }

// ===== BOARD =====
function renderBoard() {
  const el = document.getElementById('board-list'); if (!el) return;
  el.innerHTML = DB.board.map(b => `<div class="board-item"><strong>${b.title}</strong><p>${b.content}</p><small>${b.date}</small></div>`).join('');
}

function openBoardModal() {
  openModal(`<h3>新規投稿</h3><input type="text" id="bd-title" class="form-control"><textarea id="bd-content" class="form-control"></textarea><button class="btn btn-primary" onclick="saveBoard()">投稿</button>`);
}

function saveBoard() {
  DB.board.unshift({ id: uid(), title: document.getElementById('bd-title').value, content: document.getElementById('bd-content').value, date: formatYMD(new Date()) });
  saveData(DB); closeModal(); renderBoard();
}

// ===== REPORTS =====
function renderReports() {
  const el = document.getElementById('report-grid'); if (!el) return;
  const reports = [{ title:'実績CSV', action:()=>exportMonthlyCSV() }];
  el.innerHTML = reports.map((r,i) => `<div class="report-card" onclick="reportActions[${i}]()">${r.title}</div>`).join('');
  window.reportActions = reports.map(r=>r.action);
}

// ===== SETTINGS & DATA =====
function loadSettings() {
  const s = DB.settings;
  const map = {'name':'name','admin':'admin','number':'number','goal':'goal','wage-commute':'wageCommute','wage-home':'wageHome'};
  Object.keys(map).forEach(k => { const el = document.getElementById('s-'+k); if(el) el.value = s[map[k]] || ''; });
}

function renderSettings() {
  loadSettings();
  const el = document.getElementById('audit-log-list');
  if (el) el.innerHTML = DB.auditLog.slice(0,50).map(a => `<div>${a.datetime} ${a.action}</div>`).join('');
}

function saveSettings() {
  DB.settings.name = document.getElementById('s-name').value;
  DB.settings.goal = parseInt(document.getElementById('s-goal').value);
  saveData(DB); showToast('保存しました', 'success');
}

async function syncToGoogle() {
  const gasUrl = document.getElementById('s-gas-url').value;
  if (!gasUrl) return;
  try {
    const res = await fetch(gasUrl, { method: 'POST', mode: 'cors', body: JSON.stringify({ action: 'writeAll', data: DB }) });
    const json = await res.json();
    if (json.status==='ok') showToast('同期完了', 'success');
  } catch(e) { console.error(e); }
}

function exportAllDataJSON() {
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `UNIWORK_backup.json`; a.click();
}

function importDataJSON(event) {
  const reader = new FileReader();
  reader.onload = (e) => { DB = JSON.parse(e.target.result); saveData(DB); location.reload(); };
  reader.readAsText(event.target.files[0]);
}

async function downloadAppZip() {
  const zip = new JSZip();
  const files = ['index.html', 'css/style.css', 'js/data.js', 'js/app.js'];
  for (const f of files) { const res = await fetch(f + '?v=' + Date.now()); zip.file(f, await res.text()); }
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `UNIWORK_App.zip`; a.click();
}

function downloadAppAndData() { downloadAppZip(); setTimeout(exportAllDataJSON, 1000); }

function downloadCSV(rows, filename) {
  const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = filename; a.click();
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('sync-btn'); if (btn) btn.addEventListener('click', syncToGoogle);
});