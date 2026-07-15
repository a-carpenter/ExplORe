# Oregon Elk Hunting Data Explorer (GitHub Pages)

A static website version of the hunting-data notebook. It's a plain HTML/JS page - GitHub
Pages hosts it directly, no server-side code involved. All the data lives in a single
`data/data.json` file committed to the repo, which the page fetches at load time.

## How it fits together

- **`scripts/build_data.py`** - a one-time (well, once-a-year) Python step. It parses the
  ODFW Elk Preference Point Draw Report Excel files and the Elk Harvest Summary PDFs
  (the same parsing logic validated in the notebook) and writes everything out to
  `data/data.json`.
- **`data/data.json`** - the pre-processed data: per hunt, per year, application/draw
  numbers and harvest numbers, plus the draw%/success% summary used in the third plot.
  This is the file that actually gets committed and served by GitHub Pages.
- **`index.html` / `assets/app.js` / `assets/calc.js` / `assets/style.css`** - the page
  itself. `calc.js` has the pure number-crunching (selection %, draw % average, historical
  table, report text) ported from the notebook; `app.js` wires that up to three Plotly.js
  graphs and the report/table underneath.

Because GitHub Pages can only serve static files, there's no way to have it run the
Excel/PDF parsing live in the browser (or at least not reliably - parsing multi-row PDF
table headers and cross-referencing hunt numbers, like the notebook does, is not something
you'd want to redo in client-side JS). So the pattern is: **process data locally, commit
the resulting JSON, GitHub Pages serves it.**

## One-time setup

1. Create a new GitHub repository and push everything in this folder to it.
2. In the repo settings, go to **Settings -> Pages**, set Source to "Deploy from a branch",
   and pick your default branch (root folder). GitHub will publish the site at
   `https://<your-username>.github.io/<repo-name>/`.
3. That's it - `index.html` and `data/data.json` are already committed, so the site works
   immediately with whatever data you push.

## Updating the data each year

1. Put the new year's source files in a folder (they are **not** committed by default -
   see note below), named the same way as before, e.g.:
   - `2027_Elk_Preference_Point_Draw_Report.xlsx`
   - `2027_Elk_Harvest_Summary.pdf`
2. Update the year ranges in `scripts/build_data.py` if the years being tracked change
   (`APP_YEARS`, `HARVEST_YEARS`, `DRAW_AVG_YEARS` near the top of the file).
3. Regenerate the data file:
   ```
   pip install pandas openpyxl pypdf
   python scripts/build_data.py --data-dir /path/to/your/source/files --out data/data.json
   ```
4. Commit and push `data/data.json`. GitHub Pages picks up the change automatically
   (usually within a minute or two).

### Should you also commit the raw Excel/PDF files?

Optional, but recommended for reproducibility - e.g. commit them under a `raw_data/`
folder. GitHub Pages won't do anything with them (only `data/data.json` is fetched by the
page), but it means anyone can re-run `build_data.py` from the repo alone and get the same
result, and you have a record of the original source files.

## Running it locally before you push

Browsers block `fetch()` of local files opened directly (`file://`), so serve the folder
over a tiny local web server to test:

```
cd hunting-webpage
python3 -m http.server 8000
```

Then open `http://localhost:8000/` in a browser.

## Notes on the data / parsing quirks

- Only "200-series" hunt numbers (elk hunts) are in the dropdown.
- The harvest PDFs occasionally list the same hunt code on more than one row in a single
  year's report (looks like a duplication in ODFW's own data). When that happens, hunters
  and harvest totals are summed across the rows, and the success % is recomputed from
  those summed totals (harvest ÷ hunters) rather than averaging the printed percentages -
  averaging can produce nonsensical values when one of the duplicate rows has a very small
  sample size.
- Some hunts (e.g. muzzleloader-only hunts) don't appear in the "Any Legal Weapon" harvest
  PDFs at all. The report and third plot handle this gracefully (shown as "N/A" / a note
  that no harvest data is available), rather than erroring.
- 2026 has application data but no harvest data yet (season hasn't happened), so its
  historical-table row will show "N/A" for the harvest-related columns.
