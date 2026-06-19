import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate, Link } from "react-router-dom";
import { Check, Loader2, ArrowLeft, Search } from "lucide-react";
import { getOrder }  from "../api";
import { formatVND } from "../utils";

const PAY_NOTE = {
  cod:  "Vui lòng chuẩn bị tiền mặt khi nhận hàng.",
  bank: "Thông tin chuyển khoản sẽ được gửi đến số điện thoại của bạn.",
  momo: "Link thanh toán sẽ được gửi qua SMS trong vài phút.",
};

export default function OrderLookup() {
  const { code } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const justPlaced = location.state?.justPlaced;
  const [order,  setOrder]  = useState(location.state?.order || null);
  const [loading,setLoading]= useState(!location.state?.order && !!code);
  const [error,  setError]  = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (location.state?.order || !code) return;
    getOrder(code).then(setOrder).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  }, [code]);

  if (!code) return (
    <div>
      <h1 className="xi-title">Tra Cứu Đơn Hàng</h1>
      <p className="xi-subtitle">Nhập mã đơn hàng đã nhận sau khi đặt để xem trạng thái.</p>
      <form onSubmit={e=>{e.preventDefault();if(search.trim())navigate(`/order/${search.trim().toUpperCase()}`)}}
        style={{display:"flex",gap:10,maxWidth:360}}>
        <input style={{flex:1,border:"2px solid var(--ink)",borderRadius:3,padding:"10px 12px",fontFamily:"JetBrains Mono"}}
          placeholder="VD: XIMQJKBEIP0B..." value={search} onChange={e=>setSearch(e.target.value)}/>
        <button className="xi-btn-primary" type="submit"><Search size={16}/> Tra cứu</button>
      </form>
    </div>
  );

  if (loading) return <div className="xi-loading"><Loader2 size={20} className="xi-spin"/> Đang tải...</div>;
  if (error)   return <div className="xi-empty"><p>{error}</p><Link to="/order" className="xi-btn-secondary"><ArrowLeft size={16}/> Tra cứu mã khác</Link></div>;
  if (!order)  return null;

  return (
    <div className="xi-confirm">
      <div className="xi-confirm-icon"><Check size={32}/></div>
      <h1 className="xi-title">{justPlaced?"Đặt Hàng Thành Công":"Chi Tiết Đơn Hàng"}</h1>
      {justPlaced && <p>Cảm ơn bạn! Đơn hàng đang được xử lý.</p>}
      <div className="xi-order-code">{order.code}</div>
      <p style={{color:"#6b675c",fontSize:14,maxWidth:420,margin:"0 auto 24px"}}>
        {PAY_NOTE[order.payment]} Trạng thái: <strong>{order.status}</strong>.
      </p>
      <div className="xi-summary-box" style={{maxWidth:460,margin:"0 auto",textAlign:"left"}}>
        {order.items.map((it,i)=>(
          <div key={i} className="xi-summary-row" style={{alignItems:"center"}}>
            <span style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{width:12,height:12,borderRadius:"50%",background:it.inkHex,border:"1px solid #ccc",flexShrink:0}}/>
              {it.designName} · {it.shirtName} · Mực {it.inkName} · {it.size} x{it.qty}
            </span>
            <span>{formatVND(it.unitPrice*it.qty)}</span>
          </div>
        ))}
        <div className="xi-summary-row total"><span>Tổng</span><span>{formatVND(order.total)}</span></div>
      </div>
      <div style={{display:"flex",gap:12,justifyContent:"center",marginTop:24,flexWrap:"wrap"}}>
        <Link to="/order" className="xi-btn-secondary">Tra cứu đơn khác</Link>
        <Link to="/"      className="xi-btn-primary">Tiếp tục mua sắm</Link>
      </div>
    </div>
  );
}
