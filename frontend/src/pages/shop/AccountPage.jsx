import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Card, Form, Button, Alert, Spinner, Tab, Tabs, Badge, ListGroup, Accordion,
} from 'react-bootstrap'
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useGetMyOrdersQuery,
} from '../../features/api/apiSlice'
import { selectCurrentUser } from '../../features/auth/authSlice'
import { STATUS_LABELS, STATUS_VARIANTS } from '../../utils/orderStatus'
import { onlyDigits, validatePhone, validateAddress } from '../../utils/validators'
import PaymentModal from '../../components/PaymentModal'
import { formatPrice } from '../../utils/formatPrice'

// ---- 個人資訊分頁：讀寫自己的電話、地址 ----
function ProfileTab() {
  const user = useSelector(selectCurrentUser('customer'))
  const { data: profile, isLoading, isError } = useGetProfileQuery()
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation()

  const [form, setForm] = useState({ phone: '', address: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) setForm({ phone: profile.phone ?? '', address: profile.address ?? '' })
  }, [profile])

  const setField = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }))
    setFieldErrors((e) => (e[name] ? { ...e, [name]: '' } : e))
    setSaved(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    // 電話、地址非必填，但填了就要符合格式
    const errs = {
      phone: validatePhone(form.phone),
      address: validateAddress(form.address),
    }
    if (Object.values(errs).some(Boolean)) {
      setFieldErrors(errs)
      return
    }
    try {
      await updateProfile(form).unwrap()
      setSaved(true)
    } catch (err) {
      const data = err?.data
      setError(data && typeof data === 'object' ? Object.values(data).flat().join('\n') : '儲存失敗，請稍後再試。')
    }
  }

  if (isLoading) return <Spinner animation="border" />
  if (isError) return <Alert variant="danger">個人資料載入失敗，請稍後再試。</Alert>

  return (
    <Card className="shadow-sm" style={{ maxWidth: 520 }}>
      <Card.Body>
        {user && (
          <div className="mb-4 text-muted small">
            <div>帳號：{user.username}</div>
            {user.email && <div>Email：{user.email}</div>}
          </div>
        )}
        {saved && <Alert variant="success" className="py-2">已儲存 ✅</Alert>}
        {error && (
          <Alert variant="danger" className="py-2" style={{ whiteSpace: 'pre-line' }}>{error}</Alert>
        )}
        <Form onSubmit={handleSubmit} noValidate>
          <Form.Group className="mb-3">
            <Form.Label>手機</Form.Label>
            <Form.Control
              name="phone"
              value={form.phone}
              onChange={(e) => setField('phone', onlyDigits(e.target.value).slice(0, 10))}
              inputMode="numeric"
              maxLength={10}
              placeholder="09 開頭，共 10 碼"
              isInvalid={!!fieldErrors.phone}
            />
            <Form.Control.Feedback type="invalid">{fieldErrors.phone}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group className="mb-4">
            <Form.Label>地址</Form.Label>
            <Form.Control
              as="textarea" rows={3} name="address" value={form.address}
              onChange={(e) => setField('address', e.target.value)}
              placeholder="例如：台北市信義區市府路 1 號"
              isInvalid={!!fieldErrors.address}
            />
            <Form.Control.Feedback type="invalid">{fieldErrors.address}</Form.Control.Feedback>
          </Form.Group>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Spinner size="sm" animation="border" /> : '儲存'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  )
}

// ---- 我的訂單分頁：用 Accordion 呈現，預設全部收合 ----
function OrdersTab() {
  const { data, isLoading, isError } = useGetMyOrdersQuery()
  const orders = data?.results ?? []

  // 目前正在付款的訂單（null = 沒開彈窗）；付款成功後顯示提示
  const [payingOrder, setPayingOrder] = useState(null)
  const [paidMsg, setPaidMsg] = useState('')

  // 彈窗關閉：success=true 代表付款成功 → 顯示提示（RTK Query 已自動刷新訂單狀態）
  const handleClose = (success) => {
    setPayingOrder(null)
    if (success) setPaidMsg('付款成功 ✅')
  }

  if (isLoading) return <Spinner animation="border" />
  if (isError) return <Alert variant="danger">訂單載入失敗，請稍後再試。</Alert>
  if (orders.length === 0) {
    return (
      <Alert variant="secondary">
        還沒有任何訂單。<Link to="/shop">去逛逛商品 →</Link>
      </Alert>
    )
  }

  return (
    <>
      {paidMsg && (
        <Alert variant="success" className="py-2" onClose={() => setPaidMsg('')} dismissible>
          {paidMsg}
        </Alert>
      )}
      {/* 不設 defaultActiveKey → 預設全部收合，點了才展開 */}
      <Accordion alwaysOpen>
      {orders.map((order) => (
        <Accordion.Item eventKey={String(order.id)} key={order.id}>
          <Accordion.Header>
            <div className="d-flex justify-content-between align-items-center w-100 me-3">
              <span>
                訂單 <span className="font-monospace">#{order.order_number}</span>
                <span className="text-muted small ms-2">
                  {new Date(order.created_at).toLocaleDateString('zh-TW')}
                </span>
              </span>
              <span className="d-flex align-items-center gap-3">
                <span className="fw-bold">${formatPrice(order.total_price)}</span>
                <Badge bg={STATUS_VARIANTS[order.status] ?? 'secondary'}>
                  {STATUS_LABELS[order.status] ?? order.status}
                </Badge>
              </span>
            </div>
          </Accordion.Header>
          <Accordion.Body>
            <ListGroup variant="flush">
              {order.items.map((item) => (
                <ListGroup.Item key={item.id} className="d-flex justify-content-between px-0">
                  <span>
                    {item.product?.name ?? '（商品已移除）'}
                    <span className="text-muted small ms-2">× {item.quantity}</span>
                  </span>
                  <span>${formatPrice(Number(item.price) * item.quantity)}</span>
                </ListGroup.Item>
              ))}
            </ListGroup>
            <div className="text-muted small mt-2">
              收件人：{order.recipient_name}（{order.recipient_phone}）<br />
              寄送至：{order.shipping_address}
            </div>
            {/* 只有「待付款」的訂單顯示付款入口 */}
            {order.status === 'pending' && (
              <div className="mt-3">
                <Button variant="success" size="sm" onClick={() => setPayingOrder(order)}>
                  💳 立即付款
                </Button>
              </div>
            )}
          </Accordion.Body>
        </Accordion.Item>
      ))}
      </Accordion>
      <PaymentModal show={!!payingOrder} order={payingOrder} onHide={handleClose} />
    </>
  )
}

export default function AccountPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  // 結帳完成會導到 /account?tab=orders，直接落在「我的訂單」
  const activeTab = searchParams.get('tab') === 'orders' ? 'orders' : 'profile'

  return (
    <div>
      <h3 className="mb-3">我的帳戶</h3>
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setSearchParams(k === 'orders' ? { tab: 'orders' } : {})}
        className="mb-3"
      >
        <Tab eventKey="profile" title="個人資訊">
          <ProfileTab />
        </Tab>
        <Tab eventKey="orders" title="我的訂單">
          <OrdersTab />
        </Tab>
      </Tabs>
    </div>
  )
}
