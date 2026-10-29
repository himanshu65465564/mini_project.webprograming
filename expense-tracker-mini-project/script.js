'use strict';

// Pennywise Expense Tracker — vanilla JavaScript, no frameworks or backend.
const STORAGE_KEY = 'pennywise.transactions.v1';
const CATEGORIES = {
  expense: ['Food & Dining', 'Transport', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Health', 'Education', 'Travel', 'Groceries', 'Other'],
  income: ['Salary', 'Freelance', 'Business', 'Investment', 'Gift', 'Refund', 'Other']
};
const CATEGORY_COLORS = {
  'Food & Dining': '#8b7cf6', 'Transport': '#5fb7db', 'Shopping': '#f1a35c',
  'Bills & Utilities': '#e8798a', 'Entertainment': '#a68ae0', 'Health': '#55bea2',
  'Education': '#e3bb57', 'Travel': '#5b8def', 'Groceries': '#78bf76',
  'Salary': '#25ae7c', 'Freelance': '#59b7a0', 'Business': '#4b9f91',
  'Investment': '#60a7d8', 'Gift': '#e7a2b0', 'Refund': '#94b6e3', 'Other': '#a3a7b9'
};
const CATEGORY_ICONS = {
  'Food & Dining': '☕', 'Transport': '↗', 'Shopping': '◇', 'Bills & Utilities': '▤',
  'Entertainment': '♫', 'Health': '✚', 'Education': '▣', 'Travel': '✈',
  'Groceries': '⌂', 'Salary': '↙', 'Freelance': '✎', 'Business': '▥',
  'Investment': '↗', 'Gift': '♧', 'Refund': '↩', 'Other': '•'
};

const $ = (selector) => document.querySelector(selector);
const form = $('#transaction-form');
const titleInput = $('#transaction-title');
const amountInput = $('#transaction-amount');
const typeInput = $('#transaction-type');
const categoryInput = $('#transaction-category');
const dateInput = $('#transaction-date');
const noteInput = $('#transaction-note');
const editingIdInput = $('#editing-id');
const monthFilter = $('#month-filter');
const searchInput = $('#search-transactions');
const typeFilter = $('#type-filter');
const categoryFilter = $('#category-filter');
const transactionList = $('#transaction-list');
const emptyState = $('#empty-state');
const toast = $('#toast');
const deleteDialog = $('#delete-dialog');
let transactions = loadTransactions();
let pendingDeleteId = null;
let toastTimeout = null;

function localDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function currentMonthString() {
  return localDateString().slice(0, 7);
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
  return `tx-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadTransactions() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(stored)) return [];
    return stored.filter((item) => item && typeof item.id === 'string' && typeof item.title === 'string'
      && Number.isFinite(Number(item.amount)) && Number(item.amount) > 0
      && ['income', 'expense'].includes(item.type) && typeof item.date === 'string')
      .map((item) => ({
        id: item.id,
        title: item.title.slice(0, 70),
        amount: Number(item.amount),
        type: item.type,
        category: CATEGORIES[item.type].includes(item.category) ? item.category : 'Other',
        date: item.date,
        note: typeof item.note === 'string' ? item.note.slice(0, 180) : ''
      }));
  } catch (error) {
    console.warn('Could not load saved transactions:', error);
    return [];
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    return true;
  } catch (error) {
    console.error('Could not save transactions:', error);
    showToast('Could not save data. Check your browser storage settings.');
    return false;
  }
}

function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2800);
}

function populateCategorySelect(type, selectedCategory = '') {
  const categories = CATEGORIES[type] || CATEGORIES.expense;
  categoryInput.innerHTML = categories.map((category) =>
    `<option value="${escapeHTML(category)}" ${category === selectedCategory ? 'selected' : ''}>${escapeHTML(category)}</option>`
  ).join('');
}

function populateCategoryFilter() {
  const selected = categoryFilter.value || 'all';
  const categories = [...new Set(transactions.map((item) => item.category))].sort((a, b) => a.localeCompare(b));
  categoryFilter.innerHTML = '<option value="all">All categories</option>' + categories.map((category) =>
    `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`
  ).join('');
  if (categories.includes(selected)) categoryFilter.value = selected;
}

function getMonthFilteredTransactions() {
  const month = monthFilter.value;
  return transactions.filter((item) => !month || item.date.startsWith(month));
}

function getVisibleTransactions() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  return getMonthFilteredTransactions()
    .filter((item) => typeFilter.value === 'all' || item.type === typeFilter.value)
    .filter((item) => categoryFilter.value === 'all' || item.category === categoryFilter.value)
    .filter((item) => !query || `${item.title} ${item.category} ${item.note} ${item.type}`.toLocaleLowerCase().includes(query))
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function updateSummary() {
  const selected = getMonthFilteredTransactions();
  const income = selected.filter((item) => item.type === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expenses = selected.filter((item) => item.type === 'expense').reduce((sum, item) => sum + item.amount, 0);
  $('#total-balance').textContent = money(income - expenses);
  $('#total-income').textContent = money(income);
  $('#total-expenses').textContent = money(expenses);
  $('#transaction-count').textContent = String(selected.length);
  $('#income-caption').textContent = `${selected.filter((item) => item.type === 'income').length} income entries`;
  $('#expense-caption').textContent = `${selected.filter((item) => item.type === 'expense').length} expense entries`;
  $('#chart-total').textContent = money(expenses);
  $('#chart-period-label').textContent = monthFilter.value ? new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(new Date(`${monthFilter.value}-01T00:00:00`)) : 'All time';
}

function renderTransactions() {
  const visible = getVisibleTransactions();
  transactionList.innerHTML = visible.map((item) => {
    const icon = CATEGORY_ICONS[item.category] || '•';
    const amountPrefix = item.type === 'income' ? '+' : '−';
    const note = item.note ? `<span class="transaction-note" title="${escapeHTML(item.note)}">${escapeHTML(item.note)}</span>` : '';
    return `<tr>
      <td><div class="transaction-main"><span class="transaction-avatar ${item.type === 'income' ? 'type-income' : ''}" aria-hidden="true">${escapeHTML(icon)}</span><span><span class="transaction-name" title="${escapeHTML(item.title)}">${escapeHTML(item.title)}</span>${note}</span></div></td>
      <td><span class="category-pill">${escapeHTML(item.category)}</span></td>
      <td>${escapeHTML(formatDate(item.date))}</td>
      <td class="amount-cell ${item.type}">${amountPrefix}${escapeHTML(money(item.amount))}</td>
      <td><div class="row-actions"><button class="icon-button" type="button" data-action="edit" data-id="${escapeHTML(item.id)}" aria-label="Edit ${escapeHTML(item.title)}" title="Edit">✎</button><button class="icon-button delete" type="button" data-action="delete" data-id="${escapeHTML(item.id)}" aria-label="Delete ${escapeHTML(item.title)}" title="Delete">×</button></div></td>
    </tr>`;
  }).join('');

  const showEmpty = visible.length === 0;
  emptyState.classList.toggle('visible', showEmpty);
  transactionList.closest('table').style.display = showEmpty ? 'none' : 'table';
  $('#showing-count').textContent = `Showing ${visible.length} of ${getMonthFilteredTransactions().length} transaction${getMonthFilteredTransactions().length === 1 ? '' : 's'}`;
}

function renderChart() {
  const expenses = getMonthFilteredTransactions().filter((item) => item.type === 'expense');
  const totalsByCategory = expenses.reduce((totals, item) => {
    totals[item.category] = (totals[item.category] || 0) + item.amount;
    return totals;
  }, {});
  const sortedCategories = Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const chart = $('#category-chart');
  const chartEmpty = $('#chart-empty');
  chartEmpty.classList.toggle('visible', sortedCategories.length === 0);
  chart.style.display = sortedCategories.length ? 'grid' : 'none';
  const maxValue = sortedCategories.length ? sortedCategories[0][1] : 0;
  chart.innerHTML = sortedCategories.map(([category, total]) => {
    const percent = maxValue > 0 ? (total / maxValue) * 100 : 0;
    const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
    return `<div class="chart-row"><div class="chart-row-top"><span class="chart-category-name"><span class="chart-color-dot" style="background:${color}"></span>${escapeHTML(category)}</span><span class="chart-category-total">${escapeHTML(money(total))}</span></div><div class="chart-bar-track"><div class="chart-bar-fill" style="width:${percent.toFixed(2)}%;background:${color}"></div></div></div>`;
  }).join('');
}

function render() {
  populateCategoryFilter();
  updateSummary();
  renderTransactions();
  renderChart();
}

function resetForm() {
  form.reset();
  editingIdInput.value = '';
  dateInput.value = localDateString();
  typeInput.value = 'expense';
  populateCategorySelect('expense');
  $('#form-title').textContent = 'Add transaction';
  $('#save-transaction').innerHTML = 'Save transaction <span aria-hidden="true">↗</span>';
  $('#cancel-edit').classList.add('hidden');
  clearErrors();
}

function clearErrors() {
  $('#title-error').textContent = '';
  $('#amount-error').textContent = '';
  titleInput.classList.remove('input-invalid');
  amountInput.classList.remove('input-invalid');
}

function validateForm() {
  clearErrors();
  let valid = true;
  if (!titleInput.value.trim()) {
    $('#title-error').textContent = 'Please enter a transaction name.';
    titleInput.classList.add('input-invalid');
    valid = false;
  }
  const amount = Number(amountInput.value);
  if (!amountInput.value || !Number.isFinite(amount) || amount <= 0 || amount > 1000000000) {
    $('#amount-error').textContent = 'Enter an amount greater than ₹0 and at most ₹1,000,000,000.';
    amountInput.classList.add('input-invalid');
    valid = false;
  }
  if (!dateInput.value || Number.isNaN(new Date(`${dateInput.value}T00:00:00`).getTime())) {
    showToast('Please choose a valid transaction date.');
    valid = false;
  }
  return valid;
}

function handleFormSubmit(event) {
  event.preventDefault();
  if (!validateForm()) return;
  const editingId = editingIdInput.value;
  const existing = editingId ? transactions.find((item) => item.id === editingId) : null;
  const transaction = {
    id: editingId || makeId(),
    title: titleInput.value.trim(),
    amount: Math.round(Number(amountInput.value) * 100) / 100,
    type: typeInput.value,
    category: CATEGORIES[typeInput.value].includes(categoryInput.value) ? categoryInput.value : 'Other',
    date: dateInput.value,
    note: noteInput.value.trim()
  };
  if (existing) {
    transactions = transactions.map((item) => item.id === editingId ? transaction : item);
  } else {
    transactions.push(transaction);
  }
  if (!saveTransactions()) return;
  render();
  resetForm();
  showToast(existing ? 'Transaction updated successfully.' : 'Transaction added successfully.');
}

function startEdit(id) {
  const item = transactions.find((transaction) => transaction.id === id);
  if (!item) return;
  editingIdInput.value = item.id;
  titleInput.value = item.title;
  amountInput.value = item.amount;
  typeInput.value = item.type;
  populateCategorySelect(item.type, item.category);
  dateInput.value = item.date;
  noteInput.value = item.note;
  $('#form-title').textContent = 'Edit transaction';
  $('#save-transaction').innerHTML = 'Update transaction <span aria-hidden="true">↗</span>';
  $('#cancel-edit').classList.remove('hidden');
  clearErrors();
  $('#add-transaction-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  titleInput.focus({ preventScroll: true });
}

function askToDelete(id) {
  if (!transactions.some((item) => item.id === id)) return;
  pendingDeleteId = id;
  if (typeof deleteDialog.showModal === 'function') deleteDialog.showModal();
  else if (window.confirm('Delete this transaction? This action cannot be undone.')) deleteTransaction();
}

function deleteTransaction() {
  if (!pendingDeleteId) return;
  transactions = transactions.filter((item) => item.id !== pendingDeleteId);
  const wasEditing = editingIdInput.value === pendingDeleteId;
  if (!saveTransactions()) return;
  pendingDeleteId = null;
  if (deleteDialog.open) deleteDialog.close();
  if (wasEditing) resetForm();
  render();
  showToast('Transaction deleted.');
}

function exportCSV() {
  const rows = getVisibleTransactions();
  if (!rows.length) {
    showToast('There are no visible transactions to export.');
    return;
  }
  const headers = ['Title', 'Type', 'Category', 'Amount (INR)', 'Date', 'Note'];
  const csvCell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [headers, ...rows.map((item) => [item.title, item.type, item.category, item.amount.toFixed(2), item.date, item.note])]
    .map((row) => row.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pennywise-transactions-${localDateString()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast(`${rows.length} transaction${rows.length === 1 ? '' : 's'} exported to CSV.`);
}

form.addEventListener('submit', handleFormSubmit);
typeInput.addEventListener('change', () => populateCategorySelect(typeInput.value));
$('#cancel-edit').addEventListener('click', () => { resetForm(); showToast('Edit cancelled.'); });
$('#jump-to-form').addEventListener('click', () => { $('#add-transaction-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }); titleInput.focus({ preventScroll: true }); });
$('#empty-add-button').addEventListener('click', () => { $('#add-transaction-panel').scrollIntoView({ behavior: 'smooth', block: 'start' }); titleInput.focus({ preventScroll: true }); });
monthFilter.addEventListener('change', render);
searchInput.addEventListener('input', renderTransactions);
typeFilter.addEventListener('change', renderTransactions);
categoryFilter.addEventListener('change', renderTransactions);
$('#clear-filters').addEventListener('click', () => {
  monthFilter.value = currentMonthString();
  searchInput.value = '';
  typeFilter.value = 'all';
  categoryFilter.value = 'all';
  render();
});
$('#export-csv').addEventListener('click', exportCSV);
transactionList.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  if (button.dataset.action === 'edit') startEdit(button.dataset.id);
  if (button.dataset.action === 'delete') askToDelete(button.dataset.id);
});
$('#confirm-delete').addEventListener('click', deleteTransaction);
$('#keep-transaction').addEventListener('click', () => { pendingDeleteId = null; deleteDialog.close(); });
deleteDialog.addEventListener('click', (event) => {
  if (event.target === deleteDialog) { pendingDeleteId = null; deleteDialog.close(); }
});

// Initialize the app with the current month selected, without adding fake demo data.
monthFilter.value = currentMonthString();
dateInput.value = localDateString();
populateCategorySelect('expense');
render();
