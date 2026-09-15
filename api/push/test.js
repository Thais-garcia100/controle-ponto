const webpush = require("web-push");
const {
  getSubscriptionRecord,
  json,
  normalizeDeviceId,
  readBody
} = require("../_push-store");

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

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.writeHead(405, { Allow: "POST" });
    res.end();
    return;
  }

  try {
    configureVapid();

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

    const record = await getSubscriptionRecord(deviceId);
    if (!record?.subscription) {
      const response = json(404, {
        ok: false,
        error: "Subscription não encontrada."
      });
      res.writeHead(response.status, response.headers);
      res.end(response.body);
      return;
    }

    const payload = JSON.stringify({
      title: "Controle de Ponto",
      body: body.message || "Push de teste enviado pelo Controle de Ponto.",
      url: "/"
    });

    await webpush.sendNotification(record.subscription, payload);

    const response = json(200, { ok: true });
    res.writeHead(response.status, response.headers);
    res.end(response.body);
  } catch (error) {
    const response = json(error.statusCode || 500, {
      ok: false,
      error: error.message || "Erro ao enviar push de teste."
    });
    res.writeHead(response.status, response.headers);
    res.end(response.body);
  }
};
