import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { Check, Loader2, ArrowLeft, Search } from "lucide-react";
import { getOrder } from "../api";
import { formatVND } from "../utils";

const PAYMENT_NOTE = {
  cod: "Vui lòng chuẩn bị tiền mặt khi nhận hàng.",
  bank: "Thông tin chuyển khoản sẽ được gửi đến số điện thoại của bạn.",
  momo: "Liên kết thanh toán sẽ được gửi qua SMS trong vài phút.",
};

export default function OrderLookup() {
  const { code } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const justPlaced = location.state?.justPlaced;

  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order && !!code);
  const [error, setError] = useState(null);
  const [searchCode, setSearchCode] = useState("");

  useEffect(() => {
    if (location.state?.order || !code) return;
    setLoading(true);
    getOrder(code)
      .then(setOrder)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [code]);

  if (!code) {
    return (
      <div>
        <h1 className="xi-title">Tra Cứu Đơn Hàng</h1>
        <p className="xi-subtitle">Nhập mã đơn hàng đã nhận được sau khi đặt hàng để xem trạng thái.</p>
        <form
          onSubmit={(e) => { e.preventDefault(); if (searchCode.trim()) navigate(`/order/${searchCode.trim().toUpperCase()}`); }}
          style={{ display: "flex", gap: 10, maxWidth: 360 }}
        >
          <input
            className="xi-field-input"
            style={{ flex: 1, border: "2px solid var(--ink)", borderRadius: 3, padding: "10px 12px", fontFamily: "JetBrains Mono" }}
            placeholder="Ví dụ: XIMQJKBEIP0B6D"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
          />
          <button className="xi-btn-primary" type="submit"><Search size={16} /> Tra cứu</button>
        </form>
      </div>
    );
  }

  if (loading) return <div className="xi-loading"><Loader2 size={20} className="xi-spin" /> Đang tải đơn hàng...</div>;
  if (error) {
    return (
      <div className="xi-empty">
        <p>{error}</p>
        <Link to="/order" className="xi-btn-secondary"><ArrowLeft size={16} /> Tra cứu mã khác</Link>
      </div>
    );
  }
  if (!order) return null;

  return (
    <div className="xi-confirm">
      <div className="xi-confirm-icon"><Check size={32} /></div>
      <h1 className="xi-title">{justPlaced ? "Đặt Hàng Thành Công" : "Chi Tiết Đơn Hàng"}</h1>
      {justPlaced && <p>Cảm ơn bạn! Đơn hàng đang được xử lý.</p>}
      <div className="xi-order-code">{order.code}</div>
      <p style={{ color: "#6b675c", fontSize: 14, maxWidth: 420, margin: "0 auto 24px" }}>
        {PAYMENT_NOTE[order.payment]} Trạng thái hiện tại: <strong>{order.status}</strong>.
      </p>

      <div className="xi-summary-box" style={{ maxWidth: 420, margin: "0 auto", textAlign: "left" }}>
        {order.items.map((item, idx) => (
          <div key={idx} className="xi-summary-row" style={{ alignItems: "center" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {item.photo && <img src={item.photo} alt={item.designName} style={{ width: 32, height: 32, objectFit: "cover", borderRadius: 4 }} />}
              {item.designName} ({item.variantName}, {item.shirtName}, {item.size}) x{item.qty}
            </span>
            <span>{formatVND(item.unitPrice * item.qty)}</span>
          </div>
        ))}
        <div className="xi-summary-row total"><span>Tổng cộng</span><span>{formatVND(order.total)}</span></div>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24, flexWrap: "wrap" }}>
        <Link to="/order" className="xi-btn-secondary">Tra cứu đơn khác</Link>
        <Link to="/" className="xi-btn-primary">Tiếp tục mua sắm</Link>
      </div>
    </div>
  );
}
