import { useState, useEffect } from 'react'
import { Modal, Form, Button, Alert } from 'react-bootstrap'
import { useAdminCreateUserMutation } from '../features/api/apiSlice'
import { formatApiError } from '../utils/formatError'

// 後台新增一般會員（後端固定建 is_staff=False）
export default function UserCreateModal({ show, onHide }) {
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [createUser, { isLoading }] = useAdminCreateUserMutation()

  useEffect(() => {
    if (show) {
      setForm({ username: '', email: '', password: '' })
      setError('')
    }
  }, [show])

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await createUser(form).unwrap()
      onHide()
    } catch (err) {
      setError(formatApiError(err))
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title>新增一般會員</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="py-2" style={{ whiteSpace: 'pre-line' }}>{error}</Alert>
          )}
          <Form.Group className="mb-3">
            <Form.Label>帳號 *</Form.Label>
            <Form.Control name="username" value={form.username} onChange={onChange} autoFocus required />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Email *</Form.Label>
            <Form.Control type="email" name="email" value={form.email} onChange={onChange} required />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Label>密碼 *</Form.Label>
            <Form.Control
              type="password" name="password" value={form.password}
              onChange={onChange} minLength={8} required
            />
            <Form.Text className="text-muted">至少 8 個字。建立後為「一般會員」。</Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>取消</Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? '建立中…' : '建立'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
