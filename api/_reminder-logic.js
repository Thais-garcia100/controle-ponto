const REMINDER_MESSAGES = {
  entrada: "Você esqueceu de registrar a entrada.",
  saida_almoco: "Está faltando registrar sua saída para o almoço.",
  volta_almoco: "Está faltando registrar sua volta do almoço.",
  saida: "Você esqueceu de registrar a saída."
};

const DEFAULT_REMINDER_SETTINGS = {
  enabled: false,
  timezone: "America/Sao_Paulo",
  toleranceMinutes: 5,
  lunchReturnMinutes: 60,
  reminders: {
    entrada: true,
    saida_almoco: true,
    volta_almoco: true,
    saida: true
  },
  times: {
    entrada: "07:00",
    saida_almoco: "12:00",
    saida: "16:48"
  }
};

function toBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function toInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function validTime(value, fallback) {
  return typeof value === "string" && /^\d{2}:\d{2}$/.test(value) ? value : fallback;
}

function normalizeReminderSettings(input = {}) {
  return {
    enabled: toBoolean(input.enabled, DEFAULT_REMINDER_SETTINGS.enabled),
    timezone: typeof input.timezone === "string" && input.timezone.trim()
      ? input.timezone.trim().slice(0, 80)
      : DEFAULT_REMINDER_SETTINGS.timezone,
    toleranceMinutes: toInteger(input.toleranceMinutes, DEFAULT_REMINDER_SETTINGS.toleranceMinutes, 0, 60),
    lunchReturnMinutes: toInteger(input.lunchReturnMinutes, DEFAULT_REMINDER_SETTINGS.lunchReturnMinutes, 15, 180),
    reminders: {
      entrada: toBoolean(input.reminders?.entrada, true),
      saida_almoco: toBoolean(input.reminders?.saida_almoco, true),
      volta_almoco: toBoolean(input.reminders?.volta_almoco, true),
      saida: toBoolean(input.reminders?.saida, true)
    },
    times: {
      entrada: validTime(input.times?.entrada, DEFAULT_REMINDER_SETTINGS.times.entrada),
      saida_almoco: validTime(input.times?.saida_almoco, DEFAULT_REMINDER_SETTINGS.times.saida_almoco),
      saida: validTime(input.times?.saida, DEFAULT_REMINDER_SETTINGS.times.saida)
    }
  };
}

function timeToMinutes(value) {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function hasRecord(dayState, type) {
  return Boolean(dayState?.records?.[type]);
}

function expectedMinute(settings, type) {
  const value = settings.times?.[type];
  const minute = timeToMinutes(value);
  return minute === null ? null : minute + settings.toleranceMinutes;
}

function isReminderDue(nowMinute, dueMinute) {
  return typeof dueMinute === "number" && nowMinute >= dueMinute;
}

function dueReminders(settingsInput, dayStateInput, now) {
  const settings = normalizeReminderSettings(settingsInput);
  const dayState = dayStateInput || {};
  const due = [];

  if (!settings.enabled) return due;
  if (now.dayOfWeek === 0 || now.dayOfWeek === 6) return due;
  if (dayState.holiday) return due;

  const halfDay = Boolean(dayState.halfDay);
  const noLunch = Boolean(dayState.noLunch);
  const lunchRemindersAllowed = !halfDay && !noLunch;

  if (
    settings.reminders.entrada
    && isReminderDue(now.minuteOfDay, expectedMinute(settings, "entrada"))
    && !hasRecord(dayState, "entrada")
  ) {
    due.push("entrada");
  }

  if (
    lunchRemindersAllowed
    && settings.reminders.saida_almoco
    && isReminderDue(now.minuteOfDay, expectedMinute(settings, "saida_almoco"))
    && hasRecord(dayState, "entrada")
    && !hasRecord(dayState, "saida_almoco")
  ) {
    due.push("saida_almoco");
  }

  const lunchStart = timeToMinutes(dayState.times?.saida_almoco);
  if (
    lunchRemindersAllowed
    && settings.reminders.volta_almoco
    && lunchStart !== null
    && isReminderDue(now.minuteOfDay, lunchStart + settings.lunchReturnMinutes + settings.toleranceMinutes)
    && hasRecord(dayState, "saida_almoco")
    && !hasRecord(dayState, "volta_almoco")
  ) {
    due.push("volta_almoco");
  }

  if (
    settings.reminders.saida
    && isReminderDue(now.minuteOfDay, expectedMinute(settings, "saida"))
    && !hasRecord(dayState, "saida")
  ) {
    due.push("saida");
  }

  return due;
}

module.exports = {
  DEFAULT_REMINDER_SETTINGS,
  REMINDER_MESSAGES,
  dueReminders,
  normalizeReminderSettings,
  timeToMinutes
};
