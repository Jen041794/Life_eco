import { useState, useEffect } from 'react'
import { Modal, Form, Button, Alert } from 'react-bootstrap'
import { useUpdateUserMutation } from '../features/api/apiSlice'
import { formatApiError } from '../utils/formatError'

export default function UserEditModal({ show, onHide, user, isSelf }) {
  const [email, setEmail] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState('')
  const [updateUser, { isLoading }] = useUpdateUserMutation()

  useEffect(() => {
    if (show && user) {
      setEmail(user.email || '')
      setIsActive(user.is_active)
      setError('')
    }
  }, [show, user])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      await updateUser({ id: user.id, email, is_active: isActive }).unwrap()
      onHide()
    } catch (err) {
      setError(formatApiError(err))
    }
  }

  if (!user) return null

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title>編輯會員：{user.username}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger" className="py-2" style={{ whiteSpace: 'pre-line' }}>{error}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="（可留空）"
            />
          </Form.Group>
          <Form.Group className="mb-2">
            <Form.Check
              type="switch"
              id="user-active-switch"
              label={isActive ? '帳號啟用中' : '帳號已停用'}
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isSelf}
            />
            {isSelf && <Form.Text className="text-muted">不能停用自己的帳號。</Form.Text>}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>取消</Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? '儲存中…' : '儲存'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
