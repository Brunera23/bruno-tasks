// Mostra o estado das inscrições de push (subscription nativa vs token FCM antigo)
const fs = require('fs');
const path = require('path');
const https = require('https');
const PROJECT = 'smart-tracker-2eba6';
function get(url, token) { return new Promise((res, rej) => { const u = new URL(url); https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { Authorization: 'Bearer ' + token } }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: d })); }).on('error', rej); }); }
async function accessToken() { const c = [path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json'), path.join(process.env.APPDATA, 'configstore', 'firebase-tools.json')]; const cfg = JSON.parse(fs.readFileSync(c.find(p => fs.existsSync(p)), 'utf8')); const body = new URLSearchParams({ client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com', client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi', refresh_token: cfg.tokens.refresh_token, grant_type: 'refresh_token' }).toString(); return new Promise((res, rej) => { const r = https.request({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res(JSON.parse(d).access_token)); }); r.on('error', rej); r.write(body); r.end(); }); }
(async () => {
  const tok = await accessToken();
  const r = await get(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/push_tokens?pageSize=20`, tok);
  const docs = JSON.parse(r.body).documents || [];
  if (!docs.length) { console.log('push_tokens VAZIA — ninguém ativou ainda.'); return; }
  for (const d of docs) {
    const f = d.fields || {};
    const id = d.name.split('/').pop();
    const hasSub = !!(f.subscription && f.subscription.mapValue);
    const ep = hasSub ? (f.subscription.mapValue.fields.endpoint?.stringValue || '') : '';
    const hasOldToken = !!(f.token && f.token.stringValue);
    const updated = f.updatedAt?.timestampValue || '?';
    console.log(`\n${id} (role ${f.role?.stringValue}, ${f.platform?.stringValue}, updated ${updated})`);
    console.log('  inscrição Web Push nativa:', hasSub ? 'SIM ✅  ' + ep.slice(0, 50) + '...' : 'NÃO');
    console.log('  endpoint é Apple (iOS)?', ep.includes('push.apple.com') ? 'SIM (iPhone)' : ep.includes('fcm.googleapis.com') ? 'não (Chrome/FCM web push)' : '—');
    if (hasOldToken) console.log('  ⚠️ ainda tem token FCM antigo (será limpo no próximo Ativar)');
  }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
