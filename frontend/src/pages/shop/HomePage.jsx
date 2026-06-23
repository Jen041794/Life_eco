import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Row, Col, Button, Card, Spinner } from "react-bootstrap";
import {
  useGetProductsQuery,
  useGetCategoriesQuery,
} from "../../features/api/apiSlice";
import ProductCard from "../../components/ProductCard";
import heroBg from "../../assets/hero-bg.jpg";

// 依分類名稱關鍵字配一張代表圖（放在 public/categories/）。
// 找不到對應、或圖檔還沒放，畫面會自動退回 emoji（見 CategoryThumb）。
const CATEGORY_IMAGES = [
  { match: ["3c", "電", "耳機"], img: "/categories/3c.png" },
  { match: ["服", "飾", "衣"], img: "/categories/fashion.png" },
  { match: ["玩"], img: "/categories/toys.png" },
  { match: ["食"], img: "/categories/food.png" },
  { match: ["包"], img: "/categories/bags.png" },
];
const categoryImage = (name = "") => {
  const lower = name.toLowerCase();
  return (
    CATEGORY_IMAGES.find((c) => c.match.some((k) => lower.includes(k)))?.img ??
    null
  );
};

// 分類縮圖：有圖就顯示圖，沒對應或圖檔載入失敗就退回 emoji。
function CategoryThumb({ src, name }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <Card.Img
        variant="top"
        src={src}
        alt={name}
        style={{ height: 110, objectFit: "cover" }}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div
      className="bg-light d-flex align-items-center justify-content-center"
      style={{ height: 110, fontSize: "2rem" }}
    >
      🛍️
    </div>
  );
}

// 首頁落地頁：行銷 Hero + 分類入口 + 精選商品。
// 「逛全部商品」在 /shop，本頁負責第一眼的質感與導流。
export default function HomePage() {
  const navigate = useNavigate();
  const { data: categories } = useGetCategoriesQuery();
  const { data, isLoading } = useGetProductsQuery({ storefront: true });

  // 取前 5 個上架品當「精選商品」，以橫向輪播呈現
  const featured = (data?.results ?? []).slice(0, 5);

  // 輪播：用 ref 直接捲動容器，按鈕一次捲剛好一張卡（含 1rem gap）
  const trackRef = useRef(null);
  const scrollByCard = (dir) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector(".featured-card");
    const step = card ? card.offsetWidth + 16 : 260; // 16 = gap 1rem
    track.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  // 到頭 / 到尾時把對應箭頭設為不可點
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const updateArrows = () => {
    const track = trackRef.current;
    if (!track) return;
    setAtStart(track.scrollLeft <= 2);
    // 容許小數 / snap 誤差
    setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - 2);
  };
  // 商品載入完 / 視窗縮放時重新判斷（首次進來預設停在第一張）
  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [featured.length]);

  return (
    <div>
      {/* Hero Banner：情境照背景 + 珊瑚橘漸層遮罩（左濃右淡，保白字清楚） */}
      <div
        className="rounded-4 text-white p-5 mb-5"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(242,100,48,0.92) 0%, rgba(242,100,48,0.6) 55%, rgba(255,140,90,0.4) 100%), url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <Row className="align-items-center">
          <Col md={8}>
            <h1 className="fw-bold mb-3">Life_eco 生活選物</h1>
            <p className="fs-5 mb-4 opacity-75">
              嚴選好物，簡單生活。從這裡開始逛逛吧。
            </p>
            <Button
              as={Link}
              to="/shop"
              variant="light"
              size="lg"
              className="fw-bold text-primary"
            >
              開始購物 →
            </Button>
          </Col>
        </Row>
      </div>

      {/* 分類入口 */}
      {categories?.length > 0 && (
        <section className="mb-5">
          <h4 className="mb-3">商品分類</h4>
          <Row xs={2} sm={3} md={4} lg={6} className="g-3">
            {categories.map((c) => {
              const img = categoryImage(c.name);
              return (
                <Col key={c.id}>
                  <Card
                    className="h-100 text-center shadow-sm border-0 overflow-hidden"
                    role="button"
                    style={{ cursor: "pointer" }}
                    onClick={() => navigate(`/shop?category=${c.id}`)}
                  >
                    <CategoryThumb src={img} name={c.name} />
                    <Card.Body className="py-3">
                      <div className="fw-semibold">{c.name}</div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </section>
      )}

      {/* 精選商品 */}
      <section>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h4 className="mb-0">精選商品</h4>
          <Button as={Link} to="/shop" variant="link" className="text-decoration-none">
            看全部 →
          </Button>
        </div>

        {isLoading && <Spinner animation="border" />}
        {!isLoading && featured.length === 0 && (
          <p className="text-muted">目前還沒有上架商品。</p>
        )}

        {featured.length > 0 && (
          <div className="position-relative">
            {/* 左箭頭 */}
            <Button
              variant="light"
              className="carousel-arrow start-0"
              aria-label="上一個"
              onClick={() => scrollByCard(-1)}
              disabled={atStart}
            >
              ‹
            </Button>

            {/* 橫向輪播軌道：可觸控滑動 / 滑鼠拖曳捲軸，scroll-snap 對齊每張卡 */}
            <div
              ref={trackRef}
              className="d-flex overflow-auto hide-scrollbar py-1"
              style={{ scrollSnapType: "x mandatory", gap: "1rem" }}
              onScroll={updateArrows}
            >
              {featured.map((p) => (
                <div key={p.id} className="featured-card">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>

            {/* 右箭頭 */}
            <Button
              variant="light"
              className="carousel-arrow end-0"
              aria-label="下一個"
              onClick={() => scrollByCard(1)}
              disabled={atEnd}
            >
              ›
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
