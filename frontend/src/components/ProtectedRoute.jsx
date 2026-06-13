import { useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'
import { selectAccess, selectCurrentUser } from '../features/auth/authSlice'

// 後台路由守衛：必須登入，且必須是管理員（is_staff）
export default function ProtectedRoute() {
  const access = useSelector(selectAccess)
  const user = useSelector(selectCurrentUser)

  if (!access) {
    return <Navigate to="/login" replace />
  }
  // 已登入但不是管理員：擋在外面
  if (user && !user.is_staff) {
    return (
      <div className="container py-5 text-center">
        <h4 className="text-danger">沒有權限</h4>
        <p className="text-muted">這個後台只開放給管理員帳號。</p>
      </div>
    )
  }
  return <Outlet />
}
