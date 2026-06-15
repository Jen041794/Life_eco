import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Form, Button, Card, Alert, Spinner } from 'react-bootstrap'
import { apiSlice, useLoginMutation } from '../features/api/apiSlice'
import { setCredentials, setUser } from '../features/auth/authSlice'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [login, { isLoading }] = useLoginMutation()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  // CustomerRoute 擋下來時會帶 from（原本想去的頁），登入後送回去
  const from = location.state?.from

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      // 1) 帳密換 JWT
      const tokens = await login({ username, password }).unwrap()
      dispatch(setCredentials(tokens))

      // 2) 抓自己的資料，判斷是管理員還是一般顧客
      const me = await dispatch(
        apiSlice.endpoints.getMe.initiate(undefined, { forceRefetch: true })
      ).unwrap()
      dispatch(setUser(me))

      // 管理員 → 後台；顧客 → 原本想去的頁，沒有就回首頁
      if (me.is_staff) navigate('/admin')
      else navigate(from || '/')
    } catch (err) {
      if (err?.status === 401) setError('帳號或密碼錯誤。')
      else setError('登入失敗，請稍後再試。')
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-light">
      <Card style={{ width: 360 }} className="shadow-sm">
        <Card.Body>
          <Card.Title className="mb-4 text-center">Life_eco 登入</Card.Title>
          {error && <Alert variant="danger" className="py-2">{error}</Alert>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>帳號</Form.Label>
              <Form.Control
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                required
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>密碼</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>
            <Button type="submit" className="w-100" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" animation="border" /> : '登入'}
            </Button>
          </Form>
          <div className="text-center mt-3 small text-muted">
            還沒有帳號？<Link to="/register">註冊</Link>
          </div>
        </Card.Body>
      </Card>
    </div>
  )
}
