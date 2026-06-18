import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";
import Header from "./components/Header";
import Studio from "./pages/Studio";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderLookup from "./pages/OrderLookup";
import Admin from "./pages/Admin";

function Shell() {
  const { toastMsg } = useApp();
  return (
    <>
      <Header />
      <main className="xi-main">
        <Routes>
          <Route path="/" element={<Studio />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order" element={<OrderLookup />} />
          <Route path="/order/:code" element={<OrderLookup />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      {toastMsg && <div className="xi-toast">{toastMsg}</div>}
      <footer className="xi-footer">
        <span>© 2026 Xưởng.In — In áo theo yêu cầu.</span>
        <span>Cần hỗ trợ? service@xuongin.example</span>
      </footer>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Shell />
      </AppProvider>
    </BrowserRouter>
  );
}
