import type { ReactNode } from "react";
import * as RadixPopover from "@radix-ui/react-popover";
import styles from "./Overlay.module.css";

export type PopoverProps = {
  /** The element that toggles the popover. Must be a single focusable element. */
  trigger: ReactNode;
  /** Accessible name for the popover panel. */
  label: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** Non-modal popover on Radix, for short explanations such as why a gym has its trust tier. */
export function Popover({ trigger, label, children, side = "bottom", align = "start", open, onOpenChange }: PopoverProps) {
  return (
    <RadixPopover.Root open={open} onOpenChange={onOpenChange}>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content className={styles.popover} side={side} align={align} sideOffset={6} collisionPadding={16} aria-label={label}>
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
