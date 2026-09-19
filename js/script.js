/* ============================================================
   EXPENSE & BUDGET VISUALIZER
   - Local Storage persistence
   - Chart.js pie chart (expenses by category)
   - Add / Delete transactions
   ============================================================ */

'use strict';

// ── DOM refs ────────────────────────────────────────────────
const form            = document.getElementById('transactionForm');
const itemNameInput   = document.getElementById('itemName');
const amountInput     = document.getElementById('amount');
const categoryHidden  = document.getElementById('category');
const categoryTabs    = document.getElementById('categoryTabs');
const txList          = document.getElementById('transactionList');
const emptyState      = document.getElementById('emptyState');
const clearAllBtn     = document.getElementById('clearAllBtn');
const totalBalanceEl  = document.getElementById('totalBalance');
const chartEmpty      = document.getElementById('chartEmpty');
const nameError       = document.getElementById('nameError');
const amountError     = document.getElementById('amountError');
const globalErrorBanner = document.getElementById('globalError');

// ── Constants ───────────────────────────────────────────────
const STORAGE_KEY = 'ebv_transactions';

const CATEGORIES = ['Food', 'Transport', 'Fun'];  // exactly 3, fixed

// ── Category emoji map ──────────────────────────────────────
const CAT_EMOJI = {
  Food:      '🍔',
  Transport: '🚗',
  Fun:       '🎉',
};

// ── Chart colours (must match CSS vars) ────────────────────
const CAT_COLORS = {
  Food:      '#f97316',  // orange
  Transport: '#3b82f6',  // blue
  Fun:       '#a855f7',  // purple
};

// ── State ───────────────────────────────────────────────────
let transactions = loadTransactions();
let pieChart     = null;

// ── Chart.js CDN failure guard ───────────────────────────────
if (typeof Chart === 'undefined') {
  chartEmpty.textContent = 'Chart unavailable — CDN failed to load.';
  chartEmpty.classList.remove('hidden');
  chartEmpty.removeAttribute('hidden');
  // Replace renderChart with a no-op so subsequent calls do nothing
  renderChart = function () {};
}

// ── Init ────────────────────────────────────────────────────
render();

// ── Category tab clicks ─────────────────────────────────────
categoryTabs.addEventListener('click', (e) => {
  const btn = e.target.closest('.cat-btn');
  if (!btn) return;

  document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  categoryHidden.value = btn.dataset.cat;
});

// ── Form submit ─────────────────────────────────────────────
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!validateForm()) return;

  const transaction = {
    id:       Date.now().toString(),
    name:     itemNameInput.value.trim(),
    amount:   parseFloat(amountInput.value),
    category: categoryHidden.value,
    date:     new Date().toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
    }),
  };

  transactions.unshift(transaction);
  saveTransactions();
  render();
  form.reset();
  resetCategoryTab();
});

// ── Delete single transaction ───────────────────────────────
txList.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;

  const id = btn.dataset.id;
  transactions = transactions.filter((t) => t.id !== id);
  saveTransactions();
  render();
});

// ── Clear all ───────────────────────────────────────────────
clearAllBtn.addEventListener('click', () => {
  if (transactions.length === 0) return;
  if (!confirm('Delete all transactions? This cannot be undone.')) return;

  transactions = [];
  saveTransactions();
  render();
});

// ── Validate ────────────────────────────────────────────────
function validateForm() {
  let valid = true;

  const name = itemNameInput.value.trim();
  if (!name) {
    setError(itemNameInput, nameError, true);
    valid = false;
  } else {
    setError(itemNameInput, nameError, false);
  }

  const amt = parseFloat(amountInput.value);
  if (!amountInput.value || isNaN(amt) || amt <= 0) {
    setError(amountInput, amountError, true);
    valid = false;
  } else {
    setError(amountInput, amountError, false);
  }

  return valid;
}

function setError(input, msgEl, show) {
  if (show) {
    input.classList.add('invalid');
    msgEl.classList.add('visible');
  } else {
    input.classList.remove('invalid');
    msgEl.classList.remove('visible');
  }
}

// ── Reset category tab to first option ─────────────────────
function resetCategoryTab() {
  document.querySelectorAll('.cat-btn').forEach((b) => b.classList.remove('active'));
  const first = document.querySelector('.cat-btn[data-cat="Food"]');
  if (first) first.classList.add('active');
  categoryHidden.value = 'Food';
}

// ── Render everything ────────────────────────────────────────
function render() {
  renderSummary();
  renderList();
  renderChart();
}

// ── Render summary numbers ───────────────────────────────────
function renderSummary() {
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  totalBalanceEl.textContent = formatRp(total);
}

// ── Render transaction list ──────────────────────────────────
function renderList() {
  // Remove all existing items (keep the empty-state li)
  txList.querySelectorAll('.transaction-item').forEach((el) => el.remove());

  const isEmpty = transactions.length === 0;
  emptyState.style.display = isEmpty ? 'block' : 'none';
  clearAllBtn.disabled = isEmpty;

  if (isEmpty) return;

  transactions.forEach((t) => {
    const li = document.createElement('li');
    li.className = 'transaction-item';
    li.innerHTML = `
      <div class="tx-icon" data-cat="${t.category}" aria-hidden="true">
        ${CAT_EMOJI[t.category] || '📦'}
      </div>
      <div class="tx-info">
        <p class="tx-name">${escapeHTML(t.name)}</p>
        <p class="tx-meta">${t.category} · ${t.date}</p>
      </div>
      <span class="tx-amount expense">
        −${formatRp(t.amount)}
      </span>
      <button
        class="btn-delete"
        data-id="${t.id}"
        aria-label="Delete ${escapeHTML(t.name)}"
        title="Delete"
      >✕</button>
    `;
    txList.appendChild(li);
  });
}

// ── Render pie chart ─────────────────────────────────────────
function renderChart() {
  const ctx = document.getElementById('pieChart').getContext('2d');

  // Aggregate amounts per category (all transactions are expenses)
  const totals = {};
  transactions.forEach((t) => {
    totals[t.category] = (totals[t.category] || 0) + t.amount;
  });

  const labels = Object.keys(totals);
  const data   = Object.values(totals);
  const colors = labels.map((l) => CAT_COLORS[l] || '#94a3b8');

  const hasData = data.length > 0;
  chartEmpty.classList.toggle('hidden', hasData);

  if (pieChart) {
    // Update existing chart
    pieChart.data.labels         = labels;
    pieChart.data.datasets[0].data            = data;
    pieChart.data.datasets[0].backgroundColor = colors;
    pieChart.update();
    return;
  }

  // Create chart for the first time
  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 10,
      }],
    },
    options: {
      responsive: true,
      cutout: '55%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 16,
            font: { size: 12, weight: '600' },
            usePointStyle: true,
            pointStyleWidth: 10,
          },
        },
        tooltip: {
          callbacks: {
            label(context) {
              const val   = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = total ? ((val / total) * 100).toFixed(1) : 0;
              return ` ${formatRp(val)}  (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

// ── Local Storage helpers ────────────────────────────────────
function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch (err) {
    showGlobalError('Storage quota exceeded. Your last change was not saved.');
  }
}

function showGlobalError(msg) {
  globalErrorBanner.textContent = msg;
  globalErrorBanner.removeAttribute('hidden');
}

function loadTransactions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];   // malformed JSON → silent recovery, empty array
  }
}

// ── Utilities ────────────────────────────────────────────────
function formatRp(amount) {
  return 'Rp ' + amount.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
