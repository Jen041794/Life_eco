import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { Row, Col, Card, ListGroup, Form, Button, Alert, Spinner } from 'react-bootstrap'
import {
  useGetProfileQuery,
  useCreateOrderMutation,
} from '../../features/api/apiSlice'
import { selectCurrentUser } from '../../features/auth/authSlice'
import { selectCartItems, selectCartTotal, clearCart } from '../../features/cart/cartSlice'
import { onlyDigits, validatePhone, validateAddress, validateRequired } from '../../utils/validators'

// 把後端各種錯誤格式攤平成可讀字串
function extractError(err) {
  const data = err?.data
  if (!data) return '下單失敗，請稍後再試。'
  if (typeof data === 'string') return data
  if (Array.isArray(data)) return data.join('\n')
  if (typeof data === 'object') return Object.values(data).flat().join('\n')
  return '下單失敗，請稍後再試。'
}

function validateForm(form) {
  return {
    recipient_name: validateRequired(form.recipient_name, '收件人'),
    recipient_phone: validatePhone(form.recipient_phone, { required: true }),
    shipping_address: validateAddress(form.shipping_address, { required: true }),
  }
}

export default function CheckoutPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(selectCurrentUser('customer'))
  const items = useSelector(selectCartItems)
  const total = useSelector(selectCartTotal)

  const { data: profile, isLoading: loadingProfile } = useGetProfileQuery()
  const [createOrder, { isLoading: isSubmitting }] = useCreateOrderMutation()

  const [form, setForm] = useState({ recipient_name: '', recipient_phone: '', shipping_address: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')

  // 用會員資料當預設收件資訊：姓名用帳號、電話/地址用 profile
  useEffect(() => {
    setForm((f) => ({
      recipient_name: f.recipient_name || user?.username || '',
      recipient_phone: f.recipient_phone || profile?.phone || '',
      shipping_address: f.shipping_address || profile?.address || '',
    }))
  }, [user, profile])

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }))
    // 已標紅的欄位，邊改邊清掉錯誤
    setFieldErrors((e) => (e[name] ? { ...e, [name]: '' } : e))
  }

  const onPhoneChange = (e) => setField('recipient_phone', onlyDigits(e.target.value).slice(0, 10))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const errs = validateForm(form)
    if (Object.values(errs).some(Boolean)) {
      setFieldErrors(errs)
      return
    }
    try {
      await createOrder({
        items: items.map((i) => ({ product: i.id, quantity: i.quantity })),
        ...form,
      }).unwrap()
      dispatch(clearCart())
      navigate('/account?tab=orders')
    } catch (err) {
      setError(extractError(err))
    }
  }

  // 購物車空的就不給結帳
  if (items.length === 0) {
    return (
      <div>
        <h3 className="mb-3">結帳</h3>
        <Alert variant="secondary">
          購物車是空的，沒有東西可以結帳。<Link to="/">去逛逛商品 →</Link>
        </Alert>
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-3">結帳</h3>
      <Row className="g-4">
        {/* 左：收件資訊 */}
        <Col md={7}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title className="fs-6 mb-3">收件資訊</Card.Title>
              {error && (
                <Alert variant="danger" className="py-2" style={{ whiteSpace: 'pre-line' }}>
                  {error}
                </Alert>
              )}
              {loadingProfile && <Spinner size="sm" animation="border" className="mb-2" />}
              <Form onSubmit={handleSubmit} noValidate>
                <Form.Group className="mb-3">
                  <Form.Label>收件人 *</Form.Label>
                  <Form.Control
                    name="recipient_name"
                    value={form.recipient_name}
                    onChange={(e) => setField('recipient_name', e.target.value)}
                    maxLength={100}
                    isInvalid={!!fieldErrors.recipient_name}
                  />
                  <Form.Control.Feedback type="invalid">{fieldErrors.recipient_name}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>聯絡手機 *</Form.Label>
                  <Form.Control
                    name="recipient_phone"
                    value={form.recipient_phone}
                    onChange={onPhoneChange}
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="09 開頭，共 10 碼"
                    isInvalid={!!fieldErrors.recipient_phone}
                  />
                  <Form.Control.Feedback type="invalid">{fieldErrors.recipient_phone}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Label>收件地址 *</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="shipping_address"
                    value={form.shipping_address}
                    onChange={(e) => setField('shipping_address', e.target.value)}
                    placeholder="例如：台北市信義區市府路 1 號"
                    isInvalid={!!fieldErrors.shipping_address}
                  />
                  <Form.Control.Feedback type="invalid">{fieldErrors.shipping_address}</Form.Control.Feedback>
                </Form.Group>
                <Button type="submit" disabled={isSubmitting} className="w-100">
                  {isSubmitting ? <Spinner size="sm" animation="border" /> : `送出訂單（$${total.toFixed(2)}）`}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* 右：訂單摘要 */}
        <Col md={5}>
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title className="fs-6 mb-3">訂單摘要</Card.Title>
              <ListGroup variant="flush">
                {items.map((i) => (
                  <ListGroup.Item key={i.id} className="d-flex justify-content-between px-0">
                    <span>
                      {i.name} <span className="text-muted small">× {i.quantity}</span>
                    </span>
                    <span>${(Number(i.price) * i.quantity).toFixed(2)}</span>
                  </ListGroup.Item>
                ))}
              </ListGroup>
              <hr />
              <div className="d-flex justify-content-between fs-5">
                <span>總計</span>
                <span className="fw-bold text-primary">${total.toFixed(2)}</span>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
