import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { isSupabaseConfigured } from "./lib/supabaseClient";
import "./index.css";

const screen = { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#0B0B0B", color: "#E6DFCB", textAlign: "center", fontFamily: "'Inter', system-ui, sans-serif" };

// Catches any render-time crash so customers see a calm recovery screen, not a blank page.
class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { if (import.meta.env.DEV) console.error(error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={screen}>
        <div style={{ maxWidth: 420 }}>
          <img src="/logo.png" alt="House of Hannah" width={120} height={120} style={{ marginBottom: 18 }} />
          <h1 style={{ fontFamily: "'Cinzel', Georgia, serif", color: "#F0CF6E", fontSize: 24, margin: "0 0 10px" }}>Something went wrong</h1>
          <p style={{ lineHeight: 1.6, margin: "0 0 22px" }}>Please reload the page. If it keeps happening, call or WhatsApp us on 0745 604 435.</p>
          <button onClick={() => window.location.reload()} style={{ background: "#D4AF37", color: "#0B0B0B", border: "none", borderRadius: 10, padding: "12px 26px", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>Reload</button>
        </div>
      </div>
    );
  }
}

function MissingConfig() {
  return (
    <div style={screen}>
      <div style={{ maxWidth: 460 }}>
        <h1 style={{ fontFamily: "'Cinzel', Georgia, serif", color: "#F0CF6E", fontSize: 22 }}>Configuration required</h1>
        <p style={{ lineHeight: 1.6 }}>This deployment is missing <code>VITE_SUPABASE_URL</code> and/or <code>VITE_SUPABASE_ANON_KEY</code>. Add them in your hosting provider's environment settings and redeploy.</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>{isSupabaseConfigured ? <App /> : <MissingConfig />}</ErrorBoundary>
  </React.StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* non-fatal: site works without offline support */ });
  });
}
