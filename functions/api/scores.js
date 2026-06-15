// Cloudflare Pages Function — 공용 랭킹 저장/조회
// KV 네임스페이스를 이 프로젝트에 변수명 LEADERBOARD 로 바인딩해야 동작합니다.
const KEY = 'top';
const MAX = 50;

function jsonRes(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type',
      'cache-control': 'no-store',
    },
  });
}

function sanitizeName(n) {
  return String(n || '')
    .replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ ]/g, '')
    .trim()
    .slice(0, 10) || '익명';
}

export async function onRequestOptions() {
  return jsonRes({ ok: true });
}

export async function onRequestGet({ env }) {
  if (!env.LEADERBOARD) return jsonRes([]);
  const list = (await env.LEADERBOARD.get(KEY, { type: 'json' })) || [];
  return jsonRes(list);
}

export async function onRequestPost({ request, env }) {
  if (!env.LEADERBOARD) return jsonRes({ error: 'KV not bound' }, 503);
  let body;
  try { body = await request.json(); } catch (e) { return jsonRes({ error: 'bad json' }, 400); }

  const name = sanitizeName(body.name);
  const score = Math.max(0, Math.min(99999999, Math.floor(Number(body.score) || 0)));
  const stage = Math.max(1, Math.min(10, Math.floor(Number(body.stage) || 1)));
  if (score <= 0) return jsonRes({ error: 'no score' }, 400);

  let list = (await env.LEADERBOARD.get(KEY, { type: 'json' })) || [];
  const entry = { name, score, stage, ts: Date.now() };
  list.push(entry);
  list.sort((a, b) => b.score - a.score);
  list = list.slice(0, MAX);
  await env.LEADERBOARD.put(KEY, JSON.stringify(list));

  const rank = list.findIndex(e => e.ts === entry.ts) + 1;
  return jsonRes({ ok: true, rank, ts: entry.ts, list });
}
