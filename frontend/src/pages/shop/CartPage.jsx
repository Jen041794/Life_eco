import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { Table, Button, Image, InputGroup, Form, Alert } from 'react-bootstrap'
import {
  selectCartItems,
  selectCartTotal,
  setQuantity,
  removeItem,
  clearCart,
} from '../../features/cart/cartSlice'

export default function CartPage() {
  const dispatch = useDispatch()
  const items = useSelector(selectCartItems)
  const total = useSelector(selectCartTotal)

  if (items.length === 0) {
    return (
      <div>
        <h3 className="mb-3">購物車</h3>
        <Alert variant="secondary">
          購物車是空的。<Link to="/">去逛逛商品 →</Link>
        </Alert>
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-3">購物車</h3>
      <Table responsive className="align-middle bg-white shadow-sm">
        <thead className="table-light">
          <tr>
            <th style={{ width: 64 }}></th>
            <th>商品</th>
            <th className="text-end">單價</th>
            <th style={{ width: 150 }} className="text-center">數量</th>
            <th className="text-end">小計</th>
            <th style={{ width: 60 }}></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                {item.image ? (
                  <Image src={item.image} thumbnail width={48} height={48} style={{ objectFit: 'cover' }} />
                ) : (
                  <span className="text-muted small">無圖</span>
                )}
              </td>
              <td>{item.name}</td>
              <td className="text-end">${item.price}</td>
              <td>
                <InputGroup size="sm" className="justify-content-center" style={{ maxWidth: 130 }}>
                  <Button
                    variant="outline-secondary"
                    disabled={item.quantity <= 1}
                    onClick={() => dispatch(setQuantity({ id: item.id, quantity: item.quantity - 1 }))}
                  >
                    −
                  </Button>
                  <Form.Control
                    className="text-center"
                    value={item.quantity}
                    onChange={(e) =>
                      dispatch(setQuantity({ id: item.id, quantity: Number(e.target.value) || 1 }))
                    }
                  />
                  <Button
                    variant="outline-secondary"
                    disabled={item.quantity >= item.stock}
                    onClick={() => dispatch(setQuantity({ id: item.id, quantity: item.quantity + 1 }))}
                  >
                    +
                  </Button>
                </InputGroup>
                {item.quantity >= item.stock && (
                  <div className="text-muted text-center small mt-1">已達庫存上限（{item.stock}）</div>
                )}
              </td>
              <td className="text-end fw-bold">${(Number(item.price) * item.quantity).toFixed(2)}</td>
              <td>
                <Button size="sm" variant="outline-danger" onClick={() => dispatch(removeItem(item.id))}>
                  移除
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <Button variant="outline-secondary" size="sm" onClick={() => dispatch(clearCart())}>
          清空購物車
        </Button>
        <div className="text-end">
          <div className="fs-5 mb-2">
            總計：<span className="fw-bold text-primary">${total.toFixed(2)}</span>
          </div>
          <Button as={Link} to="/checkout">前往結帳</Button>
        </div>
      </div>
    </div>
  )
}
