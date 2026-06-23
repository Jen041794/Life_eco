import { useState } from "react";
import {
  Table,
  Button,
  Spinner,
  Alert,
  Form,
  InputGroup,
  Image,
  Badge,
} from "react-bootstrap";
import {
  useGetProductsQuery,
  useDeleteProductMutation,
  useUpdateProductMutation,
  useGetCategoriesQuery,
} from "../features/api/apiSlice";
import ProductFormModal from "../components/ProductFormModal";
import { formatApiError } from "../utils/formatError";
import { formatPrice } from "../utils/formatPrice";
import { tagColor } from "../utils/productTag";
import { useToast } from "../components/ToastProvider";

export default function ProductsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState(""); // "" = 全部分類
  const [modalShow, setModalShow] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: categories = [] } = useGetCategoriesQuery();
  const { data, isLoading, isError, isFetching } = useGetProductsQuery({
    page,
    search,
    category,
  });
  const [deleteProduct] = useDeleteProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const { showToast } = useToast();

  const openCreate = () => {
    setEditing(null);
    setModalShow(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setModalShow(true);
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`確定要刪除「${p.name}」嗎？`)) return;
    try {
      await deleteProduct(p.id).unwrap();
      showToast(`${p.name} 刪除成功`);
    } catch (err) {
      showToast(formatApiError(err), "danger");
    }
  };

  // 列上的快速上/下架：只送 is_active 一個欄位
  const toggleActive = async (p) => {
    const fd = new FormData();
    fd.append("is_active", p.is_active ? "false" : "true");
    try {
      await updateProduct({ id: p.id, formData: fd }).unwrap();
    } catch (err) {
      alert(formatApiError(err));
    }
  };

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  // 切換分類即時篩選，並回到第 1 頁（避免停在不存在的頁碼）
  const handleCategoryChange = (e) => {
    setPage(1);
    setCategory(e.target.value);
  };

  if (isLoading) return <Spinner animation="border" />;
  if (isError) return <Alert variant="danger">載入商品失敗。</Alert>;

  const products = data.results;
  const hasNext = Boolean(data.next);
  const hasPrev = Boolean(data.previous);
  // 後端每頁固定 10 筆，據此算總頁數（至少 1 頁）
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="mb-0">商品管理</h4>
        <Button className="text-white" onClick={openCreate}>
          + 新增商品
        </Button>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        {/* 分類篩選：選了即時套用，可和上面的關鍵字搜尋一起作用 */}
        <Form.Select
          value={category}
          onChange={handleCategoryChange}
          style={{ maxWidth: 200 }}
          aria-label="依分類篩選"
        >
          <option value="">全部分類</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Form.Select>
        <Form onSubmit={submitSearch} style={{ maxWidth: 360 }}>
          <InputGroup>
            <Form.Control
              placeholder="搜尋商品名稱 / 說明"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            <Button type="submit" variant="outline-secondary">
              搜尋
            </Button>
          </InputGroup>
        </Form>
      </div>

      <div className="mb-2">
        <small className="text-muted">
          共 {data.count} 筆，第 {page} / {totalPages} 頁
          {isFetching ? "（更新中…）" : ""}
        </small>
      </div>

      <Table hover responsive className="align-middle bg-white shadow-sm">
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th style={{ width: 64 }}>圖片</th>
            <th>名稱</th>
            <th>分類</th>
            <th>商品內容</th>
            <th>狀態</th>
            <th className="text-end">價格</th>
            <th className="text-end">庫存</th>
            <th style={{ width: 230 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {products.length === 0 ? (
            <tr>
              <td colSpan={8} className="text-center text-muted py-4">
                沒有商品
              </td>
            </tr>
          ) : (
            products.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>
                  {p.images?.length > 0 ? (
                    // 尺寸寫進 inline style 才壓得過 .img-thumbnail 的 height:auto，
                    // 配 objectFit: cover 讓不同比例的圖都裁切成統一 48×48
                    <Image
                      src={p.images[0].image}
                      thumbnail
                      style={{
                        width: 48,
                        height: 48,
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    // 無圖也用同尺寸方框，跟有圖的格子對齊
                    <div
                      className="bg-light d-flex align-items-center justify-content-center text-muted small rounded border"
                      style={{ width: 48, height: 48 }}
                    >
                      無圖
                    </div>
                  )}
                </td>
                <td>{p.name}</td>
                <td>
                  {p.category_name ? (
                    <Badge bg="info" className="fw-normal">
                      {p.category_name}
                    </Badge>
                  ) : (
                    <span className="text-muted small">—</span>
                  )}
                </td>
                <td>
                  {p.description ? (
                    // 單行截斷：超過欄寬用 … 省略，滑鼠移上去用 title 看完整內容
                    <div
                      title={p.description}
                      style={{
                        maxWidth: 240,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.description}
                    </div>
                  ) : (
                    <span className="text-muted small">—</span>
                  )}
                </td>
                <td>
                  <div className="d-flex flex-wrap gap-1">
                    {p.is_active ? (
                      <Badge bg="success" className="fw-normal">
                        上架中
                      </Badge>
                    ) : (
                      <Badge bg="secondary" className="fw-normal">
                        已下架
                      </Badge>
                    )}
                    {p.tag && (
                      <Badge
                        className="fw-normal"
                        style={{ backgroundColor: tagColor(p.tag) }}
                      >
                        {p.tag}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="text-end">${formatPrice(p.price)}</td>
                <td className="text-end">
                  <span className={p.stock < 5 ? "text-danger fw-bold" : ""}>
                    {p.stock}
                  </span>
                </td>
                <td>
                  <Button
                    size="sm"
                    variant={
                      p.is_active ? "outline-secondary" : "outline-success"
                    }
                    className="me-2"
                    onClick={() => toggleActive(p)}
                  >
                    {p.is_active ? "下架" : "上架"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-primary"
                    className="me-2"
                    onClick={() => openEdit(p)}
                  >
                    編輯
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => handleDelete(p)}
                  >
                    刪除
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>

      <div className="d-flex justify-content-end align-items-center">
        <Button
          size="sm"
          variant="outline-secondary"
          className="me-2"
          disabled={!hasPrev}
          onClick={() => setPage((p) => p - 1)}
        >
          上一頁
        </Button>
        <Button
          size="sm"
          variant="outline-secondary"
          disabled={!hasNext}
          onClick={() => setPage((p) => p + 1)}
        >
          下一頁
        </Button>
      </div>

      <ProductFormModal
        data-bs-target="#staticBackdrop"
        show={modalShow}
        onHide={() => setModalShow(false)}
        product={editing}
      />
    </>
  );
}
