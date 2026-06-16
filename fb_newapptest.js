// Testa o registro FCM com o Web App NOVO (appId + apiKey novos).
const https = require('https');
const crypto = require('crypto');

const PROJECT_NUM = '1062515853953';
const NEW_KEY = 'AIzaSyBC_umQvxgTEcYr3SJlWLpctxGnbGKqcYA';
const NEW_APP_ID = '1:1062515853953:web:4272fff0034a2fb9dc5b80';
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

(async () => {
  console.log('1) Instalação (firebaseinstallations) com a chave NOVA...');
  const inst = await call('POST', `https://firebaseinstallations.googleapis.com/v1/projects/${PROJECT_NUM}/installations`,
    { 'Content-Type': 'application/json', 'x-goog-api-key': NEW_KEY }, { fid: genFid(), appId: NEW_APP_ID, authVersion: 'FIS_v2', sdkVersion: 'w:0.6.4' });
  console.log('   status:', inst.status);
  let fis = null; try { fis = JSON.parse(inst.body).authToken.token; } catch (_) {}
  if (!fis) { console.log('   resposta:', inst.body.slice(0, 250), '\n>>> chave nova ainda propagando? tente de novo em 1-2 min.'); return; }

  console.log('2) fcmregistrations com a chave NOVA...');
  const reg = await call('POST', `https://fcmregistrations.googleapis.com/v1/projects/${PROJECT_NUM}/registrations`,
    { 'Content-Type': 'application/json', 'x-goog-api-key': NEW_KEY, 'x-goog-firebase-installations-auth': 'FIS_v2 ' + fis },
    { web: { endpoint: 'https://fcm.googleapis.com/fcm/send/dummy', p256dh: b64url(crypto.randomBytes(65)), auth: b64url(crypto.randomBytes(16)), applicationPubKey: VAPID } });
  console.log('   status:', reg.status, '::', (reg.body.match(/"message":\s*"([^"]+)"/) || [])[1] || reg.body.slice(0, 120));
  if (reg.status === 400 || reg.status === 200) console.log('\n>>> ✅ A CHAVE NOVA FUNCIONA! Migrar o app para o appId/apiKey novos resolve.');
  else console.log('\n>>> 401 também — o problema é do projeto inteiro, não do app/chave. Precisa de outra abordagem.');
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
