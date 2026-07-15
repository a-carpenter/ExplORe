# 🦌 Oregon Elk Hunting Data Explorer

An interactive web app for exploring Oregon elk controlled-hunt tag draw odds and harvest
success rates using data from the 2021–2026 seasons. 

**View the live site → https://a-carpenter.github.io/ExplORe/**


## What it does
Pick any 200-series elk hunt from the dropdown and get:

- **Applications by year** — how many people applied for that hunt, 2021–2026
- **Draw rate by residency** — the percent of Resident vs. Non-Resident applicants who
  were drawn, by year
- **Draw odds vs. hunt success** — an interactive scatter of every elk hunt's average draw
  percentage (last 3 years) against its average harvest success rate (last 5 years), with
  your selected hunt highlighted and error bars showing year-to-year variability. Hover any
  dot to see which hunt it is; click one to jump straight to it.
- **A full historical data table** — year-by-year applications, draw rates, hunter counts,
  elk harvested, and harvest success rate for the selected hunt

## Data sources
All figures come from Oregon Department of Fish and Wildlife (ODFW) public reports:

- [Point summary reports](https://myodfw.com/articles/point-summary-reports) (Elk Preference Point Draw Reports — application/draw data by hunt)
- [Big game hunting harvest statistics](https://myodfw.com/articles/big-game-hunting-harvest-statistics) (Elk Harvest Summary Reports — harvest and success-rate data by hunt)

This project is an independent tool for exploring  public data and is not affiliated
with or endorsed by ODFW. Always double-check current-year draw odds and regulations
against ODFW's official reports before making application decisions.

## How it works
This is a static site — no backend, no database. GitHub Pages serves the HTML/JS directly,
and all the hunt data lives in one file, which the page fetches when it loads.

That file is generated locally (not in the browser), which parses ODFW's Excel draw reports
and PDF harvest summaries into a single clean dataset. 

## Updating the data for a new season
Data will be updated twice annually when [1] previous season hunt results are released and 
[2] when upcoming seasons tag draw results are released

## Known data quirks
- Only 200-series hunt numbers (elk hunts) are included.
- A handful of hunt codes appear on more than one row in a single year's harvest PDF
  (this looks like a duplication in ODFW's source data rather than genuinely different
  hunts). When that happens, hunter counts and harvest totals are summed across the rows,
  and the success rate is recomputed from those combined totals — averaging the printed
  percentages directly can produce misleading results when one row has a very small sample.
- Some hunts (e.g. muzzleloader-only hunts) don't appear in the "Any Legal Weapon" harvest
  reports at all; the app shows "N/A" for those rather than guessing.
- 2026 has application data but no harvest data yet, since that season hasn't happened.

## Contributing
Issues and pull requests are welcome — particularly if you spot a parsing edge case in a
future year's report format that isn't handled correctly.

## License
No license has been applied yet.
