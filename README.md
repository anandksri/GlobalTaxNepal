# Global Tax Nepal Billing

A lightweight, local-first billing app for creating normal bills, receipt vouchers, and payment vouchers.

## Run locally

```sh
npm install
npm run dev
```

Run `npm run build` for a production build and `npm run lint` for lint checks.

## Features

- Editable bills with calculated item amounts, totals, and amount-in-words.
- Separate receipt and payment vouchers with optional links to a normal bill.
- Searchable, filterable history with view, edit, print, and delete actions.
- Print-ready documents. Choose **Save as PDF** in the browser print dialog to export a PDF.
- JSON backup export and restore from the navigation menu.
- NPR-only amounts with Bikram Sambat dates and daily document numbers using the fiscal-year suffix, BS month, day, and sequence (`830712001`, then `830712002`; next day `830713001`).

Documents, customer details, and numbering counters are stored in this browser's local storage. This first version does not sync data across devices or use a backend. Export a JSON backup regularly if the records need to be moved or preserved.
