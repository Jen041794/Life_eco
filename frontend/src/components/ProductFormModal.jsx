import { useState, useEffect } from "react";
import { Modal, Form, Button, Alert, Image } from "react-bootstrap";
import {
  useAddProductMutation,
  useUpdateProductMutation,
  useGetCategoriesQuery,
} from "../features/api/apiSlice";
import { formatApiError } from "../utils/formatError";
import { useToast } from "./ToastProvider";

const empty = {
  name: "",
  description: "",
  price: "",
  stock: 0,
  category: "",
  is_active: true,
  tag: "", // 行銷標籤：空字串＝不顯示
};
const MAX_IMAGES = 3;

export default function ProductFormModal({ show, onHide, product }) {
  const isEdit = Boolean(product);
  const [form, setForm] = useState(empty);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [addProduct, { isLoading: adding }] = useAddProductMutation();
  const [updateProduct, { isLoading: updating }] = useUpdateProductMutation();
  const { data: categories = [] } = useGetCategoriesQuery();
  const { showToast } = useToast();

  useEffect(() => {
    if (show) {
      setForm(
        product
          ? {
              name: product.name,
              description: product.description || "",
              price: Number(product.price), // 後端回 "120.00"，轉成數字去掉小數點
              stock: product.stock,
              category: product.category ?? "",
              is_active: product.is_active,
              tag: product.tag || "",
            }
          : empty,
      );
      setFiles([]);
      setError("");
    }
  }, [show, product]);

  const change = (e) => {
    const { name, type, value, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const onFiles = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length > MAX_IMAGES) {
      setError(`最多只能選 ${MAX_IMAGES} 張圖片。`);
      e.target.value = "";
      setFiles([]);
      return;
    }
    setError("");
    setFiles(selected);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const fd = new FormData();
    fd.append("name", form.name);
    fd.append("description", form.description);
    fd.append("price", form.price);
    fd.append("stock", String(Number(form.stock)));
    fd.append("category", form.category); // 空字串＝無分類，後端會轉成 null
    fd.append("is_active", form.is_active ? "true" : "false");
    fd.append("tag", form.tag); // 空字串＝無標籤
    files.forEach((f) => fd.append("images", f));

    try {
      if (isEdit)
        await updateProduct({ id: product.id, formData: fd }).unwrap();
      else await addProduct(fd).unwrap();
      showToast(isEdit ? `${form.name} 已更新` : `${form.name} 新增成功`);
      onHide();
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const existingImages = product?.images ?? [];

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" keyboard={false} size="lg">
      <Form onSubmit={submit}>
        <Modal.Header closeButton>
          <Modal.Title>{isEdit ? "編輯商品" : "新增商品"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert
              variant="danger"
              className="py-2"
              style={{ whiteSpace: "pre-line" }}
            >
              {error}
            </Alert>
          )}
          <Form.Group className="mb-3">
            <Form.Label>名稱</Form.Label>
            <Form.Control
              name="name"
              value={form.name}
              onChange={change}
              required
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>說明</Form.Label>
            <Form.Control
              as="textarea"
              rows={5}
              name="description"
              value={form.description}
              onChange={change}
            />
            <Form.Text className="text-muted">
              按 Enter 換行、空一行分段，前台會照樣顯示。
            </Form.Text>
          </Form.Group>
          <div className="row">
            <Form.Group className="mb-3 col-6">
              <Form.Label>價格</Form.Label>
              <Form.Control
                name="price"
                type="number"
                step="1"
                min="0"
                value={form.price}
                onChange={change}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3 col-6">
              <Form.Label>庫存</Form.Label>
              <Form.Control
                name="stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={change}
                required
              />
            </Form.Group>
          </div>

          <div className="row align-items-center">
            <Form.Group className="mb-3 col-7">
              <Form.Label>分類</Form.Label>
              <Form.Select
                name="category"
                value={form.category}
                onChange={change}
              >
                <option value="">（無分類）</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3 col-5">
              <Form.Label>上架狀態</Form.Label>
              <Form.Check
                type="switch"
                name="is_active"
                checked={form.is_active}
                onChange={change}
                label={
                  form.is_active ? "上架中（前台可見）" : "已下架（前台隱藏）"
                }
              />
            </Form.Group>
          </div>

          {/* 商品標籤：勾選後才能選類型，會顯示在前台卡片左上角 */}
          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="tag-enable"
              label="顯示商品標籤（前台卡片左上角絲帶）"
              checked={form.tag !== ""}
              onChange={(e) =>
                setForm({ ...form, tag: e.target.checked ? "新商品" : "" })
              }
            />
            {form.tag !== "" && (
              <Form.Select
                name="tag"
                value={form.tag}
                onChange={change}
                className="mt-2"
                style={{ maxWidth: 200 }}
              >
                <option value="新商品">新商品</option>
                <option value="限量倒數">限量倒數</option>
                <option value="熱賣">熱賣</option>
              </Form.Select>
            )}
          </Form.Group>

          {/* 編輯時顯示現有圖片 */}
          {isEdit && existingImages.length > 0 && (
            <div className="mb-2">
              <div className="text-muted small mb-1">目前圖片</div>
              <div className="d-flex gap-2 flex-wrap">
                {existingImages.map((img) => (
                  <Image
                    key={img.id}
                    src={img.image}
                    thumbnail
                    width={64}
                    height={64}
                    style={{ objectFit: "cover" }}
                  />
                ))}
              </div>
            </div>
          )}

          <Form.Group className="mb-1">
            <Form.Label>商品圖片（最多 {MAX_IMAGES} 張）</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              multiple
              onChange={onFiles}
            />
            <Form.Text className="text-muted">
              {isEdit
                ? "重新選擇會「取代」現有圖片；不選則保留原圖。"
                : "可一次選多張（按住 Ctrl/Shift）。"}
              {files.length > 0 && ` 已選 ${files.length} 張。`}
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            取消
          </Button>
          <Button
            className="text-white"
            type="submit"
            variant="primary"
            disabled={adding || updating}
          >
            {adding || updating ? "儲存中…" : "儲存"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
