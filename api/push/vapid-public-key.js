const { json } = require("../_push-store");

module.exports = function handler(req, res) {
  if (req.method !== "GET") {
    res.writeHead(405, { Allow: "GET" });
    res.end();
    return;
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY || "";
  if (!publicKey) {
    const response = json(503, {
      ok: false,
      error: "VAPID_PUBLIC_KEY não configurada."
    });
    res.writeHead(response.status, response.headers);
    res.end(response.body);
    return;
  }

  const response = json(200, { ok: true, publicKey });
  res.writeHead(response.status, response.headers);
  res.end(response.body);
};
