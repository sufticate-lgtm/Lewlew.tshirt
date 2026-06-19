const API_URL = import.meta.env.VITE_API_URL || "/api";

async function request(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, opts);
  if (!res.ok) {
    let msg = "Có lỗi xảy ra.";
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

const json = (method, body, pw) => ({
  method,
  headers: { "Content-Type": "application/json", ...(pw ? { "x-admin-password": pw } : {}) },
  body: JSON.stringify(body),
});
const auth = pw => ({ headers: { "x-admin-password": pw } });

export const getShirtColors = ()              => request("/shirt-colors");
export const getInkColors   = ()              => request("/ink-colors");
export const getDesigns      = ()              => request("/designs");
export const getSettings     = ()              => request("/settings");
export const createOrder     = (payload)       => request("/orders", json("POST", payload));
export const getOrder        = (code)          => request(`/orders/${encodeURIComponent(code)}`);

export const adminLogin             = (pw)            => request("/admin/login", json("POST", { password: pw }));
export const adminGetOrders         = (pw)            => request("/admin/orders", auth(pw));
export const adminUpdateOrderStatus = (pw, code, st)  =>
  request(`/admin/orders/${encodeURIComponent(code)}`, json("PATCH", { status: st }, pw));

// Shirt colors – form-data vì có ảnh
export const adminAddShirtColor = (pw, name, hex, photoFile) => {
  const form = new FormData();
  form.append("name", name); form.append("hex", hex); form.append("photo", photoFile);
  return request("/admin/shirt-colors", { method: "POST", headers: { "x-admin-password": pw }, body: form });
};
export const adminDeleteShirtColor = (pw, id) =>
  request(`/admin/shirt-colors/${encodeURIComponent(id)}`, { method: "DELETE", ...auth(pw) });

// Ink colors
export const adminAddInkColor    = (pw, data) => request("/admin/ink-colors",  json("POST", data, pw));
export const adminDeleteInkColor = (pw, id)   =>
  request(`/admin/ink-colors/${encodeURIComponent(id)}`,  { method: "DELETE", ...auth(pw) });

// Designs – form-data vì có PNG
export const adminAddDesign = (pw, name, pngFile) => {
  const form = new FormData();
  form.append("name", name); form.append("png", pngFile);
  return request("/admin/designs", { method: "POST", headers: { "x-admin-password": pw }, body: form });
};
export const adminDeleteDesign = (pw, id) =>
  request(`/admin/designs/${encodeURIComponent(id)}`, { method: "DELETE", ...auth(pw) });
