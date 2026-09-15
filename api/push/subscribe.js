const {
  json,
  normalizeDeviceId,
  readBody,
  saveSubscription
} = require("../_push-store");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { Allow: "POST" });
    res.end();
    return;
  }

  try {
    const body = await readBody(req);
    const deviceId = normalizeDeviceId(body.deviceId);
    const subscription = body.subscription;

    if (!deviceId || !subscription || typeof subscription.endpoint !== "string") {
      const response = json(400, {
        ok: false,
        error: "Subscription inválida."
      });
      res.writeHead(response.status, response.headers);
      res.end(response.body);
      return;
    }

    await saveSubscription(deviceId, subscription);

    const response = json(200, { ok: true });
    res.writeHead(response.status, response.headers);
    res.end(response.body);
  } catch (error) {
    const response = json(error.statusCode || 500, {
      ok: false,
      error: error.message || "Erro ao salvar subscription."
    });
    res.writeHead(response.status, response.headers);
    res.end(response.body);
  }
};
