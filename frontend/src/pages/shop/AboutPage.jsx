import { Link } from "react-router-dom";
import { Row, Col, Card, Button } from "react-bootstrap";

// 關於我們：品牌理念 + 三大價值。內容為作品集 Demo 用的虛構品牌故事。
const VALUES = [
  {
    icon: "🌿",
    title: "嚴選好物",
    desc: "每件商品都經過挑選，少而精，讓你不必在無數選項裡迷路。",
  },
  {
    icon: "📦",
    title: "品質把關",
    desc: "從商品資訊到出貨流程都力求清楚透明，買得安心、用得放心。",
  },
  {
    icon: "💬",
    title: "貼心服務",
    desc: "簡單好用的購物體驗，從逛、買到售後，都希望讓你覺得順手。",
  },
];

export default function AboutPage() {
  return (
    <div>
      {/* 標題區 */}
      <div className="text-center mb-5">
        <h2 className="fw-bold mb-3">關於 Life_eco</h2>
        <p className="text-muted mx-auto" style={{ maxWidth: 640 }}>
          Life_eco 生活選物，相信「好的生活，從挑對東西開始」。
          我們把繁雜的選擇收斂成一份用心的清單，讓你把時間留給真正重要的事。
        </p>
      </div>

      {/* 三大價值 */}
      <Row xs={1} md={3} className="g-4 mb-5">
        {VALUES.map((v) => (
          <Col key={v.title}>
            <Card className="h-100 text-center shadow-sm border-0">
              <Card.Body className="py-4">
                <div className="display-5 mb-3">{v.icon}</div>
                <Card.Title className="fs-5">{v.title}</Card.Title>
                <Card.Text className="text-muted">{v.desc}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 品牌故事 */}
      <Row className="justify-content-center mb-5">
        <Col md={8}>
          <h4 className="mb-3">我們的故事</h4>
          <p className="text-muted">
            Life_eco 從一個單純的想法出發：購物不該讓人疲累。
            市面上的選擇太多、資訊太雜，我們希望做一個「逛起來輕鬆、買起來放心」的地方，
            把挑選的功夫留給自己，把簡單留給你。
          </p>
          <p className="text-muted mb-0">
            從 3C、服飾到生活用品，我們持續尋找值得推薦的好物，
            也持續打磨每一個購物的小細節，期待成為你日常裡順手的選擇。
          </p>
        </Col>
      </Row>

      {/* CTA */}
      <div className="text-center">
        <Button as={Link} to="/shop" className="text-white px-4" size="lg">
          開始逛逛 →
        </Button>
      </div>

      {/* Demo 聲明 */}
      <p className="text-center text-muted small mt-5 mb-0">
        本網站為作品集 Demo，品牌故事與商品皆為展示用途。
      </p>
    </div>
  );
}
