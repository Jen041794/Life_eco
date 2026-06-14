import { useDispatch, useSelector } from 'react-redux'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Nav, Navbar, Container, Button } from 'react-bootstrap'
import { logout, selectCurrentUser } from '../features/auth/authSlice'

const menu = [
  { to: '/', label: '儀表板', end: true },
  { to: '/products', label: '商品管理' },
  { to: '/categories', label: '分類管理' },
  { to: '/orders', label: '訂單管理' },
  { to: '/users', label: '會員管理' },
]

export default function AdminLayout() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector(selectCurrentUser)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar bg="dark" variant="dark" expand="lg" className="px-3">
        <Navbar.Brand>Life_eco 後台</Navbar.Brand>
        <Nav className="me-auto">
          {menu.map((m) => (
            <Nav.Link
              key={m.to}
              as={NavLink}
              to={m.to}
              end={m.end}
              className={({ isActive }) => (isActive ? 'active fw-bold' : '')}
            >
              {m.label}
            </Nav.Link>
          ))}
        </Nav>
        <span className="text-light me-3 small">
          {user ? `${user.username}（管理員）` : ''}
        </span>
        <Button size="sm" variant="outline-light" onClick={handleLogout}>
          登出
        </Button>
      </Navbar>

      <Container fluid className="py-4 flex-grow-1">
        <Outlet />
      </Container>
    </div>
  )
}
