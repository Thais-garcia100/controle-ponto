const {
  json,
  normalizeDeviceId,
  readBody,
  saveReminderDayState
} = require("../_push-store");

function normalizeDay(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function normalizeTime(value) {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? value : null;
}

function normalizeState(input = {}) {
  const records = {};
  const times = {};

  ["entrada", "saida_almoco", "volta_almoco", "saida"].forEach(type => {
    records[type] = Boolean(input.records?.[type]);
    const time = normalizeTime(input.times?.[type]);
    if (time) times[type] = time;
  });

  return {
    date: normalizeDay(input.date),
    timezone: typeof input.timezone === "string" && input.timezone.trim()
      ? input.timezone.trim().slice(0, 80)
      : "America/Sao_Paulo",
    records,
    times,
    holiday: Boolean(input.holiday),
    halfDay: Boolean(input.halfDay),
    noLunch: Boolean(input.noLunch)
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { Allow: "POST" });
    res.end();
    return;
  }

  try {
    const body = await readBody(req);
    const deviceId = normalizeDeviceId(body.deviceId);
    const state = normalizeState(body.state);

    if (!deviceId || !state.date) {
      const response = json(400, {
        ok: false,
        error: "Estado de lembrete inválido."
      });
      res.writeHead(response.status, response.headers);
      res.end(response.body);
      return;
    }

    await saveReminderDayState(deviceId, state.date, state);

    const response = json(200, { ok: true });
    res.writeHead(response.status, response.headers);
    res.end(response.body);
  } catch (error) {
    const response = json(error.statusCode || 500, {
      ok: false,
      error: error.message || "Erro ao sincronizar estado do dia."
    });
    res.writeHead(response.status, response.headers);
    res.end(response.body);
  }
};
