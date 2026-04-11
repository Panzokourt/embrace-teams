

# Olseny — Πλάνο Υλοποίησης Ελλειπόντων Features

Βάσει του product context file, αυτά είναι τα features που **δεν υπάρχουν** στην εφαρμογή. Οργανωμένα σε 6 φάσεις κατά προτεραιότητα.

---

## Φάση 0 — Technical Debt (Προαπαιτούμενα)

| Εργασία | Λεπτομέρεια |
|---------|------------|
| QueryClient config | `staleTime: 5 * 60 * 1000`, `retry: 1` στο `new QueryClient()` — σήμερα δεν έχει config |
| Realtime channel cleanup | Αντικατάσταση `Date.now()` suffix με σταθερά keys + proper cleanup σε useEffect returns |
| Legacy user_roles cleanup | Αφαίρεση deprecated table references αν δεν χρησιμοποιείται πλέον |

---

## Φάση 1 — Financial Visibility Παντού

Το context λέει: *"Financial data εμφανίζεται παντού, όχι μόνο στο Finance section"*. Σήμερα τα financials είναι μόνο στο ProjectDetail.

| Εργασία | Αρχεία |
|---------|--------|
| **Mini P&L badge σε Project cards** — δείχνει budget, invoiced, profit margin | `ProjectsTableView.tsx`, νέο `ProjectFinancialBadge.tsx` |
| **Dashboard Financial widget** — top-level P&L (revenue, expenses, profit) | Νέο `DashboardFinancials.tsx` |
| **Client detail — P&L per client** — aggregate invoices/expenses | `ClientDetail.tsx`, νέο `ClientPLSummary.tsx` |

---

## Φάση 2 — AI-Fill σε Forms

Το context λέει: *"Κάθε form πρέπει να έχει AI alternative"*. Σήμερα κανένα form δεν έχει AI fill (εκτός email-to-project).

| Εργασία | Αρχεία |
|---------|--------|
| **AI fill button component** — reusable, καλεί secretary-agent με context | Νέο `AIFillButton.tsx` |
| **Project creation** — "Περίγραψε το project" → AI γεμίζει name, description, budget, tasks | `ProjectCreation` forms |
| **Task creation** — "Describe what needs to be done" → AI γεμίζει title, description, priority | Task forms |
| **Invoice creation** — AI προτείνει amount βάσει project budget/hours | Invoice forms |
| **Client creation** — Paste website URL → AI γεμίζει name, industry, contact info | Client forms |

---

## Φάση 3 — Smart Time Tracking

Το context λέει: *"AI παρακολουθεί active tasks → προτείνει time entry"*. Σήμερα δεν υπάρχει.

| Εργασία | Αρχεία |
|---------|--------|
| **Edge function: `smart-time-suggest`** — αναλύει assigned tasks, recent activity, patterns → προτείνει entries | Νέα edge function |
| **Daily suggestion banner** — εμφανίζεται στο MyWork/Dashboard στο τέλος ημέρας | Νέο `TimeSuggestionBanner.tsx` |
| **Weekly time summary** — AI summary εβδομαδιαίων ωρών per project | Νέο `WeeklyTimeSummary.tsx` |

---

## Φάση 4 — ComingSoon Pages → Real Features

17 σελίδες είναι placeholder. Κατά προτεραιότητα:

### Υψηλή (core business value)
| Σελίδα | Τι χτίζεται |
|--------|-------------|
| **Campaigns** | Campaign management — linked to clients/projects, timeline, deliverables tracker |
| **Capacity** | Team workload heatmap — hours assigned vs available per person/week |
| **Backlog** | Cross-project task backlog — unassigned/unscheduled tasks, drag to project |
| **Resource Planning** | Gantt-style view — team allocation across projects per week |

### Μεσαία (intelligence layer)
| Σελίδα | Τι χτίζεται |
|--------|-------------|
| **Cross-client Insights** | Comparative dashboard — revenue, profitability, hours per client |
| **Benchmarks** | KPI tracking vs targets — utilization rate, avg project margin, delivery time |
| **Forecasting** | Revenue/expense projection — based on pipeline + recurring projects |
| **Performance** | Team/individual metrics — tasks completed, hours logged, utilization |
| **AI Insights** | Redirect to Brain page (δεν χρειάζεται standalone) |

### Χαμηλή (settings/admin)
| Σελίδα | Τι χτίζεται |
|--------|-------------|
| **Roles & Permissions** | Custom role editor — granular permissions per module |
| **Billing** | Subscription management UI |
| **Branding** | Logo, colors, email template customization |
| **API Keys** | API key generation/management |
| **Webhooks** | Webhook configuration UI |
| **Feature Flags** | Toggle features per company |
| **Pricing** | Redirect to Services page |
| **MediaPlanningPage** | Redirect to existing MediaPlanning |

---

## Φάση 5 — Client Portal

Δεν υπάρχει καθόλου. Απαιτεί:

| Εργασία | Λεπτομέρεια |
|---------|------------|
| **Auth flow για clients** — magic link ή password, separate role | Migration + auth config |
| **Portal layout** — minimal, read-only | Νέο `ClientPortalLayout.tsx` |
| **Project status view** — progress, milestones, deliverables | Νέο `PortalProjectView.tsx` |
| **Invoice view** — outstanding/paid invoices | Νέο `PortalInvoices.tsx` |
| **File sharing** — client-visible files only | Νέο `PortalFiles.tsx` |
| **RLS policies** — clients βλέπουν μόνο τα δικά τους data | Migration |

---

## Φάση 6 — Integrations

Αναφέρονται στο context αλλά δεν υπάρχουν:

| Integration | Λεπτομέρεια |
|-------------|------------|
| **Google Calendar sync** | 2-way sync events ↔ project milestones/deadlines |
| **Slack → Tasks** | Incoming webhook, AI parses message → task |
| **Stripe/Xero reconciliation** | Invoice status auto-update from payment provider |

---

## Σύνοψη εκτίμησης

| Φάση | Εκτιμώμενος όγκος | Προτεραιότητα |
|------|-------------------|---------------|
| 0 — Tech Debt | 3 αρχεία | Κρίσιμη |
| 1 — Financial Visibility | ~5 components | Υψηλή |
| 2 — AI-Fill Forms | ~6 components + 1 reusable | Υψηλή |
| 3 — Smart Time | 1 edge function + 2 components | Μεσαία |
| 4 — ComingSoon → Real | ~17 pages (4 high priority) | Μεσαία-Υψηλή |
| 5 — Client Portal | Layout + 4 views + auth + RLS | Μεσαία |
| 6 — Integrations | 3 external APIs | Χαμηλή |

Πες μου αν θέλεις να ξεκινήσουμε από κάποια συγκεκριμένη φάση ή αν θέλεις αλλαγές στο πλάνο.

