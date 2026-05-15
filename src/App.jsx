import { useState, useRef, useCallback, useEffect } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const SESSIONS = ["Asia", "London", "Pre-market NY AM", "NY AM Macro 09:45–10:15", "NY AM Macro 10:45–11:15"];
const TIMEFRAMES = ["1M", "3M", "5M", "15M", "30M", "1H", "4H", "D", "W"];
const DEFAULT_MODELS = ["ICT 2022 Model", "OB tiếp diễn (OB đầu tiên sau MSS)"];
const CONFLUENCES = ["FVG", "IFVG", "BPR", "OB", "Breaker", "SMT", "Rejection Block", "Propulsion Block", "Void/CE", "SIBI", "BISI", "EQH/EQL", "Wick Fill"];
const PSYCHOLOGY_OPTIONS = ["Tự tin, kiên nhẫn", "FOMO", "Revenge trade", "Hồi hộp, lo lắng", "Overconfident", "Do dự, vào trễ", "Bình tĩnh, theo plan", "Thoát sớm vì sợ", "Để lệnh chạy tốt"];

const emptyForm = () => ({
  id: Date.now(),
  date: new Date().toISOString().slice(0, 10),
  ticker: "", position: "", structure: "", priceAction: "", dol: "",
  selectedModels: [], confluences: [], entryTF: "", session: "",
  psychologyTags: [], psychology: "", lesson: "", images: [], result: "", pnl: "",
  setupChecks: {},
});

const STORAGE_KEY = "my_journal_trades";
const MODELS_KEY = "my_journal_models";
const SETUPS_KEY = "my_journal_setups";

function loadTrades() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
function saveTrades(trades) { localStorage.setItem(STORAGE_KEY, JSON.stringify(trades)); }
function loadModels() { try { return JSON.parse(localStorage.getItem(MODELS_KEY)) || DEFAULT_MODELS; } catch { return DEFAULT_MODELS; } }
function saveModels(models) { localStorage.setItem(MODELS_KEY, JSON.stringify(models)); }
function loadSetups() { try { return JSON.parse(localStorage.getItem(SETUPS_KEY)) || []; } catch { return []; } }
function saveSetups(setups) { localStorage.setItem(SETUPS_KEY, JSON.stringify(setups)); }

// ─── Export ──────────────────────────────────────────────────────────────────
async function exportCard(tradeId, format = "png") {
  const el = document.getElementById(`export-card-${tradeId}`);
  if (!el) return;
  el.style.display = "block";
  await new Promise(r => setTimeout(r, 150));
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  el.style.display = "none";
  if (format === "pdf") {
    const imgData = canvas.toDataURL("image/png");
    const mmW = (canvas.width / 2) * 0.2646;
    const mmH = (canvas.height / 2) * 0.2646;
    const pdf = new jsPDF({ orientation: mmW > mmH ? "landscape" : "portrait", unit: "mm", format: [mmW, mmH] });
    pdf.addImage(imgData, "PNG", 0, 0, mmW, mmH);
    pdf.save(`trade-${tradeId}.pdf`);
  } else {
    const link = document.createElement("a");
    link.download = `trade-${tradeId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }
}

// ─── Export Card ─────────────────────────────────────────────────────────────
function ExportCard({ trade }) {
  const pos = trade.position;
  const posStyle = pos === "Buy" ? { background: "#EAF3DE", color: "#3B6D11", border: "1px solid #97C459" } : { background: "#FCEBEB", color: "#A32D2D", border: "1px solid #F09595" };
  const resStyle = trade.result === "Win" ? { color: "#3B6D11" } : trade.result === "Loss" ? { color: "#A32D2D" } : { color: "#854F0B" };
  const Row = ({ label, value }) => {
    if (!value || (Array.isArray(value) && !value.length)) return null;
    const text = Array.isArray(value) ? value.join("  ·  ") : value;
    return (
      <div style={{ padding: "10px 0", borderBottom: "0.5px solid #e8e8e4" }}>
        <div style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 14, color: "#222", lineHeight: 1.6 }}>{text}</div>
      </div>
    );
  };
  return (
    <div id={`export-card-${trade.id}`} style={{ display: "none", width: 800, padding: 40, background: "#fff", fontFamily: "system-ui, sans-serif", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, paddingBottom: 16, borderBottom: "1.5px solid #e8e8e4" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 26, fontWeight: 600, color: "#111" }}>{trade.ticker || "—"}</span>
          {pos && <span style={{ ...posStyle, borderRadius: 6, padding: "3px 12px", fontSize: 13, fontWeight: 500 }}>{pos === "Buy" ? "▲ Buy" : "▼ Sell"}</span>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "#888" }}>{trade.date}</div>
          {trade.result && <div style={{ ...resStyle, fontSize: 14, fontWeight: 600, marginTop: 2 }}>{trade.result}{trade.pnl ? `  ${trade.pnl}` : ""}</div>}
        </div>
      </div>
      <Row label="Structure & Bias (HTF)" value={trade.structure} />
      <Row label="Price Action (LTF)" value={trade.priceAction} />
      <Row label="DOL (Draw on Liquidity)" value={trade.dol} />
      <Row label="Entry Model" value={trade.selectedModels} />
      <Row label="Entry TF · Session" value={[trade.entryTF, trade.session].filter(Boolean).join("  ·  ")} />
      <Row label="Confluences" value={trade.confluences} />
      <Row label="Tâm lý" value={[...(trade.psychologyTags || []), trade.psychology].filter(Boolean)} />
      <Row label="Bài học" value={trade.lesson} />
      {trade.images?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", marginBottom: 10 }}>Chart</div>
          {trade.images.map((img, i) => <img key={i} src={img.url} alt={img.name} crossOrigin="anonymous" style={{ width: "100%", marginBottom: 12, borderRadius: 6, display: "block", border: "0.5px solid #e8e8e4" }} />)}
        </div>
      )}
      <div style={{ marginTop: 20, fontSize: 11, color: "#bbb", textAlign: "right" }}>My Trading Journal</div>
    </div>
  );
}

// ─── UI Components ────────────────────────────────────────────────────────────
function Badge({ label, color = "gray" }) {
  const colors = { buy: { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459" }, sell: { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" }, gray: { bg: "#f1f1ee", text: "#5F5E5A", border: "#B4B2A9" }, win: { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459" }, loss: { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" }, be: { bg: "#FAEEDA", text: "#854F0B", border: "#EF9F27" } };
  const c = colors[color] || colors.gray;
  return <span style={{ background: c.bg, color: c.text, border: `0.5px solid ${c.border}`, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 500 }}>{label}</span>;
}

function ImageUpload({ images, onChange }) {
  const ref = useRef();
  const handleFiles = (e) => {
    Array.from(e.target.files).forEach(f => {
      const reader = new FileReader();
      reader.onload = ev => onChange(prev => [...prev, { name: f.name, url: ev.target.result }]);
      reader.readAsDataURL(f);
    });
    e.target.value = "";
  };
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10, marginBottom: images.length ? 10 : 0 }}>
        {images.map((img, i) => (
          <div key={i} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "0.5px solid #ddd", background: "#000" }}>
            <img src={img.url} alt={img.name} style={{ width: "100%", aspectRatio: "16/9", objectFit: "contain", display: "block" }} />
            <button onClick={() => onChange(prev => prev.filter((_, j) => j !== i))} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.55)", color: "#fff", border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 12 }}>✕</button>
            <div style={{ padding: "4px 8px", fontSize: 11, color: "#888", background: "#f8f8f8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{img.name}</div>
          </div>
        ))}
      </div>
      <button onClick={() => ref.current.click()} style={btnStyle}>+ Thêm ảnh</button>
      <input ref={ref} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFiles} />
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const btnStyle = { fontSize: 13, padding: "5px 14px", cursor: "pointer", borderRadius: 7, border: "0.5px solid #ccc", background: "#fff" };
const primaryBtn = { ...btnStyle, background: "#1a1a1a", color: "#fff", border: "1px solid #1a1a1a", fontSize: 14, padding: "8px 22px", fontWeight: 500 };
const inp = { fontSize: 14, width: "100%", boxSizing: "border-box", padding: "7px 10px", border: "0.5px solid #ccc", borderRadius: 7, outline: "none" };
const chipStyle = (active, c) => ({ fontSize: 12, padding: "4px 12px", cursor: "pointer", borderRadius: 20, background: active ? c.bg : "transparent", color: active ? c.text : "#777", border: `1px solid ${active ? c.border : "#ddd"}`, fontWeight: active ? 500 : 400 });

// ─── Setup Checklist ──────────────────────────────────────────────────────────
function SetupChecklist({ setup, checks, onChange }) {
  const checkedCount = checks.filter(Boolean).length;
  const total = setup.steps.length;
  const allDone = checkedCount === total && total > 0;
  return (
    <div style={{ border: `1px solid ${allDone ? "#97C459" : "#e5e5e5"}`, borderRadius: 10, overflow: "hidden", background: allDone ? "#f9fdf5" : "#fff", transition: "all 0.2s" }}>
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: allDone ? "#EAF3DE" : "#f7f7f5", borderBottom: `0.5px solid ${allDone ? "#97C459" : "#e5e5e5"}` }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: allDone ? "#3B6D11" : "#333" }}>{setup.name}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: allDone ? "#3B6D11" : checkedCount > 0 ? "#854F0B" : "#bbb" }}>{checkedCount}/{total} {allDone ? "✓" : ""}</span>
      </div>
      <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
        {setup.steps.map((step, idx) => (
          <label key={idx} style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", padding: "5px 6px", borderRadius: 6, background: checks[idx] ? "#f0fae8" : "transparent", transition: "background 0.15s" }}>
            <input type="checkbox" checked={checks[idx] || false} onChange={() => { const n = [...checks]; n[idx] = !n[idx]; onChange(n); }} style={{ marginTop: 2, accentColor: "#3B6D11", width: 15, height: 15, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: checks[idx] ? "#3B6D11" : "#444", lineHeight: 1.5 }}><span style={{ color: "#bbb", marginRight: 5, fontWeight: 500 }}>{idx + 1}.</span>{step}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// ─── New Trade Flow ───────────────────────────────────────────────────────────
function NewTradeFlow({ initial, onSave, onCancel, allModels, onAddModel, setups }) {
  const isEditing = !!initial;
  const [step, setStep] = useState(isEditing ? "form" : "position");
  const [form, setForm] = useState(initial || emptyForm());
  const [newModel, setNewModel] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleArr = (k, v) => { const a = form[k] || []; set(k, a.includes(v) ? a.filter(x => x !== v) : [...a, v]); };
  const handleImages = useCallback(u => setForm(f => ({ ...f, images: typeof u === "function" ? u(f.images) : u })), []);
  const addModel = () => { if (!newModel.trim()) return; onAddModel(newModel.trim()); set("selectedModels", [...form.selectedModels, newModel.trim()]); setNewModel(""); };
  const handleSetupCheck = (setupId, newChecks) => { setForm(f => ({ ...f, setupChecks: { ...f.setupChecks, [setupId]: newChecks } })); };

  const lbl = txt => <div style={{ fontSize: 12, color: "#777", marginBottom: 5, fontWeight: 500 }}>{txt}</div>;
  const sec = title => <div style={{ fontSize: 13, fontWeight: 600, color: "#888", borderBottom: "0.5px solid #e5e5e5", paddingBottom: 5, marginBottom: 12, marginTop: 10, letterSpacing: 0.3 }}>{title.toUpperCase()}</div>;

  const isBuy = form.position === "Buy";
  const selectedSetupIds = form.selectedSetupIds || [];
  const selectedSetups = setups.filter(s => selectedSetupIds.includes(s.id));

  // Step 1: Position
  if (step === "position") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 80, paddingBottom: 80, gap: 32 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#333", marginBottom: 8 }}>Bạn đang vào lệnh nào?</div>
          <div style={{ fontSize: 13, color: "#aaa" }}>Chọn hướng giao dịch</div>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <button onClick={() => { set("position", "Buy"); setStep("setup"); }} style={{ width: 160, height: 100, cursor: "pointer", borderRadius: 14, border: "1.5px solid #97C459", background: "#EAF3DE", color: "#3B6D11", fontSize: 22, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 2px 8px rgba(59,109,17,0.10)", transition: "transform 0.1s" }}>
            <span style={{ fontSize: 28 }}>▲</span>
            <span>Buy</span>
          </button>
          <button onClick={() => { set("position", "Sell"); setStep("setup"); }} style={{ width: 160, height: 100, cursor: "pointer", borderRadius: 14, border: "1.5px solid #F09595", background: "#FCEBEB", color: "#A32D2D", fontSize: 22, fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 2px 8px rgba(163,45,45,0.10)", transition: "transform 0.1s" }}>
            <span style={{ fontSize: 28 }}>▼</span>
            <span>Sell</span>
          </button>
        </div>
        {onCancel && <button onClick={onCancel} style={{ ...btnStyle, color: "#aaa" }}>Huỷ</button>}
      </div>
    );
  }

  // Step 2: Setup
  if (step === "setup") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <button onClick={() => setStep("position")} style={{ ...btnStyle, color: "#aaa", padding: "4px 10px", fontSize: 12 }}>← Quay lại</button>
          <span style={{ padding: "3px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, background: isBuy ? "#EAF3DE" : "#FCEBEB", color: isBuy ? "#3B6D11" : "#A32D2D", border: `1px solid ${isBuy ? "#97C459" : "#F09595"}` }}>{isBuy ? "▲ Buy" : "▼ Sell"}</span>
        </div>
        <div style={{ textAlign: "center", paddingBottom: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#333", marginBottom: 4 }}>Chọn setup / chiến lược</div>
          <div style={{ fontSize: 13, color: "#aaa" }}>Có thể chọn nhiều setup cùng lúc</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {setups.map(setup => {
            const selected = selectedSetupIds.includes(setup.id);
            return (
              <button key={setup.id} onClick={() => { const curr = form.selectedSetupIds || []; const next = curr.includes(setup.id) ? curr.filter(id => id !== setup.id) : [...curr, setup.id]; set("selectedSetupIds", next); }} style={{ textAlign: "left", padding: "14px 16px", borderRadius: 12, cursor: "pointer", border: `1.5px solid ${selected ? "#185FA5" : "#e5e5e5"}`, background: selected ? "#EBF4FD" : "#fff", boxShadow: selected ? "0 0 0 3px rgba(24,95,165,0.08)" : "0 1px 3px rgba(0,0,0,0.04)", transition: "all 0.15s" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: selected ? "#185FA5" : "#222" }}>{selected ? "✓ " : ""}{setup.name}</span>
                  <span style={{ fontSize: 11, color: "#aaa" }}>{setup.steps.length} bước</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {setup.steps.slice(0, 4).map((step, i) => (<span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#f1f1ee", color: "#666", border: "0.5px solid #ddd" }}>{i + 1}. {step}</span>))}
                  {setup.steps.length > 4 && <span style={{ fontSize: 11, color: "#bbb" }}>+{setup.steps.length - 4} nữa</span>}
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={() => setStep("form")} style={{ ...btnStyle, color: "#aaa" }}>Bỏ qua setup</button>
          <button onClick={() => setStep("form")} style={primaryBtn}>Tiếp tục →</button>
        </div>
      </div>
    );
  }

  // Step 3: Form
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!isEditing && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <button onClick={() => setStep("setup")} style={{ ...btnStyle, color: "#aaa", padding: "4px 10px", fontSize: 12 }}>← Quay lại</button>
          <span style={{ padding: "3px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, background: isBuy ? "#EAF3DE" : "#FCEBEB", color: isBuy ? "#3B6D11" : "#A32D2D", border: `1px solid ${isBuy ? "#97C459" : "#F09595"}` }}>{isBuy ? "▲ Buy" : "▼ Sell"}</span>
          {selectedSetups.map(s => (<span key={s.id} style={{ padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: "#EBF4FD", color: "#185FA5", border: "1px solid #85B7EB" }}>{s.name}</span>))}
        </div>
      )}

      {selectedSetups.length > 0 && (
        <>
          {sec("Pre-trade checklist")}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {selectedSetups.map(setup => (
              <SetupChecklist key={setup.id} setup={setup} checks={form.setupChecks?.[setup.id] || setup.steps.map(() => false)} onChange={(newChecks) => handleSetupCheck(setup.id, newChecks)} />
            ))}
          </div>
        </>
      )}

      {sec("Thông tin lệnh")}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>{lbl("Ngày")}<input type="date" value={form.date} onChange={e => set("date", e.target.value)} style={inp} /></div>
        <div>{lbl("Ticker")}<input type="text" placeholder="NQ, ES, EURUSD..." value={form.ticker} onChange={e => set("ticker", e.target.value.toUpperCase())} style={inp} /></div>
      </div>

      {isEditing && (
        <div>{lbl("Position")}<div style={{ display: "flex", gap: 8 }}>{["Buy", "Sell"].map(p => (<button key={p} onClick={() => set("position", p)} style={{ flex: 1, padding: "7px 0", cursor: "pointer", fontWeight: 500, fontSize: 14, borderRadius: 8, background: form.position === p ? (p === "Buy" ? "#EAF3DE" : "#FCEBEB") : "#fff", color: form.position === p ? (p === "Buy" ? "#3B6D11" : "#A32D2D") : "#777", border: `1.5px solid ${form.position === p ? (p === "Buy" ? "#97C459" : "#F09595") : "#ddd"}` }}>{p === "Buy" ? "▲ Buy" : "▼ Sell"}</button>))}</div></div>
      )}

      {sec("Lý do vào lệnh")}
      <div>{lbl("Structure & Bias (HTF)")}<textarea rows={2} placeholder="vd: Bias Bullish trên HTF, giá đang retrace về discount..." value={form.structure} onChange={e => set("structure", e.target.value)} style={{ ...inp, resize: "vertical" }} /></div>
      <div>{lbl("Price action — đã quét thanh khoản? Chạm HTF PDA? (LTF)")}<textarea rows={2} placeholder="vd: Giá đã quét BSL tại 19250, rebalance về OB trên 4H..." value={form.priceAction} onChange={e => set("priceAction", e.target.value)} style={{ ...inp, resize: "vertical" }} /></div>
      <div>{lbl("DOL (Draw on Liquidity) — giá đang có xu hướng tiến tới đâu?")}<input type="text" placeholder="vd: EQH 19480, BSL tại 19550, NWOG..." value={form.dol} onChange={e => set("dol", e.target.value)} style={inp} /></div>

      <div>
        {lbl("Entry model")}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 8 }}>
          {allModels.map(m => (<button key={m} onClick={() => toggleArr("selectedModels", m)} style={chipStyle(form.selectedModels.includes(m), { bg: "#EEEDFE", text: "#3C3489", border: "#AFA9EC" })}>{form.selectedModels.includes(m) ? "✓ " : ""}{m}</button>))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="text" placeholder="+ Thêm model mới..." value={newModel} onChange={e => setNewModel(e.target.value)} onKeyDown={e => e.key === "Enter" && addModel()} style={{ ...inp, flex: 1, fontSize: 13 }} />
          <button onClick={addModel} style={btnStyle}>Thêm</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          {lbl("Entry timeframe")}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {TIMEFRAMES.map(tf => (<button key={tf} onClick={() => set("entryTF", tf)} style={chipStyle(form.entryTF === tf, { bg: "#E6F1FB", text: "#185FA5", border: "#85B7EB" })}>{tf}</button>))}
          </div>
        </div>
        <div>
          {lbl("Session")}
          <select value={form.session} onChange={e => set("session", e.target.value)} style={{ ...inp, marginTop: 4 }}>
            <option value="">Chọn session...</option>
            {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        {lbl("Yếu tố ủng hộ cho lệnh")}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {CONFLUENCES.map(c => (<button key={c} onClick={() => toggleArr("confluences", c)} style={chipStyle((form.confluences || []).includes(c), { bg: "#E1F5EE", text: "#0F6E56", border: "#5DCAA5" })}>{(form.confluences || []).includes(c) ? "✓ " : ""}{c}</button>))}
        </div>
      </div>

      {sec("Sau lệnh")}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          {lbl("Kết quả")}
          <div style={{ display: "flex", gap: 8 }}>
            {["Win", "Loss", "BE"].map(r => (<button key={r} onClick={() => set("result", r)} style={{ flex: 1, padding: "6px 0", cursor: "pointer", fontSize: 13, fontWeight: 500, borderRadius: 8, background: form.result === r ? (r === "Win" ? "#EAF3DE" : r === "Loss" ? "#FCEBEB" : "#FAEEDA") : "#fff", color: form.result === r ? (r === "Win" ? "#3B6D11" : r === "Loss" ? "#A32D2D" : "#854F0B") : "#777", border: `1.5px solid ${form.result === r ? (r === "Win" ? "#97C459" : r === "Loss" ? "#F09595" : "#EF9F27") : "#ddd"}` }}>{r}</button>))}
          </div>
        </div>
        <div>{lbl("P&L (R hoặc $)")}<input type="text" placeholder="+2R hoặc +250$" value={form.pnl} onChange={e => set("pnl", e.target.value)} style={inp} /></div>
      </div>

      <div>
        {lbl("Tâm lý")}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 6 }}>
          {PSYCHOLOGY_OPTIONS.map(p => (<button key={p} onClick={() => toggleArr("psychologyTags", p)} style={chipStyle((form.psychologyTags || []).includes(p), { bg: "#EEEDFE", text: "#3C3489", border: "#AFA9EC" })}>{p}</button>))}
        </div>
        <input type="text" placeholder="Ghi thêm nếu cần..." value={form.psychology} onChange={e => set("psychology", e.target.value)} style={{ ...inp, fontSize: 13 }} />
      </div>

      <div>{lbl("Bài học rút ra")}<textarea rows={2} placeholder="vd: Không trade revenge, chờ confirmation..." value={form.lesson} onChange={e => set("lesson", e.target.value)} style={{ ...inp, resize: "vertical" }} /></div>

      <div>{lbl("Hình ảnh chart (không giới hạn)")}<ImageUpload images={form.images} onChange={handleImages} /></div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
        {onCancel && <button onClick={onCancel} style={btnStyle}>Huỷ</button>}
        <button onClick={() => onSave(form)} style={primaryBtn}>Lưu lệnh</button>
      </div>
    </div>
  );
}

// ─── Trade Card ───────────────────────────────────────────────────────────────
function TradeCard({ trade, onDelete, onEdit, setups }) {
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const resColor = trade.result === "Win" ? "win" : trade.result === "Loss" ? "loss" : "be";
  const handleExport = async (fmt) => { setExporting(true); await exportCard(trade.id, fmt); setExporting(false); };
  const relevantSetups = setups.filter(s => trade.setupChecks && trade.setupChecks[s.id]);
  return (
    <>
      <ExportCard trade={trade} />
      <div style={{ background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 12, overflow: "hidden", marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
          <span style={{ fontSize: 13, color: "#999", minWidth: 88 }}>{trade.date}</span>
          <span style={{ fontWeight: 600, fontSize: 15, minWidth: 65 }}>{trade.ticker || "—"}</span>
          {trade.position && <Badge label={trade.position} color={trade.position === "Buy" ? "buy" : "sell"} />}
          {trade.result && <Badge label={trade.result} color={resColor} />}
          {trade.pnl && <span style={{ fontSize: 13, fontWeight: 500, color: trade.result === "Win" ? "#3B6D11" : trade.result === "Loss" ? "#A32D2D" : "#854F0B" }}>{trade.pnl}</span>}
          {trade.session && <span style={{ fontSize: 12, color: "#aaa", marginLeft: "auto" }}>{trade.session}</span>}
          <span style={{ fontSize: 11, color: "#bbb", marginLeft: trade.session ? 6 : "auto" }}>{expanded ? "▲" : "▼"}</span>
        </div>
        {expanded && (
          <div style={{ padding: "12px 16px", borderTop: "0.5px solid #f0f0f0", display: "flex", flexDirection: "column", gap: 9 }}>
            {relevantSetups.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 4 }}>
                {relevantSetups.map(setup => {
                  const checks = trade.setupChecks[setup.id] || [];
                  const done = checks.filter(Boolean).length;
                  const total = setup.steps.length;
                  return (
                    <div key={setup.id} style={{ background: "#f7f7f5", borderRadius: 8, padding: "8px 12px" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 5 }}>{setup.name} — <span style={{ color: done === total ? "#3B6D11" : "#854F0B" }}>{done}/{total} bước</span></div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {setup.steps.map((step, idx) => (<span key={idx} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: checks[idx] ? "#EAF3DE" : "#f1f1ee", color: checks[idx] ? "#3B6D11" : "#aaa", border: `0.5px solid ${checks[idx] ? "#97C459" : "#ddd"}` }}>{checks[idx] ? "✓" : "○"} {step}</span>))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {trade.structure && <div style={{ fontSize: 13 }}><span style={{ color: "#888", fontWeight: 500 }}>Structure & Bias: </span>{trade.structure}</div>}
            {trade.priceAction && <div style={{ fontSize: 13 }}><span style={{ color: "#888", fontWeight: 500 }}>Price action: </span>{trade.priceAction}</div>}
            {trade.dol && <div style={{ fontSize: 13 }}><span style={{ color: "#888", fontWeight: 500 }}>DOL: </span>{trade.dol}</div>}
            {trade.selectedModels?.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}><span style={{ fontSize: 12, color: "#888", fontWeight: 500, alignSelf: "center" }}>Model: </span>{trade.selectedModels.map(m => <Badge key={m} label={m} />)}</div>}
            {trade.entryTF && <div style={{ fontSize: 13 }}><span style={{ color: "#888" }}>Entry TF: </span>{trade.entryTF}</div>}
            {trade.confluences?.length > 0 && <div style={{ fontSize: 13 }}><span style={{ color: "#888", fontWeight: 500 }}>Confluences: </span>{trade.confluences.join(" · ")}</div>}
            {(trade.psychologyTags?.length > 0 || trade.psychology) && <div style={{ fontSize: 13 }}><span style={{ color: "#888", fontWeight: 500 }}>Tâm lý: </span>{[...(trade.psychologyTags || []), trade.psychology].filter(Boolean).join(" · ")}</div>}
            {trade.lesson && <div style={{ fontSize: 13 }}><span style={{ color: "#888", fontWeight: 500 }}>Bài học: </span>{trade.lesson}</div>}
            {trade.images?.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, marginTop: 4 }}>
                {trade.images.map((img, i) => (<div key={i} style={{ borderRadius: 6, overflow: "hidden", border: "0.5px solid #ddd", background: "#000" }}><img src={img.url} alt={img.name} style={{ width: "100%", aspectRatio: "16/9", objectFit: "contain", display: "block" }} /></div>))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
              <button onClick={() => handleExport("png")} disabled={exporting} style={btnStyle}>{exporting ? "..." : "PNG"}</button>
              <button onClick={() => handleExport("pdf")} disabled={exporting} style={btnStyle}>{exporting ? "..." : "PDF"}</button>
              <button onClick={() => onEdit(trade)} style={btnStyle}>Sửa</button>
              <button onClick={() => onDelete(trade.id)} style={{ ...btnStyle, color: "#c0392b", borderColor: "#f09595" }}>Xoá</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function Stats({ trades }) {
  const wins = trades.filter(t => t.result === "Win").length;
  const losses = trades.filter(t => t.result === "Loss").length;
  const be = trades.filter(t => t.result === "BE").length;
  const total = trades.filter(t => t.result).length;
  const wr = total ? ((wins / total) * 100).toFixed(1) : "—";
  const bySession = SESSIONS.map(s => ({ session: s, count: trades.filter(t => t.session === s).length, wins: trades.filter(t => t.session === s && t.result === "Win").length }));
  const byModel = [...new Set(trades.flatMap(t => t.selectedModels || []))].map(m => ({ model: m, count: trades.filter(t => t.selectedModels?.includes(m)).length, wins: trades.filter(t => t.selectedModels?.includes(m) && t.result === "Win").length }));
  const byConfluence = [...new Set(trades.flatMap(t => t.confluences || []))].map(c => ({ c, count: trades.filter(t => t.confluences?.includes(c)).length, wins: trades.filter(t => t.confluences?.includes(c) && t.result === "Win").length })).sort((a, b) => b.count - a.count);
  const StatCard = ({ label, val, color }) => (<div style={{ background: "#f7f7f5", borderRadius: 8, padding: "14px 16px", textAlign: "center" }}><div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{label}</div><div style={{ fontSize: 24, fontWeight: 600, color: color || "#111" }}>{val}</div></div>);
  const TableRow = ({ label, count, wins }) => (<div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid #f0f0f0", fontSize: 13 }}><span style={{ color: "#333" }}>{label}</span><span style={{ color: "#999" }}>{count} lệnh · <span style={{ color: "#3B6D11", fontWeight: 500 }}>{count ? ((wins / count) * 100).toFixed(0) : 0}% WR</span></span></div>);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        <StatCard label="Tổng lệnh" val={trades.length} />
        <StatCard label="Win rate" val={`${wr}%`} color="#3B6D11" />
        <StatCard label="Win / Loss / BE" val={`${wins} / ${losses} / ${be}`} />
        <StatCard label="Chưa có kết quả" val={trades.length - total} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.3 }}>Theo session</div>
          {bySession.filter(s => s.count > 0).length === 0 && <div style={{ fontSize: 13, color: "#bbb" }}>Chưa có dữ liệu</div>}
          {bySession.filter(s => s.count > 0).map(s => <TableRow key={s.session} label={s.session} count={s.count} wins={s.wins} />)}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.3 }}>Theo entry model</div>
          {byModel.length === 0 && <div style={{ fontSize: 13, color: "#bbb" }}>Chưa có dữ liệu</div>}
          {byModel.map(m => <TableRow key={m.model} label={m.model} count={m.count} wins={m.wins} />)}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.3 }}>Confluence hiệu quả nhất</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
          {byConfluence.length === 0 && <div style={{ fontSize: 13, color: "#bbb" }}>Chưa có dữ liệu</div>}
          {byConfluence.map(({ c, count, wins }) => (<div key={c} style={{ background: "#f7f7f5", borderRadius: 8, padding: "10px 14px" }}><div style={{ fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 3 }}>{c}</div><div style={{ fontSize: 12, color: "#3B6D11", fontWeight: 500 }}>{count ? ((wins / count) * 100).toFixed(0) : 0}% WR</div><div style={{ fontSize: 11, color: "#aaa" }}>{count} lệnh</div></div>))}
        </div>
      </div>
    </div>
  );
}

// ─── Setup Editor ─────────────────────────────────────────────────────────────
function SetupEditor({ setup, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(setup?.name || "");
  const [steps, setSteps] = useState(setup?.steps || [""]);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const addStep = () => setSteps(s => [...s, ""]);
  const updateStep = (i, val) => setSteps(s => s.map((x, j) => j === i ? val : x));
  const removeStep = (i) => setSteps(s => s.filter((_, j) => j !== i));
  const handleDragStart = (i) => setDragIdx(i);
  const handleDragOver = (e, i) => { e.preventDefault(); setDragOverIdx(i); };
  const handleDrop = (i) => {
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return; }
    const newSteps = [...steps];
    const [moved] = newSteps.splice(dragIdx, 1);
    newSteps.splice(i, 0, moved);
    setSteps(newSteps);
    setDragIdx(null);
    setDragOverIdx(null);
  };
  const handleSave = () => {
    if (!name.trim()) return alert("Vui lòng nhập tên phương pháp");
    const cleanSteps = steps.map(s => s.trim()).filter(Boolean);
    if (cleanSteps.length === 0) return alert("Vui lòng thêm ít nhất 1 bước");
    onSave({ id: setup?.id || Date.now(), name: name.trim(), steps: cleanSteps });
  };
  return (
    <div style={{ background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#777", marginBottom: 5, fontWeight: 500 }}>Tên phương pháp</div>
        <input type="text" placeholder="vd: ICT 2022, SMC, Price Action..." value={name} onChange={e => setName(e.target.value)} style={{ ...inp, fontSize: 15, fontWeight: 500 }} />
      </div>
      <div style={{ fontSize: 12, color: "#777", marginBottom: 8, fontWeight: 500 }}>Các bước setup <span style={{ color: "#bbb", fontWeight: 400 }}>(kéo thả để đổi thứ tự)</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
        {steps.map((step, i) => (
          <div key={i} draggable onDragStart={() => handleDragStart(i)} onDragOver={e => handleDragOver(e, i)} onDrop={() => handleDrop(i)} onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", opacity: dragIdx === i ? 0.4 : 1, borderTop: dragOverIdx === i && dragIdx !== i ? "2px solid #185FA5" : "2px solid transparent", transition: "border-color 0.1s" }}>
            <span style={{ cursor: "grab", color: "#ccc", fontSize: 16, userSelect: "none", flexShrink: 0 }}>⠿</span>
            <span style={{ fontSize: 13, color: "#bbb", minWidth: 20, flexShrink: 0 }}>{i + 1}.</span>
            <input type="text" placeholder={`Bước ${i + 1}... vd: Xác định bias W/D`} value={step} onChange={e => updateStep(i, e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addStep(); } }} style={{ ...inp, flex: 1, fontSize: 13 }} />
            <button onClick={() => removeStep(i)} style={{ ...btnStyle, color: "#c0392b", borderColor: "#f09595", padding: "4px 10px", flexShrink: 0 }}>✕</button>
          </div>
        ))}
      </div>
      <button onClick={addStep} style={{ ...btnStyle, marginBottom: 16, color: "#185FA5", borderColor: "#85B7EB" }}>+ Thêm bước</button>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {onDelete && <button onClick={onDelete} style={{ ...btnStyle, color: "#c0392b", borderColor: "#f09595", marginRight: "auto" }}>Xoá setup</button>}
        {onCancel && <button onClick={onCancel} style={btnStyle}>Huỷ</button>}
        <button onClick={handleSave} style={primaryBtn}>Lưu setup</button>
      </div>
    </div>
  );
}

function ThietLapTab({ setups, onSetupsSave }) {
  const [editing, setEditing] = useState(null);
  const [editingSetup, setEditingSetup] = useState(null);
  const handleSave = (saved) => {
    const exists = setups.find(s => s.id === saved.id);
    if (exists) {
      onSetupsSave(setups.map(s => s.id === saved.id ? saved : s));
    } else {
      onSetupsSave([...setups, saved]);
    }
    setEditing(null);
    setEditingSetup(null);
  };
  const handleDelete = (id) => {
    if (!window.confirm("Xoá setup này?")) return;
    onSetupsSave(setups.filter(s => s.id !== id));
    setEditing(null);
    setEditingSetup(null);
  };
  const startEdit = (setup) => {
    setEditingSetup(setup);
    setEditing(setup.id);
  };
  const startNew = () => {
    setEditingSetup(null);
    setEditing("new");
  };
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 14, color: "#555", lineHeight: 1.7, marginBottom: 16, background: "#f7f7f5", borderRadius: 10, padding: "12px 16px" }}>
          <strong>Phương pháp giao dịch</strong> của bạn được định nghĩa ở đây. Mỗi setup là một checklist các bước bạn cần tuân theo trước khi vào lệnh — giúp bạn giao dịch có kỷ luật và nhất quán.
        </div>
      </div>
      {setups.length === 0 && !editing && (<div style={{ textAlign: "center", color: "#bbb", padding: "40px 0", fontSize: 14 }}>Chưa có setup nào. Tạo setup đầu tiên của bạn!</div>)}
      {setups.map(setup => (
        editing === setup.id ? (
          <SetupEditor key={setup.id} setup={editingSetup} onSave={handleSave} onCancel={() => { setEditing(null); setEditingSetup(null); }} onDelete={() => handleDelete(setup.id)} />
        ) : (
          <div key={setup.id} style={{ background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 12, overflow: "hidden", marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: "#111", marginBottom: 4 }}>{setup.name}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {setup.steps.map((step, i) => (<span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: "#f1f1ee", color: "#666", border: "0.5px solid #ddd" }}>{i + 1}. {step}</span>))}
                </div>
              </div>
              <button onClick={() => startEdit(setup)} style={{ ...btnStyle, marginLeft: 12, flexShrink: 0 }}>Sửa</button>
            </div>
          </div>
        )
      ))}
      {editing === "new" && (<SetupEditor setup={null} onSave={handleSave} onCancel={() => setEditing(null)} />)}
      {editing !== "new" && (<button onClick={startNew} style={{ ...primaryBtn, marginTop: 8 }}>+ Tạo setup mới</button>)}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("new");
  const [trades, setTrades] = useState(loadTrades);
  const [allModels, setAllModels] = useState(loadModels);
  const [setups, setSetups] = useState(loadSetups);
  const [editTrade, setEditTrade] = useState(null);

  useEffect(() => { saveTrades(trades); }, [trades]);
  useEffect(() => { saveModels(allModels); }, [allModels]);
  useEffect(() => { saveSetups(setups); }, [setups]);

  const saveTrade = (form) => {
    setTrades(ts => editTrade ? ts.map(t => t.id === form.id ? form : t) : [{ ...form, id: Date.now() }, ...ts]);
    setEditTrade(null);
    setTab("history");
  };
  const addModel = (m) => setAllModels(prev => prev.includes(m) ? prev : [...prev, m]);
  const deleteTrade = (id) => { if (window.confirm("Xoá lệnh này?")) setTrades(ts => ts.filter(t => t.id !== id)); };
  const startEdit = (trade) => { setEditTrade(trade); setTab("new"); };

  const tabStyle = (t) => ({ padding: "9px 22px", cursor: "pointer", fontSize: 14, fontWeight: tab === t ? 600 : 400, background: "transparent", border: "none", borderBottom: `2px solid ${tab === t ? "#111" : "transparent"}`, color: tab === t ? "#111" : "#888" });

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 20px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 4 }}>My Trading Journal</h1>
        <p style={{ fontSize: 13, color: "#aaa", marginBottom: 20 }}>Time - Price - Consistency</p>
        <div style={{ display: "flex", borderBottom: "0.5px solid #e5e5e5", marginBottom: 24, overflowX: "auto" }}>
          <button style={tabStyle("new")} onClick={() => { setEditTrade(null); setTab("new"); }}>+ Lệnh mới</button>
          <button style={tabStyle("history")} onClick={() => setTab("history")}>Lịch sử ({trades.length})</button>
          <button style={tabStyle("stats")} onClick={() => setTab("stats")}>Thống kê</button>
          <button style={tabStyle("thietlap")} onClick={() => setTab("thietlap")}>Thiết lập</button>
        </div>
        {tab === "new" && <NewTradeFlow initial={editTrade} onSave={saveTrade} onCancel={editTrade ? () => { setEditTrade(null); setTab("history"); } : null} allModels={allModels} onAddModel={addModel} setups={setups} />}
        {tab === "history" && (<div>{trades.length === 0 && <div style={{ textAlign: "center", color: "#bbb", padding: "60px 0", fontSize: 14 }}>Chưa có lệnh nào. Hãy thêm lệnh đầu tiên!</div>}{trades.map(t => <TradeCard key={t.id} trade={t} onDelete={deleteTrade} onEdit={startEdit} setups={setups} />)}</div>)}
        {tab === "stats" && <Stats trades={trades} />}
        {tab === "thietlap" && <ThietLapTab setups={setups} onSetupsSave={setSetups} />}
      </div>
    </div>
  );
}