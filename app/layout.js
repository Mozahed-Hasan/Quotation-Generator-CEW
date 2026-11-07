import "./globals.css";
import { Suspense } from "react";
import NavigationProgress from "./NavigationProgress";

export const metadata = {
  title: "Online Games | Portal",
  description: "Management Portal: Quotation Generator, Purchase, Sales, Expense and Admin Control Panel.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var origError = window.onerror;
                window.onerror = function(msg, url, line, col, error) {
                  if (typeof url === 'string' && (url.includes('chrome-extension://') || url.includes('moz-extension://'))) {
                    return true;
                  }
                  if (origError) return origError.apply(this, arguments);
                };
                window.addEventListener('error', function(e) {
                  if (e.filename && (e.filename.includes('chrome-extension://') || e.filename.includes('moz-extension://'))) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);
                window.addEventListener('unhandledrejection', function(e) {
                  if (e.reason && (e.reason.stack || '').includes('chrome-extension://')) {
                    e.stopImmediatePropagation();
                    e.preventDefault();
                  }
                }, true);

                // Prevent mouse wheel from accidentally changing number input values (prices, amounts, quantities)
                document.addEventListener('wheel', function(e) {
                  if (document.activeElement && document.activeElement.type === 'number') {
                    document.activeElement.blur();
                  }
                }, { passive: true });
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans text-slate-800 antialiased">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
