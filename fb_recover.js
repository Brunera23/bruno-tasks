// Cruza o log do shared/nos com as tarefas atuais para achar sumiços silenciosos
// (create sem o task atual e sem delete correspondente = perdido pela sobrescrita).
const fs = require('fs');
const path = require('path');
const https = require('https');
const PROJECT = 'smart-tracker-2eba6';

function get(url, token) {
  return new Promise((res, rej) => { const u = new URL(url); https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { Authorization: 'Bearer ' + token } }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: d })); }).on('error', rej); });
}
async function accessToken() {
  const candidates = [path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json'), path.join(process.env.APPDATA, 'configstore', 'firebase-tools.json')];
  const cfg = JSON.parse(fs.readFileSync(candidates.find(p => fs.existsSync(p)), 'utf8'));
  const body = new URLSearchParams({ client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com', client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi', refresh_token: cfg.tokens.refresh_token, grant_type: 'refresh_token' }).toString();
  return new Promise((res, rej) => { const r = https.request({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res(JSON.parse(d).access_token)); }); r.on('error', rej); r.write(body); r.end(); });
}

(async () => {
  const tok = await accessToken();
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
  const doc = await get(base + '/shared/nos', tok);
  const f = JSON.parse(doc.body).fields || {};
  const tasks = JSON.parse(f.tasks?.stringValue || '[]');
  const logArr = JSON.parse(f.log?.stringValue || '[]');
  const liveIds = new Set(tasks.map(t => t.id));

  // agrupa eventos por taskId
  const byTask = {};
  for (const e of logArr) { (byTask[e.taskId] = byTask[e.taskId] || []).push(e); }

  console.log('Tarefas atuais no nos:', tasks.length, '| eventos no log:', logArr.length);
  console.log('\n=== Possíveis SUMIÇOS silenciosos (create sem task atual e sem delete) ===');
  let found = 0;
  for (const id in byTask) {
    const evs = byTask[id];
    const hasCreate = evs.some(e => e.type === 'create');
    const hasDelete = evs.some(e => e.type === 'delete');
    if (hasCreate && !hasDelete && !liveIds.has(id)) {
      const c = evs.find(e => e.type === 'create');
      console.log(`  • "${c.title}"  [${c.category}]  criada ${new Date(c.ts).toLocaleString('pt-BR')}`);
      found++;
    }
  }
  if (!found) console.log('  (nenhum encontrado no log atual — o log também pode ter sido truncado/sobrescrito)');

  console.log('\n=== Excluídas explicitamente (tem delete) ===');
  for (const id in byTask) {
    const evs = byTask[id];
    if (evs.some(e => e.type === 'delete') && !liveIds.has(id)) {
      const c = evs.find(e => e.title);
      console.log(`  • "${c?.title}"  (excluída de propósito)`);
    }
  }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
