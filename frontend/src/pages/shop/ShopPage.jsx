import { Row, Col, Button, Spinner, Alert } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import {
  useGetProductsQuery,
  useGetCategoriesQuery,
} from "../../features/api/apiSlice";
import ProductCard from "../../components/ProductCard";

// 顧客端商品列表：分類 chip 篩選 + 關鍵字搜尋（皆由網址 query 驅動，
// 這樣搜尋結果可分享、重整也會保留）。後端對非管理員自動只回上架商品。
export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? ""; // '' = 全部

  const { data: categories } = useGetCategoriesQuery();
  const { data, isLoading, isError } = useGetProductsQuery({
    search: q,
    category,
    storefront: true,
  });

  const products = data?.results ?? [];

  // 改分類時保留搜尋字，清掉空值讓網址乾淨
  const selectCategory = (id) => {
    const next = {};
    if (q) next.q = q;
    if (id) next.category = id;
    setSearchParams(next);
  };

  // 清除搜尋：只留分類、拿掉 q
  const clearSearch = () => setSearchParams(category ? { category } : {});

  return (
    <div>
      <h3 className="mb-3">逛商品</h3>

      {/* 搜尋狀態提示 */}
      {q && (
        <p className="text-muted">
          「<span className="fw-bold">{q}</span>」的搜尋結果
          <Button
            variant="link"
            size="sm"
            className="p-0 ms-2 align-baseline"
            onClick={clearSearch}
          >
            清除搜尋
          </Button>
        </p>
      )}

      {/* 分類篩選 */}
      <div className="mb-4 d-flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={category === "" ? "primary" : "outline-primary"}
          className={category === "" ? "text-white" : ""}
          onClick={() => selectCategory("")}
        >
          全部
        </Button>
        {categories?.map((c) => {
          const isActive = String(category) === String(c.id);
          return (
            <Button
              key={c.id}
              size="sm"
              variant={isActive ? "primary" : "outline-primary"}
              className={isActive ? "text-white" : ""}
              onClick={() => selectCategory(c.id)}
            >
              {c.name}
            </Button>
          );
        })}
      </div>

      {isLoading && <Spinner animation="border" />}
      {isError && (
        <Alert variant="danger">商品載入失敗，請確認後端有啟動。</Alert>
      )}
      {!isLoading && !isError && products.length === 0 && (
        <p className="text-muted">
          {q ? "找不到符合的商品，換個關鍵字試試。" : "這個分類目前沒有商品。"}
        </p>
      )}

      <Row xs={1} sm={2} md={3} lg={4} className="g-3">
        {products.map((p) => (
          <Col key={p.id}>
            <ProductCard product={p} />
          </Col>
        ))}
      </Row>
    </div>
  );
}
