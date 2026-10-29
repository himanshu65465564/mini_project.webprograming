# Pennywise — Expense Tracker Mini Project

A responsive personal expense tracker built using **HTML, CSS, and vanilla JavaScript only**. It does not require a framework, backend, database server, build tool, or API key.

## Features

- Add income and expense transactions
- Edit and delete transactions, with a delete confirmation
- Summary cards for balance, income, expenses, and transaction count
- Filter transactions by month, type, and category
- Search transaction names, categories, notes, and types
- Category-wise spending breakdown
- Export visible/filtered transactions as a CSV file
- Saves data in the browser using `localStorage`
- Responsive layout for desktop, tablet, and mobile
- Form validation and helpful status messages
- Keyboard-friendly labels and accessible status messaging

## Project structure

```text
expense-tracker-mini-project/
├── index.html   # Page structure and form
├── style.css    # Layout, colors, responsive design
├── script.js    # App logic, calculations, filters, local storage, CSV export
└── README.md    # Setup and project notes
```

## How to run

1. Extract the folder if you downloaded the ZIP.
2. Open `index.html` in a modern browser (Chrome, Edge, Firefox, or Safari).
3. Add an income or expense using the form. Your transactions are saved in that browser.

No installation is necessary. For a more consistent local development experience, you can open the folder in VS Code and use its Live Server extension, but it is optional.

## How the project works

1. **HTML** provides the dashboard, transaction table, filters, entry form, insights panel, and delete-confirmation dialog.
2. **CSS** styles the interface and adapts it to smaller screens.
3. **JavaScript** validates form data, calculates totals, filters and sorts transactions, draws the category bars, exports CSV, and reads/writes saved transactions in `localStorage`.

## Data and privacy

Transactions are stored locally in the browser under the key `pennywise.transactions.v1`. There is no account, backend, or automatic cloud sync. Clearing this website's browser storage can remove saved data, so export a CSV backup when needed. Google Fonts are referenced for typography; the app itself does not depend on any JavaScript library or external API.

## Notes

- The dashboard initially shows the current month. Select another month to view it, or clear the month field to view all dates.
- The CSV export includes the transactions currently visible after applying your filters and search.
- Currency formatting is set to Indian rupees (INR); change the `money()` function in `script.js` if you want a different currency.
