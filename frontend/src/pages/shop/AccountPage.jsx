import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { Card, Form, Button, Alert, Spinner } from 'react-bootstrap'
import {
  useGetProfileQuery,
  useUpdateProfileMutation,
} from '../../features/api/apiSlice'
import { selectCurrentUser } from '../../features/auth/authSlice'

// step 3：我的帳戶 —— 讀寫自己的電話、地址（/api/user/profile/）
export default function AccountPage() {
  const user = useSelector(selectCurrentUser)
  const { data: profile, isLoading, isError } = useGetProfileQuery()
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation()

  const [form, setForm] = useState({ phone: '', address: '' })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // profile 載入後，把值灌進表單
  useEffect(() => {
    if (profile) {
      setForm({ phone: profile.phone ?? '', address: profile.address ?? '' })
    }
  }, [profile])

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setSaved(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaved(false)
    try {
      await updateProfile(form).unwrap()
      setSaved(true)
    } catch (err) {
      const data = err?.data
      if (data && typeof data === 'object') {
        setError(Object.values(data).flat().join('\n'))
      } else {
        setError('儲存失敗，請稍後再試。')
      }
    }
  }

  if (isLoading) {
    return (
      <div>
        <h3 className="mb-3">我的帳戶</h3>
        <Spinner animation="border" />
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <h3 className="mb-3">我的帳戶</h3>
        <Alert variant="danger">個人資料載入失敗，請稍後再試。</Alert>
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-3">我的帳戶</h3>
      <Card className="shadow-sm" style={{ maxWidth: 520 }}>
        <Card.Body>
          {/* 帳號 / Email 唯讀（改帳號不在這頁範圍） */}
          {user && (
            <div className="mb-4 text-muted small">
              <div>帳號：{user.username}</div>
              {user.email && <div>Email：{user.email}</div>}
            </div>
          )}

          {saved && <Alert variant="success" className="py-2">已儲存 ✅</Alert>}
          {error && (
            <Alert variant="danger" className="py-2" style={{ whiteSpace: 'pre-line' }}>
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>電話</Form.Label>
              <Form.Control
                name="phone"
                value={form.phone}
                onChange={onChange}
                maxLength={20}
                placeholder="例如 0912345678"
              />
            </Form.Group>
            <Form.Group className="mb-4">
              <Form.Label>地址</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="address"
                value={form.address}
                onChange={onChange}
                placeholder="收件地址"
              />
            </Form.Group>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Spinner size="sm" animation="border" /> : '儲存'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </div>
  )
}
