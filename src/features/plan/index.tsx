import { Route, Routes } from "react-router";
import { MealsPage } from "./MealsPage";
import { PlanProvider } from "./PlanContext";
import { SetupPage } from "./SetupPage";
import { ShoppingChecklist } from "./shopping/ShoppingChecklist";
import { TodayPage } from "./TodayPage";
import { WeekPage } from "./WeekPage";

/** My week. The app shell mounts this at /plan/*. */
export default function PlanRoutes() {
  return (
    <PlanProvider>
      <Routes>
        <Route index element={<TodayPage />} />
        <Route path="week" element={<WeekPage />} />
        <Route path="meals" element={<MealsPage />} />
        <Route path="shopping" element={<ShoppingChecklist />} />
        <Route path="setup" element={<SetupPage />} />
        <Route path="*" element={<TodayPage />} />
      </Routes>
    </PlanProvider>
  );
}
