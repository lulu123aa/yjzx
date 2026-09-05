// 备忘录接口：GET /api/memos  查询全部备忘
//              POST /api/memos  登记备忘  body: {who, date, task}
const TABLE = 'memos';
const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

async function ensureTable(db) {
  await db.prepare(`CREATE TABLE IF NOT EXISTS ${TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    who TEXT NOT NULL,
    date TEXT NOT NULL,
    task TEXT NOT NULL
  )`).run();
}

async function seedIfEmpty(db) {
  const row = await db.prepare(`SELECT COUNT(*) as c FROM ${TABLE}`).first();
  if (row.c > 0) return;
  const seeds = [];
  const stmt = db.prepare(`INSERT INTO ${TABLE} (who, date, task) VALUES (?, ?, ?)`);
  for (const s of seeds) {
    await stmt.bind(s.who, s.date, s.task).run();
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
      `SELECT id, who, date, task FROM ${TABLE} ORDER BY id DESC LIMIT 200`
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
    const date = String(body.date || '').trim();
    const task = String(body.task || '').trim();
    if (!who || !date || !task) {
      return new Response(JSON.stringify({error: '缺少参数'}), { status: 400, headers: HEADERS });
    }
    await context.env.DB.prepare(
      `INSERT INTO ${TABLE} (who, date, task) VALUES (?, ?, ?)`
    ).bind(who, date, task).run();
    return new Response(JSON.stringify({ok: true}), { headers: HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({error: String(e.message || e)}), { status: 500, headers: HEADERS });
  }
}
