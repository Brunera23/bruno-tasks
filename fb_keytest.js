// Discriminador: fcmregistrations com chave real vs inválida vs sem chave.
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
    r.on('error', rej);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}
function b64url(b) { return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function genFid() { const b = crypto.randomBytes(17); b[0] = 0b01110000 | (b[0] & 0b00001111); return b64url(b).substring(0, 22); }

async function fisToken(apiKey) {
  const inst = await call('POST', `https://firebaseinstallations.googleapis.com/v1/projects/${PROJECT_NUM}/installations`,
    { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    { fid: genFid(), appId: APP_ID, authVersion: 'FIS_v2', sdkVersion: 'w:0.6.4' });
  try { return JSON.parse(inst.body).authToken.token; } catch (_) { return null; }
}

async function reg(apiKeyHeader, fis) {
  const headers = { 'Content-Type': 'application/json' };
  if (apiKeyHeader) headers['x-goog-api-key'] = apiKeyHeader;
  if (fis) headers['x-goog-firebase-installations-auth'] = 'FIS_v2 ' + fis;
  const r = await call('POST', `https://fcmregistrations.googleapis.com/v1/projects/${PROJECT_NUM}/registrations`,
    headers, { web: { endpoint: 'https://fcm.googleapis.com/fcm/send/dummy', p256dh: b64url(crypto.randomBytes(65)), auth: b64url(crypto.randomBytes(16)), applicationPubKey: VAPID } });
  const msg = (() => { try { return JSON.parse(r.body).error.message; } catch (_) { return r.body.slice(0, 120); } })();
  const status = (() => { try { return JSON.parse(r.body).error.status; } catch (_) { return ''; } })();
  return `${r.status} ${status} :: ${msg.slice(0, 110)}`;
}

(async () => {
  const fis = await fisToken(REAL_KEY); // FIS válido (a instalação aceita a chave real)
  console.log('A) chave REAL   :', await reg(REAL_KEY, fis));
  console.log('B) chave FALSA  :', await reg('AIzaSyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_BAD', fis));
  console.log('C) SEM chave    :', await reg(null, fis));
  console.log('\nSe A == C (mesmo 401), a chave real não está sendo reconhecida.');
  console.log('Se B for diferente (ex: API_KEY_INVALID), o endpoint até valida chave — mas a real é tratada como ausente.');
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
