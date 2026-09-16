const STORE_PREFIX = "controle-ponto:push:";
const REMINDER_PREFIX = "controle-ponto:reminders:";
const DEVICES_KEY = `${REMINDER_PREFIX}devices`;

function json(status, data) {
  return {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(data)
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function normalizeDeviceId(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 120);
}

function hasKvConfig() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

async function kvCommand(command) {
  if (!hasKvConfig()) {
    const error = new Error("Vercel KV não configurado.");
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(process.env.KV_REST_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(command)
  });

  if (!response.ok) {
    const error = new Error("Falha ao acessar a persistência de push.");
    error.statusCode = response.status;
    throw error;
  }

  return response.json();
}

function subscriptionKey(deviceId) {
  return `${STORE_PREFIX}${deviceId}`;
}

async function saveSubscription(deviceId, subscription) {
  const record = {
    deviceId,
    subscription,
    active: true,
    updatedAt: new Date().toISOString()
  };

  await kvCommand(["SET", subscriptionKey(deviceId), JSON.stringify(record)]);
  await kvCommand(["SADD", DEVICES_KEY, deviceId]);
  return record;
}

async function getSubscriptionRecord(deviceId) {
  const result = await kvCommand(["GET", subscriptionKey(deviceId)]);
  if (!result.result) return null;

  try {
    return typeof result.result === "string" ? JSON.parse(result.result) : result.result;
  } catch {
    return null;
  }
}

async function removeSubscription(deviceId) {
  await kvCommand(["DEL", subscriptionKey(deviceId)]);
  await kvCommand(["SREM", DEVICES_KEY, deviceId]);
}

function reminderSettingsKey(deviceId) {
  return `${REMINDER_PREFIX}settings:${deviceId}`;
}

function reminderStateKey(deviceId, day) {
  return `${REMINDER_PREFIX}state:${deviceId}:${day}`;
}

function reminderSentKey(deviceId, day) {
  return `${REMINDER_PREFIX}sent:${deviceId}:${day}`;
}

async function listReminderDevices() {
  const result = await kvCommand(["SMEMBERS", DEVICES_KEY]);
  return Array.isArray(result.result) ? result.result : [];
}

async function saveReminderSettings(deviceId, settings) {
  const record = {
    deviceId,
    settings,
    updatedAt: new Date().toISOString()
  };

  await kvCommand(["SET", reminderSettingsKey(deviceId), JSON.stringify(record)]);
  await kvCommand(["SADD", DEVICES_KEY, deviceId]);
  return record;
}

async function getReminderSettings(deviceId) {
  const result = await kvCommand(["GET", reminderSettingsKey(deviceId)]);
  if (!result.result) return null;

  try {
    return typeof result.result === "string" ? JSON.parse(result.result) : result.result;
  } catch {
    return null;
  }
}

async function saveReminderDayState(deviceId, day, state) {
  const record = {
    deviceId,
    day,
    state,
    updatedAt: new Date().toISOString()
  };

  await kvCommand(["SET", reminderStateKey(deviceId, day), JSON.stringify(record)]);
  await kvCommand(["SADD", DEVICES_KEY, deviceId]);
  return record;
}

async function getReminderDayState(deviceId, day) {
  const result = await kvCommand(["GET", reminderStateKey(deviceId, day)]);
  if (!result.result) return null;

  try {
    return typeof result.result === "string" ? JSON.parse(result.result) : result.result;
  } catch {
    return null;
  }
}

async function getSentReminders(deviceId, day) {
  const result = await kvCommand(["GET", reminderSentKey(deviceId, day)]);
  if (!result.result) return {};

  try {
    const parsed = typeof result.result === "string" ? JSON.parse(result.result) : result.result;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

async function markReminderSent(deviceId, day, type) {
  const sent = await getSentReminders(deviceId, day);
  sent[type] = sent[type] || new Date().toISOString();
  await kvCommand(["SET", reminderSentKey(deviceId, day), JSON.stringify(sent)]);
  return sent;
}

module.exports = {
  getReminderDayState,
  getReminderSettings,
  getSubscriptionRecord,
  getSentReminders,
  hasKvConfig,
  json,
  kvCommand,
  listReminderDevices,
  markReminderSent,
  normalizeDeviceId,
  readBody,
  removeSubscription,
  saveReminderDayState,
  saveReminderSettings,
  saveSubscription
};
