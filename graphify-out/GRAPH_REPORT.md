# Graph Report - CEW  (2026-11-14)

## Corpus Check
- 91 files · ~131,031 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .css 9, .ttf 3, (none) 1)

## Summary
- 786 nodes · 1968 edges · 37 communities (28 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d429b45f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- db.js
- ExpensesPage
- icons.js
- next
- AllEntriesAuditPage
- BillEntryPage
- Home
- package.json
- quotation-generator/page.js
- app_bill_entry_entry
- StaffAttendancePage
- design-md.md
- pdfExport.js
- Design System: Alpine Peak
- Generate screens
- Turn code into a Stitch project
- Manage design systems
- Design mappings and descriptors
- Extract DESIGN.md from source code
- Example: enhanced prompt
- UI and UX prompt keywords
- Upload screens and design systems
- Flow Playbook: Design System Authoring & Cloud Sync (`design`)
- Flow Playbook: Local Design Review
- Capture screens
- Angular extraction patterns
- Plain CSS, Sass, and Less extraction patterns
- Stitch
- quotation-generator/layout.js
- compilerOptions
- next.config.mjs
- vercel.json

## God Nodes (most connected - your core abstractions)
1. `ExpensesPage()` - 68 edges
2. `getSql()` - 60 edges
3. `initPg()` - 59 edges
4. `AllEntriesAuditPage()` - 53 edges
5. `BillEntryPage()` - 53 edges
6. `Home()` - 52 edges
7. `next` - 36 edges
8. `StaffAttendancePage()` - 34 edges
9. `WorkOrdersPage()` - 34 edges
10. `IconBase()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `GET()` --calls--> `getAuthUser()`  [EXTRACTED]
  app/api/auth/me/route.js → lib/serverAuth.js
- `downloadPdf()` --calls--> `generateBillPdf()`  [EXTRACTED]
  app/bill-calculator/page.js → lib/billPdf.js
- `AllEntriesAuditPage()` --calls--> `ExportLangModal()`  [EXTRACTED]
  app/all-entries/page.js → lib/ExportLangModal.js
- `AllEntriesAuditPage()` --calls--> `CheckIcon()`  [EXTRACTED]
  app/all-entries/page.js → lib/icons.js
- `AllEntriesAuditPage()` --calls--> `ClockIcon()`  [EXTRACTED]
  app/all-entries/page.js → lib/icons.js

## Import Cycles
- None detected.

## Communities (37 total, 9 thin omitted)

### Community 0 - "db.js"
Cohesion: 0.05
Nodes (112): dynamic, GET(), POST(), requireAdmin(), DELETE(), DELETE(), GET(), POST() (+104 more)

### Community 1 - "ExpensesPage"
Cohesion: 0.07
Nodes (74): executeExportPdf(), executeDownloadAllSuppliersPdf(), executeTopSheetPdf(), executeExportCustomerDetailedExcel(), executeExportExcel(), ymd(), addDays(), CAT_COLORS (+66 more)

### Community 2 - "icons.js"
Cohesion: 0.06
Nodes (61): AdminPanelPage(), handleCreateUser(), handleDeleteUser(), handleSaveEdit(), handleToggleActive(), loadCloak(), loadData(), BN_DIGITS (+53 more)

### Community 3 - "next"
Cohesion: 0.07
Nodes (53): DELETE(), dynamic, forbidden(), GET(), PATCH(), POST(), requireAdmin(), dynamic (+45 more)

### Community 4 - "AllEntriesAuditPage"
Cohesion: 0.06
Nodes (39): AllEntriesAuditPage(), addCustomStaff(), handleAddCustomStaffToExpenseModal(), handleBulkApprove(), handleBulkDelete(), handleDelete(), handleDeleteFromCustomerModal(), handleDeleteFromExpenseModal() (+31 more)

### Community 5 - "BillEntryPage"
Cohesion: 0.09
Nodes (39): MobileInvoicesList(), addDays(), BillEntryPage(), askConfirm(), handleCreateWorkOrderFromBill(), handleDelete(), handleDeleteCustomer(), handleEmptyRecycleBin() (+31 more)

### Community 6 - "Home"
Cohesion: 0.07
Nodes (30): BuildingIcon(), CheckIcon(), CrossIcon(), DownloadIcon(), EditIcon(), emptyForm(), emptyItem(), FileTextIcon() (+22 more)

### Community 7 - "package.json"
Cohesion: 0.07
Nodes (39): dynamic, fmtNum(), generateAllDealersWorkbookBuffer(), GET(), today(), dependencies, jspdf@^2.5.2, jspdf-autotable@^3.8.4 (+31 more)

### Community 8 - "quotation-generator/page.js"
Cohesion: 0.12
Nodes (26): autoNo(), getSeq(), Home(), readSeq(), REGARDS_PRESETS, today(), ymd(), fmtMoney() (+18 more)

### Community 9 - "app_bill_entry_entry"
Cohesion: 0.07
Nodes (13): metadata, metadata, metadata, metadata, ADMIN_CARD, Icon(), PAGES, RootDashboardPage() (+5 more)

### Community 10 - "StaffAttendancePage"
Cohesion: 0.14
Nodes (21): formatNum(), formatSlipAccounting(), getDaysInMonth(), parseAnyNumber(), shiftMonth(), StaffAttendancePage(), addCustomStaffToList(), applyAttendanceGridStyling() (+13 more)

### Community 11 - "design-md.md"
Cohesion: 0.15
Nodes (10): Component archetypes to inspect, Component library overrides, File discovery order, React, Next.js, and Tailwind extraction patterns, Component library overrides, File discovery order, Svelte and SvelteKit extraction patterns, Component library overrides (+2 more)

### Community 12 - "pdfExport.js"
Cohesion: 0.21
Nodes (12): CHAR_MAP, CONJUNCT_KEYS, CONJUNCTS, hasBangla(), POST_KAR, PRE_KAR, splitBanglaRuns(), unicodeToBijoy() (+4 more)

### Community 13 - "Design System: Alpine Peak"
Cohesion: 0.18
Nodes (11): 1. Visual Theme & Atmosphere, 2. Color Palette & Roles, 3. Typography Rules, 4. Component Stylings, 5. Layout Principles, 6. Design System Notes for Stitch Generation, Accent & Interactive, Design System: Alpine Peak (+3 more)

### Community 15 - "Generate screens"
Cohesion: 0.20
Nodes (10): 1. Select or create a project, 2. Check design system context, 3. Refine the prompt, 4. Generate a new screen, 5. Generate from an image or mockup, 6. Edit an existing screen, 7. Generate variants of a screen, 8. Inspect and open screens (+2 more)

### Community 16 - "Turn code into a Stitch project"
Cohesion: 0.29
Nodes (7): 1. Check local flow state, 2. Link a Stitch project, 3. Discover application routes, 4. Capture and upload each core view, 5. Extract and upload `DESIGN.md`, 6. Report the Canvas URL, Turn code into a Stitch project

### Community 17 - "Manage design systems"
Cohesion: 0.29
Nodes (7): 1. List and inspect design systems, 2. Inspect the schema and map tokens, 3. Create a design system, 4. Update a design system, 5. Apply a design system to a screen, Design systems and `DESIGN.md`, Manage design systems

### Community 18 - "Design mappings and descriptors"
Cohesion: 0.40
Nodes (5): Atmosphere and mood descriptors, Depth and elevation, Design mappings and descriptors, Geometry and shape translation, UI and UX keyword refinement

### Community 19 - "Extract DESIGN.md from source code"
Cohesion: 0.40
Nodes (5): 1. Check design flow status, 2. Detect the framework and styling stack, 3. Write DESIGN.md across six sections, 4. Upload to Stitch Canvas, Extract DESIGN.md from source code

### Community 20 - "Example: enhanced prompt"
Cohesion: 0.40
Nodes (4): CLI invocation, Enhanced prompt, Example: enhanced prompt, User input

### Community 21 - "UI and UX prompt keywords"
Cohesion: 0.40
Nodes (5): Adjective palettes, Component keywords, Interaction and behavior keywords, Shape descriptions, UI and UX prompt keywords

### Community 22 - "Upload screens and design systems"
Cohesion: 0.40
Nodes (5): 1. Check project binding, 2. Upload a screen, 3. Upload `DESIGN.md`, 4. Verify on Canvas, Upload screens and design systems

### Community 23 - "Flow Playbook: Design System Authoring & Cloud Sync (`design`)"
Cohesion: 0.50
Nodes (4): 1. Evaluate design flow state, 2. Author `DESIGN.md`, 3. Synchronize to Stitch Canvas, Flow Playbook: Design System Authoring & Cloud Sync (`design`)

### Community 24 - "Flow Playbook: Local Design Review"
Cohesion: 0.50
Nodes (4): 1. Probe local state, 2. Capture the page to review, 3. Review against `DESIGN.md`, Flow Playbook: Local Design Review

### Community 25 - "Capture screens"
Cohesion: 0.50
Nodes (4): 1. Discover routes and running server, 2. Capture a view, 3. Verify `.stitch/verify-capture.png` and handle auth gates, Capture screens

### Community 26 - "Angular extraction patterns"
Cohesion: 0.50
Nodes (3): Angular extraction patterns, Component library and theme locations, File discovery order

### Community 27 - "Plain CSS, Sass, and Less extraction patterns"
Cohesion: 0.50
Nodes (3): File discovery order, Plain CSS, Sass, and Less extraction patterns, Static sites, CMS themes, and un-tokenized CSS

### Community 28 - "Stitch"
Cohesion: 0.67
Nodes (3): Operational rules, Route by intent, Stitch

## Knowledge Gaps
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `db.js`, `ExpensesPage`, `icons.js`, `AllEntriesAuditPage`, `BillEntryPage`, `Home`, `package.json`, `quotation-generator/page.js`, `app_bill_entry_entry`?**
  _High betweenness centrality (0.301) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `BillEntryPage()` (e.g. with `handleClickOutside()` and `handleEscClose()`) actually correct?**
  _`BillEntryPage()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `db.js` be split into smaller, more focused modules?**
  _Cohesion score 0.05049368828896388 - nodes in this community are weakly interconnected._
- **Why does `AllEntriesAuditPage()` connect `AllEntriesAuditPage` to `ExpensesPage`, `icons.js`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `ExpensesPage` be split into smaller, more focused modules?**
  _Cohesion score 0.06730506155950752 - nodes in this community are weakly interconnected._
- **Why does `ExpensesPage()` connect `ExpensesPage` to `icons.js`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Should `icons.js` be split into smaller, more focused modules?**
  _Cohesion score 0.056962025316455694 - nodes in this community are weakly interconnected._