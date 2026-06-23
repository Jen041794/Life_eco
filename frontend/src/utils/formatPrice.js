// 統一價格顯示格式：一律顯示整數（不顯示小數點），千分位加逗號
// 例：120.00 → "120"、120.50 → "121"（四捨五入）、1200 → "1,200"
// 後端 DRF DecimalField 回傳的是字串（如 "120.00"），這裡用 Number 轉過再格式化
export function formatPrice(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return value ?? "";
  return n.toLocaleString("zh-TW", { maximumFractionDigits: 0 });
}
