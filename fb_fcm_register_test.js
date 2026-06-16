// Testa a chave de API direto contra firebaseinstallations + fcmregistrations,
// replicando o que o SDK web faz. Isola se o 401 é da chave/projeto ou do cliente.
const https = require('https');
const crypto = require('crypto');

const PROJECT_NUM = '1062515853953';
const API_KEY = 'AIzaSyDIoHupcNAWZFnW_Y8qYnF-DeDYH8NdQYI';
const APP_ID = '1:1062515853953:web:a04b9b3aa054be8bdc5b80';
const VAPID = 'BBWa_x7BFyHOJWEWYq_4-imPkpOHpJ_OhMiOGHrqJ4JAKu96VVJWMoaDg57Yoe1o4LhC_Y778OzLPAfHTgvK5Rk';

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
function genFid() {
  const b = crypto.randomBytes(17);
  b[0] = 0b01110000 | (b[0] & 0b00001111); // primeiros 4 bits = 0111
  return b64url(b).substring(0, 22);
}

(async () => {
  console.log('1) Criando instalação (firebaseinstallations) com a API key...');
  const fid = genFid();
  const inst = await call('POST',
    `https://firebaseinstallations.googleapis.com/v1/projects/${PROJECT_NUM}/installations`,
    { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
    { fid, appId: APP_ID, authVersion: 'FIS_v2', sdkVersion: 'w:0.6.4' });
  console.log('   status:', inst.status);
  let fisAuth = null;
  try { fisAuth = JSON.parse(inst.body).authToken.token; } catch (_) {}
  if (inst.status !== 200) { console.log('   resposta:', inst.body.slice(0, 400)); console.log('\n>>> A CHAVE FALHOU JÁ NA INSTALAÇÃO — problema é a chave/projeto.'); return; }
  console.log('   ✅ instalação criada, FIS authToken obtido.');

  const body = { web: { endpoint: 'https://fcm.googleapis.com/fcm/send/dummy-endpoint-test', p256dh: b64url(crypto.randomBytes(65)), auth: b64url(crypto.randomBytes(16)), applicationPubKey: VAPID } };

  console.log('\n2a) fcmregistrations com x-goog-api-key (HEADER, como o SDK faz)...');
  const regH = await call('POST',
    `https://fcmregistrations.googleapis.com/v1/projects/${PROJECT_NUM}/registrations`,
    { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY, 'x-goog-firebase-installations-auth': 'FIS_v2 ' + fisAuth },
    body);
  console.log('   status:', regH.status, '|', (regH.body.match(/"message":\s*"([^"]+)"/) || [])[1] || regH.body.slice(0, 120));

  console.log('\n2b) fcmregistrations com ?key= (QUERY PARAM)...');
  const regQ = await call('POST',
    `https://fcmregistrations.googleapis.com/v1/projects/${PROJECT_NUM}/registrations?key=${API_KEY}`,
    { 'Content-Type': 'application/json', 'x-goog-firebase-installations-auth': 'FIS_v2 ' + fisAuth },
    body);
  console.log('   status:', regQ.status, '|', (regQ.body.match(/"message":\s*"([^"]+)"/) || [])[1] || regQ.body.slice(0, 120));

  const ok = s => s === 400 || s === 200; // 400 = auth passou (body dummy), 200 = registrou
  console.log('\n>>> HEADER:', ok(regH.status) ? 'AUTH OK ✅' : '401 (rejeitada)', '| QUERY:', ok(regQ.status) ? 'AUTH OK ✅' : '401 (rejeitada)');
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
