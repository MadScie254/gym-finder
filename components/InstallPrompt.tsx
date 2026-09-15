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
    ("standalone" in window.navigator && Boolean((window.navigator as { standalone?: boolean }).standalone))
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
      setIosHint(true);
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible) return null;

  const hide = () => {
    dismissInstall();
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    hide();
  };

  return (
    <div className="pointer-events-auto rounded-2xl border border-white/10 bg-[#151b24]/95 p-3 shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Install Gym Finder</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {iosHint
              ? "On iPhone, open Share in Safari and tap Add to Home Screen."
              : "Add this lite app to your phone for a full-screen gym map."}
          </p>
        </div>
        <button type="button" onClick={hide} className="text-xs text-slate-500">
          Later
        </button>
      </div>
      {deferred && (
        <button
          type="button"
          onClick={install}
          className="mt-3 h-10 w-full rounded-xl bg-lime-300 text-sm font-semibold text-black"
        >
          Install app
        </button>
      )}
    </div>
  );
}
