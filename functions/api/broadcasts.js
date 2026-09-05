// 校内广播接口：GET /api/broadcasts  查询全部广播（最新在前）
//                POST /api/broadcasts  发布广播  body: {who, content}
const TABLE = 'broadcasts';
const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

function nowStr() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function ensureTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS ${TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    time TEXT NOT NULL,
    who TEXT NOT NULL,
    content TEXT NOT NULL
  )`).run();
}

async function seedIfEmpty(db) {
  const row = await db.prepare(`SELECT COUNT(*) as c FROM ${TABLE}`).first();
  if (row.c > 0) return;
  const seeds = [
    {time:"2026-08-30 09:30:00", who:"政教处", content:"关于新学期学生仪容仪表检查的通知，请各班对照要求自查，本周五统一检查。"},
    {time:"2026-08-31 14:00:00", who:"教务处", content:"明日开学报到，请同学们携带暑假作业及各科课本按时到校，注意交通安全。"}
  ];
  const stmt = db.prepare(`INSERT INTO ${TABLE} (time, who, content) VALUES (?, ?, ?)`);
  for (const s of seeds) {
    await stmt.bind(s.time, s.who, s.content).run();
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: HEADERS });
}

export async function onRequestGet(context) {
  try {
    await ensureTable(context.env.DB);
    await seedIfEmpty(context.env.DB);
    const { results } = await context.env.DB.prepare(
      `SELECT id, time, who, content FROM ${TABLE} ORDER BY id DESC LIMIT 200`
    ).all();
    return new Response(JSON.stringify(results), { headers: HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({error: String(e.message || e)}), { status: 500, headers: HEADERS });
  }
}

export async function onRequestPost(context) {
  try {
    await ensureTable(context.env.DB);
    const body = await context.request.json();
    const who = String(body.who || '').trim();
    const content = String(body.content || '').trim();
    if (!who || !content) {
      return new Response(JSON.stringify({error: '缺少参数'}), { status: 400, headers: HEADERS });
    }
    await context.env.DB.prepare(
      `INSERT INTO ${TABLE} (time, who, content) VALUES (?, ?, ?)`
    ).bind(nowStr(), who, content).run();
    return new Response(JSON.stringify({ok: true}), { headers: HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({error: String(e.message || e)}), { status: 500, headers: HEADERS });
  }
}
