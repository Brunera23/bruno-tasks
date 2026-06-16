// Dump do estado dos projetos compartilhados no Firestore (coleção 'shared') + histórico do doc 'nos'.
const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT = 'smart-tracker-2eba6';

function get(url, token) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { Authorization: 'Bearer ' + token } },
      r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: d })); }).on('error', rej);
  });
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

  // lista todos os docs de shared
  const list = await get(base + '/shared', tok);
  const lj = JSON.parse(list.body);
  console.log('=== Coleção shared ===');
  for (const d of (lj.documents || [])) {
    const id = d.name.split('/').pop();
    const f = d.fields || {};
    let tasks = [];
    try { tasks = JSON.parse(f.tasks?.stringValue || '[]'); } catch (_) {}
    const updated = f.updatedAt?.timestampValue || '?';
    console.log(`\n  shared/${id}  (updatedAt: ${updated}, taskCount field: ${f.taskCount?.integerValue ?? '?'})`);
    console.log(`    tarefas no doc: ${tasks.length}`);
    tasks.slice(0, 40).forEach(t => console.log(`      - [${t.status}] ${t.title}${t.assignedTo ? ' (' + t.assignedTo + ')' : ''}`));
  }

  // também conta quantas tarefas 'nos' estão no doc pessoal do Bruno (não deveriam estar lá)
  console.log('\n=== Checagem: tarefas com project="nos" no doc PESSOAL (users) ===');
  const users = await get(base + '/users', tok);
  for (const d of (JSON.parse(users.body).documents || [])) {
    const f = d.fields || {};
    let tasks = []; try { tasks = JSON.parse(f.tasks?.stringValue || '[]'); } catch (_) {}
    const nosInPersonal = tasks.filter(t => t.project === 'nos');
    if (nosInPersonal.length) console.log(`  users/${d.name.split('/').pop()}: ${nosInPersonal.length} tarefas 'nos' (vazaram pro doc pessoal!)`);
  }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
