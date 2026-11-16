import { Link } from "react-router";
import { SearchX } from "lucide-react";
import { useT } from "./venue-context";
import { buttonClassName, EmptyState } from "../ui";

export function NotFound() {
  const tr = useT();
  return (
    <EmptyState icon={SearchX} level={1} title={tr("notFoundTitle")} action={<Link to="/search" className={buttonClassName("primary")}>{tr("goHome")}</Link>}>
      {tr("notFoundBody")}
    </EmptyState>
  );
}
