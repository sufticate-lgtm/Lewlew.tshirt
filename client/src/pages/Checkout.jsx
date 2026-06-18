import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Truck, Landmark, Smartphone, Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";
import { createOrder } from "../api";
import { formatVND } from "../utils";

export default function Checkout() {
  const { cart, total, clearCart } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", payment: "cod" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (cart.length === 0) {
    return (
      <div className="xi-empty">
        <p>Giỏ hàng trống — hãy chọn áo trước khi thanh toán.</p>
        <Link to="/" className="xi-btn-secondary"><ArrowLeft size={16} /> Quay lại Studio</Link>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const order = await createOrder({
        items: cart.map((i) => ({ designId: i.designId, variantId: i.variantId, shirtColorId: i.shirtColorId, size: i.size, qty: i.qty })),
        customer: { name: form.name, phone: form.phone, email: form.email, address: form.address },
        payment: form.payment,
      });
      clearCart();
      navigate(`/order/${order.code}`, { state: { order, justPlaced: true } });
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="xi-title">Thanh Toán</h1>
      {error && <div className="xi-error">{error}</div>}
      <div className="xi-studio-grid">
        <form onSubmit={handleSubmit}>
          <div className="xi-section">
            <span className="xi-label">Thông tin nhận hàng</span>
            <div className="xi-form-grid">
              <div className="xi-field"><label>Họ và tên *</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="xi-field"><label>Số điện thoại *</label>
                <input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
              </div>
              <div className="xi-field" style={{ gridColumn: "1/-1" }}><label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="xi-field" style={{ gridColumn: "1/-1" }}><label>Địa chỉ giao hàng *</label>
                <textarea rows="2" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} required />
              </div>
            </div>
          </div>

          <div className="xi-section">
            <span className="xi-label">Phương thức thanh toán</span>
            <div className="xi-payment-row">
              <label className={`xi-payment-opt ${form.payment === "cod" ? "selected" : ""}`}>
                <input type="radio" name="pay" checked={form.payment === "cod"} onChange={() => setForm((f) => ({ ...f, payment: "cod" }))} style={{ display: "none" }} />
                <Truck size={20} /> <div><strong>Thanh toán khi nhận hàng (COD)</strong><div className="xi-cart-item-meta">Trả tiền mặt khi shipper giao áo</div></div>
              </label>
              <label className={`xi-payment-opt ${form.payment === "bank" ? "selected" : ""}`}>
                <input type="radio" name="pay" checked={form.payment === "bank"} onChange={() => setForm((f) => ({ ...f, payment: "bank" }))} style={{ display: "none" }} />
                <Landmark size={20} /> <div><strong>Chuyển khoản ngân hàng</strong><div className="xi-cart-item-meta">Thông tin chuyển khoản gửi sau khi đặt hàng</div></div>
              </label>
              <label className={`xi-payment-opt ${form.payment === "momo" ? "selected" : ""}`}>
                <input type="radio" name="pay" checked={form.payment === "momo"} onChange={() => setForm((f) => ({ ...f, payment: "momo" }))} style={{ display: "none" }} />
                <Smartphone size={20} /> <div><strong>Ví điện tử (Momo / ZaloPay)</strong><div className="xi-cart-item-meta">Liên kết thanh toán gửi qua SMS</div></div>
              </label>
            </div>
          </div>

          <button type="submit" className="xi-btn-primary" disabled={submitting} style={{ marginTop: 10 }}>
            {submitting ? <Loader2 size={18} className="xi-spin" /> : <Check size={18} />} Xác nhận đặt hàng
          </button>
        </form>

        <div className="xi-summary-box">
          <span className="xi-label">Đơn hàng của bạn</span>
          {cart.map((item) => (
            <div key={item.id} className="xi-summary-row">
              <span>{item.designName} ({item.shirtName}, {item.size}) x{item.qty}</span>
              <span>{formatVND(item.unitPrice * item.qty)}</span>
            </div>
          ))}
          <div className="xi-summary-row total"><span>Tổng cộng</span><span>{formatVND(total)}</span></div>
        </div>
      </div>
    </div>
  );
}
