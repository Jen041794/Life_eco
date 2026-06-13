import { useState } from 'react'
import { useSelector } from 'react-redux'
import { Table, Button, Spinner, Alert, Badge } from 'react-bootstrap'
import { useGetUsersQuery } from '../features/api/apiSlice'
import { selectCurrentUser } from '../features/auth/authSlice'
import UserEditModal from '../components/UserEditModal'

export default function UsersPage() {
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const me = useSelector(selectCurrentUser)
  const { data, isLoading, isError, isFetching } = useGetUsersQuery({ page })

  if (isLoading) return <Spinner animation="border" />
  if (isError) return <Alert variant="danger">載入會員失敗。</Alert>

  const users = data.results

  return (
    <>
      <h4 className="mb-3">會員管理</h4>

      <Table hover responsive className="align-middle bg-white shadow-sm">
        <thead className="table-light">
          <tr>
            <th>#</th><th>帳號</th><th>Email</th><th>角色</th>
            <th>狀態</th><th>註冊時間</th><th style={{ width: 100 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => {
            const isSelf = me && u.id === me.id
            return (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}{isSelf && <span className="text-muted small">（你）</span>}</td>
                <td>{u.email || <span className="text-muted">—</span>}</td>
                <td>
                  {u.is_staff
                    ? <Badge bg="dark">管理員</Badge>
                    : <Badge bg="light" text="dark">一般會員</Badge>}
                </td>
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
          })}
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

      <UserEditModal
        show={Boolean(editing)}
        onHide={() => setEditing(null)}
        user={editing}
        isSelf={Boolean(editing && me && editing.id === me.id)}
      />
    </>
  )
}
