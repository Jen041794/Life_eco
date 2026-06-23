import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { NavLink, Link, Outlet, useNavigate } from "react-router-dom";
import {
  Nav,
  Navbar,
  Container,
  Button,
  Badge,
  Offcanvas,
  Form,
} from "react-bootstrap";
import { logout, selectAccess } from "../features/auth/authSlice";
import { selectCartCount } from "../features/cart/cartSlice";

export default function ShopLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const access = useSelector(selectAccess("customer"));
  const cartCount = useSelector(selectCartCount);

  // 控制漢堡抽屜開合，方便「點項目後自動關閉」
  const [expanded, setExpanded] = useState(false);
  const closeMenu = () => setExpanded(false);

  // 搜尋：送出後導到 /shop?q=...（接後端已寫好的關鍵字搜尋）
  const [searchTerm, setSearchTerm] = useState("");
  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchTerm.trim();
    closeMenu();
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  };

  const handleLogout = () => {
    closeMenu();
    dispatch(logout("customer")); // 只登出顧客這一邊，後台不受影響
    navigate("/");
  };

  // NavLink 選中時加粗
  const navLinkClass = ({ isActive }) => (isActive ? "active fw-bold" : "");

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* expand="lg"：< 992px（手機 / 平板）收成漢堡，點開為 Offcanvas 抽屜覆蓋頁面；桌機為一般橫向列 */}
      <Navbar
        bg="light"
        expand="lg"
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        className="px-3 border-bottom"
      >
        <Navbar.Brand as={Link} to="/" onClick={closeMenu}>
          Life_eco
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="shop-navbar" />
        <Navbar.Offcanvas
          id="shop-navbar"
          aria-labelledby="shop-navbar-label"
          placement="end"
        >
          <Offcanvas.Header closeButton>
            <Offcanvas.Title id="shop-navbar-label">選單</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body>
            {/* 搜尋框（放在最左、逛商品左邊） */}
            <Form
              className="d-flex my-2 my-lg-0 me-lg-3"
              onSubmit={handleSearch}
              role="search"
            >
              <Form.Control
                type="search"
                size="sm"
                placeholder="搜尋商品"
                aria-label="搜尋商品"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="me-2"
                style={{ minWidth: 160 }}
              />
              <Button
                type="submit"
                size="sm"
                variant="outline-primary"
                className="flex-shrink-0 text-nowrap"
              >
                搜尋
              </Button>
            </Form>

            {/* 逛商品 / 關於我們：me-auto 把右側選單推到最右 */}
            <Nav className="align-items-lg-center me-auto">
              <Nav.Link
                as={NavLink}
                to="/shop"
                onClick={closeMenu}
                className="shop-nav-link"
              >
                逛商品
              </Nav.Link>
              <Nav.Link
                as={NavLink}
                to="/about"
                onClick={closeMenu}
                className="shop-nav-link"
              >
                關於我們
              </Nav.Link>
            </Nav>

            {/* 右側：我的帳戶 / 購物車 / 登入登出
                桌機（lg+）顯示 icon、手機/平板顯示文字 */}
            <Nav className="align-items-lg-center">
              <Nav.Link
                as={NavLink}
                to="/account"
                onClick={closeMenu}
                className={navLinkClass}
                title="我的帳戶"
              >
                <span className="d-none d-lg-inline fs-5">👤</span>
                <span className="d-lg-none">我的帳戶</span>
              </Nav.Link>
              <Nav.Link
                as={NavLink}
                to="/cart"
                onClick={closeMenu}
                className={navLinkClass}
                title="購物車"
              >
                {/* 桌機：icon + 角標數字 */}
                <span className="d-none d-lg-inline fs-5 position-relative">
                  🛒
                  {cartCount > 0 && (
                    <Badge
                      bg="primary"
                      pill
                      className="position-absolute top-0 start-100 translate-middle"
                      style={{ fontSize: "0.6rem" }}
                    >
                      {cartCount}
                    </Badge>
                  )}
                </span>
                {/* 手機 / 平板：文字 + 數字 */}
                <span className="d-lg-none">
                  購物車
                  {cartCount > 0 && (
                    <Badge bg="primary" pill className="ms-1">
                      {cartCount}
                    </Badge>
                  )}
                </span>
              </Nav.Link>
              {access ? (
                <Button
                  size="sm"
                  variant="outline-secondary"
                  className="ms-lg-2 mt-2 mt-lg-0 align-self-start align-self-lg-center"
                  onClick={handleLogout}
                >
                  登出
                </Button>
              ) : (
                <Button
                  as={Link}
                  to="/login"
                  size="sm"
                  variant="outline-primary"
                  className="ms-lg-2 mt-2 mt-lg-0 align-self-start align-self-lg-center"
                  onClick={closeMenu}
                >
                  登入
                </Button>
              )}
            </Nav>
          </Offcanvas.Body>
        </Navbar.Offcanvas>
      </Navbar>

      <Container className="py-4 flex-grow-1">
        <Outlet />
      </Container>

      {/* 頁尾 */}
      <footer className="bg-light border-top py-4">
        <Container className="text-center text-muted small">
          <div className="fw-semibold mb-1">Life_eco 生活選物</div>
          <div>
            © {new Date().getFullYear()} Life_eco · 本站為作品集 Demo，商品與交易皆為測試用途
          </div>
        </Container>
      </footer>
    </div>
  );
}
