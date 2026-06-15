// 表單欄位驗證規則，前台收件/個資共用同一套

// 台灣手機：09 開頭、共 10 碼數字
export const PHONE_RE = /^09\d{8}$/

// 只保留數字（給手機輸入框即時過濾用）
export const onlyDigits = (v) => (v || '').replace(/\D/g, '')

export function validatePhone(value, { required = false } = {}) {
  const v = value || ''
  if (!v) return required ? '請輸入手機號碼' : ''
  if (!PHONE_RE.test(v)) return '手機需為 09 開頭、共 10 碼數字'
  return ''
}

// 地址至少要像個地址：有路/街/巷…等關鍵字，且有門牌數字，避免亂填
const ADDRESS_KEYWORD_RE = /[市縣區鄉鎮村里路街巷弄段號樓室]/
export function validateAddress(value, { required = false } = {}) {
  const v = (value || '').trim()
  if (!v) return required ? '請輸入地址' : ''
  if (v.length < 8) return '地址太短，請輸入完整地址'
  if (!/\d/.test(v) || !ADDRESS_KEYWORD_RE.test(v)) {
    return '請輸入完整地址（含路/街名與門牌號碼）'
  }
  return ''
}

export function validateRequired(value, label = '此欄位') {
  return (value || '').trim() ? '' : `請輸入${label}`
}
