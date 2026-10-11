import { BrowserRouter, Route, Routes } from "react-router";
import { useVenues } from "../data/useVenues";
import { ErrorBoundary } from "./ErrorBoundary";

function Home() {
  const { index, error, loading } = useVenues();
  const visible = index?.manifest.counts.defaultVisible;
  const builtAt = index?.manifest.builtAt?.slice(0, 10);
  return (
    <main className="min-h-dvh bg-bg px-4 py-10 text-ink">
      <p className="text-sm text-muted">Find My Gym</p>
      <h1 className="mt-2 max-w-xl text-4xl font-semibold tracking-tight">
        Find a real gym in Kenya
      </h1>
      <p className="mt-4 max-w-xl text-muted">
        Listings come from OpenStreetMap and Overture Maps. We do not invent
        hours, prices or ratings.
      </p>
      <p className="mt-4 text-sm text-muted">
        {loading && "Loading catalogue…"}
        {error && "Catalogue not built yet — run npm run data:extract && npm run data:build."}
        {index && `${visible} listed gyms · data ${builtAt}`}
      </p>
    </main>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
