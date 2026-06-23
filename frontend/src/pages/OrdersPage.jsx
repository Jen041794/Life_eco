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
  useGetOrdersQuery,
  useUpdateOrderStatusMutation,
  useCancelOrderMutation,
} from "../features/api/apiSlice";
import OrderDetailModal from "../components/OrderDetailModal";
import {
  STATUS_LABELS,
  STATUS_VARIANTS,
  STATUS_OPTIONS,
  NEXT_ACTION,
  CANCELLABLE,
} from "../utils/orderStatus";
import { formatApiError } from "../utils/formatError";
import { formatPrice } from "../utils/formatPrice";

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [detail, setDetail] = useState(null);

  const { data, isLoading, isError, isFetching } = useGetOrdersQuery({
    page,
    status,
    search,
  });
  const [updateStatus, { isLoading: updating }] =
    useUpdateOrderStatusMutation();
  const [cancelOrder, { isLoading: cancelling }] = useCancelOrderMutation();

  const submitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const advance = async (order) => {
    const action = NEXT_ACTION[order.status];
    if (!action) return;
    try {
      await updateStatus({ id: order.id, status: action.next }).unwrap();
    } catch (err) {
      alert(formatApiError(err));
    }
  };

  const cancel = async (order) => {
    if (
      !window.confirm(
        `確定要取消訂單 #${order.order_number} 嗎？\n（會回補庫存，已付款會退款）`,
      )
    )
      return;
    try {
      await cancelOrder(order.id).unwrap();
    } catch (err) {
      alert(formatApiError(err));
    }
  };

  if (isLoading) return <Spinner animation="border" />;
  if (isError) return <Alert variant="danger">載入訂單失敗。</Alert>;

  const orders = data.results;
  const busy = updating || cancelling;
  // 後端每頁固定 10 筆，據此算總頁數（至少 1 頁）
  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));

  return (
    <>
      <h4 className="mb-3">訂單管理</h4>

      <div className="d-flex flex-wrap gap-3 mb-3">
        <Form.Select
          style={{ maxWidth: 180 }}
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">全部狀態</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Form.Select>

        <Form
          onSubmit={submitSearch}
          style={{ maxWidth: 320 }}
          className="flex-grow-1"
        >
          <InputGroup>
            <Form.Control
              placeholder="搜尋客人帳號"
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
            <th>訂單編號</th>
            <th>顧客</th>
            <th className="text-end">金額</th>
            <th>狀態</th>
            <th>建立時間</th>
            <th style={{ width: 240 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center text-muted py-4">
                沒有訂單
              </td>
            </tr>
          ) : (
            orders.map((o) => {
              const action = NEXT_ACTION[o.status];
              return (
                <tr key={o.id}>
                  <td className="font-monospace small">#{o.order_number}</td>
                  <td>{o.user}</td>
                  <td className="text-end">${formatPrice(o.total_price)}</td>
                  <td>
                    <Badge bg={STATUS_VARIANTS[o.status]}>
                      {STATUS_LABELS[o.status]}
                    </Badge>
                  </td>
                  <td className="small text-muted">
                    {new Date(o.created_at).toLocaleString()}
                  </td>
                  <td>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      className="me-2"
                      onClick={() => setDetail(o)}
                    >
                      明細
                    </Button>
                    {action && (
                      <Button
                        size="sm"
                        variant="outline-primary"
                        className="me-2"
                        disabled={busy}
                        onClick={() => advance(o)}
                      >
                        {action.label}
                      </Button>
                    )}
                    {CANCELLABLE.includes(o.status) && (
                      <Button
                        size="sm"
                        variant="outline-danger"
                        disabled={busy}
                        onClick={() => cancel(o)}
                      >
                        取消
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </Table>

      <div className="d-flex justify-content-end align-items-center">
        <Button
          size="sm"
          variant="outline-secondary"
          className="me-2"
          disabled={!data.previous}
          onClick={() => setPage((p) => p - 1)}
        >
          上一頁
        </Button>
        <Button
          size="sm"
          variant="outline-secondary"
          disabled={!data.next}
          onClick={() => setPage((p) => p + 1)}
        >
          下一頁
        </Button>
      </div>

      <OrderDetailModal
        show={Boolean(detail)}
        onHide={() => setDetail(null)}
        order={detail}
      />
    </>
  );
}
