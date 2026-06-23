import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Card, Badge, Button } from "react-bootstrap";
import { addItem } from "../features/cart/cartSlice";
import { formatPrice } from "../utils/formatPrice";
import { tagColor } from "../utils/productTag";
import { useToast } from "./ToastProvider";

// 共用商品卡片：首頁「精選商品」與「逛商品」列表共用，避免兩邊各維護一份。
export default function ProductCard({ product: p }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showToast } = useToast();

  return (
    <Card className="h-100 shadow-sm">
      <div className="position-relative overflow-hidden rounded-top">
        {p.images?.[0]?.image ? (
          <img
            src={p.images[0].image}
            alt={p.name}
            className="w-100"
            style={{ height: 250, objectFit: "cover" }}
          />
        ) : (
          <div
            className="bg-light d-flex align-items-center justify-content-center text-muted"
            style={{ height: 250 }}
          >
            無圖片
          </div>
        )}
        {/* 行銷標籤：左上角 45 度斜絲帶 */}
        {p.tag && (
          <span
            className="corner-ribbon"
            style={{ backgroundColor: tagColor(p.tag) }}
          >
            {p.tag}
          </span>
        )}
      </div>
      <Card.Body className="d-flex flex-column">
        <Card.Title className="fs-6">{p.name}</Card.Title>
        {p.category_name && (
          <Badge bg="secondary" className="align-self-start mb-2">
            {p.category_name}
          </Badge>
        )}
        <div className="mt-auto">
          <div className="fw-bold text-primary mb-2">${formatPrice(p.price)}</div>
          <div className="d-md-flex gap-2">
            <Button
              type="button"
              className="w-100 mb-2 mb-md-0 text-white"
              onClick={() => navigate(`/products/${p.id}`)}
            >
              商品詳情
            </Button>
            <Button
              variant={p.stock > 0 ? "success" : "secondary"}
              disabled={p.stock <= 0}
              className="w-100"
              onClick={() => {
                dispatch(addItem(p));
                showToast("已加入購物車");
              }}
            >
              {p.stock > 0 ? "加入購物車" : "已售完"}
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
