const API_URL = import.meta.env.VITE_API_URL || "/api";

async function request(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    let message = "Có lỗi xảy ra, vui lòng thử lại.";
    try {
      const body = await res.json();
      message = body.error || message;
    } catch (e) {}
    throw new Error(message);
  }
  return res.json();
}

export const getShirtColors = () => request("/shirt-colors");
export const getPrintColors = () => request("/print-colors");
export const getDesigns = () => request("/designs");
export const getSettings = () => request("/settings");
export const createOrder = (payload) => request("/orders", { method: "POST", body: JSON.stringify(payload) });
export const getOrder = (code) => request(`/orders/${encodeURIComponent(code)}`);

export const adminLogin = (password) =>
  request("/admin/login", { method: "POST", body: JSON.stringify({ password }) });

export const adminGetOrders = (password) => request("/admin/orders", { headers: { "x-admin-password": password } });

export const adminUpdateOrderStatus = (password, code, status) =>
  request(`/admin/orders/${encodeURIComponent(code)}`, {
    method: "PATCH",
    headers: { "x-admin-password": password },
    body: JSON.stringify({ status }),
  });

export const adminAddShirtColor = (password, data) =>
  request("/admin/shirt-colors", { method: "POST", headers: { "x-admin-password": password }, body: JSON.stringify(data) });

export const adminDeleteShirtColor = (password, id) =>
  request(`/admin/shirt-colors/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "x-admin-password": password } });

export const adminAddPrintColor = (password, data) =>
  request("/admin/print-colors", { method: "POST", headers: { "x-admin-password": password }, body: JSON.stringify(data) });

export const adminDeletePrintColor = (password, id) =>
  request(`/admin/print-colors/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "x-admin-password": password } });

export const adminAddDesign = (password, data) =>
  request("/admin/designs", { method: "POST", headers: { "x-admin-password": password }, body: JSON.stringify(data) });

export const adminDeleteDesign = (password, id) =>
  request(`/admin/designs/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "x-admin-password": password } });
