import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router";
import { ErrorBoundary } from "./ErrorBoundary";
import { ExploreProvider } from "./explore-context";
import { NotFound } from "./NotFound";
import { Shell } from "./Shell";
import { StoreProvider } from "./stores";
import { VenueProvider } from "./venue-context";
import { SkeletonList } from "../ui";
import { GymPage } from "../features/detail/GymPage";
import { Discovery } from "../features/explore/Discovery";
import { HomePage } from "../features/home/HomePage";
import { PaletteProvider } from "../features/palette/palette-context";
import { ReportProvider } from "../features/report/report-store";

// Secondary pages load on demand, so the first load stays under the 200 KB budget.
const AboutPage = lazy(async () => ({ default: (await import("../features/about/AboutPage")).AboutPage }));
const CommutePage = lazy(async () => ({ default: (await import("../features/commute/CommutePage")).CommutePage }));
const ComparePage = lazy(async () => ({ default: (await import("../features/compare/ComparePage")).ComparePage }));
const LegalPage = lazy(async () => ({ default: (await import("../features/legal/LegalPage")).LegalPage }));
const PlanPage = lazy(async () => ({ default: (await import("../features/plan/PlanPage")).PlanPage }));
const ReportsPage = lazy(async () => ({ default: (await import("../features/report/ReportsPage")).ReportsPage }));
const SavedPage = lazy(async () => ({ default: (await import("../features/saved/SavedPage")).SavedPage }));
const FuelRoutes = lazy(() => import("../features/fuel/index"));

// Dev and e2e builds only. MODE is a build-time constant, so production drops the chunk.
const Styleguide = import.meta.env.MODE !== "production"
  ? lazy(() => import("../features/styleguide/StyleguidePage"))
  : null;

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<SkeletonList count={2} label="Loading" />}>{children}</Suspense>;
}

export function App() {
  return (
    <ErrorBoundary>
      <VenueProvider>
        <StoreProvider>
          <BrowserRouter>
            <ExploreProvider>
              <ReportProvider>
                <PaletteProvider>
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
                      <Route path="saved" element={<Lazy><SavedPage /></Lazy>} />
                      <Route path="compare" element={<Lazy><ComparePage /></Lazy>} />
                      <Route path="reports" element={<Lazy><ReportsPage /></Lazy>} />
                      <Route path="about/data" element={<Lazy><AboutPage /></Lazy>} />
                      <Route path="legal" element={<Lazy><LegalPage /></Lazy>} />
                      <Route path="commute" element={<Lazy><CommutePage /></Lazy>} />
                      <Route path="plan/*" element={<Lazy><PlanPage /></Lazy>} />
                      <Route path="fuel/*" element={<Lazy><FuelRoutes /></Lazy>} />
                      <Route path="*" element={<NotFound />} />
                    </Route>
                  </Routes>
                </PaletteProvider>
              </ReportProvider>
            </ExploreProvider>
          </BrowserRouter>
        </StoreProvider>
      </VenueProvider>
    </ErrorBoundary>
  );
}
