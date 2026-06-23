import { useState } from 'react'
import { Modal, Form, Button, Alert } from 'react-bootstrap'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { stripePromise } from '../lib/stripe'
import {
  useCreatePaymentIntentMutation,
  useCreatePaymentMutation,
} from '../features/api/apiSlice'
import { formatApiError } from '../utils/formatError'
import { formatPrice } from '../utils/formatPrice'

// Stripe 測試金流付款彈窗。
// 流程：① 跟後端要 PaymentIntent（client_secret）→ ② 用 Stripe.js 確認刷卡
//       → ③ 成功後呼叫 POST /payments/，後端再跟 Stripe 查證才寫入紀錄、訂單翻「已付款」。
const CARD_OPTIONS = {
  hidePostalCode: true, // 台灣不需要郵遞區號欄位
  style: {
    base: {
      fontSize: '16px',
      color: '#212529',
      '::placeholder': { color: '#adb5bd' },
    },
    invalid: { color: '#dc3545' },
  },
}

function PaymentForm({ order, onHide }) {
  const stripe = useStripe()
  const elements = useElements()
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(false)

  const [createPaymentIntent] = useCreatePaymentIntentMutation()
  const [createPayment] = useCreatePaymentMutation()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!stripe || !elements) return // Stripe.js 還沒載完
    if (!name.trim()) {
      setError('請輸入持卡人姓名')
      return
    }
    setProcessing(true)
    try {
      // ① 跟後端要這張訂單的 PaymentIntent
      const { client_secret } = await createPaymentIntent({
        order: order.id,
      }).unwrap()

      // ② 用 Stripe 確認刷卡（測試卡號 4242 4242 4242 4242、未來到期日、任意 CVC）
      const result = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: { name: name.trim() },
        },
      })

      if (result.error) {
        setError(result.error.message || '付款失敗，請確認卡片資訊。')
        setProcessing(false)
        return
      }

      // ③ Stripe 回成功 → 通知後端，後端查證後寫入付款紀錄
      if (result.paymentIntent?.status === 'succeeded') {
        await createPayment({
          order: order.id,
          provider: 'stripe',
          payment_intent_id: result.paymentIntent.id,
        }).unwrap()
        onHide(true) // 帶 true 代表付款成功，讓父層顯示提示
      } else {
        setError('付款未完成，請再試一次。')
        setProcessing(false)
      }
    } catch (err) {
      setError(formatApiError(err))
      setProcessing(false)
    }
  }

  return (
    <Form onSubmit={submit}>
      <Modal.Header closeButton>
        <Modal.Title>付款</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="info" className="py-2">
          🧪 測試模式，請用測試卡號 <span className="font-monospace">4242 4242 4242 4242</span>，
          到期日填未來任意月年、CVC 任意 3 碼，不會真的扣款。
        </Alert>
        <div className="mb-3 text-muted small">
          訂單 <span className="font-monospace">#{order.order_number}</span>
          <span className="ms-3">應付金額 <span className="fw-bold">${formatPrice(order.total_price)}</span></span>
        </div>
        {error && (
          <Alert variant="danger" className="py-2" style={{ whiteSpace: 'pre-line' }}>{error}</Alert>
        )}
        <Form.Group className="mb-3">
          <Form.Label>持卡人姓名</Form.Label>
          <Form.Control
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="王小明"
            autoFocus
          />
        </Form.Group>
        <Form.Group className="mb-2">
          <Form.Label>卡片資訊</Form.Label>
          {/* Stripe 官方元件：卡號 / 到期日 / CVC 合一，包一層 form-control 套用 Bootstrap 外框 */}
          <div className="form-control" style={{ paddingTop: '0.6rem', paddingBottom: '0.6rem' }}>
            <CardElement options={CARD_OPTIONS} />
          </div>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => onHide(false)} disabled={processing}>
          取消
        </Button>
        <Button type="submit" variant="success" disabled={!stripe || processing}>
          {processing ? '付款中…' : `付款 $${formatPrice(order.total_price)}`}
        </Button>
      </Modal.Footer>
    </Form>
  )
}

export default function PaymentModal({ show, onHide, order }) {
  if (!order) return null
  return (
    <Modal show={show} onHide={() => onHide(false)} centered backdrop="static" keyboard={false}>
      {/* Elements 提供 Stripe context，CardElement 與 useStripe 都要包在裡面 */}
      <Elements stripe={stripePromise}>
        <PaymentForm order={order} onHide={onHide} />
      </Elements>
    </Modal>
  )
}
