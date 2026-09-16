const webpush = require("web-push");
const { Receiver } = require("@upstash/qstash");
const {
  getReminderDayState,
  getReminderSettings,
  getSentReminders,
  getSubscriptionRecord,
  json,
  listReminderDevices,
  markReminderSent,
  removeSubscription
} = require("../_push-store");
const {
  REMINDER_MESSAGES,
  dueReminders,
  normalizeReminderSettings
} = require("../_reminder-logic");

function configureVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    const error = new Error("Variáveis VAPID não configuradas.");
    error.statusCode = 503;
    throw error;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function timezoneNow(timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date()).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);

  return {
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    dayOfWeek: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    minuteOfDay: hour * 60 + minute
  };
}

function blankDayState(date, timezone) {
  return {
    date,
    timezone,
    records: {
      entrada: false,
      saida_almoco: false,
      volta_almoco: false,
      saida: false
    },
    times: {},
    holiday: false,
    halfDay: false,
    noLunch: false
  };
}

async function sendReminder(subscription, type) {
  const payload = JSON.stringify({
    title: "Controle de Ponto",
    body: REMINDER_MESSAGES[type],
    url: "/#register"
  });

  await webpush.sendNotification(subscription, payload);
}

function isCronAuthorized(req) {
  if (req.method !== "GET") return false;
  return req.headers.authorization === `Bearer ${process.env.CRON_SECRET}`;
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

async function isQStashRequest(req, body) {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  const signature = req.headers["upstash-signature"];

  if (!currentSigningKey || !nextSigningKey) {
    const error = new Error("Chaves de assinatura do QStash não configuradas.");
    error.statusCode = 503;
    throw error;
  }

  if (!signature) return false;

  const receiver = new Receiver({
    currentSigningKey,
    nextSigningKey
  });
  const url = process.env.QSTASH_RECEIVER_URL || `https://${req.headers.host}${req.url}`;

  const verified = await receiver.verify({
    signature,
    body,
    url
  });
  return Boolean(verified);
}

async function isRequestAuthorized(req) {
  if (req.method === "POST") {
    const body = await readRawBody(req);
    return isQStashRequest(req, body);
  }

  return isCronAuthorized(req);
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.writeHead(405, { Allow: "GET, POST" });
    res.end();
    return;
  }

  try {
    if (!(await isRequestAuthorized(req))) {
      const response = json(401, { ok: false, error: "Unauthorized" });
      res.writeHead(response.status, response.headers);
      res.end(response.body);
      return;
    }
  } catch (error) {
    const response = json(error.statusCode || 401, {
      ok: false,
      error: error.message || "Unauthorized"
    });
    res.writeHead(response.status, response.headers);
    res.end(response.body);
    return;
  }

  if (req.method === "GET" && !process.env.CRON_SECRET) {
    const response = json(401, { ok: false, error: "Unauthorized" });
    res.writeHead(response.status, response.headers);
    res.end(response.body);
    return;
  }

  try {
    configureVapid();

    const devices = await listReminderDevices();
    const result = {
      checked: 0,
      sent: 0,
      skipped: 0,
      errors: 0
    };

    for (const deviceId of devices) {
      try {
        const subscriptionRecord = await getSubscriptionRecord(deviceId);
        const settingsRecord = await getReminderSettings(deviceId);
        const settings = normalizeReminderSettings(settingsRecord?.settings);

        if (!subscriptionRecord?.active || !subscriptionRecord.subscription || !settings.enabled) {
          result.skipped += 1;
          continue;
        }

        const now = timezoneNow(settings.timezone);
        const stateRecord = await getReminderDayState(deviceId, now.date);
        const dayState = stateRecord?.state || blankDayState(now.date, settings.timezone);
        const due = dueReminders(settings, dayState, now);
        const sent = await getSentReminders(deviceId, now.date);

        result.checked += 1;

        for (const type of due) {
          if (sent[type]) continue;
          await sendReminder(subscriptionRecord.subscription, type);
          await markReminderSent(deviceId, now.date, type);
          result.sent += 1;
        }
      } catch (error) {
        result.errors += 1;
        if (error.statusCode === 404 || error.statusCode === 410) {
          await removeSubscription(deviceId).catch(() => {});
        }
      }
    }

    const response = json(200, { ok: true, result });
    res.writeHead(response.status, response.headers);
    res.end(response.body);
  } catch (error) {
    const response = json(error.statusCode || 500, {
      ok: false,
      error: error.message || "Erro ao verificar lembretes."
    });
    res.writeHead(response.status, response.headers);
    res.end(response.body);
  }
};
