---
name: 360-audit
description: Deeply analyzes and audits any web/software project from 7 specialized perspectives (Staff, Business Owner, Senior Developer, Cyber Security Expert, Debugger, Accountant Expert, UI/UX Expert). Triggers on 'audit', '/audit', 'judge project', 'deep review', or multi-perspective review requests.
---

# 360° Multi-Perspective Project Audit Skill

When invoked (via `/audit`, "audit project", "judge project", or "review codebase"), perform an exhaustive, page-by-page, and layer-by-layer evaluation across the following **7 specialized perspectives**:

---

## The 7 Specialized Perspectives

### 1. 👷 Staff Perspective (Field / Counter Operator)
- **Speed & Workflow**: How fast can a counter operator issue an invoice or log an entry during peak rush hours?
- **Ergonomics**: Keyboard navigation, auto-focus, tab indexing, barcode/mobile quick search.
- **Error Forgiveness**: What happens if the operator makes a typo or enters an invalid character?
- **Printing**: Speed and readiness of receipts, work order slips, and thermal/A4 invoices.

### 2. 💼 Business Owner Perspective (Managing Director / Investor)
- **Revenue Protection**: Are there leaks, untracked cash collections, or unaccounted discounts?
- **Anti-Theft & Fraud Prevention**: Can staff secretly edit or delete bills without an audit log?
- **Executive Visibility**: Live summary of total sales, total cash in hand, total bank deposits, and outstanding customer dues.
- **Control & Emergency Privacy**: Can the owner access the system from a mobile phone and cloak/lock sensitive business records if needed?

### 3. 💻 Senior Developer Perspective (Software Architect)
- **Codebase Health**: Monolithic files vs modular components, code duplication, and maintainability.
- **State Management**: Performance bottlenecks, redundant re-renders, and memory leaks.
- **Backend & Database**: Connection pooling, query efficiency, indexes, and schema migration strategies.
- **API & Type Safety**: Endpoint conventions, request validation, error handling, and payload size.

### 4. 🛡️ Cyber Security Expert Perspective (InfoSec / Penetration Tester)
- **Authentication & Sessions**: Token storage, cookie flags (`httpOnly`, `secure`, `sameSite`), session expiration, and tab-close invalidation.
- **Authorization & Access Control**: Edge middleware vs backend API route protections; role escalation prevention.
- **Injection & Tampering**: SQL injection, XSS, CSRF, and input sanitization.
- **Data Privacy & Cloaking**: Server-side masking vs client-side hiding; secure leak prevention.

### 5. 🔍 Debugger Perspective (QA & Edge-Case Specialist)
- **Boundary & Corner Cases**: Empty states, negative numbers, extremely large values, zero division, missing fields.
- **Floating Point Math**: JavaScript precision anomalies (e.g. `0.1 + 0.2`) in financial calculation engines.
- **Async & Race Conditions**: Rapid keystroke debouncing, multiple submit button clicks, network timeouts, and offline handling.

### 6. 📊 Accountant Expert Perspective (Financial Controller / Chartered Accountant)
- **Accounting Principles**: Debit/credit integrity, double-entry accuracy, and ledger balance continuity.
- **Cash Flow Reconciliation**: Formula accuracy for `Cash in Hand = Opening Cash + Cash Inflows - Cash Outflows - Bank Deposits`.
- **Opening Balances**: Proper isolation of opening balances so they don't corrupt monthly/daily revenue KPIs.
- **Reporting & Compliance**: Clean Excel/PDF exports with proper headers, date formats, and mathematical totals.

### 7. 🎨 UI/UX Expert Perspective (Product Designer)
- **Visual Hierarchy & Theme**: Consistency of colors, borders, typography, card elevations, and spacing.
- **Perceived Speed**: Elimination of zero-state flashes (FOZS), skeleton shimmer loaders, and smooth page switches.
- **Feedback & Usability**: Clear success toasts, non-intrusive warning banners, and confirmation modals for destructive actions.
- **Mobile Responsiveness**: Layout adaptations for phone screens, touch target sizes (minimum 44x44px), and sticky action bars.

---

## Audit Output Protocol
1. **Examine All Pages & APIs**: Systematically read and analyze each page, component, middleware, and route file.
2. **Scorecard**: Provide a rating (out of 10) for each of the 7 perspectives.
3. **Page-by-Page Breakdown**: Detail concrete findings, strengths, vulnerabilities, and exact line references.
4. **Actionable Roadmap**: Prioritized list of high, medium, and low-priority fixes.
5. **Artifact Generation**: Always compile the detailed report into a standalone markdown artifact for the user.
