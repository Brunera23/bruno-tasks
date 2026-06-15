/**
 * Bruno Tasks — Cloud Functions (push com app fechado via FCM)
 *
 * Duas funções:
 *  1) processPushQueue  — dispara quando o app grava em `push_queue` (nova tarefa).
 *  2) dueTodayReminder  — roda toda manhã (08:00 America/Sao_Paulo) e avisa
 *                         as tarefas que vencem hoje.
 *
 * Envia mensagens DATA-ONLY (sem o campo `notification`) para o Service Worker
 * (sw.js) montar a notificação — assim não duplica em foreground/background.
 *
 * Requer: plano Blaze + uma chave VAPID configurada no Firebase Console.
 */

const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const webpush = require("web-push");
const logger = require("firebase-functions/logger");

initializeApp();
const db = getFirestore();

// Web Push nativo (contorna o fcmregistrations quebrado do projeto). Par VAPID próprio.
const VAPID_PUBLIC = "BPduzDRHuxAMlmDANcKN3Vo0JY71ipAm8MqJuckEEyj1fNu76Fh64cegY094YSX1wkpt_QWsLzBu69mcntIpBNo";
const VAPID_PRIVATE = defineSecret("VAPID_PRIVATE");

// ---------- helpers ----------
function parseTasks(raw) {
  try {
    const arr = JSON.parse(raw || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

// 'YYYY-MM-DD' no fuso de São Paulo (mesmo formato que o app salva em t.date)
function todaySaoPaulo() {
  return new Date().toLocaleDateString("en-CA", {timeZone: "America/Sao_Paulo"});
}

function tomorrowSaoPaulo() {
  return new Date(Date.now() + 86400000)
      .toLocaleDateString("en-CA", {timeZone: "America/Sao_Paulo"});
}

// Data + minutos do dia + dia-da-semana atuais em São Paulo
function nowSaoPaulo() {
  const tz = "America/Sao_Paulo";
  const now = new Date();
  const date = now.toLocaleDateString("en-CA", {timeZone: tz});
  const [H, M] = now
      .toLocaleTimeString("en-GB", {timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit"})
      .split(":").map(Number);
  const dow = new Date(date + "T12:00:00Z").getUTCDay(); // 0=Domingo
  return {date, minutes: H * 60 + M, dow};
}

// Um alerta recorrente deve tocar hoje?
function alertFiresToday(t, date, dow) {
  const rec = t.recurrence || {};
  const freq = rec.freq || "once";
  if (rec.until && date > rec.until) return false;
  if (freq === "once") return t.date === date;
  if (freq === "daily") return true;
  if (freq === "interval") return true;
  if (freq === "weekdays") return dow >= 1 && dow <= 5;
  if (freq === "weekly") {
    const od = t.date ? new Date(t.date + "T12:00:00Z").getUTCDay() : dow;
    return od === dow;
  }
  return false;
}

// Retorna as inscrições de push (Web Push nativo) com o ref do doc p/ limpeza
async function subsForRole(role) {
  let query = db.collection("push_tokens");
  if (role && role !== "ambos") query = query.where("role", "==", role);
  const snap = await query.get();
  const subs = [];
  snap.forEach((d) => {
    const x = d.data();
    if (x && x.subscription && x.subscription.endpoint) subs.push({ref: d.ref, sub: x.subscription});
  });
  return subs;
}

async function subsForUid(uid) {
  const snap = await db.collection("push_tokens").where("uid", "==", uid).get();
  const subs = [];
  snap.forEach((d) => {
    const x = d.data();
    if (x && x.subscription && x.subscription.endpoint) subs.push({ref: d.ref, sub: x.subscription});
  });
  return subs;
}

// Envia via Web Push nativo. O sw.js monta a notificação a partir de {title, body, tag, url}.
async function sendToSubs(subs, title, body, tag) {
  // dedup por endpoint
  const seen = new Set();
  const list = (subs || []).filter((s) => {
    const ep = s.sub && s.sub.endpoint;
    if (!ep || seen.has(ep)) return false;
    seen.add(ep);
    return true;
  });
  if (!list.length) {
    logger.warn("sendToSubs: nenhuma inscrição de destino", {title, tag});
    return {sent: 0};
  }

  webpush.setVapidDetails("mailto:brunohsantos00@gmail.com", VAPID_PUBLIC, VAPID_PRIVATE.value());
  const payload = JSON.stringify({
    title: String(title || "Bruno Tasks"),
    body: String(body || ""),
    tag: String(tag || "task"),
    url: "./index.html",
  });

  let sent = 0;
  let failed = 0;
  for (const {ref, sub} of list) {
    try {
      await webpush.sendNotification(sub, payload, {TTL: 86400, urgency: "high"});
      sent++;
    } catch (e) {
      failed++;
      const code = e && e.statusCode;
      logger.error("web-push falhou", {title, tag, code: code || "?", msg: (e && e.body) || String(e && e.message || e)});
      // 404/410 = inscrição expirada/cancelada → remove o doc
      if (code === 404 || code === 410) {
        try {
          await ref.delete();
        } catch (_) { /* ignore */ }
      }
    }
  }
  return {sent, failed};
}

// ---------- 1) Fila de push (nova tarefa) ----------
exports.processPushQueue = onDocumentCreated(
    {document: "push_queue/{id}", secrets: [VAPID_PRIVATE]},
    async (event) => {
      const snap = event.data;
      if (!snap) return;
      const data = snap.data() || {};
      if (data.processed) return;

      try {
        const result = await sendToSubs(
            await subsForRole(data.targetRole),
            data.title,
            data.body,
            data.tag || "task",
        );
    logger.info("push_queue enviado", {targetRole: data.targetRole, ...result});
    await snap.ref.update({processed: true, processedAt: new Date()});
  } catch (e) {
    logger.error("processPushQueue erro", e);
    // marca como processado mesmo em erro para não reprocessar em loop
    try {
      await snap.ref.update({processed: true, error: String(e && e.message || e)});
    } catch (_) { /* ignore */ }
  }
});

// ---------- 2) Vencimento (no dia) + véspera (toda manhã, 08:00 BRT) ----------
exports.dueTodayReminder = onSchedule(
    {schedule: "0 8 * * *", timeZone: "America/Sao_Paulo", secrets: [VAPID_PRIVATE]},
    async () => {
      const today = todaySaoPaulo();
      const tomorrow = tomorrowSaoPaulo();
      let total = 0;

      const notDone = (t) =>
        t && t.status !== "done" && t.type !== "alert" && t.type !== "note";

      // byRole=true → destinatário pelo papel (assignedTo); senão pelo dono do doc
      const process = async (docsSnap, byRole) => {
        for (const doc of docsSnap.docs) {
          const items = parseTasks(doc.data().tasks).filter(notDone);
          for (const t of items) {
            let title = null;
            if (t.date === today) title = "É hoje";
            else if (t.date === tomorrow && t.remindDayBefore) title = "Amanhã";
            if (!title) continue;
            const subs = (byRole && t.assignedTo) ?
              await subsForRole(t.assignedTo) : await subsForUid(doc.id);
            const r = await sendToSubs(subs, title, t.title, "due-" + t.id + "-" + t.date);
            total += r.sent || 0;
          }
        }
      };

      await process(await db.collection("users").get(), false);
      await process(await db.collection("shared").get(), true);

      logger.info("dueTodayReminder concluído", {today, tomorrow, total});
    },
);

// ---------- 3) Remédios/alertas no horário (a cada 15 min, app fechado) ----------
exports.alertReminders = onSchedule(
    {schedule: "*/15 * * * *", timeZone: "America/Sao_Paulo", secrets: [VAPID_PRIVATE]},
    async () => {
      const {date, minutes, dow} = nowSaoPaulo();
      let total = 0;

      const process = async (docsSnap) => {
        for (const doc of docsSnap.docs) {
          const alerts = parseTasks(doc.data().tasks)
              .filter((t) => t && t.type === "alert" && t.status !== "done" && t.alertTime);
          for (const t of alerts) {
            if (!alertFiresToday(t, date, dow)) continue;
            const [ah, am] = String(t.alertTime).split(":").map(Number);
            const aMin = ah * 60 + am;
            const rec = t.recurrence || {};
            // intervalo (8/8h etc.): várias doses por dia a partir do horário inicial
            let fireSlot = null;
            if (rec.freq === "interval" && rec.every) {
              const step = rec.every * 60;
              for (let s = aMin; s < 1440; s += step) {
                if (minutes >= s && minutes < s + 60) {
                  fireSlot = s;
                  break;
                }
              }
              if (fireSlot === null) continue;
            } else {
              // dispara no 1º tick a partir do horário (até 60 min depois), 1x/dia
              if (!(minutes >= aMin && minutes < aMin + 60)) continue;
            }

            const logKey = t.id + "_" + date + (fireSlot !== null ? "_" + fireSlot : "");
            const logRef = db.collection("push_log").doc(logKey);
            const seen = await logRef.get();
            if (seen.exists) continue;

            const subs = t.assignedTo ?
              await subsForRole(t.assignedTo) : await subsForUid(doc.id);
            const title = t.medType === "med" ? "💊 " + t.title : t.title;
            const r = await sendToSubs(subs, title, t.notes || "", "alert-" + t.id);
            await logRef.set({taskId: t.id, date, at: new Date()});
            total += r.sent || 0;
          }
        }
      };

      await process(await db.collection("users").get());
      await process(await db.collection("shared").get());

      logger.info("alertReminders", {date, minutes, total});
    },
);
