import { Alert } from 'react-bootstrap'

// 骨架（step 4）：收件人 / 電話 / 地址必填，送出時呼叫 createOrder（POST /api/orders/）
export default function CheckoutPage() {
  return (
    <div>
      <h3 className="mb-3">結帳</h3>
      <Alert variant="secondary">
        🚧 建構中（step 4）：收件資訊表單 + 下單。API 接口 <code>createOrder</code> 已備妥。
      </Alert>
    </div>
  )
}
