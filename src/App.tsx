import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { EditChrome } from "./components/EditChrome";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { SiteProvider } from "./context/SiteContext";
import { AdminHome } from "./pages/admin/AdminHome";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { BlogEditor } from "./pages/admin/BlogEditor";
import { CapabilitiesEditor } from "./pages/admin/CapabilitiesEditor";
import { CaseStudyEditor } from "./pages/admin/CaseStudyEditor";
import { CapabilitiesPage } from "./pages/CapabilitiesPage";
import { ContactPage } from "./pages/ContactPage";
import { HomePage } from "./pages/HomePage";
import { InsightDetailPage } from "./pages/InsightDetailPage";
import { InsightsPage } from "./pages/InsightsPage";
import { WorkDetailPage } from "./pages/WorkDetailPage";
import { WorkPage } from "./pages/WorkPage";

function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell">
      <Header />
      <main>{children}</main>
      <Footer />
      <EditChrome />
    </div>
  );
}

export function App() {
  return (
    <SiteProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <PublicLayout>
                <HomePage />
              </PublicLayout>
            }
          />
          <Route
            path="/work"
            element={
              <PublicLayout>
                <WorkPage />
              </PublicLayout>
            }
          />
          <Route
            path="/work/:slug"
            element={
              <PublicLayout>
                <WorkDetailPage />
              </PublicLayout>
            }
          />
          <Route
            path="/insights"
            element={
              <PublicLayout>
                <InsightsPage />
              </PublicLayout>
            }
          />
          <Route
            path="/insights/:slug"
            element={
              <PublicLayout>
                <InsightDetailPage />
              </PublicLayout>
            }
          />
          <Route
            path="/capabilities"
            element={
              <PublicLayout>
                <CapabilitiesPage />
              </PublicLayout>
            }
          />
          <Route
            path="/contact"
            element={
              <PublicLayout>
                <ContactPage />
              </PublicLayout>
            }
          />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminHome />} />
            <Route path="insights" element={<BlogEditor />} />
            <Route path="work" element={<CaseStudyEditor />} />
            <Route path="capabilities" element={<CapabilitiesEditor />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SiteProvider>
  );
}
