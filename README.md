# Shemford Futuristic School — Substitution Management System

A local-first faculty substitution scheduling and 40 mm × 60 mm receipt printing web application for **Shemford Futuristic School (SFS)**.

No external API keys, Gemini credentials, or backend database setup are required to run this application. All school data (faculty, classes, periods, weekly timetable, absences, confirmed schedule history, and receipt records) is persisted in browser `localStorage` with JSON export/import support.

## Scripts

```bash
npm install
npm run dev      # Start local development server on port 3000
npm run lint     # Run TypeScript typechecking (tsc --noEmit)
npm test         # Run deterministic substitution, workload, and receipt tests
npm run build    # Build production bundle into dist/
npm run preview  # Preview production build
```

## Receipt Printing (40 mm × 60 mm)

- Uses the official template at `public/assets/sfs-receipt-template.png`.
- When printing individual or batched receipts, select **40 mm × 60 mm** custom paper size, **100% scale**, **0 mm margins**, and enable **Background graphics** in your system print dialog.
