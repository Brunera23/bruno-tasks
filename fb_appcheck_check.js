// Checa se o App Check está com enforcement ligado para FCM e outros serviços.
// Enforcement ligado sem App Check no app => fcmregistrations 401.
const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_NUM = '1062515853953';

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
  // lista todos os serviços com config de App Check
  const r = await get(`https://firebaseappcheck.googleapis.com/v1/projects/${PROJECT_NUM}/services`, tok);
  console.log('App Check services (status', r.status + '):');
  let j; try { j = JSON.parse(r.body); } catch (_) { console.log(r.body.slice(0, 300)); return; }
  const services = j.services || [];
  if (!services.length) {
    console.log('  (nenhum serviço com enforcement configurado — App Check provavelmente OFF em tudo)');
  }
  for (const s of services) {
    const name = s.name.split('/').pop();
    console.log(`  ${name}: ${s.enforcementMode}`);
  }
  // checa explicitamente o FCM mesmo que não apareça na lista
  const fcm = await get(`https://firebaseappcheck.googleapis.com/v1/projects/${PROJECT_NUM}/services/fcm.googleapis.com`, tok);
  try {
    const fj = JSON.parse(fcm.body);
    console.log('\nfcm.googleapis.com enforcement:', fj.enforcementMode || '(OFF/não configurado)');
  } catch (_) { console.log('\nfcm check:', fcm.status, fcm.body.slice(0, 200)); }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
