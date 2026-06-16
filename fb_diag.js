// Diagnóstico de push: lê push_tokens e push_log via REST usando a sessão do firebase-tools
const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT = 'smart-tracker-2eba6';

function post(url, body, headers) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST', headers }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: d }));
    });
    req.on('error', rej); req.write(body); req.end();
  });
}
function get(url, token) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { Authorization: 'Bearer ' + token } }, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: d }));
    }).on('error', rej);
  });
}

async function accessToken() {
  const candidates = [
    path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json'),
    path.join(process.env.APPDATA, 'configstore', 'firebase-tools.json')
  ];
  const cfgPath = candidates.find(p => fs.existsSync(p));
  if (!cfgPath) throw new Error('configstore do firebase-tools não encontrado');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const rt = cfg.tokens && cfg.tokens.refresh_token;
  if (!rt) throw new Error('refresh_token não encontrado — rode firebase login');
  // client público do firebase-tools (OAuth installed app)
  const body = new URLSearchParams({
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    refresh_token: rt,
    grant_type: 'refresh_token'
  }).toString();
  const r = await post('https://oauth2.googleapis.com/token', body, { 'Content-Type': 'application/x-www-form-urlencoded' });
  const j = JSON.parse(r.body);
  if (!j.access_token) throw new Error('falha ao obter access token: ' + r.body.slice(0, 200));
  return j.access_token;
}

function fmtDoc(d) {
  const f = d.fields || {};
  const v = x => x ? (x.stringValue ?? x.integerValue ?? x.booleanValue ?? (x.timestampValue || '')) : '';
  return {
    id: d.name.split('/').pop(),
    role: v(f.role), platform: v(f.platform),
    tokenPreview: (v(f.token) || '').slice(0, 24) + '...',
    updatedAt: v(f.updatedAt)
  };
}

(async () => {
  const tok = await accessToken();
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

  const tokens = await get(base + '/push_tokens?pageSize=20', tok);
  const tj = JSON.parse(tokens.body);
  console.log('=== push_tokens ===');
  console.log((tj.documents || []).length ? (tj.documents || []).map(fmtDoc) : '(VAZIA — nenhum aparelho registrado)');

  const log = await get(base + '/push_log?pageSize=10', tok);
  const lj = JSON.parse(log.body);
  console.log('=== push_log (alertas já disparados) ===');
  console.log((lj.documents || []).slice(0, 10).map(d => d.name.split('/').pop()));

  const queue = await get(base + '/push_queue?pageSize=10', tok);
  const qj = JSON.parse(queue.body);
  console.log('=== push_queue (últimas) ===');
  console.log((qj.documents || []).slice(-5).map(d => {
    const f = d.fields || {};
    return { target: f.targetRole?.stringValue, title: f.title?.stringValue, processed: f.processed?.booleanValue };
  }));
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
