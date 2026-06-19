import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Truck, Landmark, Smartphone, Loader2 } from "lucide-react";
import { useApp }    from "../context/AppContext";
import { createOrder } from "../api";
import { formatVND } from "../utils";

export default function Checkout() {
  const { cart, total, clearCart } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({name:"",phone:"",email:"",address:"",payment:"cod"});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!cart.length) return (
    <div className="xi-empty">
      <p>Giỏ hàng trống.</p>
      <Link to="/" className="xi-btn-secondary"><ArrowLeft size={16}/> Quay lại Studio</Link>
    </div>
  );

  async function handleSubmit(e) {
    e.preventDefault(); setError(null); setSubmitting(true);
    try {
      const order = await createOrder({
        items: cart.map(i=>({designId:i.designId,shirtColorId:i.shirtColorId,inkColorId:i.inkColorId,size:i.size,qty:i.qty})),
        customer:{name:form.name,phone:form.phone,email:form.email,address:form.address},
        payment:form.payment,
      });
      clearCart();
      navigate(`/order/${order.code}`,{state:{order,justPlaced:true}});
    } catch(e) { setError(e.message); } finally { setSubmitting(false); }
  }

  const F = ({l,s,children}) => <div className={`xi-field${s?" style-span":""}`} style={s?{gridColumn:"1/-1"}:{}}><label>{l}</label>{children}</div>;

  return (
    <div>
      <h1 className="xi-title">Thanh Toán</h1>
      {error && <div className="xi-error">{error}</div>}
      <div className="xi-studio-grid">
        <form onSubmit={handleSubmit}>
          <div className="xi-section">
            <span className="xi-label">Thông tin nhận hàng</span>
            <div className="xi-form-grid">
              <div className="xi-field"><label>Họ và tên *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/></div>
              <div className="xi-field"><label>Số điện thoại *</label><input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} required/></div>
              <div className="xi-field" style={{gridColumn:"1/-1"}}><label>Email</label><input type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
              <div className="xi-field" style={{gridColumn:"1/-1"}}><label>Địa chỉ giao hàng *</label><textarea rows="2" value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))} required/></div>
            </div>
          </div>
          <div className="xi-section">
            <span className="xi-label">Phương thức thanh toán</span>
            <div className="xi-payment-row">
              {[["cod","COD — Trả tiền khi nhận hàng","Shipper giao tới tay, trả tiền mặt",<Truck size={20}/>],
                ["bank","Chuyển khoản ngân hàng","Thông tin TK gửi sau khi đặt",<Landmark size={20}/>],
                ["momo","Ví điện tử (Momo / ZaloPay)","Link thanh toán gửi qua SMS",<Smartphone size={20}/>],
              ].map(([val,title,sub,icon])=>(
                <label key={val} className={`xi-payment-opt ${form.payment===val?"selected":""}`}>
                  <input type="radio" name="pay" style={{display:"none"}} checked={form.payment===val} onChange={()=>setForm(f=>({...f,payment:val}))}/>
                  {icon}<div><strong>{title}</strong><div className="xi-cart-item-meta">{sub}</div></div>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="xi-btn-primary" disabled={submitting}>
            {submitting?<Loader2 size={18} className="xi-spin"/>:<Check size={18}/>} Xác nhận đặt hàng
          </button>
        </form>
        <div className="xi-summary-box">
          <span className="xi-label">Đơn hàng</span>
          {cart.map(item=>(
            <div key={item.id} className="xi-summary-row" style={{alignItems:"center"}}>
              <span style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:10,height:10,borderRadius:"50%",background:item.inkHex,border:"1px solid #ccc",flexShrink:0}}/>
                {item.designName} ({item.shirtName}, {item.size}) x{item.qty}
              </span>
              <span>{formatVND(item.unitPrice*item.qty)}</span>
            </div>
          ))}
          <div className="xi-summary-row total"><span>Tổng</span><span>{formatVND(total)}</span></div>
        </div>
      </div>
    </div>
  );
}
