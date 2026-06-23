import { Row, Col, Card, Table, Spinner, Alert, Badge } from 'react-bootstrap'
import { useGetStatsQuery } from '../features/api/apiSlice'
import { formatPrice } from '../utils/formatPrice'

const statusLabels = {
  pending: '待付款',
  paid: '已付款',
  shipped: '已出貨',
  completed: '已完成',
  cancelled: '已取消',
}

function StatCard({ title, value, variant = 'primary' }) {
  return (
    <Card className="text-center shadow-sm h-100">
      <Card.Body>
        <div className="text-muted small">{title}</div>
        <div className={`fs-3 fw-bold text-${variant}`}>{value}</div>
      </Card.Body>
    </Card>
  )
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useGetStatsQuery()

  if (isLoading) return <Spinner animation="border" />
  if (isError) return <Alert variant="danger">載入統計資料失敗。</Alert>

  return (
    <>
      <h4 className="mb-4">儀表板</h4>

      <Row className="g-3 mb-4">
        <Col xs={6} md={3}><StatCard title="總訂單" value={data.total_orders} /></Col>
        <Col xs={6} md={3}><StatCard title="總營收" value={`$${formatPrice(data.total_revenue)}`} variant="success" /></Col>
        <Col xs={6} md={3}><StatCard title="會員數" value={data.total_users} variant="info" /></Col>
        <Col xs={6} md={3}><StatCard title="商品數" value={data.product_count} variant="secondary" /></Col>
      </Row>

      <Row className="g-3">
        <Col md={6}>
          <Card className="shadow-sm h-100">
            <Card.Header>各狀態訂單數</Card.Header>
            <Card.Body>
              <Table size="sm" className="mb-0">
                <tbody>
                  {Object.entries(data.orders_by_status).map(([key, count]) => (
                    <tr key={key}>
                      <td>{statusLabels[key] || key}</td>
                      <td className="text-end fw-bold">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="shadow-sm h-100">
            <Card.Header>
              低庫存商品{' '}
              <Badge bg="warning" text="dark">
                少於 {data.low_stock_threshold}
              </Badge>
            </Card.Header>
            <Card.Body>
              {data.low_stock_products.length === 0 ? (
                <div className="text-muted">目前沒有低庫存商品 🎉</div>
              ) : (
                <Table size="sm" className="mb-0">
                  <thead>
                    <tr><th>商品</th><th className="text-end">剩餘庫存</th></tr>
                  </thead>
                  <tbody>
                    {data.low_stock_products.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name}</td>
                        <td className="text-end text-danger fw-bold">{p.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </>
  )
}
