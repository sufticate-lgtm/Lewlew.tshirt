import { Link, useNavigate } from "react-router-dom";
import { Plus, Minus, Trash2, ArrowLeft, ChevronRight } from "lucide-react";
import { useApp }    from "../context/AppContext";
import { formatVND } from "../utils";

export default function Cart() {
  const { cart, removeItem, updateQty, total } = useApp();
  const navigate = useNavigate();
  if (!cart.length) return (
    <div className="xi-empty"><p>Giỏ hàng trống.</p>
      <Link to="/" className="xi-btn-secondary"><ArrowLeft size={16}/> Quay lại Studio</Link></div>
  );
  return (
    <div>
      <h1 className="xi-title">Giỏ Hàng</h1>
      <div className="xi-cart-list">
        {cart.map(item => (
          <div key={item.id} className="xi-cart-item">
            <div style={{width:56,height:56,borderRadius:6,overflow:"hidden",flexShrink:0,background:"#e8e5de"}}>
              {item.shirtPhoto && <img src={item.shirtPhoto} alt={item.shirtName} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
            </div>
            <div className="xi-cart-item-info">
              <div className="xi-cart-item-title">{item.designName} — Áo {item.shirtName}</div>
              <div className="xi-cart-item-meta">
                {item.layerColors?.map((lc,i) => (
                  <span key={i} style={{display:"inline-flex",alignItems:"center",gap:4,marginRight:8}}>
                    <span style={{width:10,height:10,borderRadius:"50%",background:lc.inkHex,border:"1px solid #ccc"}}/>
                    {lc.inkName}
                  </span>
                ))}
                · Size {item.size} · {formatVND(item.unitPrice)}/cái
              </div>
            </div>
            <div className="xi-cart-item-actions">
              <div className="xi-qty">
                <button onClick={()=>updateQty(item.id,-1)}><Minus size={12}/></button>
                <span>{item.qty}</span>
                <button onClick={()=>updateQty(item.id,+1)}><Plus size={12}/></button>
              </div>
              <button className="xi-remove-btn" onClick={()=>removeItem(item.id)}><Trash2 size={18}/></button>
            </div>
          </div>
        ))}
      </div>
      <div className="xi-summary-box" style={{marginTop:24,maxWidth:340,marginLeft:"auto"}}>
        <div className="xi-summary-row"><span>Tạm tính</span><span>{formatVND(total)}</span></div>
        <div className="xi-summary-row total"><span>Tổng</span><span>{formatVND(total)}</span></div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:12,marginTop:20,flexWrap:"wrap"}}>
        <Link to="/" className="xi-btn-secondary"><ArrowLeft size={16}/> Tiếp tục</Link>
        <button className="xi-btn-primary" onClick={()=>navigate("/checkout")}>Đặt hàng <ChevronRight size={16}/></button>
      </div>
    </div>
  );
}
