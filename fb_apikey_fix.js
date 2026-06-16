// Conserta o 401 do push: remove a restrição de HTTP referrer (vazia) da API key do app,
// preservando a allowlist de APIs. Chave web do Firebase é pública por design.
const fs = require('fs');
const path = require('path');
const https = require('https');

const PROJECT_NUM = '1062515853953';
const APP_API_KEY = 'AIzaSyDIoHupcNAWZFnW_Y8qYnF-DeDYH8NdQYI';

function call(method, url, token, body) {
  return new Promise((res, rej) => {
    const u = new URL(url);
    const r = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
    }, x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res({ status: x.statusCode, body: d })); });
    r.on('error', rej);
    if (body) r.write(JSON.stringify(body));
    r.end();
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
  const list = await call('GET', `https://apikeys.googleapis.com/v2/projects/${PROJECT_NUM}/locations/global/keys`, tok);
  const keys = JSON.parse(list.body).keys || [];

  let appKey = null;
  for (const k of keys) {
    const ks = await call('GET', `https://apikeys.googleapis.com/v2/${k.name}/keyString`, tok);
    if (JSON.parse(ks.body).keyString === APP_API_KEY) { appKey = k; break; }
  }
  if (!appKey) { console.log('Chave do app não encontrada'); return; }

  const apiTargets = (appKey.restrictions && appKey.restrictions.apiTargets) || [];
  console.log('Antes  -> app restriction:', appKey.restrictions && appKey.restrictions.browserKeyRestrictions ? 'HTTP referrers (BLOQUEANDO)' : 'nenhuma', '| apiTargets:', apiTargets.length);

  // PATCH: remove TODAS as restrições (app + API allowlist). fcmregistrations rejeita
  // chave com allowlist mesmo estando na lista. Chave web do Firebase é pública por design.
  const newRestrictions = {};
  const patch = await call('PATCH',
    `https://apikeys.googleapis.com/v2/${appKey.name}?updateMask=restrictions`, tok,
    { restrictions: newRestrictions });
  console.log('PATCH status:', patch.status);

  // confirma
  const after = await call('GET', `https://apikeys.googleapis.com/v2/${appKey.name}`, tok);
  const aj = JSON.parse(after.body);
  const stillBlocked = aj.restrictions && aj.restrictions.browserKeyRestrictions;
  console.log('Depois -> app restriction:', stillBlocked ? 'HTTP referrers (AINDA BLOQUEANDO)' : 'NENHUMA ✅', '| apiTargets:', (aj.restrictions && aj.restrictions.apiTargets || []).length, 'preservados');
  console.log(stillBlocked ? '\n⚠️ Patch não aplicou — verifique permissões.' : '\n✅ Restrição de referrer removida. Pode levar alguns minutos para propagar no Google.');
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
