// Pure calculation logic ported from the Python notebook. No DOM/Plotly dependencies here,
// so this file can be loaded both in the browser (via <script>) and under Node for testing.

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.HuntCalc = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {

  function mean(arr) {
    const vals = arr.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  function std(arr) {
    const vals = arr.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    if (vals.length < 2) return null;
    const m = mean(vals);
    const variance = vals.reduce((a, b) => a + (b - m) ** 2, 0) / (vals.length - 1); // sample std, matches pandas default
    return Math.sqrt(variance);
  }

  // Resident / Non-Resident selection % by year, for plot 2 and the historical table.
  function selectionPctByYear(hunt) {
    const years = hunt.draw.map((d) => d.year);
    const resPct = hunt.draw.map((d) => (d.resident_apps > 0 ? (d.resident_drawn / d.resident_apps) * 100 : null));
    const nonresPct = hunt.draw.map((d) => (d.nonres_apps > 0 ? (d.nonres_drawn / d.nonres_apps) * 100 : null));
    return { years, resPct, nonresPct };
  }

  // Average draw % (Total Drawn / Total Apps) over meta.draw_avg_years, for one hunt.
  function drawPct3yrAvg(hunt, drawAvgYears) {
    const pcts = hunt.draw
      .filter((d) => drawAvgYears.includes(d.year))
      .map((d) => (d.total_apps > 0 ? (d.total_drawn / d.total_apps) * 100 : null));
    return mean(pcts);
  }

  // Average + std dev of harvest success % across all harvest years on file for this hunt.
  function success5yrStats(hunt) {
    const pcts = hunt.harvest.map((h) => h.success_pct).filter((v) => v !== null && v !== undefined);
    return {
      mean: mean(pcts),
      std: std(pcts),
      n: pcts.length,
    };
  }

  // Historical table rows: Year, Total Apps, Resident Success, Non-Resident Success,
  // Number of Hunters, Total Elk Harvested, Harvest Success Rate.
  function historicalTable(hunt) {
    const harvestByYear = {};
    hunt.harvest.forEach((h) => { harvestByYear[h.year] = h; });

    return hunt.draw.map((d) => {
      const h = harvestByYear[d.year] || {};
      return {
        year: d.year,
        totalApps: d.total_apps,
        residentSuccess: d.resident_apps > 0 ? (d.resident_drawn / d.resident_apps) * 100 : null,
        nonresSuccess: d.nonres_apps > 0 ? (d.nonres_drawn / d.nonres_apps) * 100 : null,
        numberOfHunters: h.hunters !== undefined ? h.hunters : null,
        totalElkHarvested: h.harvest_total !== undefined ? h.harvest_total : null,
        harvestSuccessRate: h.success_pct !== undefined ? h.success_pct : null,
      };
    });
  }

  // Percentile of `value` within `arr` (share of values strictly less than it), 0-100.
  function percentileRank(arr, value) {
    const vals = arr.filter((v) => v !== null && v !== undefined && !Number.isNaN(v));
    if (!vals.length || value === null || value === undefined) return null;
    const below = vals.filter((v) => v < value).length;
    return (below / vals.length) * 100;
  }

  // Full text report, mirroring build_report() in the notebook.
  function buildReportLines(huntNumber, hunt, scatter, meta) {
    const lines = [];
    const name = hunt.name || "(name unavailable)";
    lines.push(`HUNT REPORT: ${huntNumber} - ${name}`);
    lines.push("=".repeat(60));

    if (hunt.draw.length) {
      const sorted = [...hunt.draw].sort((a, b) => a.year - b.year);
      const latest = sorted[sorted.length - 1];
      const first = sorted[0];
      lines.push(`Latest year on file: ${latest.year}`);
      lines.push(`  Total applications: ${latest.total_apps}`);
      lines.push(`  Tags authorized: ${latest.tags_authorized}`);
      const trend = latest.total_apps > first.total_apps ? "increasing" : "decreasing";
      lines.push(`  Application trend ${first.year}-${latest.year}: ${trend} (${first.total_apps} -> ${latest.total_apps})`);
    } else {
      lines.push("No application data found for this hunt.");
    }

    const { years, resPct, nonresPct } = selectionPctByYear(hunt);
    if (years.length) {
      const lastIdx = years.length - 1;
      lines.push("");
      lines.push(`Resident selection % (latest year, ${years[lastIdx]}): ${fmtPct(resPct[lastIdx])}`);
      lines.push(`Non-Resident selection % (latest year, ${years[lastIdx]}): ${fmtPct(nonresPct[lastIdx])}`);
    }

    const drawAvg = drawPct3yrAvg(hunt, meta.draw_avg_years);
    if (drawAvg !== null) {
      lines.push("");
      lines.push(`Average draw % (${meta.draw_avg_years.join("-")}): ${fmtPct(drawAvg)}`);
    }

    const s5 = success5yrStats(hunt);
    if (s5.n > 0) {
      const stdTxt = s5.std === null ? "n/a" : s5.std.toFixed(1);
      lines.push(`Average hunt success % (${meta.harvest_years[0]}-${meta.harvest_years[meta.harvest_years.length - 1]}): ` +
        `${s5.mean.toFixed(1)}% (std dev ${stdTxt}, n=${s5.n} years)`);
    } else {
      lines.push("");
      lines.push("No harvest-success data found for this hunt in the PDF reports " +
        "(this can happen for weapon-specific hunts not covered by the 'Any Legal Weapon' harvest summary).");
    }

    const row = scatter.find((r) => r.hunt_number === huntNumber);
    if (row && scatter.length > 1) {
      const drawPctile = percentileRank(scatter.map((r) => r.draw_pct), row.draw_pct);
      const succPctile = percentileRank(scatter.map((r) => r.success_mean), row.success_mean);
      if (drawPctile !== null && succPctile !== null) {
        lines.push("");
        lines.push(`Relative to other 200-series elk hunts: draw % is higher than ${drawPctile.toFixed(0)}% of hunts; ` +
          `success % is higher than ${succPctile.toFixed(0)}% of hunts.`);
      }
    }

    return lines;
  }

  function fmtPct(v) {
    return v === null || v === undefined || Number.isNaN(v) ? "N/A" : `${v.toFixed(1)}%`;
  }

  return {
    mean, std, selectionPctByYear, drawPct3yrAvg, success5yrStats,
    historicalTable, percentileRank, buildReportLines, fmtPct,
  };
});
