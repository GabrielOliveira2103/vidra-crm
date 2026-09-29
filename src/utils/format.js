export const money = (value) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(value || 0),
  );
export const percent = (value) =>
  `${Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
export const date = (value) =>
  value
    ? new Date(
        value.length === 10 ? `${value}T12:00:00` : value,
      ).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
    : "—";
export const dateTime = (value) =>
  value
    ? new Date(value).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";
export function dayKey(value = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
export function shiftDay(day, amount) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + amount);
  return d.toISOString().slice(0, 10);
}
export const daysSince = (value, now = new Date()) =>
  Math.max(0, Math.floor((new Date(now) - new Date(value)) / 86400000));
export function normalizePhone(value) {
  if (
    String(value || "")
      .trim()
      .startsWith("+") &&
    !/^55[1-9]\d\d{8,9}$/.test(String(value).replace(/\D/g, ""))
  )
    throw new Error("Informe um telefone brasileiro com DDD.");
  let digits = (value || "").replace(/\D/g, "");
  if ([10, 11].includes(digits.length)) digits = `55${digits}`;
  if (!/^55[1-9]\d\d{8,9}$/.test(digits))
    throw new Error("Informe um telefone brasileiro com DDD.");
  return `+${digits}`;
}
export const inRange = (value, start, end) =>
  Boolean(value) &&
  (!start || dayKey(value) >= start) &&
  (!end || dayKey(value) <= end);
export function errorMessage(error) {
  if (error?.code === "23505")
    return "Já existe um registro com esse telefone, número ou identificador. Cada lead pode ter apenas um orçamento aceito.";
  if (error?.code === "23503")
    return "O registro relacionado não existe ou está em uso.";
  if (error?.code === "42501")
    return "Seu usuário não está autorizado. Solicite a liberação ao administrador.";
  return error?.message || "Não foi possível concluir. Tente novamente.";
}
