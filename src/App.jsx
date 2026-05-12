import { useState, useRef, useCallback, useEffect } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// ─── Constants ───────────────────────────────────────────────────────────────
const SESSIONS = ["Asia", "London", "Pre-market NY AM", "NY AM Macro 09:45–10:15", "NY AM Macro 10:45–11:15"];
const TIMEFRAMES = ["1M", "3M", "5M", "15M", "30M", "1H", "4H", "D", "W"];
const DEFAULT_MODELS = ["ICT 2022 Model", "OB tiếp diễn (OB đầu tiên sau MSS)"];
const CONFLUENCES = ["FVG", "IFVG", "BPR", "OB", "Breaker", "SMT", "Rejection Block", "Propulsion Block", "Void/CE", "SIBI", "BISI", "EQH/EQL", "Wick Fill"];
const PSYCHOLOGY_OPTIONS = ["Tự tin, kiên nhẫn", "FOMO", "Revenge trade", "Hồi hộp, lo lắng", "Overconfident", "Do dự, vào trễ", "Bình tĩnh, theo plan", "Thoát sớm vì sợ", "Để lệnh chạy tốt"];
const STORAGE_KEY = "mtj_trades";
const MODELS_KEY = "mtj_models";
const SETTINGS_KEY = "mtj_settings";

const DEFAULT_SETTINGS = {
  plType: "", // "rr" | "money"
  currency: "USD",
  maxLossPerDay: "",
  maxTradesPerDay: "",
  riskPerTrade: "",
  timezone: "Asia/Ho_Chi_Minh",
  methodology: "",
  methodologyRules: "",
  emotionRules: "",
};

// ─── Storage ─────────────────────────────────────────────────────────────────
const load = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));

// ─── Styles ──────────────────────────────────────────────────────────────────
const btnBase = { fontSize: 13, padding: "5px 14px", cursor: "pointer", borderRadius: 7, border: "0.5px solid #ccc", background: "#fff" };
const primaryBtn = { ...btnBase, background: "#1a1a1a", color: "#fff", border: "1px solid #1a1a1a", fontSize: 14, padding: "8px 22px", fontWeight: 500 };
const inp = { fontSize: 14, width: "100%", boxSizing: "border-box", padding: "7px 10px", border: "0.5px solid #ccc", borderRadius: 7, outline: "none", fontFamily: "inherit" };
const chipStyle = (active, c) => ({ fontSize: 12, padding: "4px 12px", cursor: "pointer", borderRadius: 20, background: active ? c.bg : "transparent", color: active ? c.text : "#777", border: `1px solid ${active ? c.border : "#ddd"}`, fontWeight: active ? 500 : 400, fontFamily: "inherit" });

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
    const a = document.createElement("a");
    a.download = `trade-${tradeId}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
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
      <Row label="DOL" value={trade.dol} />
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

// ─── Onboarding ──────────────────────────────────────────────────────────────
function Onboarding({ onDone }) {
  const [step, setStep] = useState(1);
  const [s, setS] = useState({ ...DEFAULT_SETTINGS });
  const set = (k, v) => setS(p => ({ ...p, [k]: v }));
  const TOTAL = 4;

  const Step1 = () => (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Cách tính P&L</h2>
      <p style={{ fontSize: 14, color: "#888", marginBottom: 20 }}>Bạn muốn ghi nhận lợi nhuận / thua lỗ theo cách nào?</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {[{ val: "rr", title: "R:R", desc: "Theo tỷ lệ rủi ro\nvd: +2R, -1R, 0R" }, { val: "money", title: "Số tiền", desc: "Theo số tiền thực tế\nvd: +$200, -$100" }].map(o => (
          <button key={o.val} onClick={() => set("plType", o.val)}
            style={{ padding: "18px 16px", cursor: "pointer", borderRadius: 10, textAlign: "left", border: `2px solid ${s.plType === o.val ? "#1a1a1a" : "#e0e0e0"}`, background: s.plType === o.val ? "#f7f7f5" : "#fff" }}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>{o.title}</div>
            <div style={{ fontSize: 13, color: "#888", whiteSpace: "pre-line" }}>{o.desc}</div>
          </button>
        ))}
      </div>
      {s.plType === "money" && (
        <div style={{ marginBottom: 16 }}>
          <div style={lbl}>Currency</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["USD", "VNĐ", "EUR"].map(c => (
              <button key={c} onClick={() => set("currency", c)} style={chipStyle(s.currency === c, { bg: "#f0f0ee", text: "#111", border: "#999" })}>{c}</button>
            ))}
          </div>
        </div>
      )}
      {s.plType === "rr" && (
        <div style={{ marginBottom: 16 }}>
          <div style={lbl}>Risk per trade (%)</div>
          <input type="number" placeholder="vd: 1" value={s.riskPerTrade} onChange={e => set("riskPerTrade", e.target.value)} style={{ ...inp, width: 160 }} />
        </div>
      )}
    </div>
  );

  const Step2 = () => (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Giới hạn giao dịch</h2>
      <p style={{ fontSize: 14, color: "#888", marginBottom: 20 }}>Giúp bạn kiểm soát overtrade và bảo vệ tài khoản.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={lbl}>Số lệnh tối đa / ngày</div>
          <input type="number" placeholder="vd: 3" value={s.maxTradesPerDay} onChange={e => set("maxTradesPerDay", e.target.value)} style={{ ...inp, width: 160 }} />
        </div>
        <div>
          <div style={lbl}>Max loss / ngày {s.plType === "rr" ? "(R)" : `(${s.currency})`}</div>
          <input type="number" placeholder={s.plType === "rr" ? "vd: 3" : "vd: 300"} value={s.maxLossPerDay} onChange={e => set("maxLossPerDay", e.target.value)} style={{ ...inp, width: 160 }} />
          <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>Khi đạt giới hạn này, app sẽ cảnh báo bạn.</div>
        </div>
      </div>
    </div>
  );

  const Step3 = () => (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Phương pháp giao dịch</h2>
      <p style={{ fontSize: 14, color: "#888", marginBottom: 20 }}>Mô tả phương pháp và các rules entry của bạn. Càng chi tiết, journal càng có giá trị.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={lbl}>Phương pháp đang sử dụng</div>
          <input type="text" placeholder="vd: ICT, SMC, Wyckoff, Price Action..." value={s.methodology} onChange={e => set("methodology", e.target.value)} style={inp} />
        </div>
        <div>
          <div style={lbl}>Rules & quy trình phân tích (Top-down, checklist...)</div>
          <textarea rows={5} placeholder={"vd:\n1. Xác định bias trên W/D\n2. Tìm POI trên H4/H1\n3. Chờ entry model trên M5/M15\n4. SL dưới OB, TP tại liquidity pool"} value={s.methodologyRules} onChange={e => set("methodologyRules", e.target.value)} style={{ ...inp, resize: "vertical" }} />
        </div>
      </div>
    </div>
  );

  const Step4 = () => (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Rules quản lý cảm xúc</h2>
      <p style={{ fontSize: 14, color: "#888", marginBottom: 20 }}>Những quy tắc cá nhân giúp bạn dừng đúng lúc.</p>
      <div>
        <div style={lbl}>Rules của bạn</div>
        <textarea rows={6} placeholder={"vd:\n- 2 loss liên tiếp → dừng ngay\n- 2 win liên tiếp → dừng ngay\n- 1W + 1L hoặc 1L + 1W → có thể vào lệnh 3 nếu ngày đang dương\n- Không trade thứ Hai\n- Không trade trước/sau news 30 phút"} value={s.emotionRules} onChange={e => set("emotionRules", e.target.value)} style={{ ...inp, resize: "vertical" }} />
      </div>
    </div>
  );

  const steps = [Step1, Step2, Step3, Step4];
  const StepComponent = steps[step - 1];
  const canNext = step === 1 ? !!s.plType : true;

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 540, background: "#fff", borderRadius: 16, padding: "40px 40px 32px", boxShadow: "0 2px 20px rgba(0,0,0,0.07)" }}>
        {/* Progress */}
        <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i < step ? "#1a1a1a" : "#e5e5e5" }} />
          ))}
        </div>
        <div style={{ fontSize: 12, color: "#aaa", marginBottom: 8 }}>Bước {step} / {TOTAL}</div>

        <StepComponent />

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
          {step > 1
            ? <button onClick={() => setStep(s => s - 1)} style={btnBase}>← Quay lại</button>
            : <div />}
          {step < TOTAL
            ? <button onClick={() => canNext && setStep(s => s + 1)} style={{ ...primaryBtn, opacity: canNext ? 1 : 0.4 }}>Tiếp theo →</button>
            : <button onClick={() => onDone(s)} style={primaryBtn}>Bắt đầu sử dụng →</button>}
        </div>

        {step === 1 && <div style={{ textAlign: "center", marginTop: 16 }}><button onClick={() => onDone({ ...DEFAULT_SETTINGS, plType: "rr" })} style={{ fontSize: 12, color: "#bbb", background: "none", border: "none", cursor: "pointer" }}>Bỏ qua, thiết lập sau</button></div>}
      </div>
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage({ settings, onSave }) {
  const [s, setS] = useState({ ...settings });
  const set = (k, v) => setS(p => ({ ...p, [k]: v }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <div style={secTitle}>P&L & Rủi ro</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={lbl}>Cách tính P&L</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ val: "rr", label: "R:R" }, { val: "money", label: "Số tiền" }].map(o => (
                <button key={o.val} onClick={() => set("plType", o.val)} style={chipStyle(s.plType === o.val, { bg: "#f0f0ee", text: "#111", border: "#999" })}>{o.label}</button>
              ))}
            </div>
          </div>
          {s.plType === "money" && (
            <div>
              <div style={lbl}>Currency</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["USD", "VNĐ", "EUR"].map(c => <button key={c} onClick={() => set("currency", c)} style={chipStyle(s.currency === c, { bg: "#f0f0ee", text: "#111", border: "#999" })}>{c}</button>)}
              </div>
            </div>
          )}
          {s.plType === "rr" && <div><div style={lbl}>Risk per trade (%)</div><input type="number" value={s.riskPerTrade} onChange={e => set("riskPerTrade", e.target.value)} style={{ ...inp, width: 160 }} /></div>}
        </div>
      </div>

      <div>
        <div style={secTitle}>Giới hạn giao dịch</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div><div style={lbl}>Số lệnh tối đa / ngày</div><input type="number" value={s.maxTradesPerDay} onChange={e => set("maxTradesPerDay", e.target.value)} style={inp} /></div>
          <div><div style={lbl}>Max loss / ngày {s.plType === "rr" ? "(R)" : `(${s.currency})`}</div><input type="number" value={s.maxLossPerDay} onChange={e => set("maxLossPerDay", e.target.value)} style={inp} /></div>
        </div>
      </div>

      <div>
        <div style={secTitle}>Phương pháp giao dịch</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div><div style={lbl}>Phương pháp</div><input type="text" value={s.methodology} onChange={e => set("methodology", e.target.value)} style={inp} /></div>
          <div><div style={lbl}>Rules & quy trình phân tích</div><textarea rows={5} value={s.methodologyRules} onChange={e => set("methodologyRules", e.target.value)} style={{ ...inp, resize: "vertical" }} /></div>
        </div>
      </div>

      <div>
        <div style={secTitle}>Rules quản lý cảm xúc</div>
        <div><div style={lbl}>Rules của bạn</div><textarea rows={5} value={s.emotionRules} onChange={e => set("emotionRules", e.target.value)} style={{ ...inp, resize: "vertical" }} /></div>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={() => onSave(s)} style={primaryBtn}>Lưu cài đặt</button>
      </div>
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ label, color = "gray" }) {
  const colors = { buy: { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459" }, sell: { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" }, gray: { bg: "#f1f1ee", text: "#5F5E5A", border: "#B4B2A9" }, win: { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459" }, loss: { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" }, be: { bg: "#FAEEDA", text: "#854F0B", border: "#EF9F27" } };
  const c = colors[color] || colors.gray;
  return <span style={{ background: c.bg, color: c.text, border: `0.5px solid ${c.border}`, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 500 }}>{label}</span>;
}

// ─── Image Upload ────────────────────────────────────────────────────────────
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
      <button onClick={() => ref.current.click()} style={btnBase}>+ Thêm ảnh</button>
      <input ref={ref} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handleFiles} />
    </div>
  );
}

// ─── Trade Form ───────────────────────────────────────────────────────────────
const emptyForm = () => ({ id: Date.now(), date: new Date().toISOString().slice(0, 10), ticker: "", position: "", structure: "", priceAction: "", dol: "", selectedModels: [], confluences: [], entryTF: "", session: "", psychologyTags: [], psychology: "", lesson: "", images: [], result: "", pnl: "" });

function TradeForm({ initial, onSave, onCancel, allModels, onAddModel, settings }) {
  const [form, setForm] = useState(initial || emptyForm());
  const [newModel, setNewModel] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleArr = (k, v) => { const a = form[k] || []; set(k, a.includes(v) ? a.filter(x => x !== v) : [...a, v]); };
  const handleImages = useCallback(u => setForm(f => ({ ...f, images: typeof u === "function" ? u(f.images) : u })), []);
  const addModel = () => { if (!newModel.trim()) return; onAddModel(newModel.trim()); set("selectedModels", [...form.selectedModels, newModel.trim()]); setNewModel(""); };
  const plLabel = settings.plType === "money" ? `P&L (${settings.currency})` : "P&L (R)";
  const plPlaceholder = settings.plType === "money" ? "vd: +200 hoặc -100" : "vd: +2R hoặc -1R";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div><div style={lbl}>Ngày</div><input type="date" value={form.date} onChange={e => set("date", e.target.value)} style={inp} /></div>
        <div><div style={lbl}>Ticker</div><input type="text" placeholder="NQ, ES, EURUSD..." value={form.ticker} onChange={e => set("ticker", e.target.value.toUpperCase())} style={inp} /></div>
        <div>
          <div style={lbl}>Position</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["Buy", "Sell"].map(p => (
              <button key={p} onClick={() => set("position", p)} style={{ flex: 1, padding: "7px 0", cursor: "pointer", fontWeight: 500, fontSize: 14, borderRadius: 8, fontFamily: "inherit", background: form.position === p ? (p === "Buy" ? "#EAF3DE" : "#FCEBEB") : "#fff", color: form.position === p ? (p === "Buy" ? "#3B6D11" : "#A32D2D") : "#777", border: `1.5px solid ${form.position === p ? (p === "Buy" ? "#97C459" : "#F09595") : "#ddd"}` }}>
                {p === "Buy" ? "▲ Buy" : "▼ Sell"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={sec}>LÝ DO VÀO LỆNH</div>
      <div><div style={lbl}>Structure & Bias (HTF)</div><textarea rows={2} placeholder="vd: Bias Bullish trên HTF, giá đang retrace về discount..." value={form.structure} onChange={e => set("structure", e.target.value)} style={{ ...inp, resize: "vertical" }} /></div>
      <div><div style={lbl}>Price action — đã quét thanh khoản? Chạm HTF PDA? (LTF)</div><textarea rows={2} placeholder="vd: Giá đã quét BSL tại 19250, rebalance về OB trên 4H..." value={form.priceAction} onChange={e => set("priceAction", e.target.value)} style={{ ...inp, resize: "vertical" }} /></div>
      <div><div style={lbl}>DOL (Draw on Liquidity) — giá đang có xu hướng tiến tới đâu?</div><input type="text" placeholder="vd: EQH 19480, BSL tại 19550, NWOG..." value={form.dol} onChange={e => set("dol", e.target.value)} style={inp} /></div>

      <div>
        <div style={lbl}>Entry model</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 8 }}>
          {allModels.map(m => <button key={m} onClick={() => toggleArr("selectedModels", m)} style={chipStyle(form.selectedModels.includes(m), { bg: "#EEEDFE", text: "#3C3489", border: "#AFA9EC" })}>{form.selectedModels.includes(m) ? "✓ " : ""}{m}</button>)}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="text" placeholder="+ Thêm model mới..." value={newModel} onChange={e => setNewModel(e.target.value)} onKeyDown={e => e.key === "Enter" && addModel()} style={{ ...inp, flex: 1, fontSize: 13 }} />
          <button onClick={addModel} style={btnBase}>Thêm</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={lbl}>Entry timeframe</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {TIMEFRAMES.map(tf => <button key={tf} onClick={() => set("entryTF", tf)} style={chipStyle(form.entryTF === tf, { bg: "#E6F1FB", text: "#185FA5", border: "#85B7EB" })}>{tf}</button>)}
          </div>
        </div>
        <div>
          <div style={lbl}>Session</div>
          <select value={form.session} onChange={e => set("session", e.target.value)} style={{ ...inp, marginTop: 4 }}>
            <option value="">Chọn session...</option>
            {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div>
        <div style={lbl}>Yếu tố ủng hộ cho lệnh</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {CONFLUENCES.map(c => <button key={c} onClick={() => toggleArr("confluences", c)} style={chipStyle((form.confluences || []).includes(c), { bg: "#E1F5EE", text: "#0F6E56", border: "#5DCAA5" })}>{(form.confluences || []).includes(c) ? "✓ " : ""}{c}</button>)}
        </div>
      </div>

      <div style={sec}>SAU LỆNH</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={lbl}>Kết quả</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["Win", "Loss", "BE"].map(r => (
              <button key={r} onClick={() => set("result", r)} style={{ flex: 1, padding: "6px 0", cursor: "pointer", fontSize: 13, fontWeight: 500, borderRadius: 8, fontFamily: "inherit", background: form.result === r ? (r === "Win" ? "#EAF3DE" : r === "Loss" ? "#FCEBEB" : "#FAEEDA") : "#fff", color: form.result === r ? (r === "Win" ? "#3B6D11" : r === "Loss" ? "#A32D2D" : "#854F0B") : "#777", border: `1.5px solid ${form.result === r ? (r === "Win" ? "#97C459" : r === "Loss" ? "#F09595" : "#EF9F27") : "#ddd"}` }}>{r}</button>
            ))}
          </div>
        </div>
        <div><div style={lbl}>{plLabel}</div><input type="text" placeholder={plPlaceholder} value={form.pnl} onChange={e => set("pnl", e.target.value)} style={inp} /></div>
      </div>

      <div>
        <div style={lbl}>Tâm lý</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 6 }}>
          {PSYCHOLOGY_OPTIONS.map(p => <button key={p} onClick={() => toggleArr("psychologyTags", p)} style={chipStyle((form.psychologyTags || []).includes(p), { bg: "#EEEDFE", text: "#3C3489", border: "#AFA9EC" })}>{p}</button>)}
        </div>
        <input type="text" placeholder="Ghi thêm nếu cần..." value={form.psychology} onChange={e => set("psychology", e.target.value)} style={{ ...inp, fontSize: 13 }} />
      </div>

      <div><div style={lbl}>Bài học rút ra</div><textarea rows={2} placeholder="vd: Không trade revenge, chờ confirmation..." value={form.lesson} onChange={e => set("lesson", e.target.value)} style={{ ...inp, resize: "vertical" }} /></div>
      <div><div style={lbl}>Hình ảnh chart (không giới hạn)</div><ImageUpload images={form.images} onChange={handleImages} /></div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
        {onCancel && <button onClick={onCancel} style={btnBase}>Huỷ</button>}
        <button onClick={() => onSave(form)} style={primaryBtn}>Lưu lệnh</button>
      </div>
    </div>
  );
}

// ─── Trade Card ───────────────────────────────────────────────────────────────
function TradeCard({ trade, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const resColor = trade.result === "Win" ? "win" : trade.result === "Loss" ? "loss" : "be";
  const handleExport = async (fmt) => { setExporting(true); await exportCard(trade.id, fmt); setExporting(false); };
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
                {trade.images.map((img, i) => <div key={i} style={{ borderRadius: 6, overflow: "hidden", border: "0.5px solid #ddd", background: "#000" }}><img src={img.url} alt={img.name} style={{ width: "100%", aspectRatio: "16/9", objectFit: "contain", display: "block" }} /></div>)}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 6 }}>
              <button onClick={() => handleExport("png")} disabled={exporting} style={btnBase}>{exporting ? "..." : "PNG"}</button>
              <button onClick={() => handleExport("pdf")} disabled={exporting} style={btnBase}>{exporting ? "..." : "PDF"}</button>
              <button onClick={() => onEdit(trade)} style={btnBase}>Sửa</button>
              <button onClick={() => onDelete(trade.id)} style={{ ...btnBase, color: "#c0392b", borderColor: "#f09595" }}>Xoá</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function Stats({ trades, settings }) {
  const today = new Date().toISOString().slice(0, 10);
  const [range, setRange] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(today);
  const [filter, setFilter] = useState("all");

  const filtered = trades.filter(t => {
    const d = t.date;
    const now = new Date();
    if (range === "week") { const start = new Date(now); start.setDate(now.getDate() - now.getDay()); if (d < start.toISOString().slice(0, 10)) return false; }
    if (range === "month") { if (d.slice(0, 7) !== today.slice(0, 7)) return false; }
    if (range === "custom") { if (from && d < from) return false; if (to && d > to) return false; }
    if (filter !== "all" && t.result?.toLowerCase() !== filter) return false;
    return true;
  });

  const wins = filtered.filter(t => t.result === "Win").length;
  const losses = filtered.filter(t => t.result === "Loss").length;
  const be = filtered.filter(t => t.result === "BE").length;
  const total = filtered.filter(t => t.result).length;
  const wr = total ? ((wins / total) * 100).toFixed(1) : "—";
  const bySession = SESSIONS.map(s => ({ session: s, count: filtered.filter(t => t.session === s).length, wins: filtered.filter(t => t.session === s && t.result === "Win").length }));
  const byModel = [...new Set(filtered.flatMap(t => t.selectedModels || []))].map(m => ({ model: m, count: filtered.filter(t => t.selectedModels?.includes(m)).length, wins: filtered.filter(t => t.selectedModels?.includes(m) && t.result === "Win").length }));
  const byConfluence = [...new Set(filtered.flatMap(t => t.confluences || []))].map(c => ({ c, count: filtered.filter(t => t.confluences?.includes(c)).length, wins: filtered.filter(t => t.confluences?.includes(c) && t.result === "Win").length })).sort((a, b) => b.count - a.count);

  const StatCard = ({ label, val, color }) => (
    <div style={{ background: "#f7f7f5", borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: color || "#111" }}>{val}</div>
    </div>
  );
  const TableRow = ({ label, count, wins }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid #f0f0f0", fontSize: 13 }}>
      <span style={{ color: "#333" }}>{label}</span>
      <span style={{ color: "#999" }}>{count} lệnh · <span style={{ color: "#3B6D11", fontWeight: 500 }}>{count ? ((wins / count) * 100).toFixed(0) : 0}% WR</span></span>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6 }}>
          {[{ val: "all", label: "Tất cả" }, { val: "week", label: "Tuần này" }, { val: "month", label: "Tháng này" }, { val: "custom", label: "Tuỳ chỉnh" }].map(r => (
            <button key={r.val} onClick={() => setRange(r.val)} style={chipStyle(range === r.val, { bg: "#f0f0ee", text: "#111", border: "#999" })}>{r.label}</button>
          ))}
        </div>
        {range === "custom" && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...inp, width: 140, fontSize: 13 }} />
            <span style={{ color: "#aaa", fontSize: 13 }}>→</span>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...inp, width: 140, fontSize: 13 }} />
          </div>
        )}
        <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
          {[{ val: "all", label: "Tất cả" }, { val: "win", label: "Win" }, { val: "loss", label: "Loss" }, { val: "be", label: "BE" }].map(f => (
            <button key={f.val} onClick={() => setFilter(f.val)} style={chipStyle(filter === f.val, { bg: "#f0f0ee", text: "#111", border: "#999" })}>{f.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        <StatCard label="Tổng lệnh" val={filtered.length} />
        <StatCard label="Win rate" val={`${wr}%`} color="#3B6D11" />
        <StatCard label="Win / Loss / BE" val={`${wins} / ${losses} / ${be}`} />
        <StatCard label="Chưa có kết quả" val={filtered.length - total} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div style={secTitle}>Theo session</div>
          {bySession.filter(s => s.count > 0).length === 0 && <div style={{ fontSize: 13, color: "#bbb" }}>Chưa có dữ liệu</div>}
          {bySession.filter(s => s.count > 0).map(s => <TableRow key={s.session} label={s.session} count={s.count} wins={s.wins} />)}
        </div>
        <div>
          <div style={secTitle}>Theo entry model</div>
          {byModel.length === 0 && <div style={{ fontSize: 13, color: "#bbb" }}>Chưa có dữ liệu</div>}
          {byModel.map(m => <TableRow key={m.model} label={m.model} count={m.count} wins={m.wins} />)}
        </div>
      </div>

      <div>
        <div style={secTitle}>Confluence hiệu quả nhất</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
          {byConfluence.length === 0 && <div style={{ fontSize: 13, color: "#bbb" }}>Chưa có dữ liệu</div>}
          {byConfluence.map(({ c, count, wins }) => (
            <div key={c} style={{ background: "#f7f7f5", borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "#333", marginBottom: 3 }}>{c}</div>
              <div style={{ fontSize: 12, color: "#3B6D11", fontWeight: 500 }}>{count ? ((wins / count) * 100).toFixed(0) : 0}% WR</div>
              <div style={{ fontSize: 11, color: "#aaa" }}>{count} lệnh</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Shared style helpers ─────────────────────────────────────────────────────
const lbl = { fontSize: 12, color: "#777", marginBottom: 5, fontWeight: 500 };
const sec = { fontSize: 12, fontWeight: 600, color: "#888", borderBottom: "0.5px solid #e5e5e5", paddingBottom: 5, marginBottom: 4, marginTop: 4, letterSpacing: 0.5 };
const secTitle = { fontSize: 12, fontWeight: 600, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.3 };

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [settings, setSettings] = useState(() => load(SETTINGS_KEY, null));
  const [tab, setTab] = useState("new");
  const [trades, setTrades] = useState(() => load(STORAGE_KEY, []));
  const [allModels, setAllModels] = useState(() => load(MODELS_KEY, DEFAULT_MODELS));
  const [editTrade, setEditTrade] = useState(null);

  useEffect(() => { save(STORAGE_KEY, trades); }, [trades]);
  useEffect(() => { save(MODELS_KEY, allModels); }, [allModels]);

  const handleOnboardingDone = (s) => { save(SETTINGS_KEY, s); setSettings(s); };
  const handleSaveSettings = (s) => { save(SETTINGS_KEY, s); setSettings(s); setTab("new"); };

  const saveTrade = (form) => {
    const filled = { ...form };
    if (filled.result === "Loss" && !filled.pnl.trim()) filled.pnl = settings.plType === "rr" ? "-1R" : `-1`;
    if (filled.result === "BE" && !filled.pnl.trim()) filled.pnl = settings.plType === "rr" ? "0R" : "0";
    setTrades(ts => editTrade ? ts.map(t => t.id === filled.id ? filled : t) : [{ ...filled, id: Date.now() }, ...ts]);
    setEditTrade(null);
    setTab("history");
  };

  const addModel = (m) => setAllModels(prev => prev.includes(m) ? prev : [...prev, m]);
  const deleteTrade = (id) => { if (window.confirm("Xoá lệnh này?")) setTrades(ts => ts.filter(t => t.id !== id)); };
  const startEdit = (trade) => { setEditTrade(trade); setTab("new"); };

  if (!settings) return <Onboarding onDone={handleOnboardingDone} />;

  const tabStyle = (t) => ({ padding: "9px 18px", cursor: "pointer", fontSize: 14, fontWeight: tab === t ? 600 : 400, background: "transparent", border: "none", borderBottom: `2px solid ${tab === t ? "#1a1a1a" : "transparent"}`, color: tab === t ? "#111" : "#888", fontFamily: "inherit" });

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 2 }}>My Trading Journal</h1>
            <div style={{ fontSize: 12, color: "#bbb" }}>
              {settings.methodology && <span>{settings.methodology} · </span>}
              {settings.plType === "rr" ? "R:R" : settings.currency} · Data lưu trên máy
            </div>
          </div>
        </div>

        <div style={{ display: "flex", borderBottom: "0.5px solid #e5e5e5", marginBottom: 24 }}>
          <button style={tabStyle("new")} onClick={() => { setEditTrade(null); setTab("new"); }}>+ Lệnh mới</button>
          <button style={tabStyle("history")} onClick={() => setTab("history")}>Lịch sử ({trades.length})</button>
          <button style={tabStyle("stats")} onClick={() => setTab("stats")}>Thống kê</button>
          <button style={tabStyle("settings")} onClick={() => setTab("settings")}>⚙ Cài đặt</button>
        </div>

        {tab === "new" && <TradeForm initial={editTrade} onSave={saveTrade} onCancel={editTrade ? () => { setEditTrade(null); setTab("history"); } : null} allModels={allModels} onAddModel={addModel} settings={settings} />}
        {tab === "history" && (
          <div>
            {trades.length === 0 && <div style={{ textAlign: "center", color: "#bbb", padding: "60px 0", fontSize: 14 }}>Chưa có lệnh nào. Hãy thêm lệnh đầu tiên!</div>}
            {trades.map(t => <TradeCard key={t.id} trade={t} onDelete={deleteTrade} onEdit={startEdit} />)}
          </div>
        )}
        {tab === "stats" && <Stats trades={trades} settings={settings} />}
        {tab === "settings" && <SettingsPage settings={settings} onSave={handleSaveSettings} />}
      </div>
    </div>
  );
}