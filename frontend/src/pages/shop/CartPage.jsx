import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Table, Button, Image, InputGroup, Form, Alert, Card } from "react-bootstrap";
import {
  selectCartItems,
  selectCartTotal,
  setQuantity,
  removeItem,
  clearCart,
} from "../../features/cart/cartSlice";
import { formatPrice } from "../../utils/formatPrice";
import { useToast } from "../../components/ToastProvider";

// 商品縮圖：尺寸寫進 inline style，才不會被 .img-thumbnail 的 height:auto 壓掉（手機板會中招）
function CartImage({ item, size }) {
  if (item.image) {
    return (
      <Image
        src={item.image}
        thumbnail
        className="flex-shrink-0"
        style={{ width: size, height: size, objectFit: "cover" }}
      />
    );
  }
  return (
    <div
      className="bg-light d-flex align-items-center justify-content-center text-muted small rounded border flex-shrink-0"
      style={{ width: size, height: size }}
    >
      無圖
    </div>
  );
}

// 數量加減器（桌機表格 / 手機卡片共用）
function QtyStepper({ item, dispatch }) {
  return (
    <div>
      <InputGroup size="sm" style={{ maxWidth: 130 }}>
        {/* 數量 1 時停用「−」，灰掉且不可點 */}
        <Button
          variant="outline-secondary"
          disabled={item.quantity <= 1}
          onClick={() =>
            dispatch(setQuantity({ id: item.id, quantity: item.quantity - 1 }))
          }
        >
          −
        </Button>
        <Form.Control
          className="text-center"
          value={item.quantity}
          onChange={(e) =>
            dispatch(
              setQuantity({
                id: item.id,
                quantity: Number(e.target.value) || 1,
              }),
            )
          }
        />
        <Button
          variant="outline-secondary"
          disabled={item.quantity >= item.stock}
          onClick={() =>
            dispatch(setQuantity({ id: item.id, quantity: item.quantity + 1 }))
          }
        >
          +
        </Button>
      </InputGroup>
      {item.quantity >= item.stock && (
        <div className="text-muted small mt-1">已達庫存上限（{item.stock}）</div>
      )}
    </div>
  );
}

export default function CartPage() {
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const items = useSelector(selectCartItems);
  const total = useSelector(selectCartTotal);

  // 移除商品後，跳「商品名 刪除成功」通知
  const handleRemove = (item) => {
    dispatch(removeItem(item.id));
    showToast(`${item.name} 刪除成功`);
  };

  if (items.length === 0) {
    return (
      <div>
        <h3 className="mb-3">購物車</h3>
        <Alert variant="secondary">
          購物車是空的。<Link to="/shop">去逛逛商品 →</Link>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-3">購物車</h3>

      {/* 桌機（lg+）：表格 */}
      <div className="d-none d-lg-block">
        <Table responsive className="align-middle bg-white shadow-sm">
          <thead className="table-light">
            <tr>
              <th style={{ width: 64 }}></th>
              <th>商品</th>
              <th className="text-end">單價</th>
              <th style={{ width: 150 }} className="text-center">
                數量
              </th>
              <th className="text-end">小計</th>
              <th style={{ width: 60 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <CartImage item={item} size={48} />
                </td>
                <td>{item.name}</td>
                <td className="text-end">${formatPrice(item.price)}</td>
                <td>
                  <div className="d-flex justify-content-center">
                    <QtyStepper item={item} dispatch={dispatch} />
                  </div>
                </td>
                <td className="text-end fw-bold">
                  ${formatPrice(Number(item.price) * item.quantity)}
                </td>
                <td>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => handleRemove(item)}
                  >
                    移除
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* 手機 / 平板（< lg）：卡片，圖片明顯不被擠壓 */}
      <div className="d-lg-none">
        {items.map((item) => (
          <Card key={item.id} className="mb-2 shadow-sm">
            <Card.Body className="d-flex gap-3">
              <CartImage item={item} size={64} />
              <div className="flex-grow-1">
                <div className="d-flex justify-content-between align-items-start">
                  <span className="fw-semibold">{item.name}</span>
                  <Button
                    size="sm"
                    variant="link"
                    className="text-danger p-0 text-decoration-none"
                    onClick={() => handleRemove(item)}
                  >
                    移除
                  </Button>
                </div>
                <div className="text-muted small mb-2">
                  單價 ${formatPrice(item.price)}
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <QtyStepper item={item} dispatch={dispatch} />
                  <span className="fw-bold">
                    ${formatPrice(Number(item.price) * item.quantity)}
                  </span>
                </div>
              </div>
            </Card.Body>
          </Card>
        ))}
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={() => dispatch(clearCart())}
        >
          清空購物車
        </Button>
        <div className="text-end">
          <div className="fs-5 mb-2">
            總計：
            <span className="fw-bold text-primary">${formatPrice(total)}</span>
          </div>
          <Button className="text-white" as={Link} to="/checkout">
            前往結帳
          </Button>
        </div>
      </div>
    </div>
  );
}
