"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { supabase } from "./lib/supabaseClient";

// ─── Constants ────────────────────────────────────────────────────────────────
const TIMEFRAMES = ["1M","2M","3M","5M","15M","30M","1H","4H","D","W"];
const STORAGE_KEY  = "my_journal_trades";
const SETUPS_KEY   = "my_journal_setups";
const SESSIONS_KEY = "my_journal_sessions";
const PNL_MODE_KEY = "my_journal_pnl_mode";
const LANGUAGE_KEY = "my_journal_language";
const JOURNAL_TABLE = "journal_data";
const TRADE_DRAFT_KEY = "my_journal_trade_draft";
const DEFAULT_LANGUAGE = "en";

const LANGUAGES = [
  { value: "vi", label: "Tiếng Việt" },
  { value: "en", label: "English" },
];

const TEXT = {
  vi: {
    newTrade: "+ Lệnh mới",
    history: "Lịch sử",
    stats: "Thống kê",
    settings: "Thiết lập",
    madeBy: "Made by Chau Nguyen",
    loginValue: "Journal less. Review better. Trade with more discipline.",
    loginValue: "Journal less. Review better. Trade with more discipline.",
    newTradeValue: "Mỗi lệnh nên trả lời một câu hỏi: bạn có đi đúng kế hoạch không?",
    historyValue: "Lịch sử giao dịch không chỉ là danh sách các lệnh. Nó là tấm gương phản chiếu thói quen của bạn.",
    statsValue: "Những thống kê đơn giản giúp bạn hiểu kỷ luật giao dịch của mình, thay vì bị ngợp bởi các con số.",
    settingsValue: "Xác định quy tắc giao dịch trước khi thị trường thử thách kỷ luật của bạn.",

    chooseDirection: "Chọn hướng giao dịch",
    chooseSetup: "Chọn setup / chiến lược",
    onlyOne: "Chỉ nên chọn 1",
    noSetupPick: "Chưa có setup nào. Vào tab Thiết lập để tạo setup.",
    steps: "bước",
    more: "nữa",
    cancel: "Huỷ",
    continue: "Tiếp tục →",
    change: "← Đổi",
    noSetup: "Không có setup",

    tradeInfo: "Thông tin lệnh",
    date: "Ngày",
    ticker: "Ticker",
    position: "Position",
    entryReason: "Lý do vào lệnh",
    confirmed: "Đã xác nhận",
    notConfirmed: "Chưa xác nhận",
    enterContent: "Nhập nội dung...",

    tradeTime: "Thời gian vào lệnh",
    entryTimeframe: "Entry timeframe",
    session: "Session",
    chooseSession: "Chọn session...",

    afterTrade: "Sau lệnh",
    result: "Kết quả",
    pnlByR: "P/L (Theo R:R)",
    pnlByMoney: "P/L (Theo số tiền)",
    exampleBER: "vd: +0.2 hoặc -0.1",
    exampleR: "vd: 2 hoặc 1.5",
    exampleBEMoney: "vd: +20 hoặc -15",
    exampleMoney: "vd: 98 hoặc 250",

    psychology: "Tâm lý",
    psychologyPlaceholder: "Ghi thêm nếu cần...",

    disciplineReview: "Đánh giá kỷ luật",
    followedPlan: "Có theo đúng plan không?",
    followedYes: "Có",
    followedNo: "Không",
    followedPartial: "Một phần",
    mistakes: "Lỗi mắc phải",
    ruleBrokenNote: "Ghi chú rule bị phá",
    ruleBrokenPlaceholder: "vd: Vào lệnh trước confirmation, dời SL, trade ngoài plan...",
    m_fomo: "FOMO",
    m_revenge: "Revenge trade",
    m_noConfirmation: "Vào thiếu confirmation",
    m_movedSL: "Dời SL",
    m_exitEarly: "Chốt non",
    m_overtrade: "Overtrading",
    m_outsideSession: "Trade ngoài session",
    m_ignoreBias: "Bỏ qua HTF bias",
    m_poorRisk: "Quản lý rủi ro kém",

    lesson: "Bài học rút ra",
    lessonPlaceholder: "vd: Không trade revenge, chờ confirmation...",
    chartImages: "Hình ảnh chart (không giới hạn)",
    addImage: "+ Thêm ảnh",
    pasteImageHint: "Dán ảnh vào đây",
    saveTrade: "Lưu lệnh",

    searchPlaceholder: "🔍  Tìm ticker, bài học, session...",
    direction: "HƯỚNG",
    all: "Tất cả",
    showingTrades: "Đang hiển thị",
    clearFilter: "Xoá filter",
    noTrades: "Chưa có lệnh nào. Hãy thêm lệnh đầu tiên!",
    noMatchedTrades: "Không tìm thấy lệnh nào phù hợp.",

    filterByDate: "Lọc theo ngày",
    fromDate: "Từ ngày",
    toDate: "Đến ngày",
    totalTrades: "Tổng lệnh",
    tradeUnit: "lệnh",
    winRate: "Win rate",
    winLossBE: "Win / Loss / BE",
    noResult: "Chưa có kết quả",
    bySession: "Theo session",
    bySetup: "Theo setup",
    setupPerformance: "Hiệu suất setup",
    planRate: "Tỷ lệ theo plan",
    lossWithoutPlan: "Loss khi không theo plan",
    noSetupPerformance: "Chưa có dữ liệu setup.",
    noData: "Chưa có dữ liệu",

    setupName: "Tên phương pháp",
    setupNamePlaceholder: "vd: ICT 2022, SMC, Price Action...",
    setupSteps: "Các bước",
    dragHint: "kéo thả để đổi thứ tự",
    stepNamePlaceholder: "Tên bước... vd: Xác định bias",
    type: "Kiểu:",
    textInput: "📝 Điền text",
    checkbox: "☑ Checkbox",
    optionalPlaceholder: "Placeholder tuỳ chọn...",
    addStep: "+ Thêm bước",
    deleteSetup: "Xoá setup",
    saveSetup: "Lưu setup",

    pnlUnit: "Đơn vị ghi nhận P/L",
    pnlUnitNote: "Chọn cách bạn muốn ghi nhận kết quả mỗi lệnh. App sẽ tự thêm dấu + / - theo Win hoặc Loss.",
    byR: "Theo R:R",
    byMoney: "Theo số tiền",

    language: "Ngôn ngữ",
    languageNote: "Chọn ngôn ngữ hiển thị cho toàn bộ ứng dụng. Các dữ liệu bạn đã nhập sẽ được giữ nguyên.",

    tradingMethod: "Phương pháp giao dịch",
    tradingMethodNote1: "Mỗi setup là checklist các bước bạn cần làm trước khi vào lệnh.",
    tradingMethodNote2: "Hãy làm theo các bước để đảm bảo bạn tuân thủ kỷ luật giao dịch và tránh overtrading.",
    noSetupCreated: "Chưa có setup nào.",
    createSetup: "+ Tạo setup mới",

    tradingSessions: "Phiên giao dịch",
    tradingSessionsNote: "Thêm các phiên phù hợp với phương pháp của bạn.",
    newSessionPlaceholder: "Thêm phiên mới... vd: NY AM, Signal M15",
    add: "Thêm",
    edit: "Sửa",
    delete: "Xoá",
    close: "Đóng ✕",

    exportMissingLib: "Không thể export, thiếu thư viện.",
    exportFailed: "Export thất bại: ",
    bePnlAlert: "Lệnh BE cần nhập dấu + hoặc - ở P&L. Ví dụ: +0.2R hoặc -0.1R.",
    needSetupName: "Vui lòng nhập tên phương pháp",
    needOneStep: "Vui lòng thêm ít nhất 1 bước",
    confirmDeleteSetup: "Xoá setup này?",
    confirmDeleteTrade: "Xoá lệnh này?",

    feedbackText: "Bạn đang dùng bản thử nghiệm đầu tiên của My Trading Journal. Nếu có lỗi, góp ý hoặc tính năng bạn muốn thêm, hãy gửi feedback cho mình nhé.",
    feedbackBtn: "Gửi feedback",

    p_confident: "Tự tin, kiên nhẫn",
    p_fomo: "FOMO",
    p_revenge: "Revenge trade",
    p_anxious: "Hồi hộp, lo lắng",
    p_overconfident: "Overconfident",
    p_hesitate: "Do dự, vào trễ",
    p_calm: "Bình tĩnh, theo plan",
    p_exitEarly: "Thoát sớm vì sợ",
    p_letRun: "Để lệnh chạy tốt",

    weeklyReview: "Weekly Review",
    currentWeek: "Tuần hiện tại",
    previousWeek: "Tuần trước",
    nextWeek: "Tuần sau",
    weekRange: "Khoảng thời gian",
    planFollowRate: "Tỷ lệ theo plan",
    followedPlanWR: "WR khi theo plan",
    notFollowedPlanWR: "WR khi không theo plan",
    mostRepeatedMistake: "Lỗi lặp lại nhiều nhất",
    noMistakeData: "Chưa có lỗi nào được ghi nhận",
    bestSetup: "Setup nổi bật",
    mostUsedSetup: "Setup dùng nhiều nhất",
    suggestedFocus: "Gợi ý tập trung tuần tới",
    noWeeklyTrades: "Chưa có trade nào trong tuần này.",
    ruleNotes: "Rule notes",
    tradeLessons: "Lessons trong tuần",
    noLessonData: "Chưa có lesson nào.",
    noRuleNoteData: "Chưa có rule note nào.",
    weeklyInsightGood: "Tuần này bạn đang follow plan khá tốt. Tiếp tục giữ số lượng lệnh vừa phải và chỉ trade setup rõ ràng.",
    weeklyInsightNoPlan: "Bạn có nhiều lệnh chưa follow plan. Tuần tới nên giảm số lệnh và chỉ trade khi checklist đủ điều kiện.",
    weeklyInsightMistake: "Lỗi lặp lại nhiều nhất tuần này là",
    weeklyInsightNoData: "Hãy ghi thêm Followed Plan và Mistake Tags để Weekly Review có insight tốt hơn.",

    disciplineIssues: "Vấn đề kỷ luật",
    cleanTrades: "Clean trades",
    cleanTradeWR: "WR clean trades",
    issueTradeWR: "WR khi có vấn đề kỷ luật",
    aPlusTrades: "A+ trades",
    goodLosses: "Good losses",
    luckyWins: "Lucky wins",
    badLosses: "Bad losses",
    tradeQuality: "Chất lượng lệnh",

    advancedStats: "Thống kê chi tiết",
    showAdvancedStats: "Hiện thống kê chi tiết",
    hideAdvancedStats: "Ẩn thống kê chi tiết",
  },

  en: {
    newTrade: "+ New Trade",
    history: "History",
    stats: "Statistics",
    settings: "Settings",
    madeBy: "Made by Chau Nguyen",
    newTradeValue: "Every trade should answer one question: did you follow your plan?",
    historyValue: "Your trade history is not just a list of trades. It is a mirror of your habits.",
    statsValue: "Simple stats that help you understand your discipline, not drown in numbers.",
    settingsValue: "Define your trading rules before the market tests your discipline.",

    chooseDirection: "Choose trade direction",
    chooseSetup: "Choose setup / strategy",
    onlyOne: "Recommended: choose only 1",
    noSetupPick: "No setup yet. Go to the Settings tab to create one.",
    steps: "steps",
    more: "more",
    cancel: "Cancel",
    continue: "Continue →",
    change: "← Change",
    noSetup: "No setup",

    tradeInfo: "Trade information",
    date: "Date",
    ticker: "Ticker",
    position: "Position",
    entryReason: "Entry reason",
    confirmed: "Confirmed",
    notConfirmed: "Not confirmed",
    enterContent: "Enter content...",

    tradeTime: "Trade timing",
    entryTimeframe: "Entry timeframe",
    session: "Session",
    chooseSession: "Choose session...",

    afterTrade: "After trade",
    result: "Result",
    pnlByR: "P/L (R multiple)",
    pnlByMoney: "P/L (Money)",
    exampleBER: "e.g. +0.2 or -0.1",
    exampleR: "e.g. 2 or 1.5",
    exampleBEMoney: "e.g. +20 or -15",
    exampleMoney: "e.g. 98 or 250",

    psychology: "Psychology",
    psychologyPlaceholder: "Add more notes if needed...",

    disciplineReview: "Discipline review",
    followedPlan: "Did you follow your plan?",
    followedYes: "Yes",
    followedNo: "No",
    followedPartial: "Partially",
    mistakes: "Mistakes",
    ruleBrokenNote: "Rule broken note",
    ruleBrokenPlaceholder: "e.g. Entered before confirmation, moved SL, traded outside plan...",
    m_fomo: "FOMO",
    m_revenge: "Revenge trade",
    m_noConfirmation: "Entered without confirmation",
    m_movedSL: "Moved SL",
    m_exitEarly: "Closed too early",
    m_overtrade: "Overtrading",
    m_outsideSession: "Traded outside session",
    m_ignoreBias: "Ignored HTF bias",
    m_poorRisk: "Poor risk management",

    lesson: "Lesson learned",
    lessonPlaceholder: "e.g. No revenge trades, wait for confirmation...",
    chartImages: "Chart images (unlimited)",
    addImage: "+ Add image",
    pasteImageHint: "Paste image here",
    saveTrade: "Save trade",

    searchPlaceholder: "🔍  Search ticker, lesson, session...",
    direction: "DIRECTION",
    all: "All",
    showingTrades: "Showing",
    clearFilter: "Clear filter",
    noTrades: "No trades yet. Add your first trade!",
    noMatchedTrades: "No matching trades found.",

    filterByDate: "Filter by date",
    fromDate: "From date",
    toDate: "To date",
    totalTrades: "Total trades",
    tradeUnit: "trades",
    winRate: "Win rate",
    winLossBE: "Win / Loss / BE",
    noResult: "No result yet",
    bySession: "By session",
    bySetup: "By setup",
    setupPerformance: "Setup performance",
    planRate: "Plan rate",
    lossWithoutPlan: "Losses without plan",
    noSetupPerformance: "No setup performance data yet.",
    noData: "No data yet",

    setupName: "Method name",
    setupNamePlaceholder: "e.g. ICT 2022, SMC, Price Action...",
    setupSteps: "Steps",
    dragHint: "drag and drop to reorder",
    stepNamePlaceholder: "Step name... e.g. Define bias",
    type: "Type:",
    textInput: "📝 Text input",
    checkbox: "☑ Checkbox",
    optionalPlaceholder: "Optional placeholder...",
    addStep: "+ Add step",
    deleteSetup: "Delete setup",
    saveSetup: "Save setup",

    pnlUnit: "P/L recording unit",
    pnlUnitNote: "Choose how you want to record each trade result. The app will auto-add + / - based on Win or Loss.",
    byR: "By R:R",
    byMoney: "By money",

    language: "Language",
    languageNote: "Choose the display language for the whole app. Your saved trade data will stay unchanged.",

    tradingMethod: "Trading method",
    tradingMethodNote1: "Each setup is a checklist of steps you need before entering a trade.",
    tradingMethodNote2: "Follow these steps to maintain trading discipline and avoid overtrading.",
    noSetupCreated: "No setup created yet.",
    createSetup: "+ Create new setup",

    tradingSessions: "Trading sessions",
    tradingSessionsNote: "Add sessions that fit your trading method.",
    newSessionPlaceholder: "Add new session... e.g. NY AM, M15 Signal",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    close: "Close ✕",

    exportMissingLib: "Cannot export. Missing library.",
    exportFailed: "Export failed: ",
    bePnlAlert: "BE trades need a + or - sign in P/L. Example: +0.2R or -0.1R.",
    needSetupName: "Please enter a method name",
    needOneStep: "Please add at least 1 step",
    confirmDeleteSetup: "Delete this setup?",
    confirmDeleteTrade: "Delete this trade?",

    feedbackText: "You are using the first test version of My Trading Journal. If you find bugs, have feedback, or want a new feature, please send me your feedback.",
    feedbackBtn: "Send feedback",

    p_confident: "Confident, patient",
    p_fomo: "FOMO",
    p_revenge: "Revenge trade",
    p_anxious: "Nervous, anxious",
    p_overconfident: "Overconfident",
    p_hesitate: "Hesitated, entered late",
    p_calm: "Calm, followed the plan",
    p_exitEarly: "Exited early because of fear",
    p_letRun: "Let winners run",
    weeklyReview: "Weekly Review",
    currentWeek: "Current week",
    previousWeek: "Previous week",
    nextWeek: "Next week",
    weekRange: "Week range",
    planFollowRate: "Plan follow rate",
    followedPlanWR: "WR when following plan",
    notFollowedPlanWR: "WR when not following plan",
    mostRepeatedMistake: "Most repeated mistake",
    noMistakeData: "No mistakes recorded yet",
    bestSetup: "Best setup",
    mostUsedSetup: "Most used setup",
    suggestedFocus: "Suggested focus for next week",
    noWeeklyTrades: "No trades recorded this week.",
    ruleNotes: "Rule notes",
    tradeLessons: "Lessons this week",
    noLessonData: "No lessons recorded yet.",
    noRuleNoteData: "No rule notes recorded yet.",
    weeklyInsightGood: "You followed your plan well this week. Keep your trade count controlled and only take clear setups.",
    weeklyInsightNoPlan: "You had several trades that did not follow the plan. Next week, reduce trade frequency and only trade when your checklist is complete.",
    weeklyInsightMistake: "Your most repeated mistake this week is",
    weeklyInsightNoData: "Add Followed Plan and Mistake Tags to get better weekly review insights.",

    disciplineIssues: "Discipline issues",
    cleanTrades: "Clean trades",
    cleanTradeWR: "Clean trade WR",
    issueTradeWR: "Discipline issue WR",
    aPlusTrades: "A+ trades",
    goodLosses: "Good losses",
    luckyWins: "Lucky wins",
    badLosses: "Bad losses",
    tradeQuality: "Trade quality",

    advancedStats: "Advanced stats",
    showAdvancedStats: "Show advanced stats",
    hideAdvancedStats: "Hide advanced stats",
      },
};

const tOf = (lang, key) => TEXT[lang]?.[key] || TEXT.vi[key] || key;

const PSYCHOLOGY_OPTIONS = [
  { value: "Tự tin, kiên nhẫn", key: "p_confident" },
  { value: "FOMO", key: "p_fomo" },
  { value: "Revenge trade", key: "p_revenge" },
  { value: "Hồi hộp, lo lắng", key: "p_anxious" },
  { value: "Overconfident", key: "p_overconfident" },
  { value: "Do dự, vào trễ", key: "p_hesitate" },
  { value: "Bình tĩnh, theo plan", key: "p_calm" },
  { value: "Thoát sớm vì sợ", key: "p_exitEarly" },
  { value: "Để lệnh chạy tốt", key: "p_letRun" },
];

const MISTAKE_OPTIONS = [
  { value: "FOMO", key: "m_fomo" },
  { value: "Revenge trade", key: "m_revenge" },
  { value: "Entered without confirmation", key: "m_noConfirmation" },
  { value: "Moved SL", key: "m_movedSL" },
  { value: "Closed too early", key: "m_exitEarly" },
  { value: "Overtrading", key: "m_overtrade" },
  { value: "Traded outside session", key: "m_outsideSession" },
  { value: "Ignored HTF bias", key: "m_ignoreBias" },
  { value: "Poor risk management", key: "m_poorRisk" },
];

const mistakeLabel = (value, t) => {
  const item = MISTAKE_OPTIONS.find(m => m.value === value);
  return item ? t(item.key) : value;
};

const psychologyLabel = (value, t) => {
  const item = PSYCHOLOGY_OPTIONS.find(p => p.value === value);
  return item ? t(item.key) : value;
};

const DEFAULT_SESSIONS = [
  "Asia",
  "London",
  "Pre-market NY AM",
  "NY AM Macro 09:45–10:15",
  "NY AM Macro 10:45–11:15",
];

// ─── Storage helpers ──────────────────────────────────────────────────────────
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

const removePersist = key => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
  } catch {}
};

// ─── emptyForm: id assigned only on save ─────────────────────────────────────
const emptyForm = () => ({
  date: new Date().toISOString().slice(0, 10),
  ticker: "",
  position: "",
  selectedSetupIds: [],
  stepData: {},
  entryTF: "",
  session: "",
  psychologyTags: [],
  psychology: "",
  followedPlan: "",
  mistakeTags: [],
  ruleBrokenNote: "",
  lesson: "",
  images: [],
  result: "",
  pnl: "",
});

const normalizePnl = (result, pnl, pnlMode = "R") => {
  const raw = String(pnl || "").trim();
  if (!raw) return "";

  const isZero = raw === "0" || raw.toLowerCase() === "0r";
  if (isZero) return pnlMode === "R" ? "0R" : "0";

  let unsigned = raw.replace(/^[+-]\s*/, "").trim();

  if (pnlMode === "R") {
    unsigned = unsigned.replace(/r$/i, "");
    unsigned = `${unsigned}R`;
  }

  if (result === "Win") return `+${unsigned}`;
  if (result === "Loss") return `-${unsigned}`;

  return raw.startsWith("+") || raw.startsWith("-") ? `${raw[0]}${unsigned}` : raw;
};

const validatePnl = (result, pnl, t = key => tOf("vi", key)) => {
  const raw = String(pnl || "").trim();

  if (
    result === "BE" &&
    raw &&
    raw !== "0" &&
    raw.toLowerCase() !== "0r" &&
    !/^[+-]/.test(raw)
  ) {
    alert(t("bePnlAlert"));
    return false;
  }

  return true;
};

const parseDateKey = dateStr => {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const toDateKey = date => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getWeekRange = (offset = 0) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(today);
  start.setDate(today.getDate() + diffToMonday + offset * 7);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    start,
    end,
    startKey: toDateKey(start),
    endKey: toDateKey(end),
  };
};

const isDateInRange = (dateStr, startKey, endKey) => {
  if (!dateStr) return false;
  return dateStr >= startKey && dateStr <= endKey;
};

const calcWR = trades => {
  const withResult = trades.filter(trade => trade.result);
  if (!withResult.length) return "—";

  const wins = withResult.filter(trade => trade.result === "Win").length;
  return ((wins / withResult.length) * 100).toFixed(0);
};

const hasDisciplineIssue = trade => {
  return (
    trade.followedPlan === "No" ||
    trade.followedPlan === "Partially" ||
    (trade.mistakeTags || []).length > 0 ||
    Boolean(String(trade.ruleBrokenNote || "").trim())
  );
};

const isCleanTrade = trade => !hasDisciplineIssue(trade);

const tradeQuality = trade => {
  const issue = hasDisciplineIssue(trade);

  if (!issue && trade.followedPlan === "Yes" && trade.result === "Win") {
    return "A+";
  }

  if (!issue && trade.followedPlan === "Yes" && trade.result === "Loss") {
    return "Good Loss";
  }

  if (issue && trade.result === "Win") {
    return "Lucky Win";
  }

  if (issue && trade.result === "Loss") {
    return "Bad Loss";
  }

  return "Unclassified";
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const btnStyle = {
  fontSize: 13,
  padding: "5px 14px",
  cursor: "pointer",
  borderRadius: 7,
  border: "0.5px solid #ccc",
  background: "#fff",
  fontFamily: "inherit",
};

const primaryBtn = {
  ...btnStyle,
  background: "#1a1a1a",
  color: "#fff",
  border: "1px solid #1a1a1a",
  fontSize: 14,
  padding: "8px 22px",
  fontWeight: 500,
};

const inp = {
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  padding: "7px 10px",
  border: "0.5px solid #ccc",
  borderRadius: 7,
  outline: "none",
  fontFamily: "inherit",
};

const chipStyle = (active, c) => ({
  fontSize: 12,
  padding: "4px 12px",
  cursor: "pointer",
  borderRadius: 20,
  background: active ? c.bg : "transparent",
  color: active ? c.text : "#777",
  border: `1px solid ${active ? c.border : "#ddd"}`,
  fontWeight: active ? 500 : 400,
  fontFamily: "inherit",
});

const lbl = {
  fontSize: 12,
  color: "#777",
  marginBottom: 5,
  fontWeight: 500,
};

const PageValueText = ({ children }) => (
  <div
    style={{
      background: "#fff",
      border: "0.5px solid #e5e5e5",
      borderRadius: 14,
      padding: "14px 16px",
      marginBottom: 18,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}
  >
    <div
      style={{
        fontSize: 14,
        color: "#555",
        lineHeight: 1.6,
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  </div>
);

const SecTitle = ({ txt }) => (
  <div
    style={{
      fontSize: 12,
      fontWeight: 600,
      color: "#888",
      borderBottom: "0.5px solid #e5e5e5",
      paddingBottom: 5,
      marginBottom: 12,
      marginTop: 10,
      letterSpacing: 0.4,
    }}
  >
    {String(txt).toUpperCase()}
  </div>
);

// ─── Badge ────────────────────────────────────────────────────────────────────
function Badge({ label, color = "gray" }) {
  const colors = {
    buy: { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459" },
    sell: { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" },
    gray: { bg: "#f1f1ee", text: "#5F5E5A", border: "#B4B2A9" },
    win: { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459" },
    loss: { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" },
    be: { bg: "#FAEEDA", text: "#854F0B", border: "#EF9F27" },
  };

  const c = colors[color] || colors.gray;

  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        border: `0.5px solid ${c.border}`,
        borderRadius: 6,
        padding: "2px 10px",
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {label}
    </span>
  );
}

// ─── Image Upload ─────────────────────────────────────────────────────────────
function ImageUpload({ images, onChange, t }) {
  const ref = useRef();

  const addFiles = files => {
    Array.from(files).forEach(f => {
      if (!f.type?.startsWith("image/")) return;

      const reader = new FileReader();

      reader.onload = ev =>
        onChange(prev => [
          ...prev,
          {
            name: f.name || `pasted-chart-${Date.now()}.png`,
            url: ev.target.result,
          },
        ]);

      reader.readAsDataURL(f);
    });
  };

  const handleFiles = e => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const handlePaste = e => {
    const clipboardItems = e.clipboardData?.items;
    const clipboardFiles = e.clipboardData?.files;

    if (clipboardFiles?.length) {
      const imageFiles = Array.from(clipboardFiles).filter(file =>
        file.type?.startsWith("image/")
      );

      if (imageFiles.length) {
        e.preventDefault();
        addFiles(imageFiles);
        return;
      }
    }

    if (clipboardItems?.length) {
      const files = [];

      Array.from(clipboardItems).forEach(item => {
        if (item.type?.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      });

      if (files.length) {
        e.preventDefault();
        addFiles(files);
      }
    }
  };

  return (
    <div>
      <div
        tabIndex={0}
        onPaste={handlePaste}
        style={{
          border: "1px dashed #d8d8d8",
          borderRadius: 10,
          padding: 12,
          background: "#fff",
          outline: "none",
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: "#aaa",
            textAlign: "center",
            marginBottom: images.length ? 10 : 0,
            lineHeight: 1.5,
          }}
        >
          {t("pasteImageHint")}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 10,
            marginBottom: images.length ? 10 : 0,
          }}
        >
          {images.map((img, i) => (
            <div
              key={i}
              style={{
                position: "relative",
                borderRadius: 8,
                overflow: "hidden",
                border: "0.5px solid #ddd",
                background: "#000",
              }}
            >
              <img
                src={img.url}
                alt={img.name}
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  objectFit: "contain",
                  display: "block",
                }}
              />

              <button
                onClick={() => onChange(prev => prev.filter((_, j) => j !== i))}
                style={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "50%",
                  width: 22,
                  height: 22,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                ✕
              </button>

              <div
                style={{
                  padding: "4px 8px",
                  fontSize: 11,
                  color: "#888",
                  background: "#f8f8f8",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {img.name}
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center" }}>
          <button onClick={() => ref.current.click()} style={btnStyle}>
            {t("addImage")}
          </button>
        </div>
      </div>

      <input
        ref={ref}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={handleFiles}
      />
    </div>
  );
}

// ─── Export PNG/PDF ───────────────────────────────────────────────────────────
async function exportCard(tradeId, format = "png", t = key => tOf("vi", key)) {
  if (typeof document === "undefined") return;

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]).catch(() => [{ default: null }, { default: null }]);

  const el = document.getElementById(`export-card-${tradeId}`);

  if (!el || !html2canvas) {
    alert(t("exportMissingLib"));
    return;
  }

  el.style.display = "block";
  await new Promise(r => setTimeout(r, 200));

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    el.style.display = "none";

    if (format === "pdf" && jsPDF) {
      const imgData = canvas.toDataURL("image/png");
      const mmW = (canvas.width / 2) * 0.2646;
      const mmH = (canvas.height / 2) * 0.2646;

      const pdf = new jsPDF({
        orientation: mmW > mmH ? "landscape" : "portrait",
        unit: "mm",
        format: [mmW, mmH],
      });

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
    alert(t("exportFailed") + err.message);
  }
}
// ─── Export Card ──────────────────────────────────────────────────────────────
function ExportCard({ trade, setups, t }) {
  const pos = trade.position;

  const posStyle =
    pos === "Buy"
      ? { background: "#EAF3DE", color: "#3B6D11", border: "1px solid #97C459" }
      : { background: "#FCEBEB", color: "#A32D2D", border: "1px solid #F09595" };

  const resStyle =
    trade.result === "Win"
      ? { color: "#3B6D11" }
      : trade.result === "Loss"
        ? { color: "#A32D2D" }
        : { color: "#854F0B" };

  const selectedSetups = setups.filter(s =>
    (trade.selectedSetupIds || []).includes(s.id)
  );

  return (
    <div
      id={`export-card-${trade.id}`}
      style={{
        display: "none",
        width: 800,
        padding: 40,
        background: "#fff",
        fontFamily: "system-ui, sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: "1.5px solid #e8e8e4",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 26, fontWeight: 600, color: "#111" }}>
            {trade.ticker || "—"}
          </span>

          {pos && (
            <span
              style={{
                ...posStyle,
                borderRadius: 6,
                padding: "3px 12px",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              {pos === "Buy" ? "▲ Buy" : "▼ Sell"}
            </span>
          )}
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "#888" }}>{trade.date}</div>

          {trade.result && (
            <div
              style={{
                ...resStyle,
                fontSize: 14,
                fontWeight: 600,
                marginTop: 2,
              }}
            >
              {trade.result}
              {trade.pnl ? `  ${trade.pnl}` : ""}
            </div>
          )}
        </div>
      </div>

      {selectedSetups.map(setup => {
        const data = trade.stepData?.[setup.id] || {};

        return (
          <div key={setup.id} style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 12,
                color: "#999",
                fontWeight: 600,
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              {setup.name}
            </div>

            {setup.steps.map((step, idx) => (
              <div
                key={idx}
                style={{
                  padding: "8px 0",
                  borderBottom: "0.5px solid #f0f0ee",
                }}
              >
                <div style={{ fontSize: 11, color: "#bbb", marginBottom: 3 }}>
                  {idx + 1}. {step.label}
                </div>

                {step.type === "check" ? (
                  <div
                    style={{
                      fontSize: 13,
                      color: data[idx] ? "#3B6D11" : "#ccc",
                    }}
                  >
                    {data[idx] ? `✓ ${t("confirmed")}` : `○ ${t("notConfirmed")}`}
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: "#222", lineHeight: 1.6 }}>
                    {data[idx] || "—"}
                  </div>
                )}
              </div>
            ))}
          </div>
        );
      })}

      {trade.entryTF && (
        <div
          style={{
            padding: "8px 0",
            borderBottom: "0.5px solid #f0f0ee",
          }}
        >
          <div style={{ fontSize: 11, color: "#bbb", marginBottom: 3 }}>
            ENTRY TF · SESSION
          </div>
          <div style={{ fontSize: 14, color: "#222" }}>
            {[trade.entryTF, trade.session].filter(Boolean).join("  ·  ")}
          </div>
        </div>
      )}

      {(trade.psychologyTags?.length > 0 || trade.psychology) && (
        <div
          style={{
            padding: "8px 0",
            borderBottom: "0.5px solid #f0f0ee",
          }}
        >
          <div style={{ fontSize: 11, color: "#bbb", marginBottom: 3 }}>
            {t("psychology").toUpperCase()}
          </div>
          <div style={{ fontSize: 14, color: "#222" }}>
            {[
              ...(trade.psychologyTags || []).map(tag => psychologyLabel(tag, t)),
              trade.psychology,
            ]
              .filter(Boolean)
              .join("  ·  ")}
          </div>
        </div>
      )}

      {(trade.followedPlan || trade.mistakeTags?.length > 0 || trade.ruleBrokenNote) && (
        <div
          style={{
            padding: "8px 0",
            borderBottom: "0.5px solid #f0f0ee",
          }}
        >
          <div style={{ fontSize: 11, color: "#bbb", marginBottom: 3 }}>
            {t("disciplineReview").toUpperCase()}
          </div>

          <div style={{ fontSize: 14, color: "#222", lineHeight: 1.6 }}>
            {trade.followedPlan && (
              <div>
                {t("followedPlan")}:{" "}
                {trade.followedPlan === "Yes"
                  ? t("followedYes")
                  : trade.followedPlan === "No"
                    ? t("followedNo")
                    : t("followedPartial")}
              </div>
            )}

            {(trade.mistakeTags || []).length > 0 && (
              <div>
                {t("mistakes")}:{" "}
                {(trade.mistakeTags || []).map(tag => mistakeLabel(tag, t)).join(" · ")}
              </div>
            )}

            {trade.ruleBrokenNote && (
              <div>
                {t("ruleBrokenNote")}: {trade.ruleBrokenNote}
              </div>
            )}
          </div>
        </div>
      )}

      {trade.lesson && (
        <div
          style={{
            padding: "8px 0",
            borderBottom: "0.5px solid #f0f0ee",
          }}
        >
          <div style={{ fontSize: 11, color: "#bbb", marginBottom: 3 }}>
            {t("lesson").toUpperCase()}
          </div>
          <div style={{ fontSize: 14, color: "#222" }}>{trade.lesson}</div>
        </div>
      )}

      {trade.images?.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div
            style={{
              fontSize: 11,
              color: "#999",
              fontWeight: 600,
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Chart
          </div>

          {trade.images.map((img, i) => (
            <img
              key={i}
              src={img.url}
              alt=""
              crossOrigin="anonymous"
              style={{
                width: "100%",
                marginBottom: 12,
                borderRadius: 6,
                display: "block",
                border: "0.5px solid #e8e8e4",
              }}
            />
          ))}
        </div>
      )}

      <div
        style={{
          marginTop: 20,
          fontSize: 11,
          color: "#bbb",
          textAlign: "right",
        }}
      >
        My Trading Journal
      </div>
    </div>
  );
}

// ─── New Trade Flow ───────────────────────────────────────────────────────────
function NewTradeFlow({
  initial,
  onSave,
  onCancel,
  setups,
  sessions,
  pnlMode,
  draftKey,
  t,
}) {
  const isEditing = !!initial;
  const draft = !isEditing && draftKey ? load(draftKey, null) : null;

  const [flowStep, setFlowStep] = useState(() =>
    isEditing ? "form" : draft?.flowStep || "pick"
  );

  const [form, setForm] = useState(() =>
    initial
      ? { ...emptyForm(), ...initial }
      : draft?.form
        ? { ...emptyForm(), ...draft.form }
        : emptyForm()
  );

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (isEditing || !draftKey) return;

    persist(draftKey, {
      flowStep,
      form,
      updatedAt: new Date().toISOString(),
    });
  }, [isEditing, draftKey, flowStep, form]);

  const clearDraft = () => {
    if (!draftKey) return;
    removePersist(draftKey);
  };

  const handleSave = () => {
    const saved = onSave(form);

    if (saved !== false) {
      clearDraft();
    }
  };

  const handleCancel = () => {
    clearDraft();
    onCancel?.();
  };

  const toggleArr = (k, v) => {
    const a = form[k] || [];
    set(k, a.includes(v) ? a.filter(x => x !== v) : [...a, v]);
  };

  const handleImages = useCallback(u => {
    setForm(f => ({
      ...f,
      images: typeof u === "function" ? u(f.images) : u,
    }));
  }, []);

  const setStepData = (setupId, idx, val) =>
    setForm(f => ({
      ...f,
      stepData: {
        ...f.stepData,
        [setupId]: {
          ...(f.stepData?.[setupId] || {}),
          [idx]: val,
        },
      },
    }));

  const isBuy = form.position === "Buy";
  const selectedSetupIds = form.selectedSetupIds || [];
  const selectedSetups = setups.filter(s => selectedSetupIds.includes(s.id));

  const toggleSetup = id => {
    const curr = form.selectedSetupIds || [];
    set(
      "selectedSetupIds",
      curr.includes(id) ? curr.filter(x => x !== id) : [...curr, id]
    );
  };

  if (flowStep === "pick") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 28,
          paddingTop: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              color: "#aaa",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {t("chooseDirection")}
          </div>

          <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
            {["Buy", "Sell"].map(p => {
              const active = form.position === p;
              const isBuyBtn = p === "Buy";

              return (
                <button
                  key={p}
                  onClick={() => set("position", p)}
                  style={{
                    width: 148,
                    height: 86,
                    cursor: "pointer",
                    borderRadius: 14,
                    border: `2px solid ${
                      active ? (isBuyBtn ? "#97C459" : "#F09595") : "#e5e5e5"
                    }`,
                    background: active
                      ? isBuyBtn
                        ? "#EAF3DE"
                        : "#FCEBEB"
                      : "#fff",
                    color: active
                      ? isBuyBtn
                        ? "#3B6D11"
                        : "#A32D2D"
                      : "#bbb",
                    fontWeight: 700,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                    boxShadow: active
                      ? `0 2px 8px ${
                          isBuyBtn
                            ? "rgba(59,109,17,0.12)"
                            : "rgba(163,45,45,0.12)"
                        }`
                      : "0 1px 3px rgba(0,0,0,0.04)",
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ fontSize: 24 }}>{isBuyBtn ? "▲" : "▼"}</span>
                  <span style={{ fontSize: 16 }}>{p}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: 12,
              color: "#aaa",
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {t("chooseSetup")}{" "}
            <span style={{ fontSize: 11 }}>({t("onlyOne")})</span>
          </div>

          {setups.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                fontSize: 13,
                color: "#bbb",
                padding: "20px 0",
                background: "#f7f7f5",
                borderRadius: 10,
              }}
            >
              {t("noSetupPick")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {setups.map(setup => {
                const selected = selectedSetupIds.includes(setup.id);

                return (
                  <button
                    key={setup.id}
                    onClick={() => toggleSetup(setup.id)}
                    style={{
                      textAlign: "left",
                      padding: "12px 14px",
                      borderRadius: 12,
                      cursor: "pointer",
                      border: `1.5px solid ${selected ? "#185FA5" : "#e5e5e5"}`,
                      background: selected ? "#EBF4FD" : "#fff",
                      transition: "all 0.15s",
                      fontFamily: "inherit",
                      boxShadow: selected
                        ? "0 0 0 3px rgba(24,95,165,0.08)"
                        : "0 1px 3px rgba(0,0,0,0.04)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: selected ? "#185FA5" : "#222",
                        }}
                      >
                        {selected ? "✓ " : ""}
                        {setup.name}
                      </span>

                      <span style={{ fontSize: 11, color: "#aaa" }}>
                        {setup.steps.length} {t("steps")}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {setup.steps.slice(0, 4).map((s, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 10,
                            background: "#f1f1ee",
                            color: "#666",
                            border: "0.5px solid #ddd",
                          }}
                        >
                          {i + 1}. {s.label}
                        </span>
                      ))}

                      {setup.steps.length > 4 && (
                        <span style={{ fontSize: 11, color: "#bbb" }}>
                          +{setup.steps.length - 4} {t("more")}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
          {onCancel && (
            <button onClick={handleCancel} style={{ ...btnStyle, color: "#aaa" }}>
              {t("cancel")}
            </button>
          )}

          <button
            onClick={() => setFlowStep("form")}
            disabled={!form.position}
            style={{
              ...primaryBtn,
              opacity: form.position ? 1 : 0.4,
              cursor: form.position ? "pointer" : "not-allowed",
            }}
          >
            {t("continue")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!isEditing && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            paddingBottom: 12,
            borderBottom: "0.5px solid #f0f0f0",
          }}
        >
          <button
            onClick={() => setFlowStep("pick")}
            style={{ ...btnStyle, color: "#aaa", padding: "4px 10px", fontSize: 12 }}
          >
            {t("change")}
          </button>

          <span
            style={{
              padding: "3px 14px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              background: isBuy ? "#EAF3DE" : "#FCEBEB",
              color: isBuy ? "#3B6D11" : "#A32D2D",
              border: `1px solid ${isBuy ? "#97C459" : "#F09595"}`,
            }}
          >
            {isBuy ? "▲ Buy" : "▼ Sell"}
          </span>

          {selectedSetups.map(s => (
            <span
              key={s.id}
              style={{
                padding: "3px 12px",
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 500,
                background: "#EBF4FD",
                color: "#185FA5",
                border: "1px solid #85B7EB",
              }}
            >
              {s.name}
            </span>
          ))}

          {selectedSetups.length === 0 && (
            <span style={{ fontSize: 12, color: "#bbb" }}>{t("noSetup")}</span>
          )}
        </div>
      )}

      <SecTitle txt={t("tradeInfo")} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={lbl}>{t("date")}</div>
          <input
            type="date"
            value={form.date}
            onChange={e => set("date", e.target.value)}
            style={inp}
          />
        </div>

        <div>
          <div style={lbl}>{t("ticker")}</div>
          <input
            type="text"
            placeholder="NQ, ES, EURUSD..."
            value={form.ticker}
            onChange={e => set("ticker", e.target.value.toUpperCase())}
            style={inp}
          />
        </div>
      </div>

      {isEditing && (
        <div>
          <div style={lbl}>{t("position")}</div>

          <div style={{ display: "flex", gap: 8 }}>
            {["Buy", "Sell"].map(p => (
              <button
                key={p}
                onClick={() => set("position", p)}
                style={{
                  flex: 1,
                  padding: "7px 0",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: 14,
                  borderRadius: 8,
                  fontFamily: "inherit",
                  background:
                    form.position === p
                      ? p === "Buy"
                        ? "#EAF3DE"
                        : "#FCEBEB"
                      : "#fff",
                  color:
                    form.position === p
                      ? p === "Buy"
                        ? "#3B6D11"
                        : "#A32D2D"
                      : "#777",
                  border: `1.5px solid ${
                    form.position === p
                      ? p === "Buy"
                        ? "#97C459"
                        : "#F09595"
                      : "#ddd"
                  }`,
                }}
              >
                {p === "Buy" ? "▲ Buy" : "▼ Sell"}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedSetups.length > 0 && (
        <>
          <SecTitle txt={t("entryReason")} />

          {selectedSetups.map(setup => (
            <div key={setup.id} style={{ marginBottom: 4 }}>
              {selectedSetups.length > 1 && (
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#185FA5",
                    marginBottom: 8,
                  }}
                >
                  {setup.name}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {setup.steps.map((step, idx) => {
                  const val = form.stepData?.[setup.id]?.[idx];

                  return (
                    <div key={idx}>
                      <div style={lbl}>
                        {idx + 1}. {step.label}
                      </div>

                      {step.type === "check" ? (
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            cursor: "pointer",
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: `1px solid ${val ? "#97C459" : "#e5e5e5"}`,
                            background: val ? "#f0fae8" : "#fff",
                            transition: "all 0.15s",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!val}
                            onChange={() => setStepData(setup.id, idx, !val)}
                            style={{
                              width: 16,
                              height: 16,
                              accentColor: "#3B6D11",
                              flexShrink: 0,
                            }}
                          />

                          <span
                            style={{
                              fontSize: 13,
                              color: val ? "#3B6D11" : "#aaa",
                            }}
                          >
                            {val ? t("confirmed") : t("notConfirmed")}
                          </span>
                        </label>
                      ) : (
                        <textarea
                          rows={2}
                          placeholder={
                            step.placeholder ||
                            `${t("enterContent").replace("...", "")} ${(step.label || "").toLowerCase()}...`
                          }
                          value={val || ""}
                          onChange={e => setStepData(setup.id, idx, e.target.value)}
                          style={{ ...inp, resize: "vertical" }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}

      <SecTitle txt={t("tradeTime")} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={lbl}>{t("entryTimeframe")}</div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => set("entryTF", tf)}
                style={chipStyle(form.entryTF === tf, {
                  bg: "#E6F1FB",
                  text: "#185FA5",
                  border: "#85B7EB",
                })}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={lbl}>{t("session")}</div>

          <select
            value={form.session}
            onChange={e => set("session", e.target.value)}
            style={{ ...inp, marginTop: 4 }}
          >
            <option value="">{t("chooseSession")}</option>
            {sessions.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <SecTitle txt={t("afterTrade")} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <div style={lbl}>{t("result")}</div>

          <div style={{ display: "flex", gap: 8 }}>
            {["Win", "Loss", "BE"].map(r => (
              <button
                key={r}
                onClick={() => set("result", r)}
                style={{
                  flex: 1,
                  padding: "6px 0",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  borderRadius: 8,
                  fontFamily: "inherit",
                  background:
                    form.result === r
                      ? r === "Win"
                        ? "#EAF3DE"
                        : r === "Loss"
                          ? "#FCEBEB"
                          : "#FAEEDA"
                      : "#fff",
                  color:
                    form.result === r
                      ? r === "Win"
                        ? "#3B6D11"
                        : r === "Loss"
                          ? "#A32D2D"
                          : "#854F0B"
                      : "#777",
                  border: `1.5px solid ${
                    form.result === r
                      ? r === "Win"
                        ? "#97C459"
                        : r === "Loss"
                          ? "#F09595"
                          : "#EF9F27"
                      : "#ddd"
                  }`,
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={lbl}>{pnlMode === "R" ? t("pnlByR") : t("pnlByMoney")}</div>

          <input
            type="text"
            placeholder={
              pnlMode === "R"
                ? form.result === "BE"
                  ? t("exampleBER")
                  : t("exampleR")
                : form.result === "BE"
                  ? t("exampleBEMoney")
                  : t("exampleMoney")
            }
            value={form.pnl}
            onChange={e => set("pnl", e.target.value)}
            style={inp}
          />
        </div>
      </div>

      <div>
        <div style={lbl}>{t("psychology")}</div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 6 }}>
          {PSYCHOLOGY_OPTIONS.map(p => (
            <button
              key={p.value}
              onClick={() => toggleArr("psychologyTags", p.value)}
              style={chipStyle((form.psychologyTags || []).includes(p.value), {
                bg: "#EEEDFE",
                text: "#3C3489",
                border: "#AFA9EC",
              })}
            >
              {t(p.key)}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder={t("psychologyPlaceholder")}
          value={form.psychology}
          onChange={e => set("psychology", e.target.value)}
          style={{ ...inp, fontSize: 13 }}
        />
      </div>

      <SecTitle txt={t("disciplineReview")} />

      <div>
        <div style={lbl}>{t("followedPlan")}</div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {[
            { val: "Yes", label: t("followedYes"), color: { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459" } },
            { val: "No", label: t("followedNo"), color: { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" } },
            { val: "Partially", label: t("followedPartial"), color: { bg: "#FAEEDA", text: "#854F0B", border: "#EF9F27" } },
          ].map(o => (
            <button
              key={o.val}
              onClick={() => set("followedPlan", form.followedPlan === o.val ? "" : o.val)}
              style={chipStyle(form.followedPlan === o.val, o.color)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={lbl}>{t("mistakes")}</div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {MISTAKE_OPTIONS.map(m => (
            <button
              key={m.value}
              onClick={() => toggleArr("mistakeTags", m.value)}
              style={chipStyle((form.mistakeTags || []).includes(m.value), {
                bg: "#FFF0E6",
                text: "#8A4B12",
                border: "#F0B36A",
              })}
            >
              {t(m.key)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={lbl}>{t("ruleBrokenNote")}</div>

        <textarea
          rows={2}
          placeholder={t("ruleBrokenPlaceholder")}
          value={form.ruleBrokenNote || ""}
          onChange={e => set("ruleBrokenNote", e.target.value)}
          style={{ ...inp, resize: "vertical" }}
        />
      </div>
      <div>
        <div style={lbl}>{t("lesson")}</div>

        <textarea
          rows={2}
          placeholder={t("lessonPlaceholder")}
          value={form.lesson}
          onChange={e => set("lesson", e.target.value)}
          style={{ ...inp, resize: "vertical" }}
        />
      </div>

      <div>
        <div style={lbl}>{t("chartImages")}</div>
        <ImageUpload images={form.images} onChange={handleImages} t={t} />
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          justifyContent: "flex-end",
          marginTop: 6,
        }}
      >
        {onCancel && (
          <button onClick={handleCancel} style={btnStyle}>
            {t("cancel")}
          </button>
        )}

        <button onClick={handleSave} style={primaryBtn}>
          {t("saveTrade")}
        </button>
      </div>
    </div>
  );
}
// ─── Trade Card ───────────────────────────────────────────────────────────────
function TradeCard({ trade, onDelete, onEdit, setups, t }) {
  const [expanded, setExpanded] = useState(false);
  const [exporting, setExporting] = useState(false);

  const resColor =
    trade.result === "Win" ? "win" : trade.result === "Loss" ? "loss" : "be";

  const handleExport = async fmt => {
    setExporting(true);
    await exportCard(trade.id, fmt, t);
    setExporting(false);
  };

  const selectedSetups = setups.filter(s =>
    (trade.selectedSetupIds || []).includes(s.id)
  );

  return (
    <>
      {expanded && <ExportCard trade={trade} setups={setups} t={t} />}

      <div
        style={{
          background: "#fff",
          border: "0.5px solid #e5e5e5",
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 10,
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
          onClick={() => setExpanded(e => !e)}
        >
          <span style={{ fontSize: 13, color: "#999", minWidth: 88 }}>
            {trade.date}
          </span>

          <span style={{ fontWeight: 600, fontSize: 15, minWidth: 65 }}>
            {trade.ticker || "—"}
          </span>

          {trade.position && (
            <Badge
              label={trade.position}
              color={trade.position === "Buy" ? "buy" : "sell"}
            />
          )}

          {trade.result && <Badge label={trade.result} color={resColor} />}

          {trade.pnl && (
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                color:
                  trade.result === "Win"
                    ? "#3B6D11"
                    : trade.result === "Loss"
                      ? "#A32D2D"
                      : "#854F0B",
              }}
            >
              {trade.pnl}
            </span>
          )}

          {trade.session && (
            <span style={{ fontSize: 12, color: "#aaa", marginLeft: "auto" }}>
              {trade.session}
            </span>
          )}

          <span
            style={{
              fontSize: 11,
              color: "#bbb",
              marginLeft: trade.session ? 6 : "auto",
            }}
          >
            {expanded ? "▲" : "▼"}
          </span>
        </div>

        {expanded && (
          <div
            style={{
              padding: "12px 16px",
              borderTop: "0.5px solid #f0f0f0",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {selectedSetups.map(setup => {
              const data = trade.stepData?.[setup.id] || {};
              const filledCount = setup.steps.filter(
                (_, i) => data[i] !== undefined && data[i] !== "" && data[i] !== false
              ).length;

              return (
                <div
                  key={setup.id}
                  style={{
                    background: "#f7f7f5",
                    borderRadius: 8,
                    padding: "10px 14px",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#555",
                      marginBottom: 8,
                    }}
                  >
                    {setup.name}{" "}
                    <span style={{ color: "#bbb", fontWeight: 400 }}>
                      · {filledCount}/{setup.steps.length} {t("steps")}
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {setup.steps.map((step, idx) => (
                      <div key={idx} style={{ fontSize: 13 }}>
                        <span style={{ color: "#aaa", fontSize: 11 }}>
                          {idx + 1}. {step.label}:{" "}
                        </span>

                        {step.type === "check" ? (
                          <span style={{ color: data[idx] ? "#3B6D11" : "#ccc" }}>
                            {data[idx] ? "✓" : "○"}
                          </span>
                        ) : (
                          <span style={{ color: "#333" }}>
                            {data[idx] || <span style={{ color: "#ccc" }}>—</span>}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {trade.entryTF && (
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "#888", fontWeight: 500 }}>
                  {t("entryTimeframe")}:{" "}
                </span>
                {trade.entryTF}
                {trade.session ? ` · ${trade.session}` : ""}
              </div>
            )}

            {(trade.psychologyTags?.length > 0 || trade.psychology) && (
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "#888", fontWeight: 500 }}>
                  {t("psychology")}:{" "}
                </span>
                {[
                  ...(trade.psychologyTags || []).map(tag =>
                    psychologyLabel(tag, t)
                  ),
                  trade.psychology,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}

            {(trade.followedPlan || trade.mistakeTags?.length > 0 || trade.ruleBrokenNote) && (
              <div
                style={{
                  background: "#fffaf5",
                  border: "0.5px solid #f0d8bd",
                  borderRadius: 8,
                  padding: "9px 12px",
                  fontSize: 13,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {trade.followedPlan && (
                  <div>
                    <span style={{ color: "#888", fontWeight: 500 }}>
                      {t("followedPlan")}:{" "}
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        color:
                          trade.followedPlan === "Yes"
                            ? "#3B6D11"
                            : trade.followedPlan === "No"
                              ? "#A32D2D"
                              : "#854F0B",
                      }}
                    >
                      {trade.followedPlan === "Yes"
                        ? t("followedYes")
                        : trade.followedPlan === "No"
                          ? t("followedNo")
                          : t("followedPartial")}
                    </span>
                  </div>
                )}

                {(trade.mistakeTags || []).length > 0 && (
                  <div>
                    <span style={{ color: "#888", fontWeight: 500 }}>
                      {t("mistakes")}:{" "}
                    </span>
                    {(trade.mistakeTags || []).map(tag => mistakeLabel(tag, t)).join(" · ")}
                  </div>
                )}

                {trade.ruleBrokenNote && (
                  <div>
                    <span style={{ color: "#888", fontWeight: 500 }}>
                      {t("ruleBrokenNote")}:{" "}
                    </span>
                    {trade.ruleBrokenNote}
                  </div>
                )}
              </div>
            )}

            {trade.lesson && (
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "#888", fontWeight: 500 }}>
                  {t("lesson")}:{" "}
                </span>
                {trade.lesson}
              </div>
            )}

            {trade.images?.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 8,
                  marginTop: 4,
                }}
              >
                {trade.images.map((img, i) => (
                  <div
                    key={i}
                    style={{
                      borderRadius: 6,
                      overflow: "hidden",
                      border: "0.5px solid #ddd",
                      background: "#000",
                    }}
                  >
                    <img
                      src={img.url}
                      alt={img.name}
                      style={{
                        width: "100%",
                        aspectRatio: "16/9",
                        objectFit: "contain",
                        display: "block",
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                marginTop: 6,
              }}
            >
              <button
                onClick={() => handleExport("png")}
                disabled={exporting}
                style={btnStyle}
              >
                {exporting ? "..." : "PNG"}
              </button>

              <button
                onClick={() => handleExport("pdf")}
                disabled={exporting}
                style={btnStyle}
              >
                {exporting ? "..." : "PDF"}
              </button>

              <button onClick={() => onEdit(trade)} style={btnStyle}>
                {t("edit")}
              </button>

              <button
                onClick={() => onDelete(trade.id)}
                style={{ ...btnStyle, color: "#c0392b", borderColor: "#f09595" }}
              >
                {t("delete")}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── History Tab ──────────────────────────────────────────────────────────────
function HistoryTab({ trades, setups, sessions, onDelete, onEdit, t }) {
  const [search, setSearch] = useState("");
  const [filterPos, setFilterPos] = useState("");
  const [filterRes, setFilterRes] = useState("");
  const [filterSes, setFilterSes] = useState("");

  const filtered = useMemo(() => {
    return trades.filter(t => {
      if (filterPos && t.position !== filterPos) return false;
      if (filterRes && t.result !== filterRes) return false;
      if (filterSes && t.session !== filterSes) return false;

      if (search) {
        const q = search.toLowerCase();

        return (
          (t.ticker || "").toLowerCase().includes(q) ||
          (t.lesson || "").toLowerCase().includes(q) ||
          (t.session || "").toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [trades, search, filterPos, filterRes, filterSes]);

  const chipFilter = (val, setVal, opts, colorMap) => (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {opts.map(o => {
        const active = val === o;
        const c = colorMap[o] || {
          bg: "#f1f1ee",
          text: "#555",
          border: "#ddd",
        };

        return (
          <button
            key={o}
            onClick={() => setVal(active ? "" : o)}
            style={{
              fontSize: 12,
              padding: "3px 12px",
              cursor: "pointer",
              borderRadius: 20,
              background: active ? c.bg : "transparent",
              color: active ? c.text : "#888",
              border: `1px solid ${active ? c.border : "#ddd"}`,
              fontFamily: "inherit",
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );

  return (
    <div>
      <div
        style={{
          background: "#fff",
          border: "0.5px solid #e5e5e5",
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ ...inp, fontSize: 13 }}
        />

        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "#bbb", marginBottom: 5 }}>
              {t("direction")}
            </div>

            {chipFilter(filterPos, setFilterPos, ["Buy", "Sell"], {
              Buy: { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459" },
              Sell: { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" },
            })}
          </div>

          <div>
            <div style={{ fontSize: 11, color: "#bbb", marginBottom: 5 }}>
              {t("result").toUpperCase()}
            </div>

            {chipFilter(filterRes, setFilterRes, ["Win", "Loss", "BE"], {
              Win: { bg: "#EAF3DE", text: "#3B6D11", border: "#97C459" },
              Loss: { bg: "#FCEBEB", text: "#A32D2D", border: "#F09595" },
              BE: { bg: "#FAEEDA", text: "#854F0B", border: "#EF9F27" },
            })}
          </div>

          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 11, color: "#bbb", marginBottom: 5 }}>
              SESSION
            </div>

            <select
              value={filterSes}
              onChange={e => setFilterSes(e.target.value)}
              style={{ ...inp, fontSize: 12, padding: "4px 8px" }}
            >
              <option value="">{t("all")}</option>
              {sessions.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(search || filterPos || filterRes || filterSes) && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 12, color: "#aaa" }}>
              {filtered.length} / {trades.length} {t("tradeUnit")}
            </span>

            <button
              onClick={() => {
                setSearch("");
                setFilterPos("");
                setFilterRes("");
                setFilterSes("");
              }}
              style={{
                ...btnStyle,
                fontSize: 12,
                padding: "3px 10px",
                color: "#888",
              }}
            >
              {t("clearFilter")}
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: "#bbb",
            padding: "60px 0",
            fontSize: 14,
          }}
        >
          {trades.length === 0 ? t("noTrades") : t("noMatchedTrades")}
        </div>
      ) : (
        filtered.map(trade => (
          <TradeCard
            key={trade.id}
            trade={trade}
            onDelete={onDelete}
            onEdit={onEdit}
            setups={setups}
            t={t}
          />
        ))
      )}
    </div>
  );
}

// ─── Calendar View ────────────────────────────────────────────────────────────
function CalendarView({ trades, onSelectDay, lang, t }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const tradeMap = useMemo(() => {
    const m = {};

    trades.forEach(trade => {
      if (!m[trade.date]) m[trade.date] = [];
      m[trade.date].push(trade);
    });

    return m;
  }, [trades]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const startOffset = (firstDay + 6) % 7;

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const locale = lang === "en" ? "en-US" : "vi-VN";

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });

  const DOW =
    lang === "en"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

  const monthTrades = trades.filter(trade => {
    const d = new Date(trade.date);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });

  const mWins = monthTrades.filter(trade => trade.result === "Win").length;
  const mLosses = monthTrades.filter(trade => trade.result === "Loss").length;
  const mBE = monthTrades.filter(trade => trade.result === "BE").length;

  const mWR = monthTrades.filter(trade => trade.result).length
    ? ((mWins / monthTrades.filter(trade => trade.result).length) * 100).toFixed(0)
    : "—";

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <button onClick={prevMonth} style={{ ...btnStyle, padding: "5px 12px" }}>
          ←
        </button>

        <span style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>
          {monthName}
        </span>

        <button onClick={nextMonth} style={{ ...btnStyle, padding: "5px 12px" }}>
          →
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <span
          style={{
            fontSize: 12,
            padding: "4px 12px",
            borderRadius: 20,
            background: "#f1f1ee",
            color: "#555",
            border: "0.5px solid #ddd",
          }}
        >
          {monthTrades.length} {t("tradeUnit")}
        </span>

        <span
          style={{
            fontSize: 12,
            padding: "4px 12px",
            borderRadius: 20,
            background: "#EAF3DE",
            color: "#3B6D11",
            border: "0.5px solid #97C459",
          }}
        >
          ✓ {mWins} Win
        </span>

        <span
          style={{
            fontSize: 12,
            padding: "4px 12px",
            borderRadius: 20,
            background: "#FCEBEB",
            color: "#A32D2D",
            border: "0.5px solid #F09595",
          }}
        >
          ✗ {mLosses} Loss
        </span>

        {mBE > 0 && (
          <span
            style={{
              fontSize: 12,
              padding: "4px 12px",
              borderRadius: 20,
              background: "#FAEEDA",
              color: "#854F0B",
              border: "0.5px solid #EF9F27",
            }}
          >
            — {mBE} BE
          </span>
        )}

        <span
          style={{
            fontSize: 12,
            padding: "4px 12px",
            borderRadius: 20,
            background: "#EBF4FD",
            color: "#185FA5",
            border: "0.5px solid #85B7EB",
          }}
        >
          WR {mWR}%
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
          marginBottom: 4,
        }}
      >
        {DOW.map((d, idx) => (
          <div
            key={d}
            style={{
              textAlign: "center",
              fontSize: 11,
              fontWeight: 600,
              color: idx === 6 ? "#e57373" : "#bbb",
              padding: "4px 0",
            }}
          >
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />;

          const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(
            2,
            "0"
          )}-${String(day).padStart(2, "0")}`;

          const dayTrades = tradeMap[dateStr] || [];
          const wins = dayTrades.filter(trade => trade.result === "Win").length;
          const losses = dayTrades.filter(trade => trade.result === "Loss").length;
          const be = dayTrades.filter(trade => trade.result === "BE").length;
          const noRes = dayTrades.filter(trade => !trade.result).length;
          const isToday = dateStr === today.toISOString().slice(0, 10);

          let cellBg = "#f7f7f5";
          let cellBorder = "#eee";
          let textColor = "#333";

          if (dayTrades.length > 0) {
            if (wins > losses) {
              cellBg = "#EAF3DE";
              cellBorder = "#97C459";
              textColor = "#2d5a0e";
            } else if (losses > wins) {
              cellBg = "#FCEBEB";
              cellBorder = "#F09595";
              textColor = "#8c1f1f";
            } else if (be > 0) {
              cellBg = "#FAEEDA";
              cellBorder = "#EF9F27";
              textColor = "#7a4400";
            } else {
              cellBg = "#EBF4FD";
              cellBorder = "#85B7EB";
              textColor = "#185FA5";
            }
          }

          const isWeekend = i % 7 === 5 || i % 7 === 6;

          return (
            <div
              key={dateStr}
              onClick={() => dayTrades.length > 0 && onSelectDay(dateStr, dayTrades)}
              style={{
                minHeight: 64,
                padding: "6px 8px",
                borderRadius: 8,
                border: `1.5px solid ${isToday ? "#185FA5" : cellBorder}`,
                background: cellBg,
                cursor: dayTrades.length > 0 ? "pointer" : "default",
                boxShadow: isToday ? "0 0 0 2px rgba(24,95,165,0.18)" : "none",
                transition: "all 0.12s",
                position: "relative",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: isToday ? 700 : 500,
                  color: isToday ? "#185FA5" : isWeekend ? "#e57373" : textColor,
                  marginBottom: 4,
                }}
              >
                {day}
              </div>

              {dayTrades.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {wins > 0 && (
                    <div style={{ fontSize: 10, color: "#3B6D11", fontWeight: 600 }}>
                      ✓ {wins}W
                    </div>
                  )}

                  {losses > 0 && (
                    <div style={{ fontSize: 10, color: "#A32D2D", fontWeight: 600 }}>
                      ✗ {losses}L
                    </div>
                  )}

                  {be > 0 && (
                    <div style={{ fontSize: 10, color: "#854F0B", fontWeight: 600 }}>
                      — {be}BE
                    </div>
                  )}

                  {noRes > 0 && (
                    <div style={{ fontSize: 10, color: "#aaa" }}>○ {noRes}</div>
                  )}
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
function DayModal({ dateStr, dayTrades, setups, onClose, onEdit, onDelete, lang, t }) {
  const locale = lang === "en" ? "en-US" : "vi-VN";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        zIndex: 999,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxWidth: 780,
          maxHeight: "80vh",
          overflowY: "auto",
          padding: 24,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, color: "#111" }}>
            {new Date(dateStr + "T00:00:00").toLocaleDateString(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>

          <button
            onClick={onClose}
            style={{ ...btnStyle, padding: "4px 12px", fontSize: 13, color: "#888" }}
          >
            {t("close")}
          </button>
        </div>

        {dayTrades.map(trade => (
          <TradeCard
            key={trade.id}
            trade={trade}
            onDelete={id => {
              onDelete(id);
              if (dayTrades.length === 1) onClose();
            }}
            onEdit={trade => {
              onClose();
              onEdit(trade);
            }}
            setups={setups}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function WeeklyReview({ trades, setups, lang, t }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const { startKey, endKey } = useMemo(
    () => getWeekRange(weekOffset),
    [weekOffset]
  );

  const weekTrades = useMemo(() => {
    return trades.filter(trade => isDateInRange(trade.date, startKey, endKey));
  }, [trades, startKey, endKey]);

  const withResult = weekTrades.filter(trade => trade.result);
  const wins = withResult.filter(trade => trade.result === "Win").length;
  const losses = withResult.filter(trade => trade.result === "Loss").length;
  const be = withResult.filter(trade => trade.result === "BE").length;
  const wr = calcWR(weekTrades);

  const followedYes = weekTrades.filter(trade => trade.followedPlan === "Yes").length;
  const followedNo = weekTrades.filter(trade => trade.followedPlan === "No").length;
  const followedPartial = weekTrades.filter(
    trade => trade.followedPlan === "Partially"
  ).length;

  const disciplineTotal = followedYes + followedNo + followedPartial;

  const planFollowRate = disciplineTotal
    ? ((followedYes / disciplineTotal) * 100).toFixed(0)
    : "—";

  const followedTrades = weekTrades.filter(trade => trade.followedPlan === "Yes");
  const notFollowedTrades = weekTrades.filter(trade => trade.followedPlan === "No");

  const followedWR = calcWR(followedTrades);
  const notFollowedWR = calcWR(notFollowedTrades);

  const cleanTrades = weekTrades.filter(isCleanTrade);
  const issueTrades = weekTrades.filter(hasDisciplineIssue);

  const cleanWR = calcWR(cleanTrades);
  const issueWR = calcWR(issueTrades);

  const aPlusTrades = weekTrades.filter(trade => tradeQuality(trade) === "A+").length;
  const goodLosses = weekTrades.filter(trade => tradeQuality(trade) === "Good Loss").length;
  const luckyWins = weekTrades.filter(trade => tradeQuality(trade) === "Lucky Win").length;
  const badLosses = weekTrades.filter(trade => tradeQuality(trade) === "Bad Loss").length;

  const mistakeStats = MISTAKE_OPTIONS.map(m => ({
    value: m.value,
    label: t(m.key),
    count: weekTrades.filter(trade =>
      (trade.mistakeTags || []).includes(m.value)
    ).length,
  }))
    .filter(m => m.count > 0)
    .sort((a, b) => b.count - a.count);

  const topMistake = mistakeStats[0];

  const setupStats = setups
    .map(setup => {
      const setupTrades = weekTrades.filter(trade =>
        (trade.selectedSetupIds || []).includes(setup.id)
      );

      return {
        id: setup.id,
        name: setup.name,
        count: setupTrades.length,
        wr: calcWR(setupTrades),
        wins: setupTrades.filter(trade => trade.result === "Win").length,
      };
    })
    .filter(setup => setup.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.wins - a.wins;
    });

  const mostUsedSetup = setupStats[0];

  const ruleNotes = weekTrades
    .filter(trade => trade.ruleBrokenNote)
    .map(trade => ({
      id: trade.id,
      date: trade.date,
      ticker: trade.ticker,
      note: trade.ruleBrokenNote,
    }));

  const lessons = weekTrades
    .filter(trade => trade.lesson)
    .map(trade => ({
      id: trade.id,
      date: trade.date,
      ticker: trade.ticker,
      lesson: trade.lesson,
    }));

  const insight = (() => {
    if (!weekTrades.length) return t("noWeeklyTrades");

    if (topMistake) {
      return `${t("weeklyInsightMistake")}: ${topMistake.label}.`;
    }

    if (followedNo > followedYes && followedNo > 0) {
      return t("weeklyInsightNoPlan");
    }

    if (disciplineTotal > 0 && Number(planFollowRate) >= 70) {
      return t("weeklyInsightGood");
    }

    return t("weeklyInsightNoData");
  })();

  const locale = lang === "en" ? "en-US" : "vi-VN";

  const niceRange = `${parseDateKey(startKey)?.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  })} - ${parseDateKey(endKey)?.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;

  const MiniCard = ({ label, value, sub, color }) => (
    <div
      style={{
        background: "#f7f7f5",
        borderRadius: 10,
        padding: "12px 14px",
        border: "0.5px solid #e5e5e5",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#aaa",
          fontWeight: 600,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div style={{ fontSize: 22, fontWeight: 700, color: color || "#111" }}>
        {value}
      </div>

      {sub && (
        <div style={{ fontSize: 12, color: "#999", marginTop: 3 }}>
          {sub}
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #e5e5e5",
        borderRadius: 14,
        padding: "16px 18px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#111" }}>
            {t("weeklyReview")}
          </div>

          <div style={{ fontSize: 12, color: "#999", marginTop: 3 }}>
            {t("weekRange")}: {niceRange}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            style={{ ...btnStyle, fontSize: 12 }}
          >
            ← {t("previousWeek")}
          </button>

          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              style={{ ...btnStyle, fontSize: 12 }}
            >
              {t("currentWeek")}
            </button>
          )}

          <button
            onClick={() => setWeekOffset(w => w + 1)}
            style={{ ...btnStyle, fontSize: 12 }}
          >
            {t("nextWeek")} →
          </button>
        </div>
      </div>

      {weekTrades.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            color: "#bbb",
            padding: "36px 0",
            fontSize: 14,
            background: "#f7f7f5",
            borderRadius: 10,
          }}
        >
          {t("noWeeklyTrades")}
        </div>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <MiniCard
              label={t("totalTrades")}
              value={weekTrades.length}
              sub={`${wins}W / ${losses}L / ${be}BE`}
            />

            <MiniCard
              label={t("winRate")}
              value={`${wr}%`}
              color="#3B6D11"
            />

            <MiniCard
              label={t("planFollowRate")}
              value={`${planFollowRate}%`}
              sub={`${followedYes} ${t("followedYes")} / ${followedNo} ${t("followedNo")}`}
              color="#185FA5"
            />

            <MiniCard
              label={t("mostRepeatedMistake")}
              value={topMistake ? topMistake.count : "—"}
              sub={topMistake ? topMistake.label : t("noMistakeData")}
              color={topMistake ? "#8A4B12" : "#999"}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
              marginBottom: 16,
            }}
          >
            <MiniCard
              label={t("cleanTrades")}
              value={cleanTrades.length}
              sub={`${t("cleanTradeWR")}: ${cleanWR}%`}
              color="#3B6D11"
            />

            <MiniCard
              label={t("disciplineIssues")}
              value={issueTrades.length}
              sub={`${t("issueTradeWR")}: ${issueWR}%`}
              color="#A32D2D"
            />

            <MiniCard
              label={t("luckyWins")}
              value={luckyWins}
              sub={t("tradeQuality")}
              color="#854F0B"
            />

            <MiniCard
              label={t("badLosses")}
              value={badLosses}
              sub={t("tradeQuality")}
              color="#A32D2D"
            />
          </div>

          <div
            style={{
              background: "#EBF4FD",
              border: "0.5px solid #85B7EB",
              color: "#185FA5",
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 13,
              lineHeight: 1.6,
              marginBottom: 16,
              fontWeight: 500,
            }}
          >
            {insight}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 18,
              marginBottom: 18,
            }}
          >

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#888",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {t("followedPlan")}
              </div>

              <div
                style={{
                  background: "#f7f7f5",
                  borderRadius: 10,
                  padding: "12px 14px",
                  fontSize: 13,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{t("followedYes")}</span>
                  <span style={{ color: "#3B6D11", fontWeight: 700 }}>
                    {followedYes} · {followedWR}% WR
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{t("followedNo")}</span>
                  <span style={{ color: "#A32D2D", fontWeight: 700 }}>
                    {followedNo} · {notFollowedWR}% WR
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{t("followedPartial")}</span>
                  <span style={{ color: "#854F0B", fontWeight: 700 }}>
                    {followedPartial}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#888",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {t("mostUsedSetup")}
              </div>

              <div
                style={{
                  background: "#f7f7f5",
                  borderRadius: 10,
                  padding: "12px 14px",
                  fontSize: 13,
                  minHeight: 78,
                }}
              >
                {mostUsedSetup ? (
                  <>
                    <div style={{ fontWeight: 700, color: "#111", marginBottom: 6 }}>
                      {mostUsedSetup.name}
                    </div>

                    <div style={{ color: "#999" }}>
                      {mostUsedSetup.count} {t("tradeUnit")} · {mostUsedSetup.wr}% WR
                    </div>
                  </>
                ) : (
                  <div style={{ color: "#bbb" }}>{t("noData")}</div>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 18,
            }}
          >

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#888",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {t("mistakes")}
              </div>

              {mistakeStats.length === 0 ? (
                <div style={{ fontSize: 13, color: "#bbb" }}>
                  {t("noMistakeData")}
                </div>
              ) : (
                <div
                  style={{
                    background: "#fffaf5",
                    border: "0.5px solid #f0d8bd",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 13,
                  }}
                >
                  {mistakeStats.slice(0, 5).map(m => (
                    <div
                      key={m.value}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "7px 0",
                        borderBottom: "0.5px solid #f5e3cf",
                      }}
                    >
                      <span>{m.label}</span>
                      <span style={{ color: "#8A4B12", fontWeight: 700 }}>
                        {m.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#888",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {t("tradeLessons")}
              </div>

              {lessons.length === 0 ? (
                <div style={{ fontSize: 13, color: "#bbb" }}>
                  {t("noLessonData")}
                </div>
              ) : (
                <div
                  style={{
                    background: "#f7f7f5",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 13,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {lessons.slice(0, 4).map(item => (
                    <div key={item.id}>
                      <div style={{ color: "#aaa", fontSize: 11, marginBottom: 2 }}>
                        {item.date} · {item.ticker || "—"}
                      </div>
                      <div style={{ color: "#333", lineHeight: 1.5 }}>
                        {item.lesson}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {ruleNotes.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#888",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {t("ruleNotes")}
              </div>

              <div
                style={{
                  background: "#FCEBEB",
                  border: "0.5px solid #F09595",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {ruleNotes.slice(0, 5).map(item => (
                  <div key={item.id}>
                    <div style={{ color: "#A32D2D", fontSize: 11, marginBottom: 2 }}>
                      {item.date} · {item.ticker || "—"}
                    </div>
                    <div style={{ color: "#333", lineHeight: 1.5 }}>
                      {item.note}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Combined Stats + Calendar Tab ───────────────────────────────────────────
function StatsTab({ trades, setups, sessions, onSelectDay, lang, t }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);

  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      if (fromDate && trade.date < fromDate) return false;
      if (toDate && trade.date > toDate) return false;
      return true;
    });
  }, [trades, fromDate, toDate]);

  const clearDateFilter = () => {
    setFromDate("");
    setToDate("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          background: "#fff",
          border: "0.5px solid #e5e5e5",
          borderRadius: 12,
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: "#888",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.3,
          }}
        >
          {t("filterByDate")}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr auto",
            gap: 10,
            alignItems: "end",
          }}
        >
          <div>
            <div style={lbl}>{t("fromDate")}</div>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              style={inp}
            />
          </div>

          <div>
            <div style={lbl}>{t("toDate")}</div>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              style={inp}
            />
          </div>

          <button onClick={clearDateFilter} style={{ ...btnStyle, height: 34 }}>
            {t("clearFilter")}
          </button>
        </div>

        <div style={{ fontSize: 12, color: "#aaa" }}>
          {t("showingTrades")} {filteredTrades.length} / {trades.length}{" "}
          {t("tradeUnit")}
        </div>
      </div>

      <WeeklyReview trades={trades} setups={setups} lang={lang} t={t} />

      <CalendarView
        trades={filteredTrades}
        onSelectDay={onSelectDay}
        lang={lang}
        t={t}
      />

      <div style={{ textAlign: "center" }}>
        <button
          onClick={() => setShowAdvancedStats(v => !v)}
          style={{
            ...btnStyle,
            fontSize: 12,
            color: "#666",
            background: showAdvancedStats ? "#f1f1ee" : "#fff",
          }}
        >
          {showAdvancedStats ? t("hideAdvancedStats") : t("showAdvancedStats")}
        </button>
      </div>

      {showAdvancedStats && (
        <div
          style={{
            background: "#fff",
            border: "0.5px solid #e5e5e5",
            borderRadius: 14,
            padding: "16px 18px",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#888",
              marginBottom: 14,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            {t("advancedStats")}
          </div>

          <Stats
            trades={filteredTrades}
            setups={setups}
            sessions={sessions}
            t={t}
          />
        </div>
      )}
    </div>
  );
}

function SetupPerformance({ trades, setups, t }) {
  const rows = setups
    .map(setup => {
      const setupTrades = trades.filter(trade =>
        (trade.selectedSetupIds || []).includes(setup.id)
      );

      const withResult = setupTrades.filter(trade => trade.result);
      const wins = withResult.filter(trade => trade.result === "Win").length;
      const losses = withResult.filter(trade => trade.result === "Loss").length;
      const be = withResult.filter(trade => trade.result === "BE").length;

      const followedYes = setupTrades.filter(
        trade => trade.followedPlan === "Yes"
      ).length;

      const followedNoLosses = setupTrades.filter(
        trade => trade.followedPlan === "No" && trade.result === "Loss"
      ).length;

      const disciplineTotal = setupTrades.filter(
        trade =>
          trade.followedPlan === "Yes" ||
          trade.followedPlan === "No" ||
          trade.followedPlan === "Partially"
      ).length;

      return {
        id: setup.id,
        name: setup.name,
        count: setupTrades.length,
        wins,
        losses,
        be,
        wr: withResult.length ? ((wins / withResult.length) * 100).toFixed(0) : "—",
        planRate: disciplineTotal
          ? ((followedYes / disciplineTotal) * 100).toFixed(0)
          : "—",
        followedNoLosses,
      };
    })
    .filter(row => row.count > 0)
    .sort((a, b) => b.count - a.count);

  return (
    <div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#888",
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: 0.3,
        }}
      >
        {t("setupPerformance")}
      </div>

      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: "#bbb" }}>
          {t("noSetupPerformance")}
        </div>
      ) : (
        <div
          style={{
            background: "#fff",
            border: "0.5px solid #e5e5e5",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {rows.map(row => (
            <div
              key={row.id}
              style={{
                padding: "12px 14px",
                borderBottom: "0.5px solid #f0f0f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 8,
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 700, color: "#111", fontSize: 14 }}>
                  {row.name}
                </div>

                <div style={{ fontSize: 12, color: "#999" }}>
                  {row.count} {t("tradeUnit")}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                  fontSize: 12,
                }}
              >
                <div
                  style={{
                    background: "#f7f7f5",
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ color: "#aaa", marginBottom: 3 }}>{t("winRate")}</div>
                  <div style={{ color: "#3B6D11", fontWeight: 700 }}>
                    {row.wr}%
                  </div>
                </div>

                <div
                  style={{
                    background: "#f7f7f5",
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ color: "#aaa", marginBottom: 3 }}>
                    {t("winLossBE")}
                  </div>
                  <div style={{ color: "#111", fontWeight: 700 }}>
                    {row.wins} / {row.losses} / {row.be}
                  </div>
                </div>

                <div
                  style={{
                    background: "#EBF4FD",
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ color: "#185FA5", marginBottom: 3 }}>
                    {t("planRate")}
                  </div>
                  <div style={{ color: "#185FA5", fontWeight: 700 }}>
                    {row.planRate}%
                  </div>
                </div>

                <div
                  style={{
                    background: "#FCEBEB",
                    borderRadius: 8,
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ color: "#A32D2D", marginBottom: 3 }}>
                    {t("lossWithoutPlan")}
                  </div>
                  <div style={{ color: "#A32D2D", fontWeight: 700 }}>
                    {row.followedNoLosses}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function Stats({ trades, setups, sessions, t }) {
  const withResult = trades.filter(trade => trade.result);
  const wins = withResult.filter(trade => trade.result === "Win").length;
  const losses = withResult.filter(trade => trade.result === "Loss").length;
  const be = withResult.filter(trade => trade.result === "BE").length;

  const wr = withResult.length ? ((wins / withResult.length) * 100).toFixed(1) : "—";

  const followedYes = trades.filter(trade => trade.followedPlan === "Yes").length;
  const followedNo = trades.filter(trade => trade.followedPlan === "No").length;
  const followedPartial = trades.filter(trade => trade.followedPlan === "Partially").length;

  const followedWithResult = trades.filter(
    trade => trade.followedPlan === "Yes" && trade.result
  );
  const notFollowedWithResult = trades.filter(
    trade => trade.followedPlan === "No" && trade.result
  );

  const followedWR = followedWithResult.length
    ? (
        (followedWithResult.filter(trade => trade.result === "Win").length /
          followedWithResult.length) *
        100
      ).toFixed(0)
    : "—";

  const notFollowedWR = notFollowedWithResult.length
    ? (
        (notFollowedWithResult.filter(trade => trade.result === "Win").length /
          notFollowedWithResult.length) *
        100
      ).toFixed(0)
    : "—";

  const mistakeStats = MISTAKE_OPTIONS.map(m => ({
    value: m.value,
    label: t(m.key),
    count: trades.filter(trade => (trade.mistakeTags || []).includes(m.value)).length,
  }))
    .filter(m => m.count > 0)
    .sort((a, b) => b.count - a.count);

  const cleanTrades = trades.filter(isCleanTrade);
  const issueTrades = trades.filter(hasDisciplineIssue);

  const cleanWR = calcWR(cleanTrades);
  const issueWR = calcWR(issueTrades);

  const aPlusTrades = trades.filter(trade => tradeQuality(trade) === "A+").length;
  const goodLosses = trades.filter(trade => tradeQuality(trade) === "Good Loss").length;
  const luckyWins = trades.filter(trade => tradeQuality(trade) === "Lucky Win").length;
  const badLosses = trades.filter(trade => tradeQuality(trade) === "Bad Loss").length;

  const StatCard = ({ label, val, color }) => (
    <div
      style={{
        background: "#f7f7f5",
        borderRadius: 8,
        padding: "14px 16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#aaa",
          fontWeight: 600,
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>

      <div style={{ fontSize: 24, fontWeight: 600, color: color || "#111" }}>
        {val}
      </div>
    </div>
  );

  const TableRow = ({ label, count, wins }) => (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "8px 0",
        borderBottom: "0.5px solid #f0f0f0",
        fontSize: 13,
      }}
    >
      <span style={{ color: "#333" }}>{label}</span>

      <span style={{ color: "#999" }}>
        {count} {t("tradeUnit")} ·{" "}
        <span style={{ color: "#3B6D11", fontWeight: 500 }}>
          {count ? ((wins / count) * 100).toFixed(0) : 0}% WR
        </span>
      </span>
    </div>
  );

  const bySession = sessions
    .map(session => ({
      session,
      count: trades.filter(trade => trade.session === session).length,
      wins: trades.filter(
        trade => trade.session === session && trade.result === "Win"
      ).length,
    }))
    .filter(session => session.count > 0);

  const bySetup = setups
    .map(setup => ({
      name: setup.name,
      count: trades.filter(trade =>
        (trade.selectedSetupIds || []).includes(setup.id)
      ).length,
      wins: trades.filter(
        trade =>
          (trade.selectedSetupIds || []).includes(setup.id) &&
          trade.result === "Win"
      ).length,
    }))
    .filter(setup => setup.count > 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        <StatCard label={t("totalTrades")} val={trades.length} />
        <StatCard label={t("winRate")} val={`${wr}%`} color="#3B6D11" />
        <StatCard label={t("winLossBE")} val={`${wins} / ${losses} / ${be}`} />
        <StatCard label={t("noResult")} val={trades.length - withResult.length} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
        <StatCard
          label={t("cleanTrades")}
          val={`${cleanTrades.length} · ${cleanWR}% WR`}
          color="#3B6D11"
        />
        <StatCard
          label={t("disciplineIssues")}
          val={`${issueTrades.length} · ${issueWR}% WR`}
          color="#A32D2D"
        />
        <StatCard
          label={t("luckyWins")}
          val={luckyWins}
          color="#854F0B"
        />
        <StatCard
          label={t("badLosses")}
          val={badLosses}
          color="#A32D2D"
        />
      </div>

      <SetupPerformance trades={trades} setups={setups} t={t} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#888",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
              >
                {t("followedPlan")}
              </div>

              <div
                style={{
                  background: "#f7f7f5",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontSize: 13,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{t("followedYes")}</span>
                  <span style={{ color: "#3B6D11", fontWeight: 600 }}>
                    {followedYes} · {followedWR}% WR
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{t("followedNo")}</span>
                  <span style={{ color: "#A32D2D", fontWeight: 600 }}>
                    {followedNo} · {notFollowedWR}% WR
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>{t("followedPartial")}</span>
                  <span style={{ color: "#854F0B", fontWeight: 600 }}>
                    {followedPartial}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#888",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: 0.3,
                }}
              >
                {t("mistakes")}
              </div>

              {mistakeStats.length === 0 ? (
                <div style={{ fontSize: 13, color: "#bbb" }}>{t("noData")}</div>
              ) : (
                <div
                  style={{
                    background: "#f7f7f5",
                    borderRadius: 8,
                    padding: "12px 14px",
                    fontSize: 13,
                  }}
                >
                  {mistakeStats.map(m => (
                    <div
                      key={m.value}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "7px 0",
                        borderBottom: "0.5px solid #e5e5e5",
                      }}
                    >
                      <span>{m.label}</span>
                      <span style={{ color: "#8A4B12", fontWeight: 600 }}>
                        {m.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#888",
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            {t("bySession")}
          </div>

          {bySession.length === 0 && (
            <div style={{ fontSize: 13, color: "#bbb" }}>{t("noData")}</div>
          )}

          {bySession.map(session => (
            <TableRow
              key={session.session}
              label={session.session}
              count={session.count}
              wins={session.wins}
            />
          ))}
        </div>

        <div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "#888",
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: 0.3,
            }}
          >
            {t("bySetup")}
          </div>

          {bySetup.length === 0 && (
            <div style={{ fontSize: 13, color: "#bbb" }}>{t("noData")}</div>
          )}

          {bySetup.map(setup => (
            <TableRow
              key={setup.name}
              label={setup.name}
              count={setup.count}
              wins={setup.wins}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
// ─── Setup Editor ─────────────────────────────────────────────────────────────
function SetupEditor({ setup, onSave, onCancel, onDelete, t }) {
  const [name, setName] = useState(setup?.name || "");
  const [steps, setSteps] = useState(
    setup?.steps || [{ label: "", type: "text", placeholder: "" }]
  );
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const addStep = () =>
    setSteps(s => [...s, { label: "", type: "text", placeholder: "" }]);

  const updateStep = (i, key, val) =>
    setSteps(s => s.map((x, j) => (j === i ? { ...x, [key]: val } : x)));

  const removeStep = i => setSteps(s => s.filter((_, j) => j !== i));

  const handleDrop = i => {
    if (dragIdx === null || dragIdx === i) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }

    const ns = [...steps];
    const [m] = ns.splice(dragIdx, 1);
    ns.splice(i, 0, m);

    setSteps(ns);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleSave = () => {
    if (!name.trim()) return alert(t("needSetupName"));

    const clean = steps.filter(s => s.label.trim());
    if (!clean.length) return alert(t("needOneStep"));

    onSave({
      id: setup?.id || Date.now(),
      name: name.trim(),
      steps: clean,
    });
  };

  return (
    <div
      style={{
        background: "#fff",
        border: "0.5px solid #e5e5e5",
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <div style={{ marginBottom: 14 }}>
        <div style={lbl}>{t("setupName")}</div>

        <input
          type="text"
          placeholder={t("setupNamePlaceholder")}
          value={name}
          onChange={e => setName(e.target.value)}
          style={{ ...inp, fontSize: 15, fontWeight: 500 }}
        />
      </div>

      <div style={{ fontSize: 12, color: "#777", marginBottom: 8, fontWeight: 500 }}>
        {t("setupSteps")}{" "}
        <span style={{ color: "#bbb", fontWeight: 400 }}>
          ({t("dragHint")})
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {steps.map((step, i) => (
          <div
            key={i}
            draggable
            onDragStart={() => setDragIdx(i)}
            onDragOver={e => {
              e.preventDefault();
              setDragOverIdx(i);
            }}
            onDrop={() => handleDrop(i)}
            onDragEnd={() => {
              setDragIdx(null);
              setDragOverIdx(null);
            }}
            style={{
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
              opacity: dragIdx === i ? 0.4 : 1,
              borderTop:
                dragOverIdx === i && dragIdx !== i
                  ? "2px solid #185FA5"
                  : "2px solid transparent",
              paddingTop: 4,
              transition: "border-color 0.1s",
            }}
          >
            <span
              style={{
                cursor: "grab",
                color: "#ccc",
                fontSize: 16,
                userSelect: "none",
                paddingTop: 6,
                flexShrink: 0,
              }}
            >
              ⠿
            </span>

            <span
              style={{
                fontSize: 13,
                color: "#bbb",
                paddingTop: 8,
                minWidth: 20,
                flexShrink: 0,
              }}
            >
              {i + 1}.
            </span>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
              <input
                type="text"
                placeholder={t("stepNamePlaceholder")}
                value={step.label}
                onChange={e => updateStep(i, "label", e.target.value)}
                onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addStep())}
                style={{ ...inp, fontSize: 13 }}
              />

              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 11, color: "#aaa" }}>{t("type")}</span>

                {[
                  { val: "text", label: t("textInput") },
                  { val: "check", label: t("checkbox") },
                ].map(o => (
                  <button
                    key={o.val}
                    onClick={() => updateStep(i, "type", o.val)}
                    style={{
                      fontSize: 11,
                      padding: "3px 10px",
                      cursor: "pointer",
                      borderRadius: 20,
                      border: `1px solid ${
                        step.type === o.val ? "#185FA5" : "#ddd"
                      }`,
                      background: step.type === o.val ? "#EBF4FD" : "transparent",
                      color: step.type === o.val ? "#185FA5" : "#888",
                      fontFamily: "inherit",
                    }}
                  >
                    {o.label}
                  </button>
                ))}

                {step.type === "text" && (
                  <input
                    type="text"
                    placeholder={t("optionalPlaceholder")}
                    value={step.placeholder || ""}
                    onChange={e => updateStep(i, "placeholder", e.target.value)}
                    style={{
                      ...inp,
                      fontSize: 11,
                      flex: 1,
                      padding: "3px 8px",
                    }}
                  />
                )}
              </div>
            </div>

            <button
              onClick={() => removeStep(i)}
              style={{
                ...btnStyle,
                color: "#c0392b",
                borderColor: "#f09595",
                padding: "4px 10px",
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addStep}
        style={{
          ...btnStyle,
          marginBottom: 16,
          color: "#185FA5",
          borderColor: "#85B7EB",
        }}
      >
        {t("addStep")}
      </button>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {onDelete && (
          <button
            onClick={onDelete}
            style={{
              ...btnStyle,
              color: "#c0392b",
              borderColor: "#f09595",
              marginRight: "auto",
            }}
          >
            {t("deleteSetup")}
          </button>
        )}

        {onCancel && (
          <button onClick={onCancel} style={btnStyle}>
            {t("cancel")}
          </button>
        )}

        <button onClick={handleSave} style={primaryBtn}>
          {t("saveSetup")}
        </button>
      </div>
    </div>
  );
}

// ─── ThietLap Tab ─────────────────────────────────────────────────────────────
function ThietLapTab({
  setups,
  onSetupsSave,
  sessions,
  onSessionsSave,
  pnlMode,
  onPnlModeSave,
  language,
  onLanguageSave,
  t,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editingSetup, setEditingSetup] = useState(null);
  const [newSession, setNewSession] = useState("");

  const handleSaveSetup = saved => {
    const exists = setups.find(s => s.id === saved.id);

    onSetupsSave(
      exists ? setups.map(s => (s.id === saved.id ? saved : s)) : [...setups, saved]
    );

    setEditingId(null);
    setEditingSetup(null);
  };

  const handleDeleteSetup = id => {
    if (!window.confirm(t("confirmDeleteSetup"))) return;

    onSetupsSave(setups.filter(s => s.id !== id));
    setEditingId(null);
    setEditingSetup(null);
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
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 4 }}>
          {t("language")}
        </div>

        <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
          {t("languageNote")}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {LANGUAGES.map(lang => (
            <button
              key={lang.value}
              onClick={() => onLanguageSave(lang.value)}
              style={{
                ...btnStyle,
                padding: "10px 18px",
                border: `1.5px solid ${
                  language === lang.value ? "#185FA5" : "#ddd"
                }`,
                background: language === lang.value ? "#EBF4FD" : "#fff",
                color: language === lang.value ? "#185FA5" : "#777",
                fontWeight: language === lang.value ? 600 : 400,
              }}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 4 }}>
          {t("pnlUnit")}
        </div>

        <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
          {t("pnlUnitNote")}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => onPnlModeSave("R")}
            style={{
              ...btnStyle,
              padding: "10px 18px",
              border: `1.5px solid ${pnlMode === "R" ? "#185FA5" : "#ddd"}`,
              background: pnlMode === "R" ? "#EBF4FD" : "#fff",
              color: pnlMode === "R" ? "#185FA5" : "#777",
              fontWeight: pnlMode === "R" ? 600 : 400,
            }}
          >
            {t("byR")}
          </button>

          <button
            onClick={() => onPnlModeSave("money")}
            style={{
              ...btnStyle,
              padding: "10px 18px",
              border: `1.5px solid ${pnlMode === "money" ? "#185FA5" : "#ddd"}`,
              background: pnlMode === "money" ? "#EBF4FD" : "#fff",
              color: pnlMode === "money" ? "#185FA5" : "#777",
              fontWeight: pnlMode === "money" ? 600 : 400,
            }}
          >
            {t("byMoney")}
          </button>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 4 }}>
          {t("tradingMethod")}
        </div>

        <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
          {t("tradingMethodNote1")}
        </div>

        <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
          {t("tradingMethodNote2")}
        </div>

        {setups.length === 0 && !editingId && (
          <div
            style={{
              textAlign: "center",
              color: "#ccc",
              padding: "30px 0",
              fontSize: 13,
              background: "#f7f7f5",
              borderRadius: 10,
            }}
          >
            {t("noSetupCreated")}
          </div>
        )}

        {setups.map(setup =>
          editingId === setup.id ? (
            <SetupEditor
              key={setup.id}
              setup={editingSetup}
              onSave={handleSaveSetup}
              onCancel={() => {
                setEditingId(null);
                setEditingSetup(null);
              }}
              onDelete={() => handleDeleteSetup(setup.id)}
              t={t}
            />
          ) : (
            <div
              key={setup.id}
              style={{
                background: "#fff",
                border: "0.5px solid #e5e5e5",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ flex: 1, marginRight: 12 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: "#111",
                    marginBottom: 6,
                  }}
                >
                  {setup.name}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {setup.steps.map((s, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 12,
                        background: s.type === "check" ? "#f0fae8" : "#f1f1ee",
                        color: s.type === "check" ? "#3B6D11" : "#666",
                        border: `0.5px solid ${
                          s.type === "check" ? "#97C459" : "#ddd"
                        }`,
                      }}
                    >
                      {i + 1}. {s.label} {s.type === "check" ? "☑" : "✏"}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setEditingSetup(setup);
                  setEditingId(setup.id);
                }}
                style={{ ...btnStyle, flexShrink: 0 }}
              >
                {t("edit")}
              </button>
            </div>
          )
        )}

        {editingId === "new" && (
          <SetupEditor
            setup={null}
            onSave={handleSaveSetup}
            onCancel={() => setEditingId(null)}
            t={t}
          />
        )}

        {editingId !== "new" && (
          <button
            onClick={() => {
              setEditingSetup(null);
              setEditingId("new");
            }}
            style={{ ...primaryBtn, marginTop: 4 }}
          >
            {t("createSetup")}
          </button>
        )}
      </div>

      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#111", marginBottom: 4 }}>
          {t("tradingSessions")}
        </div>

        <div style={{ fontSize: 13, color: "#888", marginBottom: 16 }}>
          {t("tradingSessionsNote")}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {sessions.map(s => (
            <div
              key={s}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 12px",
                borderRadius: 20,
                background: "#f7f7f5",
                border: "0.5px solid #ddd",
                fontSize: 13,
              }}
            >
              <span>{s}</span>

              <button
                onClick={() => removeSession(s)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#ccc",
                  fontSize: 14,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            placeholder={t("newSessionPlaceholder")}
            value={newSession}
            onChange={e => setNewSession(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addSession()}
            style={{ ...inp, flex: 1, fontSize: 13 }}
          />

          <button onClick={addSession} style={btnStyle}>
            {t("add")}
          </button>
        </div>
      </div>
    </div>
  );
}
function AuthScreen() {
  const [loading, setLoading] = useState(false);

  const signInWithGoogle = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fafafa",
        fontFamily: "system-ui, -apple-system, sans-serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          border: "0.5px solid #e5e5e5",
          borderRadius: 18,
          padding: 28,
          boxShadow: "0 8px 30px rgba(0,0,0,0.06)",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>
          My Trading Journal
        </h1>

        <div
          style={{
            fontSize: 15,
            color: "#111",
            lineHeight: 1.5,
            fontWeight: 600,
            marginBottom: 10,
          }}
        >
          Journal less. Review better. Trade with more discipline.
        </div>

        <p style={{ fontSize: 14, color: "#888", lineHeight: 1.6, marginBottom: 22 }}>
          Sign in with Google to save your trades, setups, and statistics across devices.
        </p>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          style={{
            ...primaryBtn,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 8,
            opacity: loading ? 0.65 : 1,
          }}
        >
          {loading ? "Signing in..." : "Continue with Google"}
        </button>

        <p style={{ fontSize: 12, color: "#aaa", marginTop: 16 }}>
          Your journal data will be private to your account.
        </p>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const [tab, setTab] = useState("new");
  const [trades, setTrades] = useState(() => load(STORAGE_KEY, []));
  const [setups, setSetups] = useState(() => load(SETUPS_KEY, []));
  const [sessions, setSessions] = useState(() =>
    load(SESSIONS_KEY, DEFAULT_SESSIONS)
  );
  const [pnlMode, setPnlMode] = useState(() => load(PNL_MODE_KEY, "R"));
  const [language, setLanguage] = useState(() =>
    load(LANGUAGE_KEY, DEFAULT_LANGUAGE)
  );
  const [editTrade, setEditTrade] = useState(null);
  const [dayModal, setDayModal] = useState(null);

  const t = useCallback(key => tOf(language, key), [language]);
  const buildJournalPayload = useCallback(() => {
    return {
      trades,
      setups,
      sessions,
      pnlMode,
      language,
    };
  }, [trades, setups, sessions, pnlMode, language]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setUser(session?.user || null);
        setAuthLoading(false);
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setCloudLoaded(false);
      return;
    }

    let cancelled = false;

    const loadCloudJournal = async () => {
      setCloudLoaded(false);

      const localPayload = {
        trades: load(STORAGE_KEY, []),
        setups: load(SETUPS_KEY, []),
        sessions: load(SESSIONS_KEY, DEFAULT_SESSIONS),
        pnlMode: load(PNL_MODE_KEY, "R"),
        language: load(LANGUAGE_KEY, DEFAULT_LANGUAGE),
      };

      const { data, error } = await supabase
        .from(JOURNAL_TABLE)
        .select("data")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Load journal failed:", error);
        alert("Không thể tải dữ liệu journal từ Supabase: " + error.message);
        setCloudLoaded(true);
        return;
      }

      if (data?.data) {
        const cloud = data.data;

        setTrades(Array.isArray(cloud.trades) ? cloud.trades : []);
        setSetups(Array.isArray(cloud.setups) ? cloud.setups : []);
        setSessions(
          Array.isArray(cloud.sessions) && cloud.sessions.length
            ? cloud.sessions
            : DEFAULT_SESSIONS
        );
        setPnlMode(cloud.pnlMode || "R");
        setLanguage(cloud.language || DEFAULT_LANGUAGE);
      } else {
        const { error: upsertError } = await supabase
          .from(JOURNAL_TABLE)
          .upsert(
            {
              user_id: user.id,
              data: localPayload,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (upsertError) {
          console.error("Initial journal sync failed:", upsertError);
          alert("Không thể đồng bộ dữ liệu local lên Supabase: " + upsertError.message);
        }
      }

      setCloudLoaded(true);
    };

    loadCloudJournal();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    persist(STORAGE_KEY, trades);
  }, [trades]);

  useEffect(() => {
    persist(SETUPS_KEY, setups);
  }, [setups]);

  useEffect(() => {
    persist(SESSIONS_KEY, sessions);
  }, [sessions]);

  useEffect(() => {
    persist(PNL_MODE_KEY, pnlMode);
  }, [pnlMode]);

  useEffect(() => {
    persist(LANGUAGE_KEY, language);
  }, [language]);

  useEffect(() => {
    if (!user || !cloudLoaded) return;

    const timeout = setTimeout(async () => {
      const payload = buildJournalPayload();

      const { error } = await supabase
        .from(JOURNAL_TABLE)
        .upsert(
          {
            user_id: user.id,
            data: payload,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (error) {
        console.error("Save journal failed:", error);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [user, cloudLoaded, buildJournalPayload]);

  const saveTrade = form => {
    if (!validatePnl(form.result, form.pnl, t)) return false;

    const cleanForm = {
      ...form,
      pnl: normalizePnl(form.result, form.pnl, pnlMode),
    };

    setTrades(ts =>
      editTrade
        ? ts.map(trade => (trade.id === cleanForm.id ? cleanForm : trade))
        : [{ ...cleanForm, id: Date.now() }, ...ts]
    );

    setEditTrade(null);
    setTab("history");

    return true;
  };

  const deleteTrade = id => {
    if (window.confirm(t("confirmDeleteTrade"))) {
      setTrades(ts => ts.filter(trade => trade.id !== id));

      if (dayModal) {
        const remaining = dayModal.dayTrades.filter(trade => trade.id !== id);

        if (remaining.length === 0) setDayModal(null);
        else setDayModal({ ...dayModal, dayTrades: remaining });
      }
    }
  };

  const startEdit = trade => {
    setEditTrade(trade);
    setTab("new");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCloudLoaded(false);
  };

  const tabStyle = tName => ({
    padding: "9px 22px",
    cursor: "pointer",
    fontSize: 14,
    fontWeight: tab === tName ? 600 : 400,
    background: "transparent",
    border: "none",
    borderBottom: `2px solid ${tab === tName ? "#111" : "transparent"}`,
    color: tab === tName ? "#111" : "#888",
    fontFamily: "inherit",
  });

  if (authLoading || (user && !cloudLoaded)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#fafafa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#888",
          fontSize: 14,
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fafafa",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "24px 20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111", marginBottom: 4 }}>
              My Trading Journal
            </h1>

            <p style={{ fontSize: 13, color: "#aaa", margin: 0 }}>
              {t("madeBy")}
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 12,
                color: "#888",
                marginBottom: 6,
                maxWidth: 220,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {user?.email}
            </div>

            <button
              onClick={signOut}
              style={{
                ...btnStyle,
                fontSize: 12,
                padding: "4px 10px",
                color: "#888",
              }}
            >
              Sign out
            </button>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            borderBottom: "0.5px solid #e5e5e5",
            marginBottom: 24,
            overflowX: "auto",
          }}
        >
          <button
            style={tabStyle("new")}
            onClick={() => {
              setEditTrade(null);
              setTab("new");
            }}
          >
            {t("newTrade")}
          </button>

          <button style={tabStyle("history")} onClick={() => setTab("history")}>
            {t("history")} ({trades.length})
          </button>

          <button style={tabStyle("stats")} onClick={() => setTab("stats")}>
            {t("stats")}
          </button>

          <button style={tabStyle("thietlap")} onClick={() => setTab("thietlap")}>
            {t("settings")}
          </button>
        </div>

        {tab === "new" && (
          <>
            <PageValueText>{t("newTradeValue")}</PageValueText>

            <NewTradeFlow
              initial={editTrade}
              onSave={saveTrade}
              onCancel={() => {
                setEditTrade(null);
                setTab("history");
              }}
              setups={setups}
              sessions={sessions}
              pnlMode={pnlMode}
              draftKey={`${TRADE_DRAFT_KEY}_${user.id}`}
              t={t}
            />
          </>
        )}

        {tab === "history" && (
          <>
            <PageValueText>{t("historyValue")}</PageValueText>

            <HistoryTab
              trades={trades}
              setups={setups}
              sessions={sessions}
              onDelete={deleteTrade}
              onEdit={startEdit}
              t={t}
            />
          </>
        )}

        {tab === "stats" && (
          <>
            <PageValueText>{t("statsValue")}</PageValueText>

            <StatsTab
              trades={trades}
              setups={setups}
              sessions={sessions}
              onSelectDay={(dateStr, dayTrades) =>
                setDayModal({ dateStr, dayTrades })
              }
              lang={language}
              t={t}
            />
          </>
        )}

        {tab === "thietlap" && (
          <>
            <PageValueText>{t("settingsValue")}</PageValueText>

            <ThietLapTab
              setups={setups}
              onSetupsSave={setSetups}
              sessions={sessions}
              onSessionsSave={setSessions}
              pnlMode={pnlMode}
              onPnlModeSave={setPnlMode}
              language={language}
              onLanguageSave={setLanguage}
              t={t}
            />
          </>
        )}

        <div
          style={{
            marginTop: 36,
            padding: "18px 16px",
            borderTop: "0.5px solid #e5e5e5",
            textAlign: "center",
            color: "#888",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <div style={{ marginBottom: 10 }}>
            {t("feedbackText")}
          </div>

          <button
            onClick={() =>
              window.open(
                "https://docs.google.com/forms/d/e/1FAIpQLScnbHmFq1i-Tufk7DgWLbjBL6DaVxnBRiBKckXxi1ffVh2F1g/viewform?usp=dialog",
                "_blank"
              )
            }
            style={{
              ...btnStyle,
              borderColor: "#85B7EB",
              color: "#185FA5",
              background: "#EBF4FD",
              fontWeight: 500,
            }}
          >
            {t("feedbackBtn")}
          </button>
        </div>

        {dayModal && (
          <DayModal
            dateStr={dayModal.dateStr}
            dayTrades={dayModal.dayTrades}
            setups={setups}
            onClose={() => setDayModal(null)}
            onEdit={startEdit}
            onDelete={deleteTrade}
            lang={language}
            t={t}
          />
        )}
      </div>
    </div>
  );
}