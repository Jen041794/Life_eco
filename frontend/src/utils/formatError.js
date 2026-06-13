// 把 RTK Query / DRF 回傳的錯誤整理成一段好讀的文字
export function formatApiError(err) {
  const data = err?.data
  if (!data) return '操作失敗，請稍後再試。'
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  // 欄位錯誤，例如 { price: ["必須是數字"], name: ["不能空白"] }
  return Object.entries(data)
    .map(([field, msgs]) => `${field}：${Array.isArray(msgs) ? msgs.join('、') : msgs}`)
    .join('\n')
}
