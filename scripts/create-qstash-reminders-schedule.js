const { Client } = require("@upstash/qstash");

const token = process.env.QSTASH_TOKEN;
const destination = process.env.REMINDERS_CRON_URL || "https://controle-ponto-flax.vercel.app/api/cron/reminders";
const scheduleId = process.env.REMINDERS_QSTASH_SCHEDULE_ID || "controle-ponto-reminders-5m";
const cron = process.env.REMINDERS_QSTASH_CRON || "*/5 * * * *";

if (!token) {
  console.error("QSTASH_TOKEN não configurado.");
  process.exit(1);
}

async function main() {
  const client = new Client({ token });

  await client.schedules.create({
    destination,
    cron,
    scheduleId,
    method: "POST",
    retries: 1,
    timeout: "30s",
    body: JSON.stringify({ source: "controle-ponto-reminders" }),
    headers: {
      "Content-Type": "application/json"
    }
  });

  console.log(JSON.stringify({
    ok: true,
    scheduleId,
    cron,
    destination
  }, null, 2));
}

main().catch(error => {
  console.error(error.message || error);
  process.exit(1);
});
