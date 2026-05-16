"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const TIMEFRAMES = ["1M","3M","5M","15M","30M","1H","4H","D","W"];
const PSYCHOLOGY_OPTIONS = ["Tự tin, kiên nhẫn","FOMO","Revenge trade","Hồi hộp, lo lắng","Overconfident","Do dự, vào trễ","Bình tĩnh, theo plan","Thoát sớm vì sợ","Để lệnh chạy tốt"];
const STORAGE_KEY  = "my_journal_trades";
const SETUPS_KEY   = "my_journal_setups";
const SESSIONS_KEY = "my_journal_sessions";
const DEFAULT_SESSIONS = ["Asia","London","Pre-market NY AM","NY AM Macro 09:45–10:15","NY AM Macro 10:45–11:15"];

// ─── Storage helpers ──────────────────────────────────────────────────────────
// Safe for Vercel/Next.js: localStorage only exists in the browser, not during SSR/build.
const load = (key, fallback) => {
  if (typeof window === "undefined") return fallback;

  try {
    const v = window.localStorage.getItem(key);
    return v != null ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

const persist = (key, val) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(val));
  } catch {}
};

// ─── emptyForm: id assigned only on save ─────────────────────────────────────
const emptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  ticker: "", position: "",
  selectedSetupIds: [], stepData: {},
  entryTF: "", session: "",
  psychologyTags: [], psychology: "",
  lesson: "", images: [], result: "", pnl: "",
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const btnStyle   = { fontSize: 13, padding: "5px 14px", cursor: "pointer", borderRadius: 7, border: "0.5px solid #ccc", background: "#fff", fontFamily: "inherit" };
const primaryBtn = { ...btnStyle, background: "#1a1a1a", color: "#fff", border: "1px solid #1a1a1a", fontSize: 14, padding: "8px 22px", fontWeight: 500 };
const inp        = { fontSize: 14, width: "100%", boxSizing: "border-box", padding: "7px 10px", border: "0.5px solid #ccc", borderRadius: 7, outline: "none", fontFamily: "inherit" };
const chipStyle  = (active, c) => ({ fontSize: 12, padding: "4px 12px", cursor: "pointer", borderRadius: 20, background: active ? c.bg : "transparent", color: active ? c.text : "#777", border: `1px solid ${active ? c.border : "#ddd"}`, fontWeight: active ? 500 : 400, fontFamily: "inherit" });
const lbl        = { fontSize: 12, color: "#777", marginBottom: 5, fontWeight: 500 };
const SecTitle   = ({ txt }) => <div style={{ fontSize: 12, fontWeight: 600, color: "#888", borderBottom: "0.5px solid #e5e5e5", paddingBottom: 5, marginBottom: 12, marginTop: 10, letterSpacing: 0.4 }}>{txt.toUpperCase()}</div>;

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ label, color = "gray" }) {
  const colors = {
    buy:  { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459" },
    sell: { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" },
    gray: { bg: "#f1f1ee", text: "#5F5E5A", border: "#B4B2A9" },
    win:  { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459" },
    loss: { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" },
    be:   { bg: "#FAEEDA", text: "#854F0B", border: "#EF9F27" },
  };
  const c = colors[color] || colors.gray;
  return <span style={{ background: c.bg, color: c.text, border: `0.5px solid ${c.border}`, borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 500 }}>{label}</span>;
}

// ─── Image Upload ─────────────────────────────────────────────────────────────
function ImageUpload({ images, onChange }) {
  const ref = useRef();
  const handleFiles = e => {
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

// ─── Export (PNG/PDF via html2canvas + jsPDF — works on Vercel) ───────────────
async function exportCard(tradeId, format = "png") {
  if (typeof document === "undefined") return;

  // Dynamic import to avoid SSR issues
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]).catch(() => [{ default: null }, { default: null }]);

  const el = document.getElementById(`export-card-${tradeId}`);
  if (!el || !html2canvas) { alert("Không thể export, thiếu thư viện."); return; }
  el.style.display = "block";
  await new Promise(r => setTimeout(r, 200));
  try {
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    el.style.display = "none";
    if (format === "pdf" && jsPDF) {
      const imgData = canvas.toDataURL("image/png");
      const mmW = (canvas.width / 2) * 0.2646, mmH = (canvas.height / 2) * 0.2646;
      const pdf = new jsPDF({ orientation: mmW > mmH ? "landscape" : "portrait", unit: "mm", format: [mmW, mmH] });
      pdf.addImage(imgData, "PNG", 0, 0, mmW, mmH);
      pdf.save(`trade-${tradeId}.pdf`);
    } else {
      const a = document.createElement("a");
      a.download = `trade-${tradeId}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    }
  } catch (err) {
    el.style.display = "none";
    console.error(err);
    alert("Export thất bại: " + err.message);
  }
}

// ─── Export Card (hidden, rendered once per trade) ────────────────────────────
function ExportCard({ trade, setups }) {
  const pos = trade.position;
  const posStyle = pos === "Buy" ? { background: "#EAF3DE", color: "#3B6D11", border: "1px solid #97C459" } : { background: "#FCEBEB", color: "#A32D2D", border: "1px solid #F09595" };
  const resStyle = trade.result === "Win" ? { color: "#3B6D11" } : trade.result === "Loss" ? { color: "#A32D2D" } : { color: "#854F0B" };
  const selectedSetups = setups.filter(s => (trade.selectedSetupIds || []).includes(s.id));
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
      {selectedSetups.map(setup => {
        const data = trade.stepData?.[setup.id] || {};
        return (
          <div key={setup.id} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: "#999", fontWeight: 600, textTransform: "uppercase", marginBottom: 8 }}>{setup.name}</div>
            {setup.steps.map((step, idx) => (
              <div key={idx} style={{ padding: "8px 0", borderBottom: "0.5px solid #f0f0ee" }}>
                <div style={{ fontSize: 11, color: "#bbb", marginBottom: 3 }}>{idx + 1}. {step.label}</div>
                {step.type === "check"
                  ? <div style={{ fontSize: 13, color: data[idx] ? "#3B6D11" : "#ccc" }}>{data[idx] ? "✓ Đã xác nhận" : "○ Chưa xác nhận"}</div>
                  : <div style={{ fontSize: 14, color: "#222", lineHeight: 1.6 }}>{data[idx] || "—"}</div>}
              </div>
            ))}
          </div>
        );
      })}
      {trade.entryTF && <div style={{ padding: "8px 0", borderBottom: "0.5px solid #f0f0ee" }}><div style={{ fontSize: 11, color: "#bbb", marginBottom: 3 }}>ENTRY TF · SESSION</div><div style={{ fontSize: 14, color: "#222" }}>{[trade.entryTF, trade.session].filter(Boolean).join("  ·  ")}</div></div>}
      {(trade.psychologyTags?.length > 0 || trade.psychology) && <div style={{ padding: "8px 0", borderBottom: "0.5px solid #f0f0ee" }}><div style={{ fontSize: 11, color: "#bbb", marginBottom: 3 }}>TÂM LÝ</div><div style={{ fontSize: 14, color: "#222" }}>{[...(trade.psychologyTags || []), trade.psychology].filter(Boolean).join("  ·  ")}</div></div>}
      {trade.lesson && <div style={{ padding: "8px 0", borderBottom: "0.5px solid #f0f0ee" }}><div style={{ fontSize: 11, color: "#bbb", marginBottom: 3 }}>BÀI HỌC</div><div style={{ fontSize: 14, color: "#222" }}>{trade.lesson}</div></div>}
      {trade.images?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, color: "#999", fontWeight: 600, textTransform: "uppercase", marginBottom: 10 }}>Chart</div>
          {trade.images.map((img, i) => <img key={i} src={img.url} alt="" crossOrigin="anonymous" style={{ width: "100%", marginBottom: 12, borderRadius: 6, display: "block", border: "0.5px solid #e8e8e4" }} />)}
        </div>
      )}
      <div style={{ marginTop: 20, fontSize: 11, color: "#bbb", textAlign: "right" }}>My Trading Journal</div>
    </div>
  );
}

// ─── New Trade Flow ───────────────────────────────────────────────────────────
function NewTradeFlow({ initial, onSave, onCancel, setups, sessions }) {
  const isEditing = !!initial;
  const [flowStep, setFlowStep] = useState(isEditing ? "form" : "pick");
  const [form, setForm] = useState(() => initial ? { ...emptyForm(), ...initial } : emptyForm());

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleArr = (k, v) => { const a = form[k] || []; set(k, a.includes(v) ? a.filter(x => x !== v) : [...a, v]); };
  const handleImages = useCallback(u => setForm(f => ({ ...f, images: typeof u === "function" ? u(f.images) : u })), []);
  const setStepData  = (setupId, idx, val) =>
    setForm(f => ({ ...f, stepData: { ...f.stepData, [setupId]: { ...(f.stepData?.[setupId] || {}), [idx]: val } } }));

  const isBuy = form.position === "Buy";
  const selectedSetupIds = form.selectedSetupIds || [];
  const selectedSetups = setups.filter(s => selectedSetupIds.includes(s.id));
  const toggleSetup = id => {
    const curr = form.selectedSetupIds || [];
    set("selectedSetupIds", curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]);
  };

  // ── Pick screen ───────────────────────────────────────────────────────────
  if (flowStep === "pick") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 28, paddingTop: 16 }}>
        <div>
          <div style={{ fontSize: 12, color: "#aaa", textAlign: "center", marginBottom: 12 }}>Chọn hướng giao dịch</div>
          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            {["Buy", "Sell"].map(p => {
              const active = form.position === p;
              const isBuyBtn = p === "Buy";
              return (
                <button key={p} onClick={() => set("position", p)} style={{
                  width: 148, height: 86, cursor: "pointer", borderRadius: 14,
                  border: `2px solid ${active ? (isBuyBtn ? "#97C459" : "#F09595") : "#e5e5e5"}`,
                  background: active ? (isBuyBtn ? "#EAF3DE" : "#FCEBEB") : "#fff",
                  color: active ? (isBuyBtn ? "#3B6D11" : "#A32D2D") : "#bbb",
                  fontWeight: 700, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                  boxShadow: active ? `0 2px 8px ${isBuyBtn ? "rgba(59,109,17,0.12)" : "rgba(163,45,45,0.12)"}` : "0 1px 3px rgba(0,0,0,0.04)",
                  transition: "all 0.15s", fontFamily: "inherit",
                }}>
                  <span style={{ fontSize: 24 }}>{isBuyBtn ? "▲" : "▼"}</span>
                  <span style={{ fontSize: 16 }}>{p}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#aaa", textAlign: "center", marginBottom: 12 }}>Chọn setup / chiến lược <span style={{ fontSize: 11 }}>(có thể chọn nhiều)</span></div>
          {setups.length === 0
            ? <div style={{ textAlign: "center", fontSize: 13, color: "#bbb", padding: "20px 0", background: "#f7f7f5", borderRadius: 10 }}>Chưa có setup nào. Vào tab <strong>Thiết lập</strong> để tạo setup.</div>
            : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {setups.map(setup => {
                  const selected = selectedSetupIds.includes(setup.id);
                  return (
                    <button key={setup.id} onClick={() => toggleSetup(setup.id)} style={{
                      textAlign: "left", padding: "12px 14px", borderRadius: 12, cursor: "pointer",
                      border: `1.5px solid ${selected ? "#185FA5" : "#e5e5e5"}`,
                      background: selected ? "#EBF4FD" : "#fff",
                      transition: "all 0.15s", fontFamily: "inherit",
                      boxShadow: selected ? "0 0 0 3px rgba(24,95,165,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: selected ? "#185FA5" : "#222" }}>{selected ? "✓ " : ""}{setup.name}</span>
                        <span style={{ fontSize: 11, color: "#aaa" }}>{setup.steps.length} bước</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {setup.steps.slice(0, 4).map((s, i) => (
                          <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#f1f1ee", color: "#666", border: "0.5px solid #ddd" }}>{i + 1}. {s.label}</span>
                        ))}
                        {setup.steps.length > 4 && <span style={{ fontSize: 11, color: "#bbb" }}>+{setup.steps.length - 4} nữa</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
          }
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          {onCancel && <button onClick={onCancel} style={{ ...btnStyle, color: "#aaa" }}>Huỷ</button>}
          <button onClick={() => setFlowStep("form")} disabled={!form.position} style={{ ...primaryBtn, opacity: form.position ? 1 : 0.4, cursor: form.position ? "pointer" : "not-allowed" }}>Tiếp tục →</button>
        </div>
      </div>
    );
  }

  // ── Form screen ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!isEditing && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", paddingBottom: 12, borderBottom: "0.5px solid #f0f0f0" }}>
          <button onClick={() => setFlowStep("pick")} style={{ ...btnStyle, color: "#aaa", padding: "4px 10px", fontSize: 12 }}>← Đổi</button>
          <span style={{ padding: "3px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600, background: isBuy ? "#EAF3DE" : "#FCEBEB", color: isBuy ? "#3B6D11" : "#A32D2D", border: `1px solid ${isBuy ? "#97C459" : "#F09595"}` }}>
            {isBuy ? "▲ Buy" : "▼ Sell"}
          </span>
          {selectedSetups.map(s => (
            <span key={s.id} style={{ padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: "#EBF4FD", color: "#185FA5", border: "1px solid #85B7EB" }}>{s.name}</span>
          ))}
          {selectedSetups.length === 0 && <span style={{ fontSize: 12, color: "#bbb" }}>Không có setup</span>}
        </div>
      )}
      <SecTitle txt="Thông tin lệnh" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={lbl}>Ngày</div>
          <input type="date" value={form.date} onChange={e => set("date", e.target.value)} style={inp} />
        </div>
        <div>
          <div style={lbl}>Ticker</div>
          <input type="text" placeholder="NQ, ES, EURUSD..." value={form.ticker} onChange={e => set("ticker", e.target.value.toUpperCase())} style={inp} />
        </div>
      </div>
      {isEditing && (
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
      )}
      {selectedSetups.length > 0 && (
        <>
          <SecTitle txt="Lý do vào lệnh" />
          {selectedSetups.map(setup => (
            <div key={setup.id} style={{ marginBottom: 4 }}>
              {selectedSetups.length > 1 && <div style={{ fontSize: 12, fontWeight: 600, color: "#185FA5", marginBottom: 8 }}>{setup.name}</div>}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {setup.steps.map((step, idx) => {
                  const val = form.stepData?.[setup.id]?.[idx];
                  return (
                    <div key={idx}>
                      <div style={lbl}>{idx + 1}. {step.label}</div>
                      {step.type === "check"
                        ? <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 12px", borderRadius: 8, border: `1px solid ${val ? "#97C459" : "#e5e5e5"}`, background: val ? "#f0fae8" : "#fff", transition: "all 0.15s" }}>
                            <input type="checkbox" checked={!!val} onChange={() => setStepData(setup.id, idx, !val)} style={{ width: 16, height: 16, accentColor: "#3B6D11", flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: val ? "#3B6D11" : "#aaa" }}>{val ? "Đã xác nhận" : "Chưa xác nhận"}</span>
                          </label>
                        : <textarea rows={2} placeholder={step.placeholder || `Nhập ${step.label.toLowerCase()}...`} value={val || ""} onChange={e => setStepData(setup.id, idx, e.target.value)} style={{ ...inp, resize: "vertical" }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
      <SecTitle txt="Thời gian vào lệnh" />
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
            {sessions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <SecTitle txt="Sau lệnh" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={lbl}>Kết quả</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["Win", "Loss", "BE"].map(r => (
              <button key={r} onClick={() => set("result", r)} style={{ flex: 1, padding: "6px 0", cursor: "pointer", fontSize: 13, fontWeight: 500, borderRadius: 8, fontFamily: "inherit", background: form.result === r ? (r === "Win" ? "#EAF3DE" : r === "Loss" ? "#FCEBEB" : "#FAEEDA") : "#fff", color: form.result === r ? (r === "Win" ? "#3B6D11" : r === "Loss" ? "#A32D2D" : "#854F0B") : "#777", border: `1.5px solid ${form.result === r ? (r === "Win" ? "#97C459" : r === "Loss" ? "#F09595" : "#EF9F27") : "#ddd"}` }}>{r}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={lbl}>P&L (R hoặc $)</div>
          <input type="text" placeholder="+2R hoặc +250$" value={form.pnl} onChange={e => set("pnl", e.target.value)} style={inp} />
        </div>
      </div>
      <div>
        <div style={lbl}>Tâm lý</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 6 }}>
          {PSYCHOLOGY_OPTIONS.map(p => <button key={p} onClick={() => toggleArr("psychologyTags", p)} style={chipStyle((form.psychologyTags || []).includes(p), { bg: "#EEEDFE", text: "#3C3489", border: "#AFA9EC" })}>{p}</button>)}
        </div>
        <input type="text" placeholder="Ghi thêm nếu cần..." value={form.psychology} onChange={e => set("psychology", e.target.value)} style={{ ...inp, fontSize: 13 }} />
      </div>
      <div>
        <div style={lbl}>Bài học rút ra</div>
        <textarea rows={2} placeholder="vd: Không trade revenge, chờ confirmation..." value={form.lesson} onChange={e => set("lesson", e.target.value)} style={{ ...inp, resize: "vertical" }} />
      </div>
      <div>
        <div style={lbl}>Hình ảnh chart (không giới hạn)</div>
        <ImageUpload images={form.images} onChange={handleImages} />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
        {onCancel && <button onClick={onCancel} style={btnStyle}>Huỷ</button>}
        <button onClick={() => onSave(form)} style={primaryBtn}>Lưu lệnh</button>
      </div>
    </div>
  );
}

// ─── Trade Card ───────────────────────────────────────────────────────────────
// FIX: ExportCard is only mounted when expanded, avoiding heavy DOM
function TradeCard({ trade, onDelete, onEdit, setups }) {
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);
  const resColor = trade.result === "Win" ? "win" : trade.result === "Loss" ? "loss" : "be";
  const handleExport = async fmt => { setExporting(true); await exportCard(trade.id, fmt); setExporting(false); };
  const selectedSetups = setups.filter(s => (trade.selectedSetupIds || []).includes(s.id));

  return (
    <>
      {/* FIX: Only render hidden export card when expanded (avoids n×DOM bloat) */}
      {expanded && <ExportCard trade={trade} setups={setups} />}
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
          <div style={{ padding: "12px 16px", borderTop: "0.5px solid #f0f0f0", display: "flex", flexDirection: "column", gap: 10 }}>
            {selectedSetups.map(setup => {
              const data = trade.stepData?.[setup.id] || {};
              const filledCount = setup.steps.filter((_, i) => data[i] !== undefined && data[i] !== "" && data[i] !== false).length;
              return (
                <div key={setup.id} style={{ background: "#f7f7f5", borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#555", marginBottom: 8 }}>{setup.name} <span style={{ color: "#bbb", fontWeight: 400 }}>· {filledCount}/{setup.steps.length} bước</span></div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {setup.steps.map((step, idx) => (
                      <div key={idx} style={{ fontSize: 13 }}>
                        <span style={{ color: "#aaa", fontSize: 11 }}>{idx + 1}. {step.label}: </span>
                        {step.type === "check"
                          ? <span style={{ color: data[idx] ? "#3B6D11" : "#ccc" }}>{data[idx] ? "✓" : "○"}</span>
                          : <span style={{ color: "#333" }}>{data[idx] || <span style={{ color: "#ccc" }}>—</span>}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {trade.entryTF && <div style={{ fontSize: 13 }}><span style={{ color: "#888", fontWeight: 500 }}>Entry TF: </span>{trade.entryTF}{trade.session ? ` · ${trade.session}` : ""}</div>}
            {(trade.psychologyTags?.length > 0 || trade.psychology) && <div style={{ fontSize: 13 }}><span style={{ color: "#888", fontWeight: 500 }}>Tâm lý: </span>{[...(trade.psychologyTags || []), trade.psychology].filter(Boolean).join(" · ")}</div>}
            {trade.lesson && <div style={{ fontSize: 13 }}><span style={{ color: "#888", fontWeight: 500 }}>Bài học: </span>{trade.lesson}</div>}
            {trade.images?.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8, marginTop: 4 }}>
                {trade.images.map((img, i) => (
                  <div key={i} style={{ borderRadius: 6, overflow: "hidden", border: "0.5px solid #ddd", background: "#000" }}>
                    <img src={img.url} alt={img.name} style={{ width: "100%", aspectRatio: "16/9", objectFit: "contain", display: "block" }} />
                  </div>
                ))}
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

// ─── History Tab with Filter ──────────────────────────────────────────────────
function HistoryTab({ trades, setups, sessions, onDelete, onEdit }) {
  const [search,    setSearch]    = useState("");
  const [filterPos, setFilterPos] = useState("");
  const [filterRes, setFilterRes] = useState("");
  const [filterSes, setFilterSes] = useState("");

  const filtered = useMemo(() => {
    return trades.filter(t => {
      if (filterPos && t.position !== filterPos) return false;
      if (filterRes && t.result  !== filterRes)  return false;
      if (filterSes && t.session !== filterSes)  return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (t.ticker   || "").toLowerCase().includes(q) ||
          (t.lesson   || "").toLowerCase().includes(q) ||
          (t.session  || "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [trades, search, filterPos, filterRes, filterSes]);

  const chipFilter = (val, setVal, opts, colorMap) => (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {opts.map(o => {
        const active = val === o;
        const c = colorMap[o] || { bg: "#f1f1ee", text: "#555", border: "#ddd" };
        return <button key={o} onClick={() => setVal(active ? "" : o)} style={{ fontSize: 12, padding: "3px 12px", cursor: "pointer", borderRadius: 20, background: active ? c.bg : "transparent", color: active ? c.text : "#888", border: `1px solid ${active ? c.border : "#ddd"}`, fontFamily: "inherit" }}>{o}</button>;
      })}
    </div>
  );

  return (
    <div>
      {/* Filter bar */}
      <div style={{ background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 12, padding: "14px 16px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="text" placeholder="🔍  Tìm ticker, bài học, session..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inp, fontSize: 13 }} />
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, color: "#bbb", marginBottom: 5 }}>HƯỚNG</div>
            {chipFilter(filterPos, setFilterPos, ["Buy","Sell"], { Buy: { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459" }, Sell: { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" } })}
          </div>
          <div>
            <div style={{ fontSize: 11, color: "#bbb", marginBottom: 5 }}>KẾT QUẢ</div>
            {chipFilter(filterRes, setFilterRes, ["Win","Loss","BE"], { Win: { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459" }, Loss: { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" }, BE: { bg: "#FAEEDA", text: "#854F0B", border: "#EF9F27" } })}
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 11, color: "#bbb", marginBottom: 5 }}>SESSION</div>
            <select value={filterSes} onChange={e => setFilterSes(e.target.value)} style={{ ...inp, fontSize: 12, padding: "4px 8px" }}>
              <option value="">Tất cả</option>
              {sessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {(search || filterPos || filterRes || filterSes) && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#aaa" }}>{filtered.length} / {trades.length} lệnh</span>
            <button onClick={() => { setSearch(""); setFilterPos(""); setFilterRes(""); setFilterSes(""); }} style={{ ...btnStyle, fontSize: 12, padding: "3px 10px", color: "#888" }}>Xoá filter</button>
          </div>
        )}
      </div>
      {filtered.length === 0
        ? <div style={{ textAlign: "center", color: "#bbb", padding: "60px 0", fontSize: 14 }}>{trades.length === 0 ? "Chưa có lệnh nào. Hãy thêm lệnh đầu tiên!" : "Không tìm thấy lệnh nào phù hợp."}</div>
        : filtered.map(t => <TradeCard key={t.id} trade={t} onDelete={onDelete} onEdit={onEdit} setups={setups} />)
      }
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────
function CalendarView({ trades, onSelectDay }) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  // Build map: "YYYY-MM-DD" → [trades]
  const tradeMap = useMemo(() => {
    const m = {};
    trades.forEach(t => {
      if (!m[t.date]) m[t.date] = [];
      m[t.date].push(t);
    });
    return m;
  }, [trades]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay    = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  // Shift so Monday=0
  const startOffset = (firstDay + 6) % 7;

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  const DOW = ["T2","T3","T4","T5","T6","T7","CN"];

  // Monthly summary
  const monthTrades = trades.filter(t => {
    const d = new Date(t.date);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });
  const mWins   = monthTrades.filter(t => t.result === "Win").length;
  const mLosses = monthTrades.filter(t => t.result === "Loss").length;
  const mBE     = monthTrades.filter(t => t.result === "BE").length;
  const mWR     = monthTrades.filter(t => t.result).length
    ? ((mWins / monthTrades.filter(t => t.result).length) * 100).toFixed(0)
    : "—";

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <button onClick={prevMonth} style={{ ...btnStyle, padding: "5px 12px" }}>←</button>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>{monthName}</span>
        <button onClick={nextMonth} style={{ ...btnStyle, padding: "5px 12px" }}>→</button>
      </div>

      {/* Monthly summary chips */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "#f1f1ee", color: "#555", border: "0.5px solid #ddd" }}>{monthTrades.length} lệnh</span>
        <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "#EAF3DE", color: "#3B6D11", border: "0.5px solid #97C459" }}>✓ {mWins} Win</span>
        <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "#FCEBEB", color: "#A32D2D", border: "0.5px solid #F09595" }}>✗ {mLosses} Loss</span>
        {mBE > 0 && <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "#FAEEDA", color: "#854F0B", border: "0.5px solid #EF9F27" }}>— {mBE} BE</span>}
        <span style={{ fontSize: 12, padding: "4px 12px", borderRadius: 20, background: "#EBF4FD", color: "#185FA5", border: "0.5px solid #85B7EB" }}>WR {mWR}%</span>
      </div>

      {/* Day of week headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {DOW.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: d === "CN" ? "#e57373" : "#bbb", padding: "4px 0" }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;
          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayTrades = tradeMap[dateStr] || [];
          const wins   = dayTrades.filter(t => t.result === "Win").length;
          const losses = dayTrades.filter(t => t.result === "Loss").length;
          const be     = dayTrades.filter(t => t.result === "BE").length;
          const noRes  = dayTrades.filter(t => !t.result).length;
          const isToday = dateStr === today.toISOString().slice(0, 10);

          // Day cell background: green if net positive, red if net negative, neutral if empty
          let cellBg = "#f7f7f5", cellBorder = "#eee", textColor = "#333";
          if (dayTrades.length > 0) {
            if (wins > losses)       { cellBg = "#EAF3DE"; cellBorder = "#97C459"; textColor = "#2d5a0e"; }
            else if (losses > wins)  { cellBg = "#FCEBEB"; cellBorder = "#F09595"; textColor = "#8c1f1f"; }
            else if (be > 0)         { cellBg = "#FAEEDA"; cellBorder = "#EF9F27"; textColor = "#7a4400"; }
            else                     { cellBg = "#EBF4FD"; cellBorder = "#85B7EB"; textColor = "#185FA5"; }
          }

          const isWeekend = i % 7 === 5 || i % 7 === 6;

          return (
            <div
              key={dateStr}
              onClick={() => dayTrades.length > 0 && onSelectDay(dateStr, dayTrades)}
              style={{
                minHeight: 64, padding: "6px 8px", borderRadius: 8, border: `1.5px solid ${isToday ? "#185FA5" : cellBorder}`,
                background: cellBg, cursor: dayTrades.length > 0 ? "pointer" : "default",
                boxShadow: isToday ? "0 0 0 2px rgba(24,95,165,0.18)" : "none",
                transition: "all 0.12s", position: "relative",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? "#185FA5" : (isWeekend ? "#e57373" : textColor), marginBottom: 4 }}>{day}</div>
              {dayTrades.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {wins   > 0 && <div style={{ fontSize: 10, color: "#3B6D11", fontWeight: 600 }}>✓ {wins}W</div>}
                  {losses > 0 && <div style={{ fontSize: 10, color: "#A32D2D", fontWeight: 600 }}>✗ {losses}L</div>}
                  {be     > 0 && <div style={{ fontSize: 10, color: "#854F0B", fontWeight: 600 }}>— {be}</div>}
                  {noRes  > 0 && <div style={{ fontSize: 10, color: "#aaa" }}>○ {noRes}</div>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Day Detail Modal ─────────────────────────────────────────────────────────
function DayModal({ dateStr, dayTrades, setups, onClose, onEdit, onDelete }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 999, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 780, maxHeight: "80vh", overflowY: "auto", padding: 24 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>
            {new Date(dateStr + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
          <button onClick={onClose} style={{ ...btnStyle, padding: "4px 12px", fontSize: 13, color: "#888" }}>Đóng ✕</button>
        </div>
        {dayTrades.map(t => <TradeCard key={t.id} trade={t} onDelete={id => { onDelete(id); if (dayTrades.length === 1) onClose(); }} onEdit={t => { onClose(); onEdit(t); }} setups={setups} />)}
      </div>
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function Stats({ trades, setups, sessions }) {
  const withResult = trades.filter(t => t.result);
  const wins   = withResult.filter(t => t.result === "Win").length;
  const losses = withResult.filter(t => t.result === "Loss").length;
  const be     = withResult.filter(t => t.result === "BE").length;
  const wr     = withResult.length ? ((wins / withResult.length) * 100).toFixed(1) : "—";

  const StatCard = ({ label, val, color }) => (
    <div style={{ background: "#f7f7f5", borderRadius: 8, padding: "14px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "#aaa", fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 600, color: color || "#111" }}>{val}</div>
    </div>
  );
  const TableRow = ({ label, count, wins }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "0.5px solid #f0f0f0", fontSize: 13 }}>
      <span style={{ color: "#333" }}>{label}</span>
      <span style={{ color: "#999" }}>{count} lệnh · <span style={{ color: "#3B6D11", fontWeight: 500 }}>{count ? ((wins / count) * 100).toFixed(0) : 0}% WR</span></span>
    </div>
  );

  const bySession = sessions.map(s => ({
    session: s,
    count: trades.filter(t => t.session === s).length,
    wins:  trades.filter(t => t.session === s && t.result === "Win").length,
  })).filter(s => s.count > 0);

  const bySetup = setups.map(s => ({
    name:  s.name,
    count: trades.filter(t => (t.selectedSetupIds || []).includes(s.id)).length,
    wins:  trades.filter(t => (t.selectedSetupIds || []).includes(s.id) && t.result === "Win").length,
  })).filter(s => s.count > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        <StatCard label="Tổng lệnh"       val={trades.length} />
        <StatCard label="Win rate"         val={`${wr}%`} color="#3B6D11" />
        <StatCard label="Win / Loss / BE"  val={`${wins} / ${losses} / ${be}`} />
        <StatCard label="Chưa có kết quả" val={trades.length - withResult.length} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.3 }}>Theo session</div>
          {bySession.length === 0 && <div style={{ fontSize: 13, color: "#bbb" }}>Chưa có dữ liệu</div>}
          {bySession.map(s => <TableRow key={s.session} label={s.session} count={s.count} wins={s.wins} />)}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#888", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.3 }}>Theo setup</div>
          {bySetup.length === 0 && <div style={{ fontSize: 13, color: "#bbb" }}>Chưa có dữ liệu</div>}
          {bySetup.map(s => <TableRow key={s.name} label={s.name} count={s.count} wins={s.wins} />)}
        </div>
      </div>
    </div>
  );
}

// ─── Setup Editor ─────────────────────────────────────────────────────────────
function SetupEditor({ setup, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(setup?.name || "");
  const [steps, setSteps] = useState(setup?.steps || [{ label: "", type: "text", placeholder: "" }]);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const addStep    = () => setSteps(s => [...s, { label: "", type: "text", placeholder: "" }]);
  const updateStep = (i, key, val) => setSteps(s => s.map((x, j) => j === i ? { ...x, [key]: val } : x));
  const removeStep = i => setSteps(s => s.filter((_, j) => j !== i));
  const handleDrop = i => {
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setDragOverIdx(null); return; }
    const ns = [...steps]; const [m] = ns.splice(dragIdx, 1); ns.splice(i, 0, m);
    setSteps(ns); setDragIdx(null); setDragOverIdx(null);
  };
  const handleSave = () => {
    if (!name.trim()) return alert("Vui lòng nhập tên phương pháp");
    const clean = steps.filter(s => s.label.trim());
    if (!clean.length) return alert("Vui lòng thêm ít nhất 1 bước");
    onSave({ id: setup?.id || Date.now(), name: name.trim(), steps: clean });
  };

  return (
    <div style={{ background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 12, padding: 20, marginBottom: 16 }}>
      <div style={{ marginBottom: 14 }}>
        <div style={lbl}>Tên phương pháp</div>
        <input type="text" placeholder="vd: ICT 2022, SMC, Price Action..." value={name} onChange={e => setName(e.target.value)} style={{ ...inp, fontSize: 15, fontWeight: 500 }} />
      </div>
      <div style={{ fontSize: 12, color: "#777", marginBottom: 8, fontWeight: 500 }}>Các bước <span style={{ color: "#bbb", fontWeight: 400 }}>(kéo thả để đổi thứ tự)</span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {steps.map((step, i) => (
          <div key={i} draggable onDragStart={() => setDragIdx(i)} onDragOver={e => { e.preventDefault(); setDragOverIdx(i); }} onDrop={() => handleDrop(i)} onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
            style={{ display: "flex", gap: 8, alignItems: "flex-start", opacity: dragIdx === i ? 0.4 : 1, borderTop: dragOverIdx === i && dragIdx !== i ? "2px solid #185FA5" : "2px solid transparent", paddingTop: 4, transition: "border-color 0.1s" }}>
            <span style={{ cursor: "grab", color: "#ccc", fontSize: 16, userSelect: "none", paddingTop: 6, flexShrink: 0 }}>⠿</span>
            <span style={{ fontSize: 13, color: "#bbb", paddingTop: 8, minWidth: 20, flexShrink: 0 }}>{i + 1}.</span>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
              <input type="text" placeholder="Tên bước... vd: Xác định bias" value={step.label} onChange={e => updateStep(i, "label", e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addStep())} style={{ ...inp, fontSize: 13 }} />
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#aaa" }}>Kiểu:</span>
                {[{ val: "text", label: "📝 Điền text" }, { val: "check", label: "☑ Checkbox" }].map(o => (
                  <button key={o.val} onClick={() => updateStep(i, "type", o.val)} style={{ fontSize: 11, padding: "3px 10px", cursor: "pointer", borderRadius: 20, border: `1px solid ${step.type === o.val ? "#185FA5" : "#ddd"}`, background: step.type === o.val ? "#EBF4FD" : "transparent", color: step.type === o.val ? "#185FA5" : "#888", fontFamily: "inherit" }}>{o.label}</button>
                ))}
                {step.type === "text" && <input type="text" placeholder="Placeholder tuỳ chọn..." value={step.placeholder || ""} onChange={e => updateStep(i, "placeholder", e.target.value)} style={{ ...inp, fontSize: 11, flex: 1, padding: "3px 8px" }} />}
              </div>
            </div>
            <button onClick={() => removeStep(i)} style={{ ...btnStyle, color: "#c0392b", borderColor: "#f09595", padding: "4px 10px", flexShrink: 0, marginTop: 2 }}>✕</button>
          </div>
        ))}
      </div>
      <button onClick={addStep} style={{ ...btnStyle, marginBottom: 16, color: "#185FA5", borderColor: "#85B7EB" }}>+ Thêm bước</button>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {onDelete && <button onClick={onDelete} style={{ ...btnStyle, color: "#c0392b", borderColor: "#f09595", marginRight: "auto" }}>Xoá setup</button>}
        {onCancel  && <button onClick={onCancel} style={btnStyle}>Huỷ</button>}
        <button onClick={handleSave} style={primaryBtn}>Lưu setup</button>
      </div>
    </div>
  );
}

// ─── ThietLap Tab ─────────────────────────────────────────────────────────────
function ThietLapTab({ setups, onSetupsSave, sessions, onSessionsSave }) {
  const [editingId, setEditingId] = useState(null);
  const [editingSetup, setEditingSetup] = useState(null);
  const [newSession, setNewSession] = useState("");

  const handleSaveSetup = saved => {
    const exists = setups.find(s => s.id === saved.id);
    onSetupsSave(exists ? setups.map(s => s.id === saved.id ? saved : s) : [...setups, saved]);
    setEditingId(null); setEditingSetup(null);
  };
  const handleDeleteSetup = id => {
    if (!window.confirm("Xoá setup này?")) return;
    onSetupsSave(setups.filter(s => s.id !== id));
    setEditingId(null); setEditingSetup(null);
  };
  const addSession = () => {
    const s = newSession.trim();
    if (!s || sessions.includes(s)) return;
    onSessionsSave([...sessions, s]);
    setNewSession("");
  };
  const removeSession = s => onSessionsSave(sessions.filter(x => x !== s));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 4 }}>Phương pháp giao dịch</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Mỗi setup là checklist các bước bạn cần làm trước khi vào lệnh.</div>
        {setups.length === 0 && !editingId && <div style={{ textAlign: "center", color: "#ccc", padding: "30px 0", fontSize: 13, background: "#f7f7f5", borderRadius: 10 }}>Chưa có setup nào.</div>}
        {setups.map(setup => (
          editingId === setup.id
            ? <SetupEditor key={setup.id} setup={editingSetup} onSave={handleSaveSetup} onCancel={() => { setEditingId(null); setEditingSetup(null); }} onDelete={() => handleDeleteSetup(setup.id)} />
            : (
              <div key={setup.id} style={{ background: "#fff", border: "0.5px solid #e5e5e5", borderRadius: 12, padding: "14px 16px", marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "flex-start", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                <div style={{ flex: 1, marginRight: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#111", marginBottom: 6 }}>{setup.name}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {setup.steps.map((s, i) => (
                      <span key={i} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 12, background: s.type === "check" ? "#f0fae8" : "#f1f1ee", color: s.type === "check" ? "#3B6D11" : "#666", border: `0.5px solid ${s.type === "check" ? "#97C459" : "#ddd"}` }}>
                        {i + 1}. {s.label} {s.type === "check" ? "☑" : "✏"}
                      </span>
                    ))}
                  </div>
                </div>
                <button onClick={() => { setEditingSetup(setup); setEditingId(setup.id); }} style={{ ...btnStyle, flexShrink: 0 }}>Sửa</button>
              </div>
            )
        ))}
        {editingId === "new" && <SetupEditor setup={null} onSave={handleSaveSetup} onCancel={() => setEditingId(null)} />}
        {editingId !== "new" && <button onClick={() => { setEditingSetup(null); setEditingId("new"); }} style={{ ...primaryBtn, marginTop: 4 }}>+ Tạo setup mới</button>}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 4 }}>Phiên giao dịch</div>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>Thêm các phiên phù hợp với phương pháp của bạn.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {sessions.map(s => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 20, background: "#f7f7f5", border: "0.5px solid #ddd", fontSize: 13 }}>
              <span>{s}</span>
              <button onClick={() => removeSession(s)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ccc", fontSize: 14, padding: 0, lineHeight: 1 }}>✕</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="text" placeholder="Thêm phiên mới... vd: NY AM, Signal M15" value={newSession} onChange={e => setNewSession(e.target.value)} onKeyDown={e => e.key === "Enter" && addSession()} style={{ ...inp, flex: 1, fontSize: 13 }} />
          <button onClick={addSession} style={btnStyle}>Thêm</button>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab,       setTab]       = useState("new");
  const [trades,    setTrades]    = useState(() => load(STORAGE_KEY,  []));
  const [setups,    setSetups]    = useState(() => load(SETUPS_KEY,   []));
  const [sessions,  setSessions]  = useState(() => load(SESSIONS_KEY, DEFAULT_SESSIONS));
  const [editTrade, setEditTrade] = useState(null);
  const [dayModal,  setDayModal]  = useState(null); // { dateStr, dayTrades }

  useEffect(() => { persist(STORAGE_KEY,  trades);   }, [trades]);
  useEffect(() => { persist(SETUPS_KEY,   setups);   }, [setups]);
  useEffect(() => { persist(SESSIONS_KEY, sessions); }, [sessions]);

  // FIX: id assigned here on save, not inside emptyForm
  const saveTrade = form => {
    setTrades(ts => editTrade
      ? ts.map(t => t.id === form.id ? form : t)
      : [{ ...form, id: Date.now() }, ...ts]
    );
    setEditTrade(null);
    setTab("history");
  };
  const deleteTrade = id => {
    if (window.confirm("Xoá lệnh này?")) {
      setTrades(ts => ts.filter(t => t.id !== id));
      // Update day modal if open
      if (dayModal) {
        const remaining = dayModal.dayTrades.filter(t => t.id !== id);
        if (remaining.length === 0) setDayModal(null);
        else setDayModal({ ...dayModal, dayTrades: remaining });
      }
    }
  };
  const startEdit = trade => { setEditTrade(trade); setTab("new"); };

  const tabStyle = t => ({
    padding: "9px 22px", cursor: "pointer", fontSize: 14,
    fontWeight: tab === t ? 600 : 400,
    background: "transparent", border: "none",
    borderBottom: `2px solid ${tab === t ? "#111" : "transparent"}`,
    color: tab === t ? "#111" : "#888",
    fontFamily: "inherit",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#fafafa", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 20px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 4 }}>My Trading Journal</h1>
        <p style={{ fontSize: 13, color: "#aaa", marginBottom: 20 }}>Time - Price - Consistency</p>

        <div style={{ display: "flex", borderBottom: "0.5px solid #e5e5e5", marginBottom: 24, overflowX: "auto" }}>
          <button style={tabStyle("new")}      onClick={() => { setEditTrade(null); setTab("new"); }}>+ Lệnh mới</button>
          <button style={tabStyle("history")}  onClick={() => setTab("history")}>Lịch sử ({trades.length})</button>
          <button style={tabStyle("calendar")} onClick={() => setTab("calendar")}>📅 Calendar</button>
          <button style={tabStyle("stats")}    onClick={() => setTab("stats")}>Thống kê</button>
          <button style={tabStyle("thietlap")} onClick={() => setTab("thietlap")}>Thiết lập</button>
        </div>

        {tab === "new"      && <NewTradeFlow initial={editTrade} onSave={saveTrade} onCancel={editTrade ? () => { setEditTrade(null); setTab("history"); } : null} setups={setups} sessions={sessions} />}
        {tab === "history"  && <HistoryTab trades={trades} setups={setups} sessions={sessions} onDelete={deleteTrade} onEdit={startEdit} />}
        {tab === "calendar" && <CalendarView trades={trades} onSelectDay={(dateStr, dayTrades) => setDayModal({ dateStr, dayTrades })} />}
        {tab === "stats"    && <Stats trades={trades} setups={setups} sessions={sessions} />}
        {tab === "thietlap" && <ThietLapTab setups={setups} onSetupsSave={setSetups} sessions={sessions} onSessionsSave={setSessions} />}

        {dayModal && (
          <DayModal
            dateStr={dayModal.dateStr}
            dayTrades={dayModal.dayTrades}
            setups={setups}
            onClose={() => setDayModal(null)}
            onEdit={startEdit}
            onDelete={deleteTrade}
          />
        )}
      </div>
    </div>
  );
}