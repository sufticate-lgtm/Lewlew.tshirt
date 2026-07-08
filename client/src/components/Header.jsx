import { Link, NavLink } from "react-router-dom";
import { ShoppingBag } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function Header() {
  const { cart } = useApp();
  return (
    <header className="xi-header">
      <Link to="/" className="xi-logo">LEWLEW<span> TSHIRT</span></Link>
      <nav className="xi-nav">
        <NavLink to="/" className={({isActive})=>isActive?"active":""} end>Studio</NavLink>
        <NavLink to="/order" className={({isActive})=>isActive?"active":""}>Tra cứu đơn hàng</NavLink>
      </nav>
      <Link to="/cart" className="xi-cart-btn">
        <ShoppingBag size={17}/> Giỏ hàng
        {cart.length > 0 && <span className="xi-badge">{cart.length}</span>}
      </Link>
    </header>
  );
}
