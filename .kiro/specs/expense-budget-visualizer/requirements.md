# Requirements Document

## Introduction

The Expense & Budget Visualizer is a mobile-friendly, single-page web application that helps users track their daily expenses. Users can add expense transactions with an item name, an amount, and one of three fixed categories (Food, Transport, Fun). The app displays a running total spending figure, a doughnut chart showing spending distribution by category, and a scrollable list of all recorded transactions. All data is persisted in the browser's Local Storage so that it survives page refreshes.

The application is built with HTML, CSS, and Vanilla JavaScript only. Chart.js (loaded via CDN) is used for the pie/doughnut chart. There is no backend and no income-tracking feature — the app is an expense-only tracker.

---

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application.
- **Transaction**: A single expense record containing an item name, an amount (in Rupiah), a category, and a timestamp.
- **Category**: One of three fixed expense groupings — Food, Transport, or Fun.
- **Category Tab**: A pill-shaped toggle button that selects the active Category for a new Transaction.
- **Transaction List**: The scrollable ordered list that displays all saved Transactions.
- **Total Spending**: The sum of the amounts of all Transactions currently stored.
- **Chart**: The Chart.js doughnut chart that visualises Total Spending broken down by Category.
- **Local Storage**: The browser's `localStorage` Web Storage API used to persist Transaction data between sessions.
- **Validator**: The client-side form-validation logic inside `js/script.js`.
- **Renderer**: The `render()` function inside `js/script.js` responsible for synchronising the DOM with the current Transaction array.

---

## Requirements

### Requirement 1: Expense Input Form

**User Story:** As a user, I want to enter an item name, an amount, and a category for a new expense, so that I can record what I spent money on.

#### Acceptance Criteria

1. THE App SHALL display a form containing an Item Name text field, an Amount number field, a Category selector, and a submit button labelled "Add Expense".
2. THE App SHALL present exactly three Category options — Food, Transport, and Fun — as tab buttons inside the form.
3. WHEN the page loads, THE App SHALL pre-select the Food Category tab as the default active selection.
4. WHEN a user clicks a Category tab, THE App SHALL mark that tab as active and deactivate all other Category tabs.
5. THE App SHALL limit the Item Name field to a maximum of 100 characters.
6. THE App SHALL accept Amount values greater than 0 and up to 999,999,999.99 with up to 2 decimal places of precision.
7. WHEN a user submits the form with an empty Item Name field, THE Validator SHALL display an inline error message below the Item Name field.
8. WHEN a user submits the form with an Amount that is empty, zero, or negative, THE Validator SHALL display an inline error message below the Amount field.

---

### Requirement 2: Form Validation

**User Story:** As a user, I want the form to tell me when I have missed a required field, so that I do not accidentally submit incomplete expense data.

#### Acceptance Criteria

1. WHEN a user submits the form with an Item Name field that is empty or contains only whitespace characters, THE Validator SHALL display an inline error message below the Item Name field and prevent the Transaction from being saved.
2. WHEN a user submits the form with no Amount value, THE Validator SHALL display an inline error message below the Amount field and prevent the Transaction from being saved.
3. WHEN a user submits the form with an Amount value that is not a positive number, THE Validator SHALL display an inline error message below the Amount field and prevent the Transaction from being saved.
4. WHEN a user changes the value of a previously invalid field, THE Validator SHALL remove the inline error message for that field.
5. IF an input field has failed validation, THEN THE App SHALL apply a visually distinct border style to that field that differs from the default border style of a valid field.

---

### Requirement 3: Add Transaction

**User Story:** As a user, I want to submit the form to add an expense transaction, so that my spending is recorded.

#### Acceptance Criteria

1. WHEN a user submits a valid form, THE App SHALL create a Transaction with the entered Item Name, Amount, selected Category, and the current local date in DD MMM YYYY format.
2. WHEN a new Transaction is created, THE App SHALL add it to the front of the Transaction array so that the most recent Transaction appears first in the list.
3. WHEN a new Transaction is created, THE Renderer SHALL update the Transaction List, Total Spending, and Chart to reflect the new data.
4. WHEN a Transaction is successfully added, THE App SHALL reset the Item Name field to empty and the Amount field to empty.
5. WHEN a Transaction is successfully added, THE App SHALL reset the Category tab selection to Food.
6. IF a user submits the form with an empty Item Name or an Amount of 0 or less, THEN THE App SHALL display an inline error message indicating which field is invalid and SHALL NOT create a Transaction.

---

### Requirement 4: Transaction List Display

**User Story:** As a user, I want to see all my expense transactions in a scrollable list, so that I can review what I have spent.

#### Acceptance Criteria

1. THE App SHALL display all stored Transactions in a scrollable Transaction List, ordered from most recent to oldest by Transaction date.
2. WHEN the Transaction List contains at least one Transaction, THE App SHALL display each Transaction with its item name (maximum 100 characters), the formatted amount prefixed with "−" and formatted in Rupiah locale, the category label, and the date.
3. WHEN the Transaction List contains at least one Transaction, THE App SHALL display a category icon next to each Transaction entry, where the icon corresponds to the Transaction's assigned category.
4. WHEN two or more Transactions share the same date, THE App SHALL display them ordered by the time they were recorded, from most recently recorded to oldest.
5. WHEN the Transaction List is empty, THE App SHALL display a placeholder message indicating that no transactions have been recorded yet.
6. THE App SHALL escape all user-supplied text (item names) before inserting it into the DOM to prevent cross-site scripting.

---

### Requirement 5: Delete Individual Transaction

**User Story:** As a user, I want to delete a single transaction from the list, so that I can remove incorrect or unwanted entries.

#### Acceptance Criteria

1. THE App SHALL display a delete button on each Transaction item in the Transaction List.
2. WHEN a user clicks the delete button on a Transaction item, THE App SHALL remove that Transaction from the Transaction array.
3. WHEN a Transaction is deleted, THE Renderer SHALL update the Transaction List, Total Spending, and Chart within 100 milliseconds to reflect the removal of that Transaction's amount and category from all displayed values.
4. WHEN the last Transaction is deleted, THE App SHALL display the empty-state placeholder in the Transaction List.
5. IF a Transaction selected for deletion does not exist in the Transaction array, THEN THE App SHALL leave the Transaction List unchanged.

---

### Requirement 6: Clear All Transactions

**User Story:** As a user, I want to clear all transactions at once, so that I can reset my expense history quickly.

#### Acceptance Criteria

1. THE App SHALL display a "Clear All" button in the Transaction List header.
2. WHEN a user clicks the "Clear All" button, THE App SHALL display a confirmation prompt before deleting any data.
3. WHEN a user confirms the clear action, THE App SHALL remove all Transactions from the Transaction array and update the Transaction List to show no transaction entries.
4. WHEN a user confirms the clear action, THE App SHALL update Total Spending to display 0 and update the Chart to display an empty state with no data.
5. WHEN a user cancels the confirmation prompt, THE App SHALL leave all Transactions unchanged.
6. IF the Transaction List is empty, THEN THE App SHALL disable the "Clear All" button so that it cannot be clicked.

---

### Requirement 7: Total Spending Display

**User Story:** As a user, I want to see the total amount I have spent at the top of the screen, so that I can quickly check my overall spending.

#### Acceptance Criteria

1. WHEN the page loads, THE App SHALL display a Total Spending figure in a card positioned above the Transaction List.
2. THE App SHALL calculate Total Spending as the sum of the amounts of all Transactions currently stored.
3. THE App SHALL format the Total Spending figure using Indonesian Rupiah locale with no fractional digits (e.g., "Rp 150.000").
4. WHEN there are no Transactions, THE App SHALL display "Rp 0" as the Total Spending figure.
5. WHEN a Transaction is added or deleted, THE App SHALL recalculate and re-display the Total Spending figure immediately.

---

### Requirement 8: Automatic Total Spending Update

**User Story:** As a user, I want the total spending to update automatically whenever I add or delete a transaction, so that the figure always reflects my current data.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE Renderer SHALL recalculate Total Spending as the sum of all Transaction amounts and update the displayed Total Spending figure in the same interaction cycle.
2. WHEN a Transaction is deleted, THE Renderer SHALL recalculate Total Spending as the sum of all remaining Transaction amounts and update the displayed Total Spending figure in the same interaction cycle.
3. WHEN all Transactions are cleared via the clear-all action, THE Renderer SHALL reset the Total Spending figure to display "Rp 0".
4. WHEN the Transaction array is empty, THE App SHALL display "Rp 0" as the Total Spending figure.
5. WHEN Total Spending is calculated from a non-empty Transaction array, THE App SHALL display the formatted Rupiah amount with no fractional digits.

---

### Requirement 9: Spending Distribution Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money goes.

#### Acceptance Criteria

1. THE App SHALL display a doughnut chart rendered by Chart.js that shows the proportion of Total Spending for each Category with at least one Transaction.
2. THE App SHALL assign a distinct, fixed colour to each Category: orange for Food, blue for Transport, and purple for Fun.
3. THE Chart SHALL display a legend below the chart area identifying each Category by its assigned colour.
4. WHEN the Chart tooltip is shown for a segment, THE Chart SHALL display the formatted Rupiah amount and the percentage of Total Spending for that Category, rounded to one decimal place.
5. WHEN there are no Transactions, THE App SHALL display an empty-state message overlay in place of populated chart segments.
6. WHEN a Category has no Transactions, THE Chart SHALL exclude that Category's segment from the chart.

---

### Requirement 10: Automatic Chart Update

**User Story:** As a user, I want the chart to update automatically whenever I add or delete a transaction, so that it always reflects my current spending distribution.

#### Acceptance Criteria

1. WHEN a Transaction is added, THE Renderer SHALL update the Chart data and re-render the Chart within the same interaction cycle without destroying and recreating the Chart instance.
2. WHEN a Transaction is deleted, THE Renderer SHALL update the Chart data and re-render the Chart within the same interaction cycle without destroying and recreating the Chart instance.
3. WHEN all Transactions are cleared, THE Renderer SHALL update the Chart to reflect zero data across all Categories.
4. WHEN a Transaction is added whose Category was previously absent from the Chart, THE Chart SHALL add that Category's segment; WHEN the last Transaction of a Category is deleted, THE Chart SHALL remove that Category's segment.
5. IF the Chart instance has not been initialised when a Transaction mutation occurs, THEN THE App SHALL initialise the Chart before applying the update.

---

### Requirement 11: Local Storage Persistence

**User Story:** As a user, I want my transactions to be saved in the browser, so that my data is not lost when I close or refresh the page.

#### Acceptance Criteria

1. WHEN the page loads, THE App SHALL read the `ebv_transactions` key from Local Storage and parse the stored JSON into the Transaction array before rendering the UI.
2. WHEN a Transaction is added, THE App SHALL serialise the current Transaction array to JSON and write it to Local Storage under the key `ebv_transactions`.
3. WHEN a Transaction is deleted, THE App SHALL serialise the updated Transaction array to JSON and write it to Local Storage under the key `ebv_transactions`.
4. WHEN all Transactions are cleared, THE App SHALL write an empty JSON array to Local Storage under the key `ebv_transactions`.
5. IF the Local Storage entry under `ebv_transactions` is missing or contains malformed JSON, THEN THE App SHALL silently recover by initialising the Transaction array as empty and continuing normal operation.
6. IF a Local Storage write operation fails due to a storage quota being exceeded, THEN THE App SHALL display an error notification to the user and leave the in-memory Transaction array unchanged.

---

### Requirement 12: Load Saved Transactions on Page Load

**User Story:** As a user, I want my previously saved transactions to be restored when I open or refresh the app, so that I do not lose my expense history.

#### Acceptance Criteria

1. WHEN the page loads, THE App SHALL read and parse the `ebv_transactions` key from Local Storage into the Transaction array before any UI rendering occurs.
2. IF the Local Storage data is corrupt or unreadable, THEN THE App SHALL initialise an empty Transaction array and continue normal operation without throwing an unhandled error.
3. WHEN the page loads with saved Transactions present, THE Renderer SHALL populate the Transaction List with all stored Transactions, update Total Spending to reflect their sum, and render the Chart with the saved category distribution.
4. WHEN the page loads with no saved data, THE App SHALL initialise an empty Transaction array, display the empty-state placeholder in the Transaction List, display "Rp 0" as Total Spending, and display the empty-state message in the Chart.

---

### Requirement 13: Responsive and Mobile-Friendly Layout

**User Story:** As a user, I want the app to be usable on both mobile phones and desktop browsers, so that I can track expenses on any device.

#### Acceptance Criteria

1. THE App SHALL constrain the main content area to a maximum width of 520px and centre it horizontally on larger viewports.
2. THE App SHALL use relative and fluid units (clamp, %, vw) for font sizes and spacing so that body text is no smaller than 14px and heading text is no smaller than 16px on screens as narrow as 320px.
3. THE App SHALL render the Category tab buttons in a wrapping flex row so that each tab button is at least 44px tall, fully visible, and reachable without horizontal scrolling on viewports as narrow as 320px.
4. WHERE the viewport width is 360px or narrower, THE App SHALL reduce the balance amount font size to no larger than 1.5rem so that the balance value fits within the viewport width without text overflow or clipping.

---

### Requirement 14: Single-File Code Organisation

**User Story:** As a developer, I want the codebase to be organised in a single CSS file and a single JavaScript file, so that the project remains simple and maintainable.

#### Acceptance Criteria

1. THE App SHALL load all styles from exactly one file located at `css/style.css`.
2. THE App SHALL load all application logic from exactly one file located at `js/script.js`.
3. THE App SHALL load Chart.js exclusively from a CDN `<script>` tag in `index.html`.
4. THE App SHALL NOT include Chart.js or any copy of it as a file within the project directory.
5. THE App SHALL use no external JavaScript frameworks, JavaScript UI component libraries, JavaScript utility libraries, or CSS frameworks.
6. IF the Chart.js CDN resource fails to load, THEN THE App SHALL display an error message indicating that charting is unavailable.
