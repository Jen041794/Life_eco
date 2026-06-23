import { Link } from "react-router-dom";
import { Button } from "react-bootstrap";

// 404：找不到頁面時的友善出口。
export default function NotFoundPage() {
  return (
    <div className="text-center py-5">
      <div className="display-1 fw-bold text-primary">404</div>
      <h4 className="mb-3">找不到這個頁面</h4>
      <p className="text-muted mb-4">
        網址可能打錯了，或這個頁面已經不存在。
      </p>
      <Button as={Link} to="/" className="text-white px-4">
        回首頁
      </Button>
    </div>
  );
}
