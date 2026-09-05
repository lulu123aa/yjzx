// 留言板接口：GET /api/messages  查询全部留言
//              POST /api/messages  发布留言  body: {who, content}
const TABLE = 'messages';
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
    {time:"2026-06-28 16:20:11", who:"2025届毕业生", content:"毕业快乐！最后来这个系统留个言，祝学弟学妹们都能考上理想高中，加油！"},
    {time:"2026-07-02 10:15:43", who:"匿名", content:"这留言板还是老样子，加载慢得一批，教务处到底什么时候换新系统啊……"},
    {time:"2026-08-20 21:43:07", who:"八年级", content:"七年级的学弟学妹别慌，分班其实没那么可怕，老师们人都挺好的。"},
    {time:"2026-08-31 12:07:36", who:"学生家长", content:"请问新学期的校服和课本什么时候发放？看到请回复一下，谢谢。"}
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
