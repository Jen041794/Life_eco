import { Modal, Table, Badge } from "react-bootstrap";
import { STATUS_LABELS, STATUS_VARIANTS } from "../utils/orderStatus";
import { formatPrice } from "../utils/formatPrice";

export default function OrderDetailModal({ show, onHide, order }) {
  if (!order) return null;

  return (
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>訂單 #{order.order_number} 明細</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3 d-flex flex-wrap gap-4">
          <div>
            <span className="text-muted">顧客：</span>
            {order.user}
          </div>
          <div>
            <span className="text-muted">狀態：</span>
            <Badge bg={STATUS_VARIANTS[order.status]}>
              {STATUS_LABELS[order.status]}
            </Badge>
          </div>
          <div>
            <span className="text-muted">建立時間：</span>
            {new Date(order.created_at).toLocaleString()}
          </div>
        </div>

        <Table size="sm" bordered className="mb-3">
          <thead className="table-light">
            <tr>
              <th>商品</th>
              <th className="text-end">單價</th>
              <th className="text-end">數量</th>
              <th className="text-end">小計</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id}>
                <td>{item.product?.name ?? "（商品已刪除）"}</td>
                <td className="text-end">${formatPrice(item.price)}</td>
                <td className="text-end">{item.quantity}</td>
                <td className="text-end">
                  ${formatPrice(Number(item.price) * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>

        <div className="text-end fs-5">
          總計：
          <span className="fw-bold text-success">${formatPrice(order.total_price)}</span>
        </div>
      </Modal.Body>
    </Modal>
  );
}
