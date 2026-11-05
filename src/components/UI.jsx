import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { C, STATUS_LABEL, FONT_BODY, FONT_DISPLAY } from "../lib/constants";

export function Button({ children, variant = "primary", onClick, style, type = "button", disabled, full }) {
  const base = {
    fontFamily: FONT_BODY, fontWeight: 700, fontSize: 15, borderRadius: 10,
    padding: "13px 22px", border: "none", cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    transition: "transform .15s ease, box-shadow .15s ease, opacity .15s ease",
    width: full ? "100%" : "auto", opacity: disabled ? 0.6 : 1,
  };
  const variants = {
    primary: { background: `linear-gradient(135deg, ${C.goldLight}, ${C.gold})`, color: C.ink, boxShadow: "0 4px 14px rgba(212,175,55,0.30)" },
    secondary: { background: C.white, color: C.ink, border: `2px solid ${C.ink}` },
    whatsapp: { background: C.whatsapp, color: "#0B0B0B", boxShadow: "0 4px 14px rgba(37,211,102,0.30)" },
    ghost: { background: "transparent", color: C.ink },
    subtle: { background: C.sand, color: C.ink },
    gold: { background: C.gold, color: C.ink },
    dark: { background: C.ink, color: C.goldLight, border: `1.5px solid ${C.gold}` },
    danger: { background: "#FCE8E8", color: "#B23131" },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.transform = "translateY(-1px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
      style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

export function Chip({ active, onClick, children, disabled }) {
  return (
    <button onClick={onClick} type="button" disabled={disabled} style={{
      padding: "9px 15px", borderRadius: 999, border: `2px solid ${active ? C.ink : "#DCD3BC"}`,
      background: active ? C.ink : "#fff", color: disabled ? "#BDB59F" : active ? C.goldLight : C.ink,
      fontFamily: FONT_BODY, fontWeight: 600, fontSize: 13.5, cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.7 : 1,
    }}>{children}</button>
  );
}

export function Field({ label, required, children, hint }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontFamily: FONT_BODY, fontWeight: 600, fontSize: 13.5, color: C.ink, marginBottom: 7 }}>
        {label} {required && <span style={{ color: "#D64545" }}>*</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 12, color: "#7A7466", marginTop: 5 }}>{hint}</div>}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #DCD3BC",
  fontFamily: FONT_BODY, fontSize: 14.5, color: C.ink, background: "#fff", boxSizing: "border-box", outline: "none",
};
export function TextInput(props) {
  return <input maxLength={200} {...props} style={{ ...inputStyle, ...(props.style || {}) }} onFocus={(e) => (e.target.style.borderColor = C.accent)} onBlur={(e) => (e.target.style.borderColor = "#DCD3BC")} />;
}
export function TextArea(props) {
  return <textarea maxLength={1500} {...props} style={{ ...inputStyle, resize: "vertical", minHeight: 90, ...(props.style || {}) }} onFocus={(e) => (e.target.style.borderColor = C.accent)} onBlur={(e) => (e.target.style.borderColor = "#DCD3BC")} />;
}
export function Select(props) {
  return <select {...props} style={{ ...inputStyle, ...(props.style || {}) }} />;
}

// A password field with a show/hide toggle — used anywhere staff type or
// set a password (login, change password, add worker, reset password).
export function PasswordInput(props) {
  const [visible, setVisible] = React.useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        maxLength={128}
        {...props}
        type={visible ? "text" : "password"}
        style={{ ...inputStyle, paddingRight: 42, ...(props.style || {}) }}
        onFocus={(e) => (e.target.style.borderColor = C.accent)}
        onBlur={(e) => (e.target.style.borderColor = "#DCD3BC")}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
        style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 8, color: "#7A7466", display: "flex" }}
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </div>
  );
}

// A searchable dropdown for long lists (e.g. Kenya's 47 counties) — a plain
// <select> is painful to use on mobile once it has more than a handful of
// options, so this pairs a text filter with a scrollable option list.
export function SearchableSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const boxRef = React.useRef(null);

  React.useEffect(() => {
    function onDocClick(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{ ...inputStyle, textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", color: value ? C.ink : "#7A7466" }}
      >
        {value || placeholder || "Select…"}
        <span style={{ fontSize: 11, color: "#7A7466" }}>▼</span>
      </button>
      {open && (
        <div style={{ position: "absolute", zIndex: 30, top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #DCD3BC", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", overflow: "hidden" }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search…`}
            style={{ ...inputStyle, border: "none", borderBottom: "1px solid #EDE6D3", borderRadius: 0 }}
          />
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0 && <div style={{ padding: 12, fontSize: 13, color: "#7A7466" }}>No matches</div>}
            {filtered.map((o) => (
              <div
                key={o}
                onClick={() => { onChange(o); setOpen(false); setQuery(""); }}
                style={{ padding: "10px 14px", fontSize: 14, cursor: "pointer", color: C.ink, background: o === value ? C.ivory : "#fff" }}
              >
                {o}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Badge({ status, label }) {
  const map = {
    submitted: ["#F1EBDC", C.ink], confirmed: ["#F6EDCB", C.accent], picked_up: ["#F6EDCB", C.accent],
    processing: ["#FFF6D8", "#8A6D00"], ready: ["#E4F9EC", "#0C7A3D"], completed: ["#E4F9EC", "#0C7A3D"],
    cancelled: ["#FCE8E8", "#B23131"],
  };
  const [bg, fg] = map[status] || ["#F1EBDC", C.ink];
  return <span style={{ background: bg, color: fg, fontSize: 12.5, fontWeight: 700, padding: "5px 12px", borderRadius: 999, fontFamily: FONT_BODY }}>{label || STATUS_LABEL[status] || status}</span>;
}

export function Section({ children, bg, style }) {
  return <section style={{ padding: "56px 20px", background: bg || "transparent", ...style }}><div style={{ maxWidth: 1080, margin: "0 auto" }}>{children}</div></section>;
}
export function Eyebrow({ children, style }) {
  return <div style={{ color: C.accent, fontWeight: 700, fontSize: 12.5, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10, fontFamily: FONT_BODY, ...style }}>{children}</div>;
}
export function H2({ children }) {
  return <h2 style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: "clamp(25px,4vw,34px)", color: C.ink, margin: "0 0 14px", letterSpacing: 0.4, lineHeight: 1.2 }}>{children}</h2>;
}

export function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", color: "#7A7466" }}>
      {Icon && <Icon size={32} style={{ marginBottom: 10, opacity: 0.6 }} />}
      <div style={{ fontWeight: 700, color: C.ink, marginBottom: 4 }}>{title}</div>
      {desc && <div style={{ fontSize: 13.5 }}>{desc}</div>}
    </div>
  );
}

export function Spinner({ label }) {
  return (
    <div style={{ padding: 60, textAlign: "center", color: "#7A7466" }}>
      <div className="spin" style={{ display: "inline-block", width: 22, height: 22, border: "3px solid #DCD3BC", borderTopColor: C.accent, borderRadius: "50%" }} />
      {label && <div style={{ marginTop: 10, fontSize: 13.5 }}>{label}</div>}
    </div>
  );
}
