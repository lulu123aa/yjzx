// 删除留言：DELETE /api/messages/:id  body: {who}
// 只能删除自己发布的（who 匹配）
const TABLE = 'messages';
const HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export async function onRequestOptions() {
  return new Response(null, { headers: HEADERS });
}

export async function onRequestDelete(context) {
  try {
    const id = context.params.id;
    const body = await context.request.json();
    const who = String(body.who || '').trim();
    if (!who) {
      return new Response(JSON.stringify({error: '缺少参数'}), { status: 400, headers: HEADERS });
    }
    const row = await context.env.DB.prepare(
      `SELECT who FROM ${TABLE} WHERE id = ?`
    ).bind(id).first();
    if (!row) {
      return new Response(JSON.stringify({error: '记录不存在'}), { status: 404, headers: HEADERS });
    }
    if (row.who !== who) {
      return new Response(JSON.stringify({error: '只能删除自己发布的内容'}), { status: 403, headers: HEADERS });
    }
    await context.env.DB.prepare(`DELETE FROM ${TABLE} WHERE id = ?`).bind(id).run();
    return new Response(JSON.stringify({ok: true}), { headers: HEADERS });
  } catch (e) {
    return new Response(JSON.stringify({error: String(e.message || e)}), { status: 500, headers: HEADERS });
  }
}
