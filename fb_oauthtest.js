// Testa fcmregistrations com OAuth bearer (em vez de API key) para ver se o backend FCM responde.
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const PROJECT_NUM = '1062515853953';
const REAL_KEY = 'AIzaSyDIoHupcNAWZFnW_Y8qYnF-DeDYH8NdQYI';
const APP_ID = '1:1062515853953:web:a04b9b3aa054be8bdc5b80';
const VAPID = 'BBWa_x7BFyHOJWEWYq_4-imPkpOHpJ_OhMiOGHrqJ4JAKu96VVJWMoaDg57Yoe1o4LhC_Y778OzLPAfHTgvK5Rk';

function call(method, url, headers, body) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    const r = https.request({ hostname: u.hostname, path: u.pathname + u.search, method, headers },
      x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res({ status: x.statusCode, body: d })); });
    r.on('error', rej); if (body) r.write(JSON.stringify(body)); r.end();
  });
}
function b64url(b) { return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function genFid() { const b = crypto.randomBytes(17); b[0] = 0b01110000 | (b[0] & 0b00001111); return b64url(b).substring(0, 22); }
async function accessToken() {
  const candidates = [path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json'), path.join(process.env.APPDATA, 'configstore', 'firebase-tools.json')];
  const cfg = JSON.parse(fs.readFileSync(candidates.find(p => fs.existsSync(p)), 'utf8'));
  const body = new URLSearchParams({ client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com', client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi', refresh_token: cfg.tokens.refresh_token, grant_type: 'refresh_token' }).toString();
  return new Promise((res, rej) => { const r = https.request({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res(JSON.parse(d).access_token)); }); r.on('error', rej); r.write(body); r.end(); });
}

(async () => {
  const oauth = await accessToken();
  const inst = await call('POST', `https://firebaseinstallations.googleapis.com/v1/projects/${PROJECT_NUM}/installations`,
    { 'Content-Type': 'application/json', 'x-goog-api-key': REAL_KEY }, { fid: genFid(), appId: APP_ID, authVersion: 'FIS_v2', sdkVersion: 'w:0.6.4' });
  const fis = JSON.parse(inst.body).authToken.token;
  const body = { web: { endpoint: 'https://fcm.googleapis.com/fcm/send/dummy', p256dh: b64url(crypto.randomBytes(65)), auth: b64url(crypto.randomBytes(16)), applicationPubKey: VAPID } };

  const r = await call('POST', `https://fcmregistrations.googleapis.com/v1/projects/${PROJECT_NUM}/registrations`,
    { 'Content-Type': 'application/json', Authorization: 'Bearer ' + oauth, 'x-goog-firebase-installations-auth': 'FIS_v2 ' + fis }, body);
  console.log('fcmregistrations com OAuth Bearer -> status:', r.status);
  console.log('resposta:', r.body.slice(0, 400));
  if (r.status === 400) console.log('\n>>> 400 = backend FCM OK; só a auth de API key está quebrada no projeto.');
  else if (r.status === 200) console.log('\n>>> 200 = registrou via OAuth.');
  else console.log('\n>>> ' + r.status + ' = backend também recusa OAuth.');
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
