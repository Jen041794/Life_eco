import { useState } from "react";
import { useDispatch } from "react-redux";
import { useParams, Link } from "react-router-dom";
import { useGetProductQuery } from "../../features/api/apiSlice";
import { Badge } from "react-bootstrap";
import { addItem } from "../../features/cart/cartSlice";
import { formatPrice } from "../../utils/formatPrice";
import { useToast } from "../../components/ToastProvider";

export const ProductDetail = () => {
  const dispatch = useDispatch();
  const { showToast } = useToast();
  const { id } = useParams();
  const { data, isLoading, isError } = useGetProductQuery(id);
  const [qty, setQty] = useState(1); // 使用者選的數量
  const [added, setAdded] = useState(false); // 任務 4：是否剛加入（控制按鈕回饋）
  const [activeImg, setActiveImg] = useState(0); // 任務 6：目前顯示的主圖 index
  if (isLoading) return <p>載入中…</p>;
  if (isError || !data) return <p>找不到這個商品 😢</p>;
  let stockLabel = data.stock;
  if (data.stock <= 0) stockLabel = "已售完";

  const images = data.images ?? []; // 任務 6 / 7：商品圖陣列（可能是空的）

  // 數量 −／＋（夾在 1 ~ 庫存之間）
  const dec = () => setQty((q) => Math.max(1, q - 1));
  const inc = () => setQty((q) => Math.min(data.stock, q + 1));

  // 按下「加入購物車」
  const handleAddToCart = () => {
    dispatch(addItem({ ...data, quantity: qty })); //帶選的數量加入購物車
    setQty(1); // 加入後數量重置為 1
    setAdded(true); // 觸發回饋
    setTimeout(() => setAdded(false), 1500); // 1.5 秒後變回原樣
    showToast("已加入購物車"); // 右下角通知
  };

  return (
    <div>
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <Link to="/" className="text-decoration-none">
              <i className="bi bi-chevron-left me-1"></i>首頁
            </Link>
          </li>
          <li className="breadcrumb-item">
            <Link to="/shop" className="text-decoration-none">
              逛商品
            </Link>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {data.name}
          </li>
        </ol>
      </nav>
      <h3>商品詳細頁</h3>
      <div className="container">
        <div className="row">
          <div className="col-lg-6 col-md-12">
            {images.length > 0 ? (
              <>
                <img
                  src={images[activeImg]?.image}
                  alt={data.name}
                  className="img-fluid rounded"
                  style={{ width: "550px", height: "350px", objectFit: "cover" }}
                />
                {/* 任務 6：多張圖才顯示縮圖列，點縮圖換主圖 */}
                {images.length > 1 && (
                  <div className="d-flex gap-2 mt-2 flex-wrap">
                    {images.map((img, i) => (
                      <img
                        key={img.id}
                        src={img.image}
                        alt={`${data.name} 縮圖 ${i + 1}`}
                        onClick={() => setActiveImg(i)}
                        className={`rounded border ${
                          i === activeImg ? "border-primary border-2" : ""
                        }`}
                        style={{
                          width: "70px",
                          height: "70px",
                          objectFit: "cover",
                          cursor: "pointer",
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              // 任務 7：沒有圖片時的灰底佔位（比照 ShopPage）
              <div
                className="bg-light d-flex align-items-center justify-content-center text-muted rounded"
                style={{ width: "550px", height: "350px", maxWidth: "100%" }}
              >
                無圖片
              </div>
            )}
          </div>
          <div className="col-lg-6 col-md-12">
            <div className="d-flex align-items-center gap-2 mb-3">
              <h4>{data.name}</h4>
              {data.category_name && (
                <Badge bg="secondary" style={{ fontSize: "14px" }}>
                  {data.category_name}
                </Badge>
              )}
            </div>
            <p>庫存: {stockLabel}</p>
            <p>價格: ${formatPrice(data.price)}</p>
            <div className="d-flex align-items-center gap-2 mb-3">
              <span>數量：</span>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={dec}
                disabled={qty <= 1}
              >
                −
              </button>
              <span>{qty}</span>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={inc}
                disabled={qty >= data.stock}
              >
                ＋
              </button>
            </div>
            <button
              className={`btn w-50 ${
                data.stock <= 0 ? "btn-secondary" : "btn-success"
              }`}
              disabled={data.stock <= 0}
              onClick={handleAddToCart}
            >
              {data.stock <= 0 ? "已售完" : added ? "已加入 ✓" : "加入購物車"}
            </button>
          </div>
        </div>
        <hr />
        <h5>商品介紹</h5>
        {/* 任務 7：描述是空的就顯示提示，不要留一片空白 */}
        {data.description?.trim() ? (
          <p style={{ whiteSpace: "pre-line" }}>{data.description}</p>
        ) : (
          <p className="text-muted">尚無商品介紹</p>
        )}
      </div>
    </div>
  );
};
