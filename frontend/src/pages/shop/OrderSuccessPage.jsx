import { Link, Navigate, useLocation } from "react-router-dom";
import { Card, Button, ListGroup } from "react-bootstrap";
import { formatPrice } from "../../utils/formatPrice";

// 訂單完成 / 感謝頁：結帳成功後由 CheckoutPage 用 navigate state 帶資料過來。
// 直接打網址進來（沒有 state）就導回首頁，避免顯示空白訂單。
export default function OrderSuccessPage() {
  const { state } = useLocation();

  if (!state?.order) return <Navigate to="/" replace />;

  const { order_number, total_price, items = [] } = state.order;

  return (
    <div className="mx-auto" style={{ maxWidth: 640 }}>
      <Card className="shadow-sm text-center">
        <Card.Body className="p-4 p-md-5">
          <div className="display-4 mb-3">🎉</div>
          <h3 className="mb-2">訂單成立！</h3>
          <p className="text-muted mb-4">
            謝謝你的訂購，我們已收到你的訂單。
          </p>

          {order_number && (
            <div className="bg-light rounded-3 py-3 mb-4">
              <div className="small text-muted">訂單編號</div>
              <div className="fs-5 fw-bold">{order_number}</div>
            </div>
          )}

          {items.length > 0 && (
            <ListGroup variant="flush" className="text-start mb-3">
              {items.map((i, idx) => (
                <ListGroup.Item
                  key={i.id ?? idx}
                  className="d-flex justify-content-between px-0"
                >
                  <span>
                    {i.name}{" "}
                    <span className="text-muted small">× {i.quantity}</span>
                  </span>
                  <span>${formatPrice(Number(i.price) * i.quantity)}</span>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}

          {total_price != null && (
            <div className="d-flex justify-content-between fs-5 border-top pt-3 mb-4">
              <span>總計</span>
              <span className="fw-bold text-primary">
                ${formatPrice(total_price)}
              </span>
            </div>
          )}

          <p className="text-muted small mb-4">
            訂單目前為「待付款」，可到「我的訂單」完成付款。
          </p>

          <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
            <Button
              as={Link}
              to="/account?tab=orders"
              className="text-white px-4"
            >
              前往付款
            </Button>
            <Button as={Link} to="/shop" variant="outline-secondary" className="px-4">
              繼續逛商品
            </Button>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}
