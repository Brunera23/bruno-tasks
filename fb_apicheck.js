// Diagnóstico da causa do 401 no token-subscribe: checa APIs habilitadas e
// restrições da API key usada pelo app (apiKey do fbConfig).
const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT = 'smart-tracker-2eba6';
const PROJECT_NUM = '1062515853953';
const APP_API_KEY = 'AIzaSyDIoHupcNAWZFnW_Y8qYnF-DeDYH8NdQYI'; // do fbConfig em index.html

function get(url, token) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { Authorization: 'Bearer ' + token } },
      r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: d })); }).on('error', rej);
  });
}

async function accessToken() {
  const candidates = [
    path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json'),
    path.join(process.env.APPDATA, 'configstore', 'firebase-tools.json')
  ];
  const cfg = JSON.parse(fs.readFileSync(candidates.find(p => fs.existsSync(p)), 'utf8'));
  const body = new URLSearchParams({
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
    refresh_token: cfg.tokens.refresh_token,
    grant_type: 'refresh_token'
  }).toString();
  return new Promise((res, rej) => {
    const r = https.request({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res(JSON.parse(d).access_token)); });
    r.on('error', rej); r.write(body); r.end();
  });
}

(async () => {
  const tok = await accessToken();

  console.log('===== APIs necessárias para push (estado) =====');
  const apis = ['fcmregistrations.googleapis.com', 'firebaseinstallations.googleapis.com', 'fcm.googleapis.com'];
  for (const api of apis) {
    const r = await get(`https://serviceusage.googleapis.com/v1/projects/${PROJECT_NUM}/services/${api}`, tok);
    let state = '?';
    try { state = JSON.parse(r.body).state; } catch (_) { state = 'HTTP ' + r.status; }
    console.log(`  ${api}: ${state}`);
  }

  console.log('\n===== API Keys do projeto (restrições) =====');
  const keys = await get(`https://apikeys.googleapis.com/v2/projects/${PROJECT_NUM}/locations/global/keys`, tok);
  let kj;
  try { kj = JSON.parse(keys.body); } catch (_) { console.log('  erro listando keys:', keys.status, keys.body.slice(0, 200)); kj = {}; }
  for (const k of (kj.keys || [])) {
    // pega o keyString pra identificar qual é a do app
    const ks = await get(`https://apikeys.googleapis.com/v2/${k.name}/keyString`, tok);
    let keyString = '';
    try { keyString = JSON.parse(ks.body).keyString; } catch (_) {}
    const isAppKey = keyString === APP_API_KEY;
    console.log(`\n  ${k.displayName || '(sem nome)'} ${isAppKey ? '  <<<< ESTA É A DO APP' : ''}`);
    if (isAppKey) console.log('    RESTRICTIONS RAW:', JSON.stringify(k.restrictions, null, 2));
    const r = k.restrictions || {};
    console.log('    Application restriction:', r.browserKeyRestrictions ? 'HTTP referrers' : r.androidKeyRestrictions ? 'Android' : r.iosKeyRestrictions ? 'iOS' : r.serverKeyRestrictions ? 'IPs' : 'NENHUMA (sem restrição de app)');
    if (r.browserKeyRestrictions) console.log('      referrers:', JSON.stringify(r.browserKeyRestrictions.allowedReferrers));
    if (r.apiTargets) {
      const allowed = r.apiTargets.map(t => t.service);
      console.log('    API restriction (allowlist):', JSON.stringify(allowed));
      const need = ['fcmregistrations.googleapis.com', 'firebaseinstallations.googleapis.com'];
      const missing = need.filter(n => !allowed.includes(n));
      console.log('    >>> APIs de push FALTANDO na allowlist:', missing.length ? missing.join(', ') : 'nenhuma (ok)');
    } else {
      console.log('    API restriction: NENHUMA (todas as APIs liberadas)');
    }
  }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
