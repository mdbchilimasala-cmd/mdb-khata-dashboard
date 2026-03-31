export function parseQty(input) {
  if (!input) return 0;
  const raw = String(input).trim();
  if (raw.includes("-")) {
    const [left, right] = raw.split("-");
    const r = right?.replace(/\D/g, "") || "0";
    return Number(`${left}${r ? `${r[0]}` : ""}`);
  }
  return Number(raw);
}

export function money(value) {
  return Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function calcRowAmount(qtyText, rate) {
  return parseQty(qtyText) * Number(rate || 0);
}
