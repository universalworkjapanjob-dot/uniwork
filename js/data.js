// ===== INITIAL DATA (サンプルデータ) =====

const INITIAL_DATA = {
  settings: {
    name: 'UNIWORK 就労継続支援B型事業所',
    admin: '山田 太郎',
    number: '1234567890',
    goal: 120,
    wageCommute: 850,
    wageHome: 550,
    oauthClientId: '',
    gasUrl: '',
    spreadsheetId: '',
    driveFolderId: ''
  },
  users: [
    { id: 'u01', name: '田中 花子', kana: 'タナカ ハナコ', type: 'commute', wageCommute: 850, wageHome: 0, maxHours: 4, status: 'active', disability: '精神障害', guardianName: '田中 一郎' },
    { id: 'u02', name: '佐藤 健一', kana: 'サトウ ケンイチ', type: 'commute', wageCommute: 900, wageHome: 0, maxHours: 4, status: 'active', disability: '知的障害', guardianName: '佐藤 幸子' },
    { id: 'u03', name: '鈴木 美咲', kana: 'スズキ ミサキ', type: 'home', wageCommute: 0, wageHome: 550, maxHours: 2, status: 'active', disability: '精神障害', guardianName: '' },
    { id: 'u04', name: '高橋 勇気', kana: 'タカハシ ユウキ', type: 'commute', wageCommute: 850, wageHome: 600, maxHours: 5, status: 'active', disability: '身体障害', guardianName: '高橋 真理子' },
    { id: 'u05', name: '伊藤 さくら', kana: 'イトウ サクラ', type: 'commute', wageCommute: 800, wageHome: 0, maxHours: 4, status: 'active', disability: '精神障害', guardianName: '' },
    { id: 'u06', name: '渡辺 大輔', kana: 'ワタナベ ダイスケ', type: 'commute', wageCommute: 850, wageHome: 0, maxHours: 2, status: 'active', disability: '知的障害', guardianName: '渡辺 節子' },
    { id: 'u07', name: '中村 ひとみ', kana: 'ナカムラ ヒトミ', type: 'home', wageCommute: 0, wageHome: 550, maxHours: 2, status: 'active', disability: '精神障害', guardianName: '' },
    { id: 'u08', name: '小林 翔太', kana: 'コバヤシ ショウタ', type: 'commute', wageCommute: 850, wageHome: 0, maxHours: 4, status: 'active', disability: '発達障害', guardianName: '小林 明美' },
    { id: 'u09', name: '加藤 幸子', kana: 'カトウ サチコ', type: 'farm', wageCommute: 850, wageHome: 0, maxHours: 4, status: 'leave', disability: '知的障害', guardianName: '加藤 豊' },
    { id: 'u10', name: '吉田 竜也', kana: 'ヨシダ タツヤ', type: 'commute', wageCommute: 900, wageHome: 600, maxHours: 4, status: 'active', disability: '精神障害', guardianName: '' }
  ],
  certificates: [
    { id: 'c01', userId: 'u01', number: 'A12345678', validFrom: '2024-04-01', validTo: '2025-03-31', amount: 23, notes: '' },
    { id: 'c02', userId: 'u02', number: 'B23456789', validFrom: '2024-07-01', validTo: '2025-06-30', amount: 23, notes: '' },
    { id: 'c03', userId: 'u03', number: 'C34567890', validFrom: '2024-01-01', validTo: '2024-12-31', amount: 23, notes: '' },
    { id: 'c04', userId: 'u04', number: 'D45678901', validFrom: '2025-01-01', validTo: '2025-12-31', amount: 23, notes: '' },
    { id: 'c05', userId: 'u05', number: 'E56789012', validFrom: '2024-10-01', validTo: '2025-09-30', amount: 23, notes: '' },
    { id: 'c06', userId: 'u06', number: 'F67890123', validFrom: '2024-06-01', validTo: '2025-05-31', amount: 23, notes: '' },
    { id: 'c07', userId: 'u07', number: 'G78901234', validFrom: '2025-02-01', validTo: '2026-01-31', amount: 23, notes: '' },
    { id: 'c08', userId: 'u08', number: 'H89012345', validFrom: '2024-08-01', validTo: '2025-07-31', amount: 23, notes: '' },
    { id: 'c09', userId: 'u09', number: 'I90123456', validFrom: '2024-11-01', validTo: '2025-10-31', amount: 23, notes: '' },
    { id: 'c10', userId: 'u10', number: 'J01234567', validFrom: '2025-03-01', validTo: '2026-02-28', amount: 23, notes: '' }
  ],
  monitoring: [
    { id: 'm01', userId: 'u01', date: '2025-01-20', nextDate: '2025-07-20', goal1: '安定した通所継続', goal1Status: '達成', goal2: '作業スキル向上', goal2Status: '取組中', goal3: '', goal3Status: '', notes: '概ね順調', signed: true },
    { id: 'm02', userId: 'u02', date: '2025-02-10', nextDate: '2025-08-10', goal1: '日常生活リズムの確立', goal1Status: '取組中', goal2: '対人関係スキル', goal2Status: '取組中', goal3: '', goal3Status: '', notes: '午後の集中力課題あり', signed: true },
    { id: 'm03', userId: 'u04', date: '2025-01-15', nextDate: '2025-07-15', goal1: '就労移行準備', goal1Status: '取組中', goal2: '体力維持', goal2Status: '達成', goal3: 'コミュニケーション', goal3Status: '取組中', notes: 'A型事業所見学予定', signed: false },
    { id: 'm04', userId: 'u05', date: '2025-02-20', nextDate: '2025-08-20', goal1: '精神的安定の維持', goal1Status: '達成', goal2: '作業量の増加', goal2Status: '取組中', goal3: '', goal3Status: '', notes: '服薬管理良好', signed: true }
  ],
  records: [], // 実績データ（起動時に生成）
  schedules: [], // 出勤予定データ
  board: [
    { id: 'b01', title: '4月の通所カレンダー変更のお知らせ', content: '4月28日（月）は事業所都合により休業となります。ご確認ください。', category: 'notice', priority: 'high', pinned: true, date: '2025-04-01', userId: null },
    { id: 'b02', title: '田中さん モニタリング記録票署名依頼', content: '田中花子さんのモニタリング記録票への署名をお願いします。', category: 'monitoring', priority: 'medium', pinned: false, date: '2025-03-25', userId: 'u01' },
    { id: 'b03', title: '受給者証更新 佐藤さん・渡辺さん', content: '受給者証の有効期限が近づいています。本人・保護者へ更新手続きのご案内をお願いします。', category: 'certificate', priority: 'high', pinned: true, date: '2025-03-20', userId: null },
    { id: 'b04', title: 'スタッフミーティング議事録（3月）', content: '3月のスタッフミーティングの議事録です。各自ご確認ください。', category: 'general', priority: 'low', pinned: false, date: '2025-03-15', userId: null }
  ],
  auditLog: [
    { id: 'al01', datetime: '2025-04-01 09:12', user: 'admin', action: '日別実績入力', detail: '2025-04-01 田中花子 通所' },
    { id: 'al02', datetime: '2025-04-01 09:15', user: 'admin', action: '日別実績入力', detail: '2025-04-01 佐藤健一 通所' },
    { id: 'al03', datetime: '2025-03-31 17:30', user: 'admin', action: '月次締め', detail: '2025年3月 締め実行' }
  ]
};

// 3ヶ月分の実績サンプルデータを生成
function generateSampleRecords() {
  const records = [];
  const today = new Date();
  const activeUsers = INITIAL_DATA.users.filter(u => u.status === 'active');
  const statusOptions = ['attend', 'attend', 'attend', 'attend', 'absent', 'attend', 'attend', 'attend', 'home', 'attend'];
  const absenceReasons = ['体調不良', '私用', '医療機関受診', ''];

  for (let m = 2; m >= 0; m--) {
    const d = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dt = new Date(year, month, day);
      if (dt > today) continue;
      const dow = dt.getDay();
      if (dow === 0 || dow === 6) continue; // 土日スキップ
      
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      
      activeUsers.forEach(user => {
        const statusIdx = Math.floor(Math.random() * statusOptions.length);
        let status = statusOptions[statusIdx];
        
        // 在宅ユーザーは在宅優先
        if (user.type === 'home') status = Math.random() > 0.2 ? 'home' : 'absent';
        
        let startTime = '', endTime = '', hours = 0;
        if (status === 'attend') {
          const pattern = Math.random();
          if (user.maxHours === 2) {
            startTime = '10:00'; endTime = '12:00'; hours = 2;
          } else if (pattern < 0.3) {
            startTime = '10:00'; endTime = '12:00'; hours = 2; // 午前のみ
          } else if (pattern < 0.6) {
            startTime = '13:00'; endTime = '15:00'; hours = 2; // 午後のみ
          } else if (user.maxHours >= 5 && Math.random() < 0.1) {
            startTime = '10:00'; endTime = '16:00'; hours = 5; // 延長
          } else {
            startTime = '10:00'; endTime = '15:00'; hours = 4; // 終日
          }
        } else if (status === 'home') {
          hours = user.maxHours;
        }
        
        const wageRate = status === 'home' ? user.wageHome : user.wageCommute;
        const wage = Math.round(wageRate * hours);
        
        records.push({
          id: `r_${dateStr}_${user.id}`,
          date: dateStr,
          userId: user.id,
          status,
          startTime,
          endTime,
          hours,
          wage,
          absenceReason: status === 'absent' ? absenceReasons[Math.floor(Math.random() * absenceReasons.length)] : '',
          notes: ''
        });
      });
    }
  }
  return records;
}

// ストレージキー
const STORAGE_KEY = 'uniwork_data_v2';

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // 必須キーを確認してマージ
      return {
        settings: parsed.settings || INITIAL_DATA.settings,
        users: parsed.users || INITIAL_DATA.users,
        certificates: parsed.certificates || INITIAL_DATA.certificates,
        monitoring: parsed.monitoring || INITIAL_DATA.monitoring,
        records: parsed.records && parsed.records.length > 0 ? parsed.records : generateSampleRecords(),
        schedules: parsed.schedules || [],
        board: parsed.board || INITIAL_DATA.board,
        auditLog: parsed.auditLog || INITIAL_DATA.auditLog
      };
    }
  } catch(e) { console.warn('データ読込エラー:', e); }
  const data = { ...INITIAL_DATA, records: generateSampleRecords(), schedules: [] };
  saveData(data);
  return data;
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch(e) { console.warn('データ保存エラー:', e); }
}

// グローバルデータ
let DB = loadData();
