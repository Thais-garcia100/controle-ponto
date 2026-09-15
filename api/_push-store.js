const STORE_PREFIX = "controle-ponto:push:";

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
}

module.exports = {
  getSubscriptionRecord,
  hasKvConfig,
  json,
  normalizeDeviceId,
  readBody,
  removeSubscription,
  saveSubscription
};
