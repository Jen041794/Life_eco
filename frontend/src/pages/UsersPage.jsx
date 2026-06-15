import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Row, Col, ListGroup, Table, Button, Spinner, Alert, Badge } from 'react-bootstrap'
import { useGetUsersQuery } from '../features/api/apiSlice'
import { selectCurrentUser } from '../features/auth/authSlice'
import UserEditModal from '../components/UserEditModal'
import UserCreateModal from '../components/UserCreateModal'

const TABS = [
  { key: 'customer', label: '一般會員管理', role: 'customer' },
  { key: 'admin', label: '管理員管理', role: 'admin' },
]

export default function UsersPage() {
  const [tab, setTab] = useState('customer')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [creating, setCreating] = useState(false)
  const me = useSelector(selectCurrentUser('admin'))

  const role = TABS.find((t) => t.key === tab).role
  const { data, isLoading, isError, isFetching } = useGetUsersQuery({ page, role })

  const switchTab = (key) => {
    setTab(key)
    setPage(1)
  }

  return (
    <>
      <h4 className="mb-3">會員管理</h4>
      <Row className="g-4">
        {/* 左側子選單 */}
        <Col md={3}>
          <ListGroup>
            {TABS.map((t) => (
              <ListGroup.Item
                key={t.key}
                action
                active={tab === t.key}
                onClick={() => switchTab(t.key)}
              >
                {t.label}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>

        {/* 右側內容 */}
        <Col md={9}>
          {/* 新增會員只在「一般會員管理」出現（後端只建一般會員） */}
          {tab === 'customer' && (
            <div className="d-flex justify-content-end mb-3">
              <Button onClick={() => setCreating(true)}>+ 新增會員</Button>
            </div>
          )}

          {isLoading ? (
            <Spinner animation="border" />
          ) : isError ? (
            <Alert variant="danger">載入會員失敗。</Alert>
          ) : (
            <>
              <Table hover responsive className="align-middle bg-white shadow-sm">
                <thead className="table-light">
                  <tr>
                    <th>#</th><th>帳號</th><th>Email</th>
                    <th>狀態</th><th>註冊時間</th><th style={{ width: 100 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.length === 0 ? (
                    <tr><td colSpan={6} className="text-center text-muted py-4">沒有資料</td></tr>
                  ) : (
                    data.results.map((u) => {
                      const isSelf = me && u.id === me.id
                      return (
                        <tr key={u.id}>
                          <td>{u.id}</td>
                          <td>{u.username}{isSelf && <span className="text-muted small">（你）</span>}</td>
                          <td>{u.email || <span className="text-muted">—</span>}</td>
                          <td>
                            {u.is_active
                              ? <Badge bg="success">啟用中</Badge>
                              : <Badge bg="danger">已停用</Badge>}
                          </td>
                          <td className="small text-muted">{new Date(u.date_joined).toLocaleDateString()}</td>
                          <td>
                            <Button size="sm" variant="outline-primary" onClick={() => setEditing(u)}>
                              編輯
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </Table>

              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">共 {data.count} 位{isFetching ? '（更新中…）' : ''}</small>
                <div>
                  <Button size="sm" variant="outline-secondary" className="me-2"
                    disabled={!data.previous} onClick={() => setPage((p) => p - 1)}>上一頁</Button>
                  <Button size="sm" variant="outline-secondary"
                    disabled={!data.next} onClick={() => setPage((p) => p + 1)}>下一頁</Button>
                </div>
              </div>
            </>
          )}
        </Col>
      </Row>

      <UserEditModal
        show={Boolean(editing)}
        onHide={() => setEditing(null)}
        user={editing}
        isSelf={Boolean(editing && me && editing.id === me.id)}
      />
      <UserCreateModal show={creating} onHide={() => setCreating(false)} />
    </>
  )
}
