import { useSelector } from 'react-redux'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { selectAccess } from '../features/auth/authSlice'

// 顧客路由守衛：只要求「有登入」即可（管理員或一般會員都行），
// 不像後台那樣硬性要 is_staff。未登入則導去 /login，並記住原本想去的頁。
export default function CustomerRoute() {
  const access = useSelector(selectAccess)
  const location = useLocation()

  if (!access) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
