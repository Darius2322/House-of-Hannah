import React, { useLayoutEffect, useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { NavBar, Footer, WhatsAppFloat } from "./components/Layout";

import Home from "./pages/Home";
import ServicesPage from "./pages/Services";
import Booking from "./pages/Booking";
import Confirmation from "./pages/Confirmation";
import TrackPage from "./pages/Track";
import GalleryPage from "./pages/Gallery";
import ReviewsPage from "./pages/Reviews";
import { AboutPage, PickupDeliveryPage, ContactPage, FAQPage, PrivacyPage, TermsPage } from "./pages/Static";
import AdminLogin from "./pages/AdminLogin";
import PricingPage from "./pages/Pricing";
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
import WorkerLogin from "./pages/WorkerLogin";
const WorkerDashboard = lazy(() => import("./pages/WorkerDashboard"));
import { Spinner } from "./components/UI";
import { BRAND } from "./lib/constants";

function PublicLayout({ children }) {
  return (
    <>
      <NavBar />
      {children}
      <Footer />
      <WhatsAppFloat />
    </>
  );
}

// Route-level scroll restoration: every navigation scrolls to the top of
// the new page. This runs independently of the mobile drawer's own
// scroll-lock/restore (see Layout.jsx), which only concerns itself with
// putting the customer back where they were on the *same* page when the
// menu closes without navigating anywhere.
function ScrollToTop() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Subtle fade+slide on every route change — short enough (220ms) to feel
// fast rather than decorative.
function PageTransition({ children }) {
  const { pathname } = useLocation();
  return (
    <div key={pathname} style={{ animation: "hoh-page-in .22s ease" }}>
      {children}
      <style>{`
        @keyframes hoh-page-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) {
          @keyframes hoh-page-in { from { opacity: 1; } to { opacity: 1; } }
        }
      `}</style>
    </div>
  );
}

// One codebase, two deployments:
//   VITE_APP_MODE unset / "public" → the customer website (no staff routes exist in it)
//   VITE_APP_MODE = "admin"        → the staff site only (admin + worker portals, nothing public)
// A hostname starting with "hannahhouse-admin" or "admin." also switches it on, so the staff site
// can never fall back to showing the public pages if the env var is forgotten.
const ADMIN_MODE =
  import.meta.env.VITE_APP_MODE === "admin" ||
  (typeof window !== "undefined" && /^(hannahhouse-admin|admin)[.-]/i.test(window.location.hostname));

const TITLES = {
  "/": `${BRAND.name} — ${BRAND.descriptor}`,
  "/services": "Services", "/pricing": "Price List", "/booking": "Book a Service", "/track": "Track My Request",
  "/gallery": "Gallery", "/reviews": "Customer Reviews", "/about": "About Us", "/pickup-delivery": "Pickup & Delivery",
  "/contact": "Contact", "/faq": "FAQ", "/privacy": "Privacy Policy", "/terms": "Terms & Conditions",
};

// Per-route document title; staff and confirmation pages are kept out of search engines.
function usePageMeta(pathname, isPrivate) {
  useEffect(() => {
    const t = TITLES[pathname];
    document.title = ADMIN_MODE ? `Staff Portal | ${BRAND.name}` : t ? (pathname === "/" ? t : `${t} | ${BRAND.name}`) : BRAND.name;
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement("meta"); robots.name = "robots"; document.head.appendChild(robots); }
    robots.content = isPrivate ? "noindex, nofollow" : "index, follow";
  }, [pathname, isPrivate]);
}

function NotFound() {
  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "90px 20px", textAlign: "center" }}>
      <div style={{ fontFamily: "'Cinzel', Georgia, serif", fontWeight: 700, fontSize: 56, color: "#8C6A00" }}>404</div>
      <h1 style={{ fontFamily: "'Cinzel', Georgia, serif", fontSize: 24, margin: "6px 0 10px" }}>Page not found</h1>
      <p style={{ color: "#5F594D", marginBottom: 22 }}>The page you're looking for doesn't exist or has moved.</p>
      <a href="/" style={{ display: "inline-block", background: "#0B0B0B", color: "#F0CF6E", padding: "12px 24px", borderRadius: 10, fontWeight: 700, textDecoration: "none" }}>Back to Home</a>
    </div>
  );
}

function Shell() {
  const loc = useLocation();
  const isStaff = loc.pathname.startsWith("/admin") || loc.pathname.startsWith("/worker");
  usePageMeta(loc.pathname, ADMIN_MODE || isStaff || loc.pathname.startsWith("/confirmation"));

  const staffRoutes = (
    <>
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<Suspense fallback={<Spinner />}><AdminDashboard /></Suspense>} />
      <Route path="/worker/login" element={<WorkerLogin />} />
      <Route path="/worker/dashboard" element={<Suspense fallback={<Spinner />}><WorkerDashboard /></Suspense>} />
    </>
  );

  const routes = (
    <PageTransition>
      <Routes location={loc}>
        {ADMIN_MODE ? (
          <>
            <Route path="/" element={<Navigate to="/admin" replace />} />
            {staffRoutes}
          </>
        ) : (
          <>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/confirmation/:requestNumber" element={<Confirmation />} />
            <Route path="/track" element={<TrackPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/pickup-delivery" element={<PickupDeliveryPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
          </>
        )}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </PageTransition>
  );

  return (
    <>
      <ScrollToTop />
      {ADMIN_MODE || isStaff ? routes : <PublicLayout>{routes}</PublicLayout>}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}
