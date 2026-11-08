"use client";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

// 15 minutes of inactivity before auto-logout
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

export default function SessionSecurityGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const lastActiveThrottleRef = useRef(0);

  useEffect(() => {
    // 1. If user is on the root login page, we don't force a redirect.
    const isPublicPage = pathname === "/" || pathname === "";

    if (!isPublicPage) {
      // Check if this browser tab has an active validated session.
      // If the tab was closed and re-opened, or opened in a new tab without signing in, sessionStorage is empty!
      const isTabActive = typeof window !== "undefined" && sessionStorage.getItem("cew_session_active");
      if (!isTabActive) {
        // Clear server cookie and redirect to login
        fetch("/api/auth/logout", { method: "POST" })
          .catch(() => {})
          .finally(() => {
            window.location.href = "/?reason=closed";
          });
        return;
      }
    }

    // 2. Activity Tracker for Idle Logout
    function updateActivity() {
      const now = Date.now();
      if (now - lastActiveThrottleRef.current > 4000) {
        lastActiveThrottleRef.current = now;
        try {
          sessionStorage.setItem("cew_last_active", String(now));
        } catch {}
      }
    }

    // Set initial active timestamp if not set
    if (!sessionStorage.getItem("cew_last_active")) {
      sessionStorage.setItem("cew_last_active", String(Date.now()));
    }

    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, updateActivity, { passive: true });
    });

    // 3. Periodic Idle Checker (checks every 10 seconds)
    const checkInterval = setInterval(() => {
      // Only enforce idle logout on protected internal pages
      if (pathname === "/" || pathname === "") return;

      const rawLast = sessionStorage.getItem("cew_last_active");
      const lastActive = rawLast ? Number(rawLast) : Date.now();
      const idleTime = Date.now() - lastActive;

      if (idleTime >= IDLE_TIMEOUT_MS) {
        clearInterval(checkInterval);
        try {
          sessionStorage.removeItem("cew_session_active");
          sessionStorage.removeItem("cew_last_active");
        } catch {}

        fetch("/api/auth/logout", { method: "POST" })
          .catch(() => {})
          .finally(() => {
            window.location.href = "/?reason=idle";
          });
      }
    }, 10000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, updateActivity);
      });
      clearInterval(checkInterval);
    };
  }, [pathname, router]);

  return null;
}

