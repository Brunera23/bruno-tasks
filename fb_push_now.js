// Lê a inscrição Web Push do Bruno no Firestore e envia uma notificação real via web-push.
const fs = require('fs');
const path = require('path');
const https = require('https');
const webpush = require('./functions/node_modules/web-push');
const PROJECT = 'smart-tracker-2eba6';
const VAPID_PUBLIC = 'BPduzDRHuxAMlmDANcKN3Vo0JY71ipAm8MqJuckEEyj1fNu76Fh64cegY094YSX1wkpt_QWsLzBu69mcntIpBNo';
const VAPID_PRIVATE = 'UYISeiF4D0T54IOggX2o48gPGJ5_Hy_5MTJiGQolrCk';

function get(url, token) { return new Promise((res, rej) => { const u = new URL(url); https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { Authorization: 'Bearer ' + token } }, r => { let d = ''; r.on('data', c => d += c); r.on('end', () => res({ status: r.statusCode, body: d })); }).on('error', rej); }); }
async function accessToken() { const c = [path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json'), path.join(process.env.APPDATA, 'configstore', 'firebase-tools.json')]; const cfg = JSON.parse(fs.readFileSync(c.find(p => fs.existsSync(p)), 'utf8')); const body = new URLSearchParams({ client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com', client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi', refresh_token: cfg.tokens.refresh_token, grant_type: 'refresh_token' }).toString(); return new Promise((res, rej) => { const r = https.request({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res(JSON.parse(d).access_token)); }); r.on('error', rej); r.write(body); r.end(); }); }
function fromFs(v) { if (v.stringValue !== undefined) return v.stringValue; if (v.mapValue) { const o = {}; for (const k in v.mapValue.fields) o[k] = fromFs(v.mapValue.fields[k]); return o; } return v; }

(async () => {
  const tok = await accessToken();
  const r = await get(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/push_tokens?pageSize=20`, tok);
  const docs = JSON.parse(r.body).documents || [];
  const subs = docs.map(d => d.fields).filter(f => f.role?.stringValue === 'bruno' && f.subscription?.mapValue).map(f => fromFs(f.subscription));
  if (!subs.length) { console.log('Nenhuma inscrição nativa do Bruno encontrada.'); return; }

  webpush.setVapidDetails('mailto:brunohsantos00@gmail.com', VAPID_PUBLIC, VAPID_PRIVATE);
  // amostras com a nova estrutura (emoji-categoria no título + corpo limpo)
  const samples = [
    { title: '📋 Nova tarefa de Clara', body: 'Comprar presente de aniversário da Lara', tag: 'demo-task', url: './index.html' },
    { title: '💊 Losartana', body: 'Tomar agora · 50mg', tag: 'demo-med', url: './index.html' },
  ];

  for (const sub of subs) {
    const host = (() => { try { return new URL(sub.endpoint).host; } catch (_) { return '?'; } })();
    for (const s of samples) {
      try {
        const res = await webpush.sendNotification(sub, JSON.stringify(s), { TTL: 3600, urgency: 'high' });
        console.log(`✅ "${s.title}" → ${host} (HTTP ${res.statusCode})`);
      } catch (e) {
        console.log(`❌ "${s.title}" → ${host} — status ${e.statusCode}: ${(e.body || e.message || '').slice(0, 120)}`);
      }
      await new Promise((r) => setTimeout(r, 800));
    }
  }
})().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
