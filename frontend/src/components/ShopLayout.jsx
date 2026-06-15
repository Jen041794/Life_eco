import { useDispatch, useSelector } from 'react-redux'
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom'
import { Nav, Navbar, Container, Button, Badge } from 'react-bootstrap'
import { logout, selectAccess } from '../features/auth/authSlice'
import { selectCartCount } from '../features/cart/cartSlice'

export default function ShopLayout() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const access = useSelector(selectAccess('customer'))
  const cartCount = useSelector(selectCartCount)

  const handleLogout = () => {
    dispatch(logout('customer')) // 只登出顧客這一邊，後台不受影響
    navigate('/')
  }

  const iconLinkClass = ({ isActive }) =>
    'fs-5 px-2' + (isActive ? ' active' : '')

  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar bg="light" expand="lg" className="px-3 border-bottom">
        {/* 左側：逛商品 */}
        <Navbar.Brand as={Link} to="/">🛒 Life_eco</Navbar.Brand>
        <Nav className="me-auto">
          <Nav.Link
            as={NavLink}
            to="/"
            end
            className={({ isActive }) => (isActive ? 'active fw-bold' : '')}
          >
            逛商品
          </Nav.Link>
        </Nav>

        {/* 右側：我的帳戶 / 購物車 / 登入登出 */}
        <Nav className="align-items-center">
          <Nav.Link as={NavLink} to="/account" title="我的帳戶" className={iconLinkClass}>
            👤
          </Nav.Link>
          <Nav.Link as={NavLink} to="/cart" title="購物車" className={iconLinkClass}>
            <span className="position-relative">
              🛒
              {cartCount > 0 && (
                <Badge
                  bg="primary"
                  pill
                  className="position-absolute top-0 start-100 translate-middle"
                  style={{ fontSize: '0.6rem' }}
                >
                  {cartCount}
                </Badge>
              )}
            </span>
          </Nav.Link>
          {access ? (
            <Button size="sm" variant="outline-secondary" className="ms-2" onClick={handleLogout}>
              登出
            </Button>
          ) : (
            <Button as={Link} to="/login" size="sm" variant="outline-primary" className="ms-2">
              登入
            </Button>
          )}
        </Nav>
      </Navbar>

      <Container className="py-4 flex-grow-1">
        <Outlet />
      </Container>
    </div>
  )
}
