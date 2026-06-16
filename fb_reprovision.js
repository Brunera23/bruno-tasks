// Reprovisiona fcmregistrations (disable -> enable) e re-testa o registro com a chave atual.
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const PROJECT_NUM = '1062515853953';
const API_KEY = 'AIzaSyDIoHupcNAWZFnW_Y8qYnF-DeDYH8NdQYI';
const APP_ID = '1:1062515853953:web:a04b9b3aa054be8bdc5b80';
const VAPID = 'BBWa_x7BFyHOJWEWYq_4-imPkpOHpJ_OhMiOGHrqJ4JAKu96VVJWMoaDg57Yoe1o4LhC_Y778OzLPAfHTgvK5Rk';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function call(method, url, headers, body) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    const r = https.request({ hostname: u.hostname, path: u.pathname + u.search, method, headers },
      x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res({ status: x.statusCode, body: d })); });
    r.on('error', rej);
    if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
    r.end();
  });
}
function b64url(buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function genFid() { const b = crypto.randomBytes(17); b[0] = 0b01110000 | (b[0] & 0b00001111); return b64url(b).substring(0, 22); }

async function accessToken() {
  const candidates = [
    path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json'),
    path.join(process.env.APPDATA, 'configstore', 'firebase-tools.json')
  ];
  const cfg = JSON.parse(fs.readFileSync(candidates.find(p => fs.existsSync(p)), 'utf8'));
  const body = new URLSearchParams({
    client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
    client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi', refresh_token: cfg.tokens.refresh_token, grant_type: 'refresh_token'
  }).toString();
  return new Promise((res, rej) => {
    const r = https.request({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res(JSON.parse(d).access_token)); });
    r.on('error', rej); r.write(body); r.end();
  });
}

async function testRegister(tokAuthHeaders) {
  const inst = await call('POST', `https://firebaseinstallations.googleapis.com/v1/projects/${PROJECT_NUM}/installations`,
    { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
    { fid: genFid(), appId: APP_ID, authVersion: 'FIS_v2', sdkVersion: 'w:0.6.4' });
  const fisAuth = JSON.parse(inst.body).authToken.token;
  const reg = await call('POST', `https://fcmregistrations.googleapis.com/v1/projects/${PROJECT_NUM}/registrations`,
    { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY, 'x-goog-firebase-installations-auth': 'FIS_v2 ' + fisAuth },
    { web: { endpoint: 'https://fcm.googleapis.com/fcm/send/dummy', p256dh: b64url(crypto.randomBytes(65)), auth: b64url(crypto.randomBytes(16)), applicationPubKey: VAPID } });
  return reg;
}

(async () => {
  const tok = await accessToken();
  const auth = { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' };
  const svc = `https://serviceusage.googleapis.com/v1/projects/${PROJECT_NUM}/services/fcmregistrations.googleapis.com`;

  console.log('1) Desabilitando fcmregistrations...');
  const dis = await call('POST', svc + ':disable', auth, { disableDependentServices: false });
  console.log('   status:', dis.status);
  await sleep(20000);

  console.log('2) Reabilitando fcmregistrations...');
  const en = await call('POST', svc + ':enable', auth, {});
  console.log('   status:', en.status);

  console.log('3) Aguardando provisionamento (180s)...');
  await sleep(180000);

  console.log('4) Re-testando registro com a chave atual...');
  const reg = await testRegister();
  console.log('   fcmregistrations status:', reg.status);
  console.log('   ', (reg.body.match(/"message":\s*"([^"]+)"/) || [])[1] || reg.body.slice(0, 160));
  console.log('\n>>>', (reg.status === 400 || reg.status === 200) ? 'AUTH PASSOU ✅ — RESOLVIDO!' : '401 ainda — não era provisionamento.');
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
