const API_URL = import.meta.env.VITE_API_URL || "/api";

async function request(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, { ...opts });
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

function jsonOpts(method, body, headers) {
  return { method, headers: { "Content-Type": "application/json", ...(headers || {}) }, body: JSON.stringify(body) };
}

export const getShirtColors = () => request("/shirt-colors");
export const getDesigns = () => request("/designs");
export const getSettings = () => request("/settings");
export const createOrder = (payload) => request("/orders", jsonOpts("POST", payload));
export const getOrder = (code) => request(`/orders/${encodeURIComponent(code)}`);

export const adminLogin = (password) => request("/admin/login", jsonOpts("POST", { password }));

export const adminGetOrders = (password) => request("/admin/orders", { headers: { "x-admin-password": password } });

export const adminUpdateOrderStatus = (password, code, status) =>
  request(`/admin/orders/${encodeURIComponent(code)}`, jsonOpts("PATCH", { status }, { "x-admin-password": password }));

export const adminAddShirtColor = (password, data) =>
  request("/admin/shirt-colors", jsonOpts("POST", data, { "x-admin-password": password }));

export const adminDeleteShirtColor = (password, id) =>
  request(`/admin/shirt-colors/${encodeURIComponent(id)}`, { method: "DELETE", headers: { "x-admin-password": password } });

export const adminAddDesign = (password, name) =>
  request("/admin/designs", jsonOpts("POST", { name }, { "x-admin-password": password }));

export const adminDeleteDesign = (password, designId) =>
  request(`/admin/designs/${encodeURIComponent(designId)}`, { method: "DELETE", headers: { "x-admin-password": password } });

export const adminAddVariant = (password, designId, data) =>
  request(`/admin/designs/${encodeURIComponent(designId)}/variants`, jsonOpts("POST", data, { "x-admin-password": password }));

export const adminDeleteVariant = (password, designId, variantId) =>
  request(`/admin/designs/${encodeURIComponent(designId)}/variants/${encodeURIComponent(variantId)}`, {
    method: "DELETE",
    headers: { "x-admin-password": password },
  });

export const adminUploadVariantPhoto = (password, designId, variantId, shirtColorId, file) => {
  const form = new FormData();
  form.append("shirtColorId", shirtColorId);
  form.append("photo", file);
  return request(`/admin/designs/${encodeURIComponent(designId)}/variants/${encodeURIComponent(variantId)}/photo`, {
    method: "POST",
    headers: { "x-admin-password": password },
    body: form,
  });
};

export const adminDeleteVariantPhoto = (password, designId, variantId, shirtColorId) =>
  request(
    `/admin/designs/${encodeURIComponent(designId)}/variants/${encodeURIComponent(variantId)}/photo/${encodeURIComponent(shirtColorId)}`,
    { method: "DELETE", headers: { "x-admin-password": password } }
  );
