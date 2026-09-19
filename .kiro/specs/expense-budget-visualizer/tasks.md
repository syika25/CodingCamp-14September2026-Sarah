# Implementation Plan: Expense & Budget Visualizer

## Overview

Fix and complete the partially-implemented single-page expense tracker. The existing files (`index.html`, `css/style.css`, `js/script.js`) have a stale income-tracking scaffold that must be removed. Tasks are ordered by dependency: utilities → state/storage → DOM rendering → event handlers → tests.

No new files are added beyond the test file. All application code stays in `index.html`, `css/style.css`, and `js/script.js` as required by the spec.

---

## Tasks

- [x] 1. Audit and fix `index.html` DOM structure
  - Verify the following IDs exist exactly once: `globalError`, `totalBalance`, `transactionForm`, `itemName`, `amount`, `category`, `categoryTabs`, `transactionList`, `emptyState`, `clearAllBtn`, `pieChart`, `chartEmpty`, `nameError`, `amountError`.
  - Remove any income-related elements (`#totalIncome`, `#totalExpense`, type select, etc.) that are not in the spec.
  - Ensure `<div id="globalError" role="alert" aria-live="assertive" hidden></div>` is present at the top of `.app-wrapper`.
  - Ensure the balance card contains only the "Total Spending" label and `<span id="totalBalance">Rp 0</span>`.
  - Ensure the Chart.js CDN `<script>` tag is present in `<head>` and `js/script.js` is loaded at the end of `<body>`.
  - Add `disabled` attribute to `#clearAllBtn` in the initial HTML (empty list state).
  - _Requirements: 1.1, 1.2, 6.1, 7.1, 14.1, 14.2, 14.3_

- [x] 2. Implement utility functions in `js/script.js`
  - [x] 2.1 Implement `escapeHTML(str)`
    - Replace `& < > " '` with their HTML entity equivalents using a single-pass replace.
    - _Requirements: 4.6_
  - [x] 2.2 Implement `formatRp(amount)`
    - Use `amount.toLocaleString('id-ID')` with no fraction digits; prefix result with `"Rp "`.
    - Must return `"Rp 0"` when amount is 0.
    - _Requirements: 7.3, 7.4_

- [x] 3. Implement Local Storage helpers in `js/script.js`
  - [x] 3.1 Implement `loadTransactions()`
    - Read `localStorage.getItem('ebv_transactions')`, parse JSON; return `[]` on missing key or parse error (try/catch, silent recovery).
    - _Requirements: 11.1, 11.5, 12.1, 12.2_
  - [x] 3.2 Implement `saveTransactions()`
    - Wrap `localStorage.setItem('ebv_transactions', JSON.stringify(transactions))` in try/catch.
    - On `QuotaExceededError` (or any error), call `showGlobalError()` to display the `#globalError` banner; do **not** roll back the in-memory array.
    - Implement `showGlobalError(msg)` to set `textContent` and remove the `hidden` attribute from `#globalError`.
    - _Requirements: 11.2, 11.3, 11.4, 11.6_
  - [ ]* 3.3 Write unit test: malformed localStorage JSON returns empty array without throwing
    - Mock `localStorage.getItem` to return `"not-json"`, call `loadTransactions()`, assert result is `[]` and no error is thrown.
    - _Requirements: 11.5, 12.2_

- [x] 4. Fix state initialisation and DOM references in `js/script.js`
  - Remove all references to `typeSelect`, `totalIncomeEl`, `totalExpenseEl` from the DOM ref block and from every function that uses them.
  - Remove the `type` field from the Transaction object created in the form submit handler.
  - Update the `renderChart()` aggregation to include all transactions (no `.filter(t => t.type === 'expense')` guard — every transaction is an expense).
  - Update the `renderSummary()` function to compute only the total of all transaction amounts (no income/balance split).
  - _Requirements: 3.1, 7.2, 8.1, 8.2, 14.2_

- [x] 5. Implement `renderSummary()` in `js/script.js`
  - Sum `amount` across all entries in `transactions`; format with `formatRp()`; set `totalBalanceEl.textContent`.
  - When `transactions` is empty, display `"Rp 0"`.
  - _Requirements: 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 6. Implement `renderList()` in `js/script.js`
  - [x] 6.1 Implement empty-state handling
    - Remove all `.transaction-item` children from `#transactionList` on each call.
    - Show `#emptyState` when `transactions.length === 0`; hide it otherwise.
    - Disable `#clearAllBtn` when list is empty; enable it when list is non-empty.
    - _Requirements: 4.5, 6.6_
  - [x] 6.2 Implement transaction item rendering
    - For each transaction, create a `<li class="transaction-item">` containing: category icon (`tx-icon` with `data-cat`), `.tx-info` block (`.tx-name` via `escapeHTML()`, `.tx-meta` with `category · date`), `.tx-amount` with `"−"` prefix and `formatRp(amount)`, and a `.btn-delete` button with `data-id`.
    - Append items in array order (array is already newest-first per spec).
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6_

- [~] 7. Implement `renderChart()` in `js/script.js`
  - [x] 7.1 Implement Chart.js CDN failure guard
    - At the top of `js/script.js` (before `render()` is called), check `typeof Chart === 'undefined'`. If true, set `chartEmpty.textContent` to `"Chart unavailable — CDN failed to load."`, remove the `hidden` / add visible class on `chartEmpty`, and define `renderChart` as a no-op.
    - _Requirements: 14.6_
  - [-] 7.2 Implement chart singleton create/update logic
    - Aggregate `amount` by `category` from `transactions` (all entries, no type filter).
    - If `transactions` is empty (no data), show `#chartEmpty` overlay; otherwise hide it.
    - On first call (`pieChart === null`): create the Chart.js doughnut instance, assign to `pieChart`, configure legend at `position: 'bottom'` and tooltip callback to show `formatRp(val)` and percentage to 1 decimal place.
    - On subsequent calls: update `pieChart.data.labels`, `pieChart.data.datasets[0].data`, `pieChart.data.datasets[0].backgroundColor`, then call `pieChart.update()`. Do **not** destroy and recreate the instance.
    - Exclude categories with zero transactions from chart data.
    - Use `CAT_COLORS` for segment colours: `Food → #f97316`, `Transport → #3b82f6`, `Fun → #a855f7`.
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.1, 10.2, 10.3, 10.4, 10.5_

- [~] 8. Implement form validation in `js/script.js`
  - [~] 8.1 Implement `validateForm()`
    - Trim `itemNameInput.value`; if empty or whitespace-only, call `setError(itemNameInput, nameError, true)` and mark `valid = false`.
    - Parse `amountInput.value` as float; if missing, NaN, zero, or negative, call `setError(amountInput, amountError, true)` and mark `valid = false`.
    - Clear errors on valid fields via `setError(..., false)`.
    - Return `valid` boolean.
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 3.6_
  - [~] 8.2 Implement `setError(input, msgEl, show)`
    - When `show` is true: add `.invalid` to input, add `.visible` to error `<span>`.
    - When `show` is false: remove `.invalid` and `.visible`.
    - _Requirements: 2.5_
  - [ ] 8.3 Wire up `input` event listeners on `#itemName` and `#amount`
    - On `input` event for each field, clear that field's error by calling `setError(..., false)`.
    - _Requirements: 2.4_

- [~] 9. Implement form submit handler and `resetCategoryTab()` in `js/script.js`
  - In the `submit` event listener: call `validateForm()`; if invalid, return early.
  - Build a Transaction object: `{ id: Date.now().toString(), name: trimmed, amount: parseFloat, category: categoryHidden.value, date: toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'}) }` — no `type` field.
  - `unshift` the new transaction, call `saveTransactions()`, `render()`, then reset the form and call `resetCategoryTab()`.
  - Implement `resetCategoryTab()`: remove `.active` from all `.cat-btn`, add `.active` to the `[data-cat="Food"]` button, set `categoryHidden.value = 'Food'`.
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 1.3, 1.4_

- [ ] 10. Implement delete and clear-all handlers in `js/script.js`
  - [ ] 10.1 Implement delegated delete handler on `#transactionList`
    - On `click`, find closest `.btn-delete`; if found, filter `transactions` by `t.id !== btn.dataset.id`, save, render.
    - If the id is not found, `Array.filter` returns the unchanged array — no special guard needed.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - [ ] 10.2 Implement `#clearAllBtn` click handler
    - If `transactions.length === 0`, return early (button should already be disabled, but guard defensively).
    - Call `window.confirm('Delete all transactions? This cannot be undone.')`. If false, return.
    - Set `transactions = []`, call `saveTransactions()`, `render()`.
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 11. Checkpoint — verify the app runs correctly end-to-end
  - Ensure all tests pass, ask the user if questions arise.
  - Open `index.html` in a browser and manually confirm: add transactions across all three categories, delete one, clear all, refresh the page to verify persistence.

- [ ] 12. Set up test infrastructure
  - Create `tests/` directory in the project root.
  - Create `package.json` with `"type": "module"`, add `vitest` and `fast-check` as dev dependencies.
  - Create `tests/utils.test.js` for utility function tests and `tests/script.test.js` for integration/unit tests.
  - Extract the pure functions (`escapeHTML`, `formatRp`, `validateForm`, `loadTransactions`, `saveTransactions`, and the core logic functions) so they can be imported in the test files, or use a shared module pattern.
  - _Requirements: 14.1, 14.2_

- [ ] 13. Write property-based tests
  - [ ]* 13.1 Write property test for Property 1: valid transaction addition grows the list by one
    - Use `fc.string({minLength:1}).filter(s => s.trim().length > 0)`, `fc.float({min:0.01, max:999999999.99})`, `fc.constantFrom('Food','Transport','Fun')`.
    - Assert `transactions.length` is exactly `before + 1` after adding.
    - **Property 1: Valid transaction addition grows the list by one**
    - **Validates: Requirements 3.1, 3.2**
  - [ ]* 13.2 Write property test for Property 2: whitespace-only names are rejected
    - Use `fc.stringOf(fc.char().filter(c => /\s/.test(c)), {minLength:1})`.
    - Assert `validateForm()` returns false and transaction array is unchanged.
    - **Property 2: Whitespace-only names are rejected**
    - **Validates: Requirements 2.1, 3.6**
  - [ ]* 13.3 Write property test for Property 3: non-positive amounts are rejected
    - Use `fc.oneof(fc.constant(0), fc.float({max:-0.001}), fc.constant(NaN))`.
    - Assert `validateForm()` returns false and transaction array is unchanged.
    - **Property 3: Non-positive amounts are rejected**
    - **Validates: Requirements 2.2, 2.3, 3.6**
  - [ ]* 13.4 Write property test for Property 4: delete removes exactly the target transaction
    - Use `fc.array(transactionArbitrary, {minLength:1})` and pick a random index.
    - Assert result array length is `before - 1`, does not contain the deleted id, and all other transactions are unchanged.
    - **Property 4: Delete removes exactly the target transaction**
    - **Validates: Requirements 5.2, 5.3, 5.5**
  - [ ]* 13.5 Write property test for Property 5: total spending equals sum of all transaction amounts
    - Use `fc.array(transactionArbitrary)`.
    - Assert computed total from `renderSummary` logic equals `transactions.reduce((s,t) => s + t.amount, 0)`.
    - **Property 5: Total spending equals sum of all transaction amounts**
    - **Validates: Requirements 7.2, 8.1, 8.2**
  - [ ]* 13.6 Write property test for Property 6: localStorage round-trip preserves transactions
    - Use `fc.array(transactionArbitrary)`.
    - Assert `JSON.parse(JSON.stringify(arr))` deeply equals original array.
    - **Property 6: Local Storage round-trip preserves transactions**
    - **Validates: Requirements 11.2, 11.3, 12.1**
  - [ ]* 13.7 Write property test for Property 7: chart category totals are consistent with transaction array
    - Use `fc.array(transactionArbitrary)`.
    - Assert per-category totals computed by chart logic equal manual reduce per category; assert categories with 0 transactions are absent from chart labels.
    - **Property 7: Chart category totals are consistent with transaction array**
    - **Validates: Requirements 9.1, 9.6, 10.4**
  - [ ]* 13.8 Write property test for Property 8: escapeHTML produces safe output for all input strings
    - Use `fc.string()` (full unicode range).
    - Assert output contains no unescaped `& < > " '`; assert `escapeHTML(escapeHTML(s)) === escapeHTML(s)` (idempotent under entity-escaped input).
    - **Property 8: escapeHTML produces safe output for all user input strings**
    - **Validates: Requirements 4.6**

- [ ] 14. Write unit / example-based tests
  - [ ]* 14.1 Test: page load pre-selects Food tab
    - Assert the `[data-cat="Food"]` button has class `active` and `categoryHidden.value === 'Food'` on init.
    - _Requirements: 1.3_
  - [ ]* 14.2 Test: clicking Transport activates it and deactivates Food and Fun
    - Simulate a click on the Transport button; assert Transport has `active`, Food and Fun do not.
    - _Requirements: 1.4_
  - [ ]* 14.3 Test: after successful add, Item Name and Amount fields are empty
    - Submit a valid form; assert `itemNameInput.value === ''` and `amountInput.value === ''`.
    - _Requirements: 3.4_
  - [ ]* 14.4 Test: after successful add, Category tab resets to Food
    - Submit a valid form with Transport selected; assert Food tab is active afterwards.
    - _Requirements: 3.5_
  - [ ]* 14.5 Test: empty list shows placeholder text
    - Render with empty transactions array; assert `#emptyState` is visible.
    - _Requirements: 4.5_
  - [ ]* 14.6 Test: Clear All shows confirm dialog
    - Mock `window.confirm`; click `#clearAllBtn` with one transaction present; assert `window.confirm` was called.
    - _Requirements: 6.2_
  - [ ]* 14.7 Test: cancelling confirm leaves list unchanged
    - Mock `window.confirm` to return false; click `#clearAllBtn`; assert transactions array is unchanged.
    - _Requirements: 6.5_
  - [ ]* 14.8 Test: Clear All button is disabled when list is empty
    - Render with empty transactions; assert `clearAllBtn.disabled === true`.
    - _Requirements: 6.6_
  - [ ]* 14.9 Test: formatRp(150000) returns "Rp 150.000"
    - Assert `formatRp(150000) === 'Rp 150.000'`.
    - _Requirements: 7.3_
  - [ ]* 14.10 Test: formatRp(0) returns "Rp 0"
    - Assert `formatRp(0) === 'Rp 0'`.
    - _Requirements: 7.4_
  - [ ]* 14.11 Test: chart tooltip callback returns formatted amount and percentage
    - Construct a mock Chart.js context with known values; invoke the tooltip label callback; assert output includes `formatRp` result and a percentage string ending in `%`.
    - _Requirements: 9.4_
  - [ ]* 14.12 Test: malformed localStorage JSON returns empty array and does not throw
    - Mock `localStorage.getItem` to return `"{"bad json"`; call `loadTransactions()`; assert result is `[]`.
    - _Requirements: 11.5_
  - [ ]* 14.13 Test: missing Chart.js CDN shows error message
    - Temporarily set `globalThis.Chart = undefined`; call the CDN guard code; assert `#chartEmpty` text contains "unavailable".
    - _Requirements: 14.6_

- [ ] 15. Final checkpoint — all tests pass
  - Run `npx vitest --run` and confirm all tests in `tests/` pass.
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Each task references specific requirements and acceptance criteria for traceability.
- The test infrastructure (task 12) is a prerequisite for all test sub-tasks in tasks 13–14.
- Property tests must run a minimum of 100 iterations (`numRuns: 100`) per design spec.
- The `transactionArbitrary` used in property tests should be defined once in a shared test helper:
  ```js
  const transactionArbitrary = fc.record({
    id:       fc.date().map(d => d.getTime().toString()),
    name:     fc.string({minLength:1, maxLength:100}).filter(s => s.trim().length > 0),
    amount:   fc.float({min:0.01, max:999999999.99}),
    category: fc.constantFrom('Food', 'Transport', 'Fun'),
    date:     fc.constant('14 Sep 2026'),
  });
  ```
- All application code must remain in `index.html`, `css/style.css`, and `js/script.js` — no extra source files.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "2.2"] },
    { "id": 1, "tasks": ["3.1", "3.2"] },
    { "id": 2, "tasks": ["3.3", "4"] },
    { "id": 3, "tasks": ["5", "6.1", "6.2", "7.1"] },
    { "id": 4, "tasks": ["7.2", "8.1", "8.2", "8.3"] },
    { "id": 5, "tasks": ["9", "10.1", "10.2"] },
    { "id": 6, "tasks": ["12"] },
    { "id": 7, "tasks": ["13.1", "13.2", "13.3", "13.4", "13.5", "13.6", "13.7", "13.8"] },
    { "id": 8, "tasks": ["14.1", "14.2", "14.3", "14.4", "14.5", "14.6", "14.7", "14.8", "14.9", "14.10", "14.11", "14.12", "14.13"] }
  ]
}
```
