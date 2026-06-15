import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Form, Button, Card, Alert, Spinner } from 'react-bootstrap'
import { useRegisterMutation } from '../features/api/apiSlice'

export default function RegisterPage() {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [register, { isLoading }] = useRegisterMutation()
  const navigate = useNavigate()

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await register(form).unwrap()
      setDone(true)
      // 註冊成功後導到登入頁
      setTimeout(() => navigate('/login'), 1200)
    } catch (err) {
      // 後端用欄位錯誤回 400，例如 username 已被使用
      const data = err?.data
      if (data && typeof data === 'object') {
        setError(Object.values(data).flat().join('\n'))
      } else {
        setError('註冊失敗，請稍後再試。')
      }
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
      <Card style={{ width: 360 }} className="shadow-sm">
        <Card.Body>
          <Card.Title className="mb-4 text-center">註冊 Life_eco 帳號</Card.Title>
          {error && <Alert variant="danger" className="py-2" style={{ whiteSpace: 'pre-line' }}>{error}</Alert>}
          {done && <Alert variant="success" className="py-2">註冊成功！正在帶你去登入…</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>帳號</Form.Label>
              <Form.Control name="username" value={form.username} onChange={onChange} autoFocus required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control type="email" name="email" value={form.email} onChange={onChange} required />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>密碼</Form.Label>
              <Form.Control
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                minLength={8}
                required
              />
              <Form.Text className="text-muted">至少 8 個字</Form.Text>
            </Form.Group>
            <Button type="submit" className="w-100" disabled={isLoading || done}>
              {isLoading ? <Spinner size="sm" animation="border" /> : '註冊'}
            </Button>
          </Form>
          <div className="text-center mt-3 small text-muted">
            已經有帳號了？<Link to="/login">登入</Link>
          </div>
        </Card.Body>
      </Card>
    </div>
  )
}
