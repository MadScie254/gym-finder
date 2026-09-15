"use client";

import { useEffect, useState } from "react";
import { dismissInstall, hasDismissedInstall } from "@/lib/storage";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      Boolean((window.navigator as { standalone?: boolean }).standalone))
  );
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (hasDismissedInstall() || isStandalone()) return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    if (isIos()) {
      queueMicrotask(() => {
        setIosHint(true);
        setVisible(true);
      });
    }
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible) return null;

  const hide = () => {
    dismissInstall();
    setVisible(false);
  };

  return (
    <div className="install-card">
      <div>
        <p className="install-card__title">Keep it on your home screen</p>
        <p className="install-card__copy">
          {iosHint
            ? "Safari → Share → Add to Home Screen."
            : "Install the lite app. No store listing required."}
        </p>
      </div>
      <div className="install-card__actions">
        {deferred && (
          <button
            type="button"
            className="tiny-btn"
            onClick={async () => {
              await deferred.prompt();
              await deferred.userChoice;
              hide();
            }}
          >
            Install
          </button>
        )}
        <button type="button" className="tiny-btn is-ghost" onClick={hide}>
          Later
        </button>
      </div>
    </div>
  );
}
