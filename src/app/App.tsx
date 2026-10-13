import { BrowserRouter, Route, Routes } from "react-router";
import { ErrorBoundary } from "./ErrorBoundary";
import { Shell } from "./Shell";
import { VenueProvider } from "./venue-context";
import { Explore } from "../features/explore/Explore";
import { SavedPage } from "../features/saved/SavedPage";
import { PlanPage } from "../features/plan/PlanPage";
import { MorePage } from "../features/more/MorePage";
import { AboutPage } from "../features/about/AboutPage";
import { LegalPage } from "../features/legal/LegalPage";
import { CommutePage } from "../features/commute/CommutePage";
import { ComparePage } from "../features/compare/ComparePage";

function Missing() {
  return (
    <section className="page">
      <h1>Page not found</h1>
      <p>That link does not match a Find My Gym page.</p>
    </section>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <VenueProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Shell />}>
              <Route path="/" element={<Explore />} />
              <Route path="/search" element={<Explore />} />
              <Route path="/gym/:slug" element={<Explore />} />
              <Route path="/in/:place" element={<Explore />} />
              <Route path="/saved" element={<SavedPage />} />
              <Route path="/plan" element={<PlanPage />} />
              <Route path="/more" element={<MorePage />} />
              <Route path="/about/data" element={<AboutPage />} />
              <Route path="/legal" element={<LegalPage />} />
              <Route path="/commute" element={<CommutePage />} />
              <Route path="/compare" element={<ComparePage />} />
              <Route path="*" element={<Missing />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </VenueProvider>
    </ErrorBoundary>
  );
}
