import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { ErrorBoundary } from "./ErrorBoundary";
import { ExploreProvider } from "./explore-context";
import { NotFound } from "./NotFound";
import { Shell } from "./Shell";
import { StoreProvider } from "./stores";
import { VenueProvider } from "./venue-context";
import { AboutPage } from "../features/about/AboutPage";
import { CommutePage } from "../features/commute/CommutePage";
import { ComparePage } from "../features/compare/ComparePage";
import { GymPage } from "../features/detail/GymPage";
import { Discovery } from "../features/explore/Discovery";
import FuelRoutes from "../features/fuel/index";
import { HomePage } from "../features/home/HomePage";
import { LegalPage } from "../features/legal/LegalPage";
import { PlanPage } from "../features/plan/PlanPage";
import { ReportProvider } from "../features/report/report-store";
import { ReportsPage } from "../features/report/ReportsPage";
import { SavedPage } from "../features/saved/SavedPage";

// Dev and e2e builds only. MODE is a build-time constant, so production drops the chunk.
const Styleguide = import.meta.env.MODE !== "production"
  ? lazy(() => import("../features/styleguide/StyleguidePage"))
  : null;

export function App() {
  return (
    <ErrorBoundary>
      <VenueProvider>
        <StoreProvider>
          <BrowserRouter>
            <ExploreProvider>
              <ReportProvider>
                <Routes>
                  {Styleguide && (
                    <Route path="/styleguide" element={<Suspense fallback={null}><Styleguide /></Suspense>} />
                  )}
                  <Route element={<Shell />}>
                    <Route index element={<HomePage />} />
                    <Route path="search" element={<Discovery />} />
                    <Route path="in/:place" element={<Discovery />} />
                    <Route path="county/:county" element={<Discovery />} />
                    <Route path="near/:landmark" element={<Discovery />} />
                    <Route path="gym/:slug" element={<GymPage />} />
                    <Route path="saved" element={<SavedPage />} />
                    <Route path="compare" element={<ComparePage />} />
                    <Route path="reports" element={<ReportsPage />} />
                    <Route path="about/data" element={<AboutPage />} />
                    <Route path="legal" element={<LegalPage />} />
                    <Route path="commute" element={<CommutePage />} />
                    <Route path="plan/*" element={<PlanPage />} />
                    <Route path="fuel/*" element={<FuelRoutes />} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </ReportProvider>
            </ExploreProvider>
          </BrowserRouter>
        </StoreProvider>
      </VenueProvider>
    </ErrorBoundary>
  );
}
