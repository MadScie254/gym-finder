import type { ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { IconButton } from "./IconButton";
import styles from "./Overlay.module.css";

export type DialogProps = {
  title: string;
  /** One sentence under the title. Read out when the dialog opens. */
  description?: string;
  /** The element that opens the dialog. Must be a single focusable element. */
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
  /** Buttons along the bottom edge. */
  footer?: ReactNode;
};

/** Modal dialog on Radix: focus trap, Escape to close, focus returns to the trigger. */
export function Dialog({ title, description, trigger, open, onOpenChange, children, footer }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <RadixDialog.Trigger asChild>{trigger}</RadixDialog.Trigger>}
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.scrim} />
        <RadixDialog.Content className={styles.dialog} {...(description ? {} : { "aria-describedby": undefined })}>
          <div className={styles.head}>
            <RadixDialog.Title className={styles.title}>{title}</RadixDialog.Title>
            <RadixDialog.Close asChild>
              <IconButton icon={X} label="Close" variant="quiet" />
            </RadixDialog.Close>
          </div>
          {description && <RadixDialog.Description className={styles.description}>{description}</RadixDialog.Description>}
          <div className={styles.body}>{children}</div>
          {footer && <div className={styles.footer}>{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export const DialogClose = RadixDialog.Close;
