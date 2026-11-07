"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // When path/searchParams change, navigation finished
    setLoading(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    function handleAnchorClick(e) {
      const target = e.target.closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href) return;

      // Ignore hash links, javascript:, external links, or new tab links
      if (
        href.startsWith("#") ||
        href.startsWith("javascript:") ||
        target.target === "_blank" ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      // Check if it's an internal route link
      try {
        const url = new URL(href, window.location.href);
        if (url.origin === window.location.origin) {
          // If navigating to different page or different search query
          const currentUrl = window.location.pathname + window.location.search;
          const nextUrl = url.pathname + url.search;
          if (currentUrl !== nextUrl) {
            setLoading(true);
          }
        }
      } catch {
        // invalid URL ignore
      }
    }

    document.addEventListener("click", handleAnchorClick, true);
    return () => {
      document.removeEventListener("click", handleAnchorClick, true);
    };
  }, []);

  if (!loading) return null;

  return (
    <>
      {/* Top slim animated progress bar */}
      <div className="global-top-progress-bar" />

      {/* Modern backdrop loading overlay */}
      <div className="global-page-loading-overlay">
        <div className="global-page-loading-card">
          <div className="global-page-spinner" />
          <div className="global-page-loading-title">Loading Page...</div>
          <div className="global-page-loading-sub">Please wait a moment</div>
        </div>
      </div>
    </>
  );
}

