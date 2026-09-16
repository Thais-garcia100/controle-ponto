const {
  getReminderSettings,
  json,
  normalizeDeviceId,
  readBody,
  saveReminderSettings
} = require("../_push-store");
const { normalizeReminderSettings } = require("../_reminder-logic");

function send(res, response) {
  res.writeHead(response.status, {
    ...response.headers,
    "Cache-Control": "no-store"
  });
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
        exists: Boolean(record?.settings),
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

      const settings = normalizeReminderSettings(body.settings || body);
      await saveReminderSettings(deviceId, settings);
      send(res, json(200, { ok: true, exists: true, settings }));
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
