import { Alert } from 'react-bootstrap'

// 骨架：我的訂單列表，接 getMyOrders（GET /api/orders/，後端只回自己的）
export default function MyOrdersPage() {
  return (
    <div>
      <h3 className="mb-3">我的訂單</h3>
      <Alert variant="secondary">
        🚧 建構中：訂單列表 + 狀態。API 接口 <code>getMyOrders</code> 已備妥。
      </Alert>
    </div>
  )
}
