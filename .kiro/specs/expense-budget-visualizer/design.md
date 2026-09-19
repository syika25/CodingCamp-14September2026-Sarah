# Design Document — Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer (EBV) is a single-page, client-side web application for tracking daily expenses. It runs entirely in the browser with no build step, no framework, and no backend. The technology stack is:

- **HTML** — static shell in `index.html`
- **CSS** — one stylesheet at `css/style.css`
- **Vanilla JavaScript** — one module at `js/script.js`
- **Chart.js 4** — loaded via CDN `<script>` tag; used for the doughnut chart

All application state is stored in a single in-memory array (`transactions`) that is initialised from, and synchronised back to, the browser's `localStorage` on every mutation. There is no income tracking, no authentication, and no server communication.

### Goals

1. Let a user record expense transactions with a name, an amount, and a category.
2. Show running total spending and a category-breakdown doughnut chart at all times.
3. Persist all data in `localStorage` so it survives page refreshes and browser restarts.
4. Work correctly on viewports as narrow as 320 px without horizontal scrolling.

### Non-Goals

- Income tracking or balance calculation between income and expense.
- Multi-currency support (Rupiah only).
- User accounts or server-side storage.
- Undo / redo history.

---

## Architecture

The application follows a simple **Model → Event → Render** pattern with no virtual DOM and no reactive framework.

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│                                                             │
│  ┌────────────┐   events    ┌─────────────────────────────┐ │
│  │  index.html│────────────▶│        js/script.js         │ │
│  │  (DOM)     │◀────────────│                             │ │
│  └────────────┘  DOM writes │  ┌─────────┐ ┌───────────┐ │ │
│                             │  │  State  │ │ Handlers  │ │ │
│  ┌────────────┐             │  │ (array) │ │ (submit,  │ │ │
│  │ localStorage│◀───────────│  └────┬────┘ │  delete,  │ │ │
│  │ ebv_trans- │────────────▶│       │      │  clear)   │ │ │
│  │ actions    │  load/save  │  ┌────▼────┐ └───────────┘ │ │
│  └────────────┘             │  │render() │               │ │
│                             │  └─────────┘               │ │
│  ┌────────────┐             │                             │ │
│  │  Chart.js  │◀────────────│  ┌──────────────────────┐  │ │
│  │  (CDN)     │             │  │  Chart singleton      │  │ │
│  └────────────┘             │  └──────────────────────┘  │ │
│                             └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| Expense-only (no `type` field) | Requirements spec is expense-only; removing `type` eliminates the stale `typeSelect` / `totalIncomeEl` bugs in the prototype code. |
| Single `render()` entry point | Keeps all DOM synchronisation in one place; impossible to update the list without also updating the total and chart. |
| Chart singleton pattern | Avoids destroying/recreating the `<canvas>` on every mutation, which causes flicker and loses animation state. |
| `window.confirm()` for Clear All | Meets the requirements' confirmation prompt without adding a custom modal component. |
| `escapeHTML()` utility | Prevents XSS from user-supplied item names inserted via `innerHTML`. |
| Try/catch around `localStorage` | Handles malformed JSON on load and quota errors on write gracefully. |

---

## Components and Interfaces

The single JavaScript file is logically divided into the sections below. There are no ES modules or classes — everything lives in an IIFE-like `'use strict'` top-level scope.

### 1. DOM Reference Block

Reads all required element references once at startup:

```
form, itemNameInput, amountInput, categoryHidden,
categoryTabs, txList, emptyState, clearAllBtn,
totalBalanceEl, chartEmpty, nameError, amountError,
globalErrorBanner
```

`globalErrorBanner` is the `#globalError` `<div role="alert">` used to surface `localStorage` quota errors.

### 2. Constants

```js
STORAGE_KEY = 'ebv_transactions'    // localStorage key
CATEGORIES  = ['Food','Transport','Fun']
CAT_EMOJI   = { Food:'🍔', Transport:'🚗', Fun:'🎉' }
CAT_COLORS  = { Food:'#f97316', Transport:'#3b82f6', Fun:'#a855f7' }
```

### 3. State

```js
let transactions = loadTransactions();  // Transaction[]
let pieChart     = null;                // Chart | null
```

`transactions` is the single source of truth. Every handler mutates this array, then calls `saveTransactions()` and `render()`.

### 4. Initialisation

```js
render();  // called once after state is loaded
```

All event listeners are attached at module-parse time (outside of any init function) using `addEventListener`.

### 5. Event Listeners

| Listener target | Event | Action |
|---|---|---|
| `categoryTabs` | `click` | Activate clicked `.cat-btn`, sync `categoryHidden.value` |
| `form` | `submit` | `validateForm()` → build Transaction → `unshift` → save → render → reset |
| `itemNameInput` | `input` | Clear name validation error if present |
| `amountInput` | `input` | Clear amount validation error if present |
| `txList` | `click` | Delegate to `.btn-delete` → remove by `id` → save → render |
| `clearAllBtn` | `click` | Guard empty list → `confirm()` → clear → save → render |

### 6. Validation Module (`validateForm`)

Pure function; returns `boolean`. Sets/clears `.invalid` class on inputs and `.visible` class on error `<span>` elements.

### 7. Render Pipeline

```
render()
  ├─ renderSummary()   — updates #totalBalance
  ├─ renderList()      — rebuilds transaction <li> nodes
  └─ renderChart()     — creates or updates Chart.js instance
```

### 8. Local Storage Helpers

- `loadTransactions()` — returns `Transaction[]`, catches parse errors
- `saveTransactions()` — catches quota errors, shows banner

### 9. Utilities

- `formatRp(amount)` — formats as "Rp X" with `id-ID` locale, no fraction
- `escapeHTML(str)` — replaces `& < > " '` with HTML entities

---

## Data Models

### Transaction Object

```ts
interface Transaction {
  id:       string;   // Date.now().toString() — unique per session
  name:     string;   // user-entered item name, 1–100 characters, trimmed
  amount:   number;   // positive float, > 0, ≤ 999_999_999.99
  category: 'Food' | 'Transport' | 'Fun';
  date:     string;   // toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })
                      // e.g. "14 Sep 2026"
}
```

There is **no `type` field**. The application is expense-only; the prototype `type: 'income'|'expense'` field is removed.

### Local Storage Schema

```
Key:   "ebv_transactions"
Value: JSON.stringify(Transaction[])
```

Example stored value:

```json
[
  {
    "id": "1726286400000",
    "name": "Nasi goreng",
    "amount": 25000,
    "category": "Food",
    "date": "14 Sep 2026"
  },
  {
    "id": "1726282800000",
    "name": "Grab to office",
    "amount": 18500,
    "category": "Transport",
    "date": "14 Sep 2026"
  }
]
```

The array is ordered most-recent-first (newest `id` at index 0). New transactions are prepended with `Array.unshift()`.

### State Shape (in-memory)

```
transactions: Transaction[]   // ordered newest-first
pieChart:     Chart | null    // Chart.js singleton; null before first render
```

### Category Totals (derived, not stored)

Computed inside `renderChart()` on every render:

```js
const totals = {};  // { [category: string]: number }
transactions.forEach(t => {
  totals[t.category] = (totals[t.category] || 0) + t.amount;
});
```

Only categories with at least one transaction appear in the chart.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid transaction addition grows the list by one

*For any* transaction list and any valid transaction (non-empty trimmed name, positive amount, valid category), adding that transaction to the list SHALL result in a list whose length is exactly one greater than before.

**Validates: Requirements 3.1, 3.2**

### Property 2: Whitespace-only names are rejected

*For any* string composed entirely of whitespace characters (spaces, tabs, newlines), submitting it as an item name SHALL be rejected by the validator; the transaction list SHALL remain unchanged.

**Validates: Requirements 2.1, 3.6**

### Property 3: Non-positive amounts are rejected

*For any* amount value that is zero, negative, or non-numeric (NaN), submitting it SHALL be rejected by the validator; the transaction list SHALL remain unchanged.

**Validates: Requirements 2.2, 2.3, 3.6**

### Property 4: Delete removes exactly the target transaction

*For any* transaction list containing at least one transaction, deleting the transaction with a given `id` SHALL produce a list that contains every other transaction unchanged and does not contain any transaction with that `id`.

**Validates: Requirements 5.2, 5.3, 5.5**

### Property 5: Total spending equals sum of all transaction amounts

*For any* transaction array, the computed Total Spending figure SHALL equal the arithmetic sum of the `amount` fields of every transaction in that array.

**Validates: Requirements 7.2, 8.1, 8.2**

### Property 6: Local Storage round-trip preserves transactions

*For any* non-empty transaction array, serialising it to JSON and parsing the result SHALL produce an array that is deeply equal to the original (same length, same field values for every element).

**Validates: Requirements 11.2, 11.3, 12.1**

### Property 7: Chart category totals are consistent with transaction array

*For any* transaction array, the per-category totals used by the chart SHALL equal the sum of `amount` for every transaction whose `category` matches, and categories with zero transactions SHALL be absent from the chart data.

**Validates: Requirements 9.1, 9.6, 10.4**

### Property 8: escapeHTML produces safe output for all user input strings

*For any* string (including strings containing `<`, `>`, `&`, `"`, `'`), the output of `escapeHTML()` SHALL not contain any unescaped HTML special characters, and applying `escapeHTML()` twice SHALL produce the same result as applying it once (idempotent under entity-escaped input).

**Validates: Requirements 4.6**

---

## Error Handling

### Form Validation Errors

- Triggered on `form` `submit` event.
- Each field is validated independently; all errors shown simultaneously.
- Error state: add `.invalid` to the `<input>`, add `.visible` to the sibling `.error-msg` `<span>`.
- Recovery: on every `input` event on a field, clear that field's error immediately (Requirement 2.4).
- The form submit is blocked (`return` before transaction creation) if any field is invalid.

### Local Storage — Load Failure

```js
function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];   // malformed JSON → silent recovery, empty array
  }
}
```

Matches Requirement 11.5 and 12.2.

### Local Storage — Save Failure (Quota Exceeded)

```js
function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (err) {
    showGlobalError('Storage quota exceeded. Your last change was not saved.');
  }
}
```

`showGlobalError(msg)` sets `globalErrorBanner.textContent = msg` and removes the `hidden` attribute. The in-memory `transactions` array is **not** rolled back — the user keeps seeing their change in the UI even though it was not persisted (Requirement 11.6).

### Chart.js CDN Failure

On `DOMContentLoaded` (or at the top of `script.js`), check `typeof Chart === 'undefined'`. If true, display an error message in `#chartEmpty` (e.g., "Chart unavailable — CDN failed to load.") and skip all `renderChart()` calls. Matches Requirement 14.6.

### Double-Delete Guard

Deleting a transaction that no longer exists in the array is a no-op because `Array.filter()` on an absent `id` returns the unchanged array. The `saveTransactions()` + `render()` calls still fire but produce no visible change. Matches Requirement 5.5.

---

## Testing Strategy

### Dual Testing Approach

Tests are split into two complementary layers:

1. **Unit / example-based tests** — verify specific scenarios, integration between components, and edge cases.
2. **Property-based tests** — verify universal invariants across randomised inputs.

### Property-Based Testing Library

**[fast-check](https://fast-check.dev/)** (MIT licence, actively maintained) is the recommended PBT library for JavaScript. It integrates with any test runner (Jest, Vitest, Node test runner).

Each property test must run a **minimum of 100 iterations** (`numRuns: 100` or higher in `fc.assert`).

Tag format for each property test comment:

```
// Feature: expense-budget-visualizer, Property N: <property_text>
```

### Property Test Map

| Design Property | Test description | Arbitraries needed |
|---|---|---|
| Property 1 | Adding a valid transaction grows the list by 1 | `fc.string()` (non-whitespace-only), `fc.float({min:0.01, max:999999999.99})`, `fc.constantFrom(...CATEGORIES)` |
| Property 2 | Whitespace-only names are rejected | `fc.stringOf(fc.char().filter(c => /\s/.test(c)))` |
| Property 3 | Non-positive amounts are rejected | `fc.oneof(fc.constant(0), fc.float({max:0}), fc.constant(NaN))` |
| Property 4 | Delete removes exactly the target | `fc.array(transactionArbitrary, {minLength:1})` + random index pick |
| Property 5 | Total = sum of amounts | `fc.array(transactionArbitrary)` |
| Property 6 | Local Storage round-trip | `fc.array(transactionArbitrary)` |
| Property 7 | Chart totals match array | `fc.array(transactionArbitrary)` |
| Property 8 | escapeHTML safety + idempotence | `fc.string()` (full unicode range) |

### Unit Test Map

| Requirement | Test scenario | Type |
|---|---|---|
| Req 1.3 | Page load pre-selects Food tab | Example |
| Req 1.4 | Clicking Transport activates it and deactivates others | Example |
| Req 3.4 | After add, Item Name and Amount fields are empty | Example |
| Req 3.5 | After add, Category tab resets to Food | Example |
| Req 4.5 | Empty list shows placeholder text | Example |
| Req 6.2 | Clear All shows confirm dialog | Example (mock `window.confirm`) |
| Req 6.5 | Cancel on confirm leaves list unchanged | Example |
| Req 6.6 | Clear All button is disabled when list is empty | Example |
| Req 7.3 | formatRp(150000) === "Rp 150.000" | Example |
| Req 7.4 | formatRp(0) === "Rp 0" | Example |
| Req 9.4 | Chart tooltip shows amount + percentage | Example |
| Req 11.5 | Malformed localStorage JSON → empty array, no throw | Example |
| Req 14.6 | Missing Chart.js CDN → error message shown | Example (mock `Chart` undefined) |

### Integration Checkpoints (Manual / E2E)

- Add three transactions across all three categories; verify chart has three coloured segments with correct proportions.
- Delete the only Food transaction; verify the Food segment disappears from the chart.
- Refresh the page; verify all transactions are restored and Total Spending matches.
- Resize to 320 px viewport; verify no horizontal scroll, all buttons reachable.
