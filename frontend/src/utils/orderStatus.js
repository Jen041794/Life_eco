// 訂單狀態的顯示設定，前後端共用同一套字串
export const STATUS_LABELS = {
  pending: '待付款',
  paid: '已付款',
  shipped: '已出貨',
  completed: '已完成',
  cancelled: '已取消',
}

export const STATUS_VARIANTS = {
  pending: 'secondary',
  paid: 'info',
  shipped: 'primary',
  completed: 'success',
  cancelled: 'danger',
}

// 篩選下拉選單用
export const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))

// 下一步可推進的狀態與按鈕文字（對應後端允許的合法轉換）
export const NEXT_ACTION = {
  pending: { next: 'paid', label: '標記已付款' },
  paid: { next: 'shipped', label: '出貨' },
  shipped: { next: 'completed', label: '完成' },
}

// 可以取消的狀態（未出貨前）
export const CANCELLABLE = ['pending', 'paid']
