# Graduate Job Search

A local Singapore graduate-job workspace for Zhong.

## What it does

- Fetches live Singapore roles from the keyless FreeHire API.
- Starts with graduate and junior filters, with dedicated tracks for software, AI/data, quant/finance, and product/operations.
- Links each role to the employer or original source listing.
- Keeps a local browser-only shortlist with `Saved` and `Applied` states.
- Links to Jorb's Singapore graduate pages for programme alerts.

## Run

```sh
npm start
```

Open `http://127.0.0.1:4177`.

For automatic server restarts while editing:

```sh
npm run dev
```

## Data boundary

FreeHire is a discovery source, not proof of eligibility or closing date. Verify each role against the employer's original careers page before tailoring materials or applying. Jorb is linked as an alerting and programme-discovery source; this app does not scrape Jorb or automate submissions.
