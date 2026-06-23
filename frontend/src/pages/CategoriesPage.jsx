import { useState } from "react";
import {
  Table,
  Button,
  Spinner,
  Alert,
  Form,
  InputGroup,
  Badge,
} from "react-bootstrap";
import {
  useGetCategoriesQuery,
  useAddCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from "../features/api/apiSlice";
import { formatApiError } from "../utils/formatError";
import { useToast } from "../components/ToastProvider";

export default function CategoriesPage() {
  const { data: categories = [], isLoading, isError } = useGetCategoriesQuery();
  const [addCategory, { isLoading: adding }] = useAddCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();
  const [deleteCategory] = useDeleteCategoryMutation();
  const { showToast } = useToast();

  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null); // 正在改名的分類 id
  const [editName, setEditName] = useState("");

  const submitNew = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError("");
    try {
      await addCategory({ name }).unwrap();
      setNewName("");
      showToast(`分類「${name}」新增成功`);
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditName(c.name);
    setError("");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const saveEdit = async (c) => {
    const name = editName.trim();
    if (!name || name === c.name) {
      cancelEdit();
      return;
    }
    try {
      await updateCategory({ id: c.id, name }).unwrap();
      cancelEdit();
      showToast(`分類已更新為「${name}」`);
    } catch (err) {
      setError(formatApiError(err));
    }
  };

  const handleDelete = async (c) => {
    const note =
      c.product_count > 0
        ? `「${c.name}」底下有 ${c.product_count} 個商品，刪除後這些商品會變成「無分類」（商品不會被刪）。確定刪除？`
        : `確定要刪除分類「${c.name}」嗎？`;
    if (!window.confirm(note)) return;
    try {
      await deleteCategory(c.id).unwrap();
      showToast(`分類「${c.name}」刪除成功`);
    } catch (err) {
      showToast(formatApiError(err), "danger");
    }
  };

  if (isLoading) return <Spinner animation="border" />;
  if (isError) return <Alert variant="danger">載入分類失敗。</Alert>;

  return (
    <>
      <h4 className="mb-3">分類管理</h4>

      {error && (
        <Alert
          variant="danger"
          className="py-2"
          style={{ whiteSpace: "pre-line" }}
        >
          {error}
        </Alert>
      )}

      <Form onSubmit={submitNew} className="mb-3" style={{ maxWidth: 360 }}>
        <InputGroup>
          <Form.Control
            placeholder="新增分類名稱"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button className="text-white" type="submit" disabled={adding}>
            {adding ? "新增中…" : "+ 新增"}
          </Button>
        </InputGroup>
      </Form>

      <Table
        hover
        responsive
        className="align-middle bg-white shadow-sm"
        style={{ maxWidth: 640 }}
      >
        <thead className="table-light">
          <tr>
            <th>#</th>
            <th>名稱</th>
            <th className="text-center">商品數</th>
            <th style={{ width: 180 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {categories.length === 0 ? (
            <tr>
              <td colSpan={4} className="text-center text-muted py-4">
                還沒有分類
              </td>
            </tr>
          ) : (
            categories.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>
                  {editingId === c.id ? (
                    <Form.Control
                      size="sm"
                      value={editName}
                      autoFocus
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(c);
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                  ) : (
                    c.name
                  )}
                </td>
                <td className="text-center">
                  <Badge
                    bg={c.product_count > 0 ? "info" : "light"}
                    text={c.product_count > 0 ? undefined : "dark"}
                    className="fw-normal"
                  >
                    {c.product_count}
                  </Badge>
                </td>
                <td>
                  {editingId === c.id ? (
                    <>
                      <Button
                        size="sm"
                        variant="success"
                        className="me-2"
                        onClick={() => saveEdit(c)}
                      >
                        儲存
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-secondary"
                        onClick={cancelEdit}
                      >
                        取消
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="me-2"
                        onClick={() => startEdit(c)}
                      >
                        改名
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => handleDelete(c)}
                      >
                        刪除
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </>
  );
}
