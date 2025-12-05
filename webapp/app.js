const state = {
  data: null,
  charts: {},
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const data = await fetchData();
    state.data = data;
    state.tableMode = "count";
    renderCards(data);
    buildCharts(data);
    buildTable(data, state.tableMode);
    renderNarrative(data);
    bindActions();
  } catch (err) {
    console.error(err);
    document.body.innerHTML = `<main class="report-shell"><p>Could not load data. Check the console for details.</p></main>`;
  }
});

async function fetchData() {
  const res = await fetch("/data/arlington_summary.json");
  if (!res.ok) {
    throw new Error(`Failed to load summary JSON (status ${res.status})`);
  }
  return res.json();
}

function renderCards(data) {
  const cards = document.getElementById("statCards");
  const years = data.meta.years;
  const latestYear = Math.max(...years);
  const firstYear = Math.min(...years);

  const breakdown = data.race_breakdown.find((d) => d.year === latestYear);
  const searches = data.searches.find((d) => d.year === latestYear);
  const earliestTotal = data.totals_by_year[firstYear];
  const latestTotal = data.totals_by_year[latestYear];
  const delta = ((latestTotal - earliestTotal) / earliestTotal) * 100;
  const searchRate = (searches.search_yes / breakdown.total_stops) * 100;
  const hitRate = searches.search_yes
    ? (searches.contraband_yes / searches.search_yes) * 100
    : 0;

  const races = [
    ["Black", breakdown.race_black],
    ["Hispanic", breakdown.race_hispanic],
    ["White", breakdown.race_white],
    ["Asian", breakdown.race_asian],
    ["Native", breakdown.race_native],
  ].sort((a, b) => b[1] - a[1]);
  const [topRace, topCount] = races[0];
  const topShare = (topCount / breakdown.total_stops) * 100;

  const cardData = [
    {
      title: `${latestYear} total stops`,
      value: formatNumber(latestTotal),
      delta: `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% vs ${firstYear}`,
    },
    {
      title: "Search rate",
      value: `${searchRate.toFixed(1)}%`,
      delta: `${formatNumber(searches.search_yes)} searches`,
    },
    {
      title: "Contraband hit rate",
      value: `${hitRate.toFixed(1)}%`,
      delta: `${formatNumber(searches.contraband_yes)} found of ${formatNumber(searches.search_yes)}`,
    },
    {
      title: "Largest share",
      value: `${topRace}: ${topShare.toFixed(1)}%`,
      delta: `${formatNumber(topCount)} of ${formatNumber(breakdown.total_stops)} stops`,
    },
  ];

  cards.innerHTML = cardData
    .map(
      (c) => `
        <article class="card">
          <h3>${c.title}</h3>
          <div class="value">${c.value}</div>
          <div class="delta">${c.delta}</div>
        </article>
      `
    )
    .join("");
}

function buildCharts(data) {
  Chart.defaults.font.family = '"Space Grotesk", "Libre Franklin", system-ui, sans-serif';
  Chart.defaults.color = "#0f172a";
  Chart.defaults.maintainAspectRatio = false;

  buildStopsChart(data);
  buildRaceChart(data);
  buildSearchChart(data);
  buildReasonsChart(data);
  buildContrabandChart(data);
  buildRateChart(data);
}

function buildStopsChart(data) {
  const ctx = document.getElementById("stopsChart");
  const labels = data.meta.years;
  const totals = labels.map((y) => data.totals_by_year[y]);

  state.charts.stops?.destroy();
  state.charts.stops = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Total stops",
          data: totals,
          borderColor: "#0d9488",
          backgroundColor: "rgba(13,148,136,0.15)",
          tension: 0.25,
          pointRadius: 4,
          pointBackgroundColor: "#0d9488",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { mode: "index", intersect: false },
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => formatNumber(v) } },
      },
    },
  });
}

function buildRaceChart(data) {
  const labels = data.meta.years;
  const races = [
    { key: "race_black", label: "Black", color: "#0d9488" },
    { key: "race_hispanic", label: "Hispanic", color: "#f97316" },
    { key: "race_white", label: "White", color: "#94a3b8" },
    { key: "race_asian", label: "Asian", color: "#22c55e" },
    { key: "race_native", label: "Native", color: "#f59e0b" },
  ];

  const datasets = races.map((r) => ({
    label: r.label,
    data: data.race_breakdown.map((row) =>
      Number(((row[r.key] / row.total_stops) * 100).toFixed(1))
    ),
    backgroundColor: r.color,
    stack: "race",
  }));

  state.charts.race?.destroy();
  state.charts.race = new Chart(document.getElementById("raceChart"), {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "bottom" },
        tooltip: { mode: "index", intersect: false, callbacks: { label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%` } },
      },
      scales: {
        y: { stacked: true, beginAtZero: true, max: 100, ticks: { callback: (v) => `${v}%` } },
        x: { stacked: true },
      },
    },
  });
}

function buildSearchChart(data) {
  const labels = data.meta.years;
  const yes = data.searches.map((r) => r.search_yes);
  const no = data.searches.map((r) => r.search_no);

  state.charts.search?.destroy();
  state.charts.search = new Chart(document.getElementById("searchChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Search conducted", data: yes, backgroundColor: "#0d9488" },
        { label: "No search", data: no, backgroundColor: "#cbd5e1" },
      ],
    },
    options: {
      plugins: { legend: { position: "bottom" } },
      responsive: true,
      scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatNumber(v) } } },
    },
  });
}

function buildReasonsChart(data) {
  const labels = data.meta.years;
  const reasons = [
    { key: "search_reason_probable", label: "Probable cause", color: "#0d9488" },
    { key: "search_reason_incident", label: "Incident to arrest", color: "#f97316" },
    { key: "search_reason_inventory", label: "Inventory", color: "#22c55e" },
    { key: "search_reason_consent", label: "Consent", color: "#64748b" },
  ];

  const datasets = reasons.map((r) => ({
    label: r.label,
    data: data.searches.map((row) => row[r.key]),
    backgroundColor: r.color,
  }));

  state.charts.reasons?.destroy();
  state.charts.reasons = new Chart(document.getElementById("reasonsChart"), {
    type: "bar",
    data: { labels, datasets },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" } },
      scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatNumber(v) } } },
    },
  });
}

function buildContrabandChart(data) {
  const labels = data.meta.years;
  const yes = data.searches.map((r) => r.contraband_yes);
  const no = data.searches.map((r) => r.contraband_no);

  state.charts.contraband?.destroy();
  state.charts.contraband = new Chart(document.getElementById("contrabandChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Contraband found", data: yes, backgroundColor: "#0d9488" },
        { label: "No contraband", data: no, backgroundColor: "#cbd5e1" },
      ],
    },
    options: {
      plugins: { legend: { position: "bottom" } },
      responsive: true,
      scales: { y: { beginAtZero: true, ticks: { callback: (v) => formatNumber(v) } } },
    },
  });
}

function buildRateChart(data) {
  const labels = data.meta.years;
  const searchRate = data.meta.years.map((year) => {
    const race = data.race_breakdown.find((r) => r.year === year);
    const s = data.searches.find((s) => s.year === year);
    return share(s.search_yes, race.total_stops);
  });
  const hitRate = data.meta.years.map((year) => {
    const s = data.searches.find((s) => s.year === year);
    return share(s.contraband_yes, s.search_yes);
  });

  state.charts.rate?.destroy();
  state.charts.rate = new Chart(document.getElementById("rateChart"), {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Search rate (searches per stop)",
          data: searchRate,
          borderColor: "#0d9488",
          backgroundColor: "rgba(13,148,136,0.12)",
          tension: 0.25,
          pointRadius: 4,
        },
        {
          label: "Contraband hit rate (hits per search)",
          data: hitRate,
          borderColor: "#f97316",
          backgroundColor: "rgba(249,115,22,0.12)",
          tension: 0.25,
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue}%` } } },
      scales: {
        y: { beginAtZero: true, max: Math.max(...hitRate, ...searchRate, 5) + 5, ticks: { callback: (v) => `${v}%` } },
      },
    },
  });
}

function buildTable(data) {
  const body = document.querySelector("#summaryTable tbody");
  const mode = state.tableMode || "count";
  const contrabandHeader = document.getElementById("contrabandHeader");
  contrabandHeader.textContent =
    mode === "percent" ? "Contraband found (% of searches)" : "Contraband found";

  body.innerHTML = data.meta.years
    .map((year) => {
      const race = data.race_breakdown.find((r) => r.year === year);
      const search = data.searches.find((s) => s.year === year);
      if (mode === "percent") {
        const pct = (v, base) => `${share(v, base).toFixed(1)}%`;
        return `
          <tr>
            <td>${year}</td>
            <td>100%</td>
            <td>${pct(race.race_black, race.total_stops)}</td>
            <td>${pct(race.race_hispanic, race.total_stops)}</td>
            <td>${pct(race.race_white, race.total_stops)}</td>
            <td>${pct(race.race_asian, race.total_stops)}</td>
            <td>${pct(race.race_native, race.total_stops)}</td>
            <td>${pct(search.search_yes, race.total_stops)}</td>
            <td>${pct(search.contraband_yes, search.search_yes)}</td>
          </tr>
        `;
      }
      return `
        <tr>
          <td>${year}</td>
          <td>${formatNumber(race.total_stops)}</td>
          <td>${formatNumber(race.race_black)}</td>
          <td>${formatNumber(race.race_hispanic)}</td>
          <td>${formatNumber(race.race_white)}</td>
          <td>${formatNumber(race.race_asian)}</td>
          <td>${formatNumber(race.race_native)}</td>
          <td>${formatNumber(search.search_yes)}</td>
          <td>${formatNumber(search.contraband_yes)}</td>
        </tr>
      `;
    })
    .join("");
}

function renderNarrative(data) {
  const latestYear = Math.max(...data.meta.years);
  const earliestYear = Math.min(...data.meta.years);
  const latestRace = data.race_breakdown.find((r) => r.year === latestYear);
  const earliestRace = data.race_breakdown.find((r) => r.year === earliestYear);
  const latestSearch = data.searches.find((s) => s.year === latestYear);

  const stopsDelta = percentChange(
    data.totals_by_year[earliestYear],
    data.totals_by_year[latestYear]
  );
  const stopDirection = stopsDelta >= 0 ? "rose" : "fell";
  const stopDeltaDisplay = Math.abs(stopsDelta).toFixed(1);
  const blackShare = share(latestRace.race_black, latestRace.total_stops);
  const hispanicShare = share(latestRace.race_hispanic, latestRace.total_stops);
  const searchRate = share(latestSearch.search_yes, latestRace.total_stops);
  const hitRate = latestSearch.search_yes
    ? share(latestSearch.contraband_yes, latestSearch.search_yes)
    : 0;
  const priorKnowledge = share(latestRace.race_known_yes, latestRace.total_stops);

  const narrative = [
    `Stops ${stopDirection} ${stopDeltaDisplay}% from ${earliestYear} (${formatNumber(
      data.totals_by_year[earliestYear]
    )}) to ${latestYear} (${formatNumber(data.totals_by_year[latestYear])}).`,
    `In ${latestYear}, Black drivers made up ${blackShare.toFixed(
      1
    )}% of stops; Hispanic drivers ${hispanicShare.toFixed(1)}%; White drivers ${share(
      latestRace.race_white,
      latestRace.total_stops
    ).toFixed(1)}%.`,
    `Searches touched ${searchRate.toFixed(1)}% of stops, and contraband was found in ${hitRate.toFixed(
      1
    )}% of searches.`,
    `Race was reported as known before the stop in only ${priorKnowledge.toFixed(1)}% of stops, underscoring the limits of pre-stop visibility in the dataset.`,
  ];

  document.getElementById("narrativeBody").innerHTML = narrative
    .map((line) => `<p>${line}</p>`)
    .join("");
}

function bindActions() {
  document.getElementById("downloadPdf").addEventListener("click", downloadPdf);
  document.getElementById("printView").addEventListener("click", () => window.print());
  document.getElementById("refreshNarrative").addEventListener("click", () => renderNarrative(state.data));
  const toggle = document.getElementById("tableModeToggle");
  toggle.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-mode]");
    if (!btn) return;
    const mode = btn.dataset.mode;
    state.tableMode = mode;
    [...toggle.querySelectorAll("button")].forEach((b) => b.classList.toggle("primary", b === btn));
    [...toggle.querySelectorAll("button")].forEach((b) => b.classList.toggle("ghost", b !== btn));
    buildTable(state.data);
  });
}

async function downloadPdf() {
  const target = document.getElementById("report");
  const { jsPDF } = window.jspdf;
  const canvas = await html2canvas(target, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = (canvas.height * pageWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
  pdf.save("arlington-racial-profiling-report.pdf");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function percentChange(oldVal, newVal) {
  if (!oldVal) return 0;
  return ((newVal - oldVal) / oldVal) * 100;
}

function share(part, whole) {
  const num = Number(part) || 0;
  const den = Number(whole) || 0;
  if (!den) return 0;
  return (num / den) * 100;
}
