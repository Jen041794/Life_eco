import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Form, Button, Card, Alert, Spinner } from 'react-bootstrap'
import { apiSlice, useLoginMutation } from '../features/api/apiSlice'
import { setCredentials, setUser, logout } from '../features/auth/authSlice'

// 後台登入入口（/admin/login）：只放行管理員，前台不會連到這裡
export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [login, { isLoading }] = useLoginMutation()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const tokens = await login({ username, password }).unwrap()
      dispatch(setCredentials({ scope: 'admin', ...tokens }))
      // 換了身分 → 清掉上一個帳號殘留的 API 快取，避免看到別人的資料
      dispatch(apiSlice.util.resetApiState())

      const me = await dispatch(
        apiSlice.endpoints.getMe.initiate(undefined, { forceRefetch: true })
      ).unwrap()

      if (!me.is_staff) {
        dispatch(logout('admin'))
        setError('這個帳號不是管理員，無法進入後台。')
        return
      }
      dispatch(setUser({ scope: 'admin', user: me }))
      navigate('/admin')
    } catch (err) {
      if (err?.status === 401) setError('帳號或密碼錯誤。')
      else setError('登入失敗，請稍後再試。')
    }
  }

  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100 bg-dark">
      <Card style={{ width: 360 }} className="shadow">
        <Card.Body>
          <Card.Title className="mb-4 text-center">Life_eco 後台登入</Card.Title>
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
            <Button type="submit" variant="dark" className="w-100" disabled={isLoading}>
              {isLoading ? <Spinner size="sm" animation="border" /> : '登入後台'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  )
}
