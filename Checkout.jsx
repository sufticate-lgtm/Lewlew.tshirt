const API_URL = import.meta.env.VITE_API_URL || "/api";

async function request(path, opts={}) {
  const res = await fetch(`${API_URL}${path}`, opts);
  if (!res.ok) {
    let msg="Có lỗi xảy ra.";
    try { msg=(await res.json()).error||msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}
const j=(method,body,pw)=>({method,headers:{"Content-Type":"application/json",...(pw?{"x-admin-password":pw}:{})},body:JSON.stringify(body)});
const auth=pw=>({headers:{"x-admin-password":pw}});

export const getShirtColors = () => request("/shirt-colors");
export const getInkColors   = () => request("/ink-colors");
export const getDesigns     = () => request("/designs");
export const getSettings    = () => request("/settings");
export const createOrder    = p  => request("/orders",j("POST",p));
export const getOrder       = c  => request(`/orders/${encodeURIComponent(c)}`);

export const adminLogin = pw => request("/admin/login",j("POST",{password:pw}));
export const adminGetOrders = pw => request("/admin/orders",auth(pw));
export const adminUpdateOrderStatus = (pw,code,status) =>
  request(`/admin/orders/${encodeURIComponent(code)}`,j("PATCH",{status},pw));

// Settings & ruler
export const adminUpdateSettings = (pw,data) => request("/admin/settings",j("PATCH",data,pw));
export const adminUploadRuler = (pw,field,file) => {
  const form=new FormData(); form.append("field",field); form.append("photo",file);
  return request("/admin/settings/ruler",{method:"POST",headers:{"x-admin-password":pw},body:form});
};

// Shirt colors
export const adminAddShirtColor = (pw,name,hex,photo) => {
  const form=new FormData(); form.append("name",name); form.append("hex",hex); form.append("photo",photo);
  return request("/admin/shirt-colors",{method:"POST",headers:{"x-admin-password":pw},body:form});
};
export const adminPatchShirtColor = (pw,id,data) =>
  request(`/admin/shirt-colors/${encodeURIComponent(id)}`,j("PATCH",data,pw));
export const adminDeleteShirtColor = (pw,id) =>
  request(`/admin/shirt-colors/${encodeURIComponent(id)}`,{method:"DELETE",...auth(pw)});

// Ink colors
export const adminAddInkColor    = (pw,data) => request("/admin/ink-colors",j("POST",data,pw));
export const adminDeleteInkColor = (pw,id)   =>
  request(`/admin/ink-colors/${encodeURIComponent(id)}`,{method:"DELETE",...auth(pw)});

// Designs
export const adminAddDesign    = (pw,name) => request("/admin/designs",j("POST",{name},pw));
export const adminPatchDesign  = (pw,id,data) =>
  request(`/admin/designs/${encodeURIComponent(id)}`,j("PATCH",data,pw));
export const adminDeleteDesign = (pw,id) =>
  request(`/admin/designs/${encodeURIComponent(id)}`,{method:"DELETE",...auth(pw)});

// Design layers
export const adminAddLayer = (pw,designId,name,defaultInkId,pngFile) => {
  const form=new FormData();
  form.append("name",name); form.append("defaultInkId",defaultInkId); form.append("png",pngFile);
  return request(`/admin/designs/${encodeURIComponent(designId)}/layers`,
    {method:"POST",headers:{"x-admin-password":pw},body:form});
};
export const adminPatchLayer = (pw,designId,layerId,data) =>
  request(`/admin/designs/${encodeURIComponent(designId)}/layers/${encodeURIComponent(layerId)}`,j("PATCH",data,pw));
export const adminDeleteLayer = (pw,designId,layerId) =>
  request(`/admin/designs/${encodeURIComponent(designId)}/layers/${encodeURIComponent(layerId)}`,
    {method:"DELETE",...auth(pw)});
