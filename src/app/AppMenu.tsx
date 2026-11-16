import { useState } from "react";
import { Menu } from "lucide-react";
import { IconButton, Popover } from "../ui";
import { MenuContent } from "./MenuContent";
import { useT } from "./venue-context";

/** The header menu from 900 to 1099 px, where the header carries four tabs and there is no sidebar or More tab yet. */
export function AppMenu({ onInstall }: { onInstall?: () => void }) {
  const tr = useT();
  const [open, setOpen] = useState(false);

  return (
    <Popover
      label={tr("menu")}
      open={open}
      onOpenChange={setOpen}
      align="end"
      trigger={<IconButton icon={Menu} label={tr("menu")} variant="quiet" />}
    >
      <MenuContent onNavigate={() => setOpen(false)} onInstall={onInstall} />
    </Popover>
  );
}
