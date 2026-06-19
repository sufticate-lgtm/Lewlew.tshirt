@import url("https://fonts.googleapis.com/css2?family=Anton&family=Work+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap");

:root {
  --paper: #f6f2e9;
  --ink: #181816;
  --orange: #ff5a1f;
  --blue: #2c4a6e;
  --line: #ddd5c2;
  --surface: #ffffff;
  --green: #3f6b4a;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: "Work Sans", system-ui, sans-serif;
  background: var(--paper);
  color: var(--ink);
}

#root { display: flex; flex-direction: column; min-height: 100vh; }

.xi-display { font-family: "Anton", sans-serif; text-transform: uppercase; letter-spacing: 0.03em; }
.xi-mono { font-family: "JetBrains Mono", monospace; }

.xi-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 28px; border-bottom: 2px solid var(--ink);
  position: sticky; top: 0; background: var(--paper); z-index: 10; flex-wrap: wrap; gap: 10px;
}
.xi-logo { font-family: "Anton", sans-serif; font-size: 22px; letter-spacing: 0.04em; text-decoration: none; color: var(--ink); }
.xi-logo span { color: var(--orange); }
.xi-nav { display: flex; gap: 6px; }
.xi-nav a { font-weight: 600; font-size: 14px; padding: 8px 14px; text-decoration: none; color: var(--ink); border-radius: 3px; opacity: 0.6; }
.xi-nav a.active { opacity: 1; background: var(--ink); color: var(--paper); }
.xi-cart-btn {
  display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 14px;
  padding: 9px 16px; border: 2px solid var(--ink); background: var(--surface); border-radius: 3px;
  text-decoration: none; color: var(--ink);
}
.xi-badge {
  background: var(--orange); color: #fff; font-size: 11px; font-weight: 700; border-radius: 50%;
  width: 18px; height: 18px; display: flex; align-items: center; justify-content: center;
}

.xi-main { flex: 1; padding: 32px 28px 80px; max-width: 1100px; width: 100%; margin: 0 auto; }

.xi-eyebrow { font-family: "JetBrains Mono"; font-size: 12px; letter-spacing: 0.08em; color: var(--blue); text-transform: uppercase; margin-bottom: 4px; }
.xi-title { font-family: "Anton"; font-size: 30px; margin: 0 0 8px; text-transform: uppercase; }
.xi-subtitle { font-size: 14px; color: #6b675c; margin: 0 0 26px; max-width: 560px; }

.xi-studio-grid { display: grid; grid-template-columns: 1.1fr 1fr; gap: 40px; align-items: start; }
@media (max-width: 760px) { .xi-studio-grid { grid-template-columns: 1fr; } }

.xi-preview-card {
  background: var(--surface); border: 2px solid var(--ink); border-radius: 6px; padding: 24px;
  display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; min-height: 380px;
}
.xi-swipe-bar {
  position: absolute; top: 0; left: 0; width: 45%; height: 100%;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.6), transparent);
  animation: xi-swipe 0.65s ease-out; pointer-events: none;
}
@keyframes xi-swipe { from { transform: translateX(-130%) skewX(-12deg); } to { transform: translateX(230%) skewX(-12deg); } }
@keyframes xi-spin { to { transform: rotate(360deg); } }
.xi-spin { animation: xi-spin 1s linear infinite; }

.xi-section { margin-bottom: 24px; }
.xi-label { font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 10px; display: block; }

.xi-swatch-row { display: flex; gap: 10px; flex-wrap: wrap; }
.xi-swatch { width: 36px; height: 36px; border-radius: 50% 50% 50% 6px; border: 2px solid var(--ink); cursor: pointer; transition: transform 0.15s; padding: 0; }
.xi-swatch:hover { transform: scale(1.1); }
.xi-swatch.selected { box-shadow: 0 0 0 3px var(--paper), 0 0 0 5px var(--ink); transform: scale(1.05); }

.xi-design-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
@media (max-width: 480px) { .xi-design-grid { grid-template-columns: repeat(2, 1fr); } }
.xi-design-thumb { background: var(--surface); border: 2px solid var(--line); border-radius: 6px; padding: 8px; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 6px; }
.xi-design-thumb.selected { border-color: var(--ink); }
.xi-design-thumb span { font-size: 11px; font-weight: 600; text-align: center; }

.xi-size-row { display: flex; gap: 8px; flex-wrap: wrap; }
.xi-size-btn { width: 46px; height: 40px; border: 2px solid var(--ink); background: var(--surface); font-weight: 700; cursor: pointer; border-radius: 3px; }
.xi-size-btn.selected { background: var(--ink); color: var(--paper); }

.xi-qty { display: flex; align-items: center; gap: 14px; border: 2px solid var(--ink); border-radius: 3px; width: fit-content; padding: 4px; }
.xi-qty button { width: 30px; height: 30px; border: none; background: var(--paper); cursor: pointer; display: flex; align-items: center; justify-content: center; border-radius: 2px; }
.xi-qty span { font-family: "JetBrains Mono"; font-weight: 600; min-width: 20px; text-align: center; }

.xi-sticky-bar { display: flex; align-items: center; justify-content: space-between; border-top: 2px solid var(--ink); padding-top: 20px; margin-top: 10px; flex-wrap: wrap; gap: 14px; }
.xi-price { font-family: "Anton"; font-size: 26px; }
.xi-btn-primary { display: flex; align-items: center; gap: 8px; background: var(--orange); color: #fff; font-weight: 700; font-size: 15px; padding: 14px 26px; border: none; border-radius: 3px; cursor: pointer; }
.xi-btn-primary:hover { filter: brightness(1.06); }
.xi-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.xi-btn-secondary { display: flex; align-items: center; gap: 8px; background: transparent; color: var(--ink); font-weight: 600; font-size: 14px; padding: 12px 20px; border: 2px solid var(--ink); border-radius: 3px; cursor: pointer; text-decoration: none; }

.xi-cart-list { display: flex; flex-direction: column; gap: 14px; }
.xi-cart-item { display: flex; gap: 16px; background: var(--surface); border: 2px solid var(--line); border-radius: 6px; padding: 14px; align-items: center; flex-wrap: wrap; }
.xi-cart-item-info { flex: 1; min-width: 160px; }
.xi-cart-item-title { font-weight: 700; margin-bottom: 4px; }
.xi-cart-item-meta { font-family: "JetBrains Mono"; font-size: 12px; color: #6b675c; }
.xi-cart-item-actions { display: flex; align-items: center; gap: 14px; }
.xi-remove-btn { background: none; border: none; cursor: pointer; color: #a8453a; }

.xi-summary-box { background: var(--surface); border: 2px solid var(--ink); border-radius: 6px; padding: 20px; }
.xi-summary-row { display: flex; justify-content: space-between; font-size: 14px; padding: 6px 0; gap: 10px; }
.xi-summary-row.total { font-weight: 700; font-size: 18px; border-top: 2px solid var(--line); margin-top: 8px; padding-top: 12px; }

.xi-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 600px) { .xi-form-grid { grid-template-columns: 1fr; } }
.xi-field { display: flex; flex-direction: column; gap: 6px; }
.xi-field label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
.xi-field input, .xi-field textarea, .xi-field select {
  border: 2px solid var(--ink); border-radius: 3px; padding: 10px 12px; font-family: "Work Sans"; font-size: 14px; background: var(--surface);
}
.xi-field input:focus, .xi-field textarea:focus { outline: 3px solid var(--blue); outline-offset: 1px; }

.xi-payment-row { display: flex; flex-direction: column; gap: 10px; }
.xi-payment-opt { display: flex; align-items: center; gap: 12px; border: 2px solid var(--line); border-radius: 6px; padding: 14px; cursor: pointer; }
.xi-payment-opt.selected { border-color: var(--ink); background: #fff; }

.xi-confirm { text-align: center; padding: 50px 20px; }
.xi-confirm-icon { width: 64px; height: 64px; border-radius: 50%; background: var(--green); color: #fff; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
.xi-order-code { font-family: "JetBrains Mono"; font-size: 20px; font-weight: 600; background: var(--ink); color: var(--paper); display: inline-block; padding: 8px 16px; border-radius: 3px; margin: 14px 0; }

.xi-orders-list { display: flex; flex-direction: column; gap: 14px; }
.xi-order-card { background: var(--surface); border: 2px solid var(--line); border-radius: 6px; padding: 16px; }
.xi-order-head { display: flex; justify-content: space-between; align-items: center; cursor: pointer; flex-wrap: wrap; gap: 10px; }
.xi-status-pill { font-size: 11px; font-weight: 700; background: #fcefd9; color: #9c5b0e; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; }

.xi-empty { text-align: center; padding: 60px 20px; color: #6b675c; }
.xi-error { background: #fbe4e1; border: 2px solid #a8453a; color: #7a2e25; padding: 12px 16px; border-radius: 6px; font-size: 14px; margin-bottom: 16px; }

.xi-toast { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); background: var(--ink); color: var(--paper); padding: 12px 22px; border-radius: 30px; font-weight: 600; font-size: 14px; z-index: 50; }

.xi-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px 28px; border-top: 1px solid var(--line); font-size: 12px; color: #8a8576; flex-wrap: wrap; gap: 8px; }

.xi-loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 80px 0; color: #6b675c; }

/* Admin */
.xi-admin-login { max-width: 360px; margin: 60px auto; text-align: center; }
.xi-tabs { display: flex; gap: 6px; border-bottom: 2px solid var(--ink); margin-bottom: 24px; flex-wrap: wrap; }
.xi-tabs button { font-weight: 700; font-size: 14px; padding: 10px 16px; border: none; background: transparent; cursor: pointer; opacity: 0.55; border-bottom: 3px solid transparent; }
.xi-tabs button.active { opacity: 1; border-bottom-color: var(--orange); }
.xi-admin-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
.xi-admin-row { display: flex; align-items: center; gap: 14px; background: var(--surface); border: 2px solid var(--line); border-radius: 6px; padding: 10px 14px; }
.xi-admin-row .grow { flex: 1; }
.xi-swatch-sm { width: 26px; height: 26px; border-radius: 50% 50% 50% 6px; border: 2px solid var(--ink); flex-shrink: 0; }
