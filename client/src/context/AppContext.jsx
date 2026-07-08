import { createContext, useContext, useEffect, useState } from "react";

const AppContext = createContext(null);
const CART_KEY = "xi_cart";

export function AppProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });
  const [toastMsg, setToastMsg] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (e) {}
  }, [cart]);

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2200);
  }

  function addItem(item) {
    setCart((prev) => [...prev, { ...item, id: "item_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8) }]);
    showToast("Đã thêm vào giỏ hàng");
  }
  function removeItem(id) {
    setCart((prev) => prev.filter((i) => i.id !== id));
  }
  function updateQty(id, delta) {
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)));
  }
  function clearCart() {
    setCart([]);
  }

  const total = cart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);

  return (
    <AppContext.Provider value={{ cart, addItem, removeItem, updateQty, clearCart, total, showToast, toastMsg }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
