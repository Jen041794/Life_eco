import { useDispatch, useSelector } from 'react-redux'
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import { Nav, Navbar, Container, Button } from 'react-bootstrap'
import { logout, selectAccess, selectCurrentUser } from '../features/auth/authSlice'

const menu = [
  { to: '/', label: '逛商品', end: true },
  { to: '/cart', label: '購物車' },
  { to: '/my-orders', label: '我的訂單' },
  { to: '/account', label: '我的帳戶' },
]

export default function ShopLayout() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const access = useSelector(selectAccess)
  const user = useSelector(selectCurrentUser)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/')
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar bg="light" expand="lg" className="px-3 border-bottom">
        <Navbar.Brand as={Link} to="/">🛒 Life_eco</Navbar.Brand>
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
        {access ? (
          <>
            <span className="text-muted me-3 small">
              {user ? `Hi, ${user.username}` : ''}
              {user?.is_staff && (
                <Link to="/admin" className="ms-2">後台</Link>
              )}
            </span>
            <Button size="sm" variant="outline-secondary" onClick={handleLogout}>
              登出
            </Button>
          </>
        ) : (
          <>
            <Button as={Link} to="/login" size="sm" variant="outline-primary" className="me-2">
              登入
            </Button>
            <Button as={Link} to="/register" size="sm" variant="primary">
              註冊
            </Button>
          </>
        )}
      </Navbar>

      <Container className="py-4 flex-grow-1">
        <Outlet />
      </Container>
    </div>
  )
}
