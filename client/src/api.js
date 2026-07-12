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
export const getDesigns        = () => request("/designs");
export const adminGetDesigns   = (pw) => request("/admin/designs",auth(pw));
export const getSettings    = () => request("/settings");
export const createOrder    = p  => request("/orders",j("POST",p));
export const getOrder       = c  => request(`/orders/${encodeURIComponent(c)}`);

export const adminLogin             = pw        => request("/admin/login",j("POST",{password:pw}));
export const adminGetOrders         = pw        => request("/admin/orders",auth(pw));
export const adminUpdateOrderStatus = (pw,c,st) =>
  request(`/admin/orders/${encodeURIComponent(c)}`,j("PATCH",{status:st},pw));

export const adminUpdateSettings = (pw,data) => request("/admin/settings",j("PATCH",data,pw));
export const adminUploadRuler    = (pw,field,file) => {
  const form=new FormData(); form.append("field",field); form.append("photo",file);
  return request("/admin/settings/ruler",{method:"POST",headers:{"x-admin-password":pw},body:form});
};

export const adminAddShirtColor    = (pw,name,hex,photo,photoBack=null) => {
  const form=new FormData(); form.append("name",name); form.append("hex",hex); form.append("photo",photo);
  if(photoBack) form.append("photoBack",photoBack);
  return request("/admin/shirt-colors",{method:"POST",headers:{"x-admin-password":pw},body:form});
};
export const adminAddShirtColorBack = (pw,id,photoBack) => {
  const form=new FormData(); form.append("photoBack",photoBack);
  return request(`/admin/shirt-colors/${encodeURIComponent(id)}`,{method:"PATCH",headers:{"x-admin-password":pw},body:form});
};
export const adminPatchShirtColor  = (pw,id,data) =>
  request(`/admin/shirt-colors/${encodeURIComponent(id)}`,j("PATCH",data,pw));
export const adminDeleteShirtColor = (pw,id) =>
  request(`/admin/shirt-colors/${encodeURIComponent(id)}`,{method:"DELETE",...auth(pw)});

export const adminAddInkColor    = (pw,data) => request("/admin/ink-colors",j("POST",data,pw));
export const adminPatchInkColor  = (pw,id,data) =>
  request(`/admin/ink-colors/${encodeURIComponent(id)}`,j('PATCH',data,pw));
export const adminDeleteInkColor = (pw,id)   =>
  request(`/admin/ink-colors/${encodeURIComponent(id)}`,{method:"DELETE",...auth(pw)});

export const adminAddDesign    = (pw,name) => request("/admin/designs",j("POST",{name},pw));
export const adminPatchDesignStatus = (pw,id,status) =>
  request(`/admin/designs/${encodeURIComponent(id)}`,j('PATCH',{status},pw));
export const adminPatchDesign  = (pw,id,data) =>
  request(`/admin/designs/${encodeURIComponent(id)}`,j("PATCH",data,pw));
export const adminDuplicateDesign = (pw,id) => request(`/admin/designs/${encodeURIComponent(id)}/duplicate`,{method:"POST",...{headers:{"x-admin-password":pw}}});
export const adminDuplicateDesign = (pw,id) => request(`/admin/designs/${encodeURIComponent(id)}/duplicate`,{method:"POST",headers:{"x-admin-password":pw}});
export const adminDeleteDesign = (pw,id) =>
  request(`/admin/designs/${encodeURIComponent(id)}`,{method:"DELETE",...auth(pw)});

export const adminAddLayer    = (pw,designId,name,defaultInkId,pngFile,side,zoneId,pendingZones) => {
  const form=new FormData();
  form.append("name",name); form.append("defaultInkId",defaultInkId); form.append("png",pngFile);
  if(side)         form.append("side",side);
  if(zoneId)       form.append("zoneId",zoneId);
  if(pendingZones) form.append("pendingZones",JSON.stringify(pendingZones));
  return request(`/admin/designs/${encodeURIComponent(designId)}/layers`,
    {method:"POST",headers:{"x-admin-password":pw},body:form});
};
export const adminPatchLayer  = (pw,designId,lid,data) =>
  request(`/admin/designs/${encodeURIComponent(designId)}/layers/${encodeURIComponent(lid)}`,
    j("PATCH",data,pw));
export const adminDeleteLayer = (pw,designId,lid) =>
  request(`/admin/designs/${encodeURIComponent(designId)}/layers/${encodeURIComponent(lid)}`,
    {method:"DELETE",...auth(pw)});

export const adminReorderLayers = (pw,designId,order) =>
  request(`/admin/designs/${encodeURIComponent(designId)}/layer-order`,
    j('PATCH',{order},pw));

// ── PSD AUTO EXTRACT ──────────────────────────────────────
export const adminExtractPsd = (pw, psdFile) => {
  const form = new FormData();
  form.append("psd", psdFile);
  return request("/admin/psd-extract",
    {method:"POST", headers:{"x-admin-password":pw}, body:form});
};

export const adminCreateDesignFromPsd = (pw, name, layers, printArea) =>
  request("/admin/designs-from-psd", j("POST", {name,layers,printArea}, pw));

export const adminPatchShirtColorFull = (pw,id,name,hex,photoFront,photoBack,removeBack) => {
  const form=new FormData();
  if(name) form.append('name',name);
  if(hex)  form.append('hex',hex);
  if(photoFront) form.append('photo',photoFront);
  if(photoBack)  form.append('photoBack',photoBack);
  if(removeBack) form.append('removeBack','1');
  return request(`/admin/shirt-colors/${encodeURIComponent(id)}`,
    {method:'PATCH',headers:{'x-admin-password':pw},body:form});
};

export const adminPatchLayerFull = (pw,designId,lid,name,defaultInkId,pngFile) => {
  const form=new FormData();
  if(name) form.append('name',name);
  if(defaultInkId) form.append('defaultInkId',defaultInkId);
  if(pngFile) form.append('png',pngFile);
  return request(`/admin/designs/${encodeURIComponent(designId)}/layers/${encodeURIComponent(lid)}`,
    {method:'PATCH',headers:{'x-admin-password':pw},body:form});
};

export const adminSetPrintAreaBack = (pw,id,printAreaBack) =>
  request(`/admin/designs/${encodeURIComponent(id)}`,j('PATCH',{printAreaBack},pw));

export const adminGetAccounts    = pw => request('/admin/accounts', {headers:{'x-admin-password':pw}});
export const adminAddAccount     = (pw,name,password,role='staff') => request('/admin/accounts',j('POST',{name,password,role},pw));
export const adminDeleteAccount  = (pw,id) => request(`/admin/accounts/${encodeURIComponent(id)}`,{method:'DELETE',headers:{'x-admin-password':pw}});
