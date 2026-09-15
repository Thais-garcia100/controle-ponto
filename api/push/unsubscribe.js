const {
  json,
  normalizeDeviceId,
  readBody,
  removeSubscription
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

    if (!deviceId) {
      const response = json(400, {
        ok: false,
        error: "deviceId inválido."
      });
      res.writeHead(response.status, response.headers);
      res.end(response.body);
      return;
    }

    await removeSubscription(deviceId);

    const response = json(200, { ok: true });
    res.writeHead(response.status, response.headers);
    res.end(response.body);
  } catch (error) {
    const response = json(error.statusCode || 500, {
      ok: false,
      error: error.message || "Erro ao remover subscription."
    });
    res.writeHead(response.status, response.headers);
    res.end(response.body);
  }
};
