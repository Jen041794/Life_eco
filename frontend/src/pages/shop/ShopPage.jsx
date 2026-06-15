import { useState } from 'react'
import { Row, Col, Card, Badge, Button, Spinner, Alert } from 'react-bootstrap'
import { useGetProductsQuery, useGetCategoriesQuery } from '../../features/api/apiSlice'

// 顧客端商品列表骨架：分類 chip 篩選 + 商品卡片。
// 後端對非管理員自動只回上架（is_active）商品，所以這裡直接呈現即可。
export default function ShopPage() {
  const [category, setCategory] = useState('') // '' = 全部
  const { data: categories } = useGetCategoriesQuery()
  const { data, isLoading, isError } = useGetProductsQuery({ category, storefront: true })

  const products = data?.results ?? []

  return (
    <div>
      <h3 className="mb-3">逛商品</h3>

      {/* 分類篩選 */}
      <div className="mb-4 d-flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={category === '' ? 'primary' : 'outline-primary'}
          onClick={() => setCategory('')}
        >
          全部
        </Button>
        {categories?.map((c) => (
          <Button
            key={c.id}
            size="sm"
            variant={String(category) === String(c.id) ? 'primary' : 'outline-primary'}
            onClick={() => setCategory(c.id)}
          >
            {c.name}
          </Button>
        ))}
      </div>

      {isLoading && <Spinner animation="border" />}
      {isError && <Alert variant="danger">商品載入失敗，請確認後端有啟動。</Alert>}
      {!isLoading && !isError && products.length === 0 && (
        <p className="text-muted">這個分類目前沒有商品。</p>
      )}

      <Row xs={1} sm={2} md={3} lg={4} className="g-3">
        {products.map((p) => (
          <Col key={p.id}>
            <Card className="h-100 shadow-sm">
              {p.images?.[0]?.image ? (
                <Card.Img
                  variant="top"
                  src={p.images[0].image}
                  style={{ height: 180, objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="bg-light d-flex align-items-center justify-content-center text-muted"
                  style={{ height: 180 }}
                >
                  無圖片
                </div>
              )}
              <Card.Body className="d-flex flex-column">
                <Card.Title className="fs-6">{p.name}</Card.Title>
                {p.category_name && (
                  <Badge bg="secondary" className="align-self-start mb-2">
                    {p.category_name}
                  </Badge>
                )}
                <div className="mt-auto">
                  <div className="fw-bold text-primary mb-2">${p.price}</div>
                  <Button size="sm" className="w-100" disabled={p.stock <= 0}>
                    {p.stock > 0 ? '加入購物車' : '已售完'}
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}
