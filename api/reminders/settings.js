const {
  getReminderSettings,
  json,
  normalizeDeviceId,
  readBody,
  saveReminderSettings
} = require("../_push-store");
const { normalizeReminderSettings } = require("../_reminder-logic");

function send(res, response) {
  res.writeHead(response.status, response.headers);
  res.end(response.body);
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const url = new URL(req.url, `https://${req.headers.host || "localhost"}`);
      const deviceId = normalizeDeviceId(url.searchParams.get("deviceId"));

      if (!deviceId) {
        send(res, json(400, { ok: false, error: "deviceId inválido." }));
        return;
      }

      const record = await getReminderSettings(deviceId);
      send(res, json(200, {
        ok: true,
        settings: normalizeReminderSettings(record?.settings)
      }));
      return;
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const deviceId = normalizeDeviceId(body.deviceId);

      if (!deviceId) {
        send(res, json(400, { ok: false, error: "deviceId inválido." }));
        return;
      }

      const settings = normalizeReminderSettings(body.settings);
      await saveReminderSettings(deviceId, settings);
      send(res, json(200, { ok: true, settings }));
      return;
    }

    res.writeHead(405, { Allow: "GET, POST" });
    res.end();
  } catch (error) {
    send(res, json(error.statusCode || 500, {
      ok: false,
      error: error.message || "Erro ao salvar lembretes."
    }));
  }
};
