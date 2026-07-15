(function () {
  let DATA = null;
  let plot3Ready = false;

  const selectEl = document.getElementById("hunt-select");
  const statusEl = document.getElementById("load-status");
  const reportEl = document.getElementById("report");

  fetch("data/data.json")
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      DATA = data;
      init();
    })
    .catch((err) => {
      statusEl.textContent = `Failed to load data/data.json: ${err.message}`;
      console.error(err);
    });

  function init() {
    const hunts = DATA.elk_hunts.slice().sort();
    hunts.forEach((hn) => {
      const opt = document.createElement("option");
      opt.value = hn;
      opt.textContent = hn;
      selectEl.appendChild(opt);
    });

    selectEl.addEventListener("change", () => render(selectEl.value));

    buildPlot3(); // built once; subsequent selections only move the highlighted point
    render(hunts[0]);
  }

  function selectHunt(huntNumber) {
    if (selectEl.value !== huntNumber) {
      selectEl.value = huntNumber;
    }
    render(huntNumber);
  }

  function render(huntNumber) {
    const hunt = DATA.hunts[huntNumber];
    if (!hunt) return;

    renderPlot1(huntNumber, hunt);
    renderPlot2(huntNumber, hunt);
    updatePlot3Highlight(huntNumber);
    renderReport(huntNumber, hunt);
  }

  function renderPlot1(huntNumber, hunt) {
    const draw = [...hunt.draw].sort((a, b) => a.year - b.year);
    Plotly.newPlot(
      "plot1",
      [{
        x: draw.map((d) => d.year),
        y: draw.map((d) => d.total_apps),
        mode: "lines+markers",
        type: "scatter",
        line: { color: "#1f77b4" },
      }],
      {
        title: `Total Applications by Year - ${huntNumber}`,
        xaxis: { title: "Year", dtick: 1 },
        yaxis: { title: "Total Applications" },
        margin: { t: 40, r: 10, b: 40, l: 55 },
      },
      { responsive: true, displaylogo: false }
    );
  }

  function renderPlot2(huntNumber, hunt) {
    const { years, resPct, nonresPct } = HuntCalc.selectionPctByYear(hunt);
    Plotly.newPlot(
      "plot2",
      [
        { x: years, y: resPct, mode: "lines+markers", type: "scatter", name: "Resident" },
        { x: years, y: nonresPct, mode: "lines+markers", type: "scatter", name: "Non-Resident" },
      ],
      {
        title: `% of Applications Selected - ${huntNumber}`,
        xaxis: { title: "Year", dtick: 1 },
        yaxis: { title: "% Selected" },
        legend: { orientation: "h", y: -0.2 },
        margin: { t: 40, r: 10, b: 60, l: 55 },
      },
      { responsive: true, displaylogo: false }
    );
  }

  function buildPlot3() {
    const scatter = DATA.scatter;
    const allTrace = {
      x: scatter.map((r) => r.draw_pct),
      y: scatter.map((r) => r.success_mean),
      customdata: scatter.map((r) => r.hunt_number),
      mode: "markers",
      type: "scatter",
      marker: { size: 9, color: "gray", opacity: 0.55 },
      name: "Other 200-series hunts",
      hovertemplate: "Hunt %{customdata}<br>Draw %: %{x:.1f}%<br>Success %: %{y:.1f}%<extra></extra>",
    };
    const selectedTrace = {
      x: [], y: [],
      error_y: { type: "data", array: [], visible: true, color: "red" },
      customdata: [],
      mode: "markers",
      type: "scatter",
      marker: { size: 15, color: "red", line: { width: 1, color: "black" } },
      name: "Selected hunt",
      hovertemplate: "Hunt %{customdata}<br>Draw %: %{x:.1f}%<br>Success %: %{y:.1f}%<extra></extra>",
    };

    Plotly.newPlot(
      "plot3",
      [allTrace, selectedTrace],
      {
        title: "Draw % (avg 2024-2026) vs Hunt Success % (avg 2021-2025)",
        xaxis: { title: "Draw % (Total Drawn / Total Apps)" },
        yaxis: { title: "Hunt Success %" },
        legend: { orientation: "h", y: -0.2 },
        margin: { t: 40, r: 10, b: 60, l: 55 },
      },
      { responsive: true, displaylogo: false }
    );

    const plotDiv = document.getElementById("plot3");
    plotDiv.on("plotly_click", (eventData) => {
      if (!eventData || !eventData.points || !eventData.points.length) return;
      const pt = eventData.points[0];
      const huntNumber = pt.customdata;
      if (huntNumber) selectHunt(huntNumber);
    });

    plot3Ready = true;
  }

  function updatePlot3Highlight(huntNumber) {
    if (!plot3Ready) return;
    const row = DATA.scatter.find((r) => r.hunt_number === huntNumber);
    const plotDiv = document.getElementById("plot3");
    if (row) {
      const std = row.success_std === null || row.success_std === undefined ? 0 : row.success_std;
      Plotly.restyle(plotDiv, {
        x: [[row.draw_pct]],
        y: [[row.success_mean]],
        "error_y.array": [[std]],
        customdata: [[huntNumber]],
      }, [1]);
      Plotly.relayout(plotDiv, { title: `Draw % vs Hunt Success % — highlighting ${huntNumber}` });
    } else {
      Plotly.restyle(plotDiv, {
        x: [[]],
        y: [[]],
        customdata: [[]],
      }, [1]);
      Plotly.relayout(plotDiv, { title: `Draw % vs Hunt Success % — no harvest data for ${huntNumber}` });
    }
  }

  function renderReport(huntNumber, hunt) {
    const lines = HuntCalc.buildReportLines(huntNumber, hunt, DATA.scatter, DATA.meta);
    const table = HuntCalc.historicalTable(hunt);

    const summaryHtml = `<div class="summary-lines">${escapeHtml(lines.join("\n"))}</div>`;

    const headers = ["Year", "Total Apps", "Resident Success", "Non-Resident Success",
      "Number of Hunters", "Total Elk Harvested", "Harvest Success Rate"];

    const intCols = new Set(["Year", "Total Apps", "Number of Hunters", "Total Elk Harvested"]);

    const rowsHtml = table.map((r) => {
      const cells = [
        r.year,
        fmtCell(r.totalApps, true),
        fmtCell(r.residentSuccess, false),
        fmtCell(r.nonresSuccess, false),
        fmtCell(r.numberOfHunters, true),
        fmtCell(r.totalElkHarvested, true),
        fmtCell(r.harvestSuccessRate, false),
      ];
      return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
    }).join("");

    const tableHtml = `
      <h3>Historical Data</h3>
      <table>
        <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;

    reportEl.innerHTML = summaryHtml + tableHtml;
  }

  function fmtCell(v, isInt) {
    if (v === null || v === undefined || Number.isNaN(v)) return `<span class="na">N/A</span>`;
    return isInt ? Math.round(v).toString() : `${v.toFixed(1)}%`;
  }

  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
})();
