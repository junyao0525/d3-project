// === Main App ===
document.addEventListener("DOMContentLoaded", () => {
  d3.csv("olist_combined_clean_3.csv").then((data) => {
    const loading = document.getElementById("loading");
    if (loading) loading.style.display = "none";

    preprocess(data);
    updateStats(data);
    updateTrends(data);
    updateMapInfoPanel(data);
    populateGeoFilter();
    drawCharts(data);
    drawMap(data);
    setupFilterEvents(data);
  });
});

// === STEP 1: Preprocessing ===
function preprocess(data) {
  data.forEach((d) => {
    d.price = +d.price;
    d.freight_value = +d.freight_value;
    d.review_score = +d.review_score;
    d.payment_value = +d.payment_value;
    d.order_purchase_timestamp = new Date(d.order_purchase_timestamp);
    d.order_delivered_customer_date = new Date(d.order_delivered_customer_date);
  });
}

// === STEP 2: Stats Cards ===
function updateStats(data) {
  const totalRevenue = d3.sum(data, (d) => d.payment_value);
  const avgReview = d3.mean(data, (d) => d.review_score).toFixed(2);
  const avgDelivery = d3
    .mean(
      data
        .filter(
          (d) =>
            !isNaN(d.order_delivered_customer_date - d.order_purchase_timestamp)
        )
        .map(
          (d) =>
            (d.order_delivered_customer_date - d.order_purchase_timestamp) /
            (1000 * 60 * 60 * 24)
        )
    )
    .toFixed(1);

  const revenueEl = document.getElementById("total-revenue");
  const reviewEl = document.getElementById("avg-review");
  const deliveryEl = document.getElementById("avg-delivery");

  if (revenueEl) {
    revenueEl.textContent = `R$ ${totalRevenue.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    })}`;
  }
  if (reviewEl) reviewEl.textContent = `${avgReview} ★`;
  if (deliveryEl) deliveryEl.textContent = `${avgDelivery} days`;
}

// === STEP 3: Geo Filter Dropdown ===
function populateGeoFilter() {
  const geoFilter = document.getElementById("geo-filter");
  if (!geoFilter) return;

  geoFilter.innerHTML = "";

  const allOpt = document.createElement("option");
  allOpt.value = "";
  allOpt.textContent = "All States";
  geoFilter.appendChild(allOpt);

  Object.entries(stateNameToAbbr).forEach(([name, abbr]) => {
    const opt = document.createElement("option");
    opt.value = abbr;
    opt.textContent = name;
    geoFilter.appendChild(opt);
  });
}

// === STEP 4: Charts ===
let charts = {};

function drawCharts(data) {
  const stateAgg = d3.rollups(
    data,
    (v) => ({
      revenue: d3.sum(v, (d) => d.payment_value),
      delivery: d3.mean(
        v
          .filter(
            (d) =>
              !isNaN(
                d.order_delivered_customer_date - d.order_purchase_timestamp
              )
          )
          .map(
            (d) =>
              (d.order_delivered_customer_date - d.order_purchase_timestamp) /
              (1000 * 60 * 60 * 24)
          )
      ),
      review: d3.mean(v, (d) => d.review_score),
      freight: d3.mean(v, (d) => d.freight_value),
    }),
    (d) => d.customer_state
  );

  const labels = stateAgg.map((d) => d[0]);
  const revenue = stateAgg.map((d) => d[1].revenue);
  const delivery = stateAgg.map((d) => d[1].delivery);
  const review = stateAgg.map((d) => d[1].review);
  const freight = stateAgg.map((d) => d[1].freight);

  charts.revenueByState = drawBarChart(
    "revenueByState",
    labels,
    revenue,
    "Revenue (R$)",
    "#0ea5e9"
  );
  charts.deliveryTimeByState = drawBarChart(
    "deliveryTimeByState",
    labels,
    delivery,
    "Avg Delivery Time (days)",
    "#38bdf8"
  );
  charts.reviewScoreByState = drawBarChart(
    "reviewScoreByState",
    labels,
    review,
    "Avg Review Score",
    "#f59e0b"
  );
  charts.freightVsRevenue = drawBarChart(
    "freightVsRevenue",
    labels,
    freight,
    "Avg Freight (R$)",
    "#10b981"
  );

  // Update chart note for top 5 revenue
  const total = d3.sum(revenue);
  const top5Total = revenue
    .slice()
    .sort((a, b) => b - a)
    .slice(0, 5)
    .reduce((a, b) => a + b, 0);
  const note = document
    .querySelector("#revenueByState")
    ?.parentElement?.querySelector(".chart-note");
  if (note) {
    note.textContent = `Top 5 states account for ${(
      (top5Total / total) *
      100
    ).toFixed(1)}% of total revenue`;
  }
}

function drawBarChart(canvasId, labels, values, label, color) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.warn(`Canvas not found: #${canvasId}`);
    return;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    console.warn(`Failed to get context for: #${canvasId}`);
    return;
  }

  if (charts[canvasId]) charts[canvasId].destroy();

  return new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label,
          data: values,
          backgroundColor: color,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${label}: R$ ${ctx.parsed.y.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (v) => `R$ ${v / 1000}k`,
          },
        },
      },
    },
  });
}

// === STEP 5: Filters ===
function setupFilterEvents(data) {
  const filterEl = document.getElementById("geo-filter");
  const displayEl = document.getElementById("active-filter-display");
  const resetBtn = document.getElementById("reset-selection");

  if (!filterEl || !displayEl || !resetBtn) return;

  filterEl.addEventListener("change", function () {
    const selectedState = this.value;
    const filtered = selectedState
      ? data.filter((d) => d.customer_state === selectedState)
      : data;

    updateStats(filtered);
    drawCharts(filtered);
    updateTrends(filtered);
    updateMapInfoPanel(filtered);

    displayEl.textContent = selectedState
      ? `Showing data for: ${selectedState}`
      : "Showing all states";
  });

  resetBtn.addEventListener("click", () => {
    filterEl.value = "";
    filterEl.dispatchEvent(new Event("change"));
  });
}

// === STEP 6: Trend Function ===
function updateTrends(data) {
  const groupedByMonth = d3.groups(data, (d) =>
    d3.timeMonth(d.order_purchase_timestamp)
  );

  groupedByMonth.sort((a, b) => new Date(a[0]) - new Date(b[0]));

  // Filter out incomplete months (less than 25 days of data range)
  const completeMonths = groupedByMonth
    .map(([month, rows]) => {
      const dates = rows.map((r) => r.order_purchase_timestamp);
      const spanDays = (d3.max(dates) - d3.min(dates)) / (1000 * 60 * 60 * 24);
      return spanDays >= 25 ? [month, rows] : null;
    })
    .filter(Boolean);

  if (completeMonths.length < 2) {
    console.warn("Not enough full months for trend comparison");
    return;
  }

  const lastMonth = completeMonths[completeMonths.length - 2][1];
  const thisMonth = completeMonths[completeMonths.length - 1][1];

  const sumPayment = (d) => d3.sum(d, (row) => row.payment_value);
  const avgReview = (d) => d3.mean(d, (row) => row.review_score);
  const avgDelivery = (d) =>
    d3.mean(
      d
        .filter(
          (r) =>
            r.order_delivered_customer_date &&
            r.order_purchase_timestamp &&
            !isNaN(r.order_delivered_customer_date - r.order_purchase_timestamp)
        )
        .map(
          (r) =>
            (r.order_delivered_customer_date - r.order_purchase_timestamp) /
            (1000 * 60 * 60 * 24)
        )
    );

  const lastRevenue = sumPayment(lastMonth);
  const thisRevenue = sumPayment(thisMonth);
  const lastReview = avgReview(lastMonth);
  const thisReview = avgReview(thisMonth);
  const lastDelivery = avgDelivery(lastMonth);
  const thisDelivery = avgDelivery(thisMonth);

  const revenueDelta = thisRevenue - lastRevenue;
  const reviewDelta = thisReview - lastReview;
  const deliveryDelta =
    !isNaN(thisDelivery) && !isNaN(lastDelivery)
      ? thisDelivery - lastDelivery
      : NaN;

  const revChange =
    !isNaN(lastRevenue) && lastRevenue !== 0
      ? (revenueDelta / lastRevenue) * 100
      : 0;

  const revenueLabel = document
    .querySelector("#total-revenue")
    ?.parentElement?.querySelector(".label");
  const reviewLabel = document
    .querySelector("#avg-review")
    ?.parentElement?.querySelector(".label");
  const deliveryLabel = document
    .querySelector("#avg-delivery")
    ?.parentElement?.querySelector(".label");

  if (revenueLabel && !isNaN(revChange)) {
    revenueLabel.innerHTML = `Across all states | <span class="${
      revChange > 0
        ? "trend-up"
        : revChange < 0
        ? "trend-down"
        : "trend-neutral"
    }">${revChange > 0 ? "↑" : revChange < 0 ? "↓" : "–"}${Math.abs(
      revChange
    ).toFixed(1)}%</span> from last month`;
  }

  if (reviewLabel && !isNaN(reviewDelta)) {
    reviewLabel.innerHTML = `Average review score | <span class="${
      reviewDelta > 0
        ? "trend-up"
        : reviewDelta < 0
        ? "trend-down"
        : "trend-neutral"
    }">${reviewDelta > 0 ? "↑" : reviewDelta < 0 ? "↓" : "–"}${Math.abs(
      reviewDelta
    ).toFixed(1)}</span> from last month`;
  }

  if (deliveryLabel) {
    if (!isNaN(deliveryDelta)) {
      deliveryLabel.innerHTML = `Nationwide average | <span class="${
        deliveryDelta < 0
          ? "trend-up"
          : deliveryDelta > 0
          ? "trend-down"
          : "trend-neutral"
      }">${deliveryDelta < 0 ? "↓" : deliveryDelta > 0 ? "↑" : "–"}${Math.abs(
        deliveryDelta
      ).toFixed(1)} days</span> ${
        deliveryDelta < 0
          ? "improvement"
          : deliveryDelta > 0
          ? "longer"
          : "unchanged"
      }`;
    } else {
      deliveryLabel.innerHTML =
        'Nationwide average | <span class="trend-neutral">–</span> No data';
    }
  }

  console.log("📈 Revenue Delta:", revenueDelta);
  console.log("🌟 Review Delta:", reviewDelta);
  console.log("🚚 Delivery Delta:", deliveryDelta);
}
// === STEP 7: Map Info Panel ===
function updateMapInfoPanel(data) {
  const grouped = d3.rollups(
    data,
    (v) => ({
      revenue: d3.sum(v, (d) => d.payment_value),
      delivery: d3.mean(
        v
          .filter(
            (d) =>
              !isNaN(
                d.order_delivered_customer_date - d.order_purchase_timestamp
              )
          )
          .map(
            (d) =>
              (d.order_delivered_customer_date - d.order_purchase_timestamp) /
              (1000 * 60 * 60 * 24)
          )
      ),
      review: d3.mean(v, (d) => d.review_score),
    }),
    (d) => d.customer_state
  );

  const topRevenue = grouped.reduce((a, b) =>
    a[1].revenue > b[1].revenue ? a : b
  );
  const topDelivery = grouped.reduce((a, b) =>
    a[1].delivery < b[1].delivery ? a : b
  );
  const topReview = grouped.reduce((a, b) =>
    a[1].review > b[1].review ? a : b
  );

  const panel = document.querySelector(".map-info-panel");
  if (panel) {
    panel.innerHTML = `
    <div class="map-title">Regional Performance Summary</div>
    <div class="map-stats">
      <div class="stat-item">
        <div class="stat-label">Top Performing State</div>
        <div class="stat-value">${stateFullName(topRevenue[0])}</div>
        <div class="stat-detail">R$ ${topRevenue[1].revenue.toLocaleString(
          "pt-BR"
        )}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Fastest Delivery</div>
        <div class="stat-value">${stateFullName(topDelivery[0])}</div>
        <div class="stat-detail">${topDelivery[1].delivery.toFixed(
          1
        )} days avg</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Highest Satisfaction</div>
        <div class="stat-value">${stateFullName(topReview[0])}</div>
        <div class="stat-detail">${topReview[1].review.toFixed(1)} ★</div>
      </div>
    </div>`;
  }
}

// === STEP 8: Abbreviation Mapping (already used in other places) ===
const stateNameToAbbr = {
  Acre: "AC",
  Alagoas: "AL",
  Amapá: "AP",
  Amazonas: "AM",
  Bahia: "BA",
  Ceará: "CE",
  "Distrito Federal": "DF",
  "Espírito Santo": "ES",
  Goiás: "GO",
  Maranhão: "MA",
  "Mato Grosso": "MT",
  "Mato Grosso do Sul": "MS",
  "Minas Gerais": "MG",
  Pará: "PA",
  Paraíba: "PB",
  Paraná: "PR",
  Pernambuco: "PE",
  Piauí: "PI",
  "Rio de Janeiro": "RJ",
  "Rio Grande do Norte": "RN",
  "Rio Grande do Sul": "RS",
  Rondônia: "RO",
  Roraima: "RR",
  "Santa Catarina": "SC",
  "São Paulo": "SP",
  Sergipe: "SE",
  Tocantins: "TO",
};

const abbrToStateName = Object.entries(stateNameToAbbr).reduce(
  (acc, [name, abbr]) => {
    acc[abbr] = name;
    return acc;
  },
  {}
);

function stateFullName(code) {
  return `${abbrToStateName[code] || code} (${code})`;
}
let selectedState = null; // Track selected state

function drawMap(data) {
  console.log("🔍 Starting drawMap");

  const width = 600;
  const height = 600;

  d3.json(
    "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson"
  )
    .then((geo) => {
      console.log("🌍 GeoJSON loaded");

      const container = d3.select("#brazil-map");
      container.selectAll("*").remove(); // Clear previous map

      const svg = container
        .append("svg")
        .attr("class", "map-svg")
        .attr("width", width)
        .attr("height", height);

      const projection = d3
        .geoMercator()
        .center([-54.5, -15.5])
        .scale(700)
        .translate([width / 2, height / 2]);

      const path = d3.geoPath().projection(projection);

      const revenueByState = d3.rollup(
        data,
        (v) => d3.sum(v, (d) => d.payment_value),
        (d) => d.customer_state
      );

      const allRevenues = Array.from(revenueByState.values());
      const minRevenue = d3.min(allRevenues);
      const maxRevenue = d3.max(allRevenues);

      const colorScale = d3
        .scaleLinear()
        .domain([minRevenue, maxRevenue])
        .range(["#e0f2fe", "#0c4a6e"]);

      const tooltip = d3.select("#selected-state-info");

      // Draw states
      svg
        .selectAll("path")
        .data(geo.features)
        .join("path")
        .attr("d", path)
        .attr("fill", (d) => {
          const abbr = stateNameToAbbr[d.properties.name];
          const revenue = revenueByState.get(abbr) || 0;
          return colorScale(revenue);
        })
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .on("mouseover", function (event, d) {
          const abbr = stateNameToAbbr[d.properties.name];
          const revenue = revenueByState.get(abbr) || 0;
          tooltip
            .html(
              `<strong>${
                d.properties.name
              } (${abbr})</strong><br/>Revenue: R$ ${revenue.toLocaleString(
                "pt-BR"
              )}`
            )
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY - 40}px`)
            .style("opacity", 1);

          d3.select(this).attr("stroke", "#000").attr("stroke-width", 2);
        })
        .on("mouseout", function () {
          tooltip.style("opacity", 0);
          d3.select(this).attr("stroke", "#fff").attr("stroke-width", 1);
        })
        .on("click", function (event, d) {
          const abbr = stateNameToAbbr[d.properties.name];

          if (selectedState === abbr) {
            selectedState = null;
            updateStats(data);
            drawCharts(data);
            document.getElementById("geo-filter").value = "";
            document.getElementById("active-filter-display").textContent =
              "Showing all states";
          } else {
            selectedState = abbr;
            const filtered = data.filter((row) => row.customer_state === abbr);
            updateStats(filtered);
            drawCharts(filtered);
            document.getElementById("geo-filter").value = abbr;
            document.getElementById(
              "active-filter-display"
            ).textContent = `Showing data for: ${abbr}`;
          }
        });

      // Add state labels
      geo.features.forEach((d) => {
        const centroid = path.centroid(d);
        const abbr = stateNameToAbbr[d.properties.name];
        const revenue = revenueByState.get(abbr) || 0;
        const fillColor = colorScale(revenue);
        const textColor = getTextColor(fillColor);

        if (
          centroid[0] > 0 &&
          centroid[0] < width &&
          centroid[1] > 0 &&
          centroid[1] < height
        ) {
          svg
            .append("text")
            .attr("class", "state-label")
            .attr("x", centroid[0])
            .attr("y", centroid[1])
            .attr("dy", "0.35em")
            .attr("text-anchor", "middle")
            .attr("fill", textColor)
            .text(abbr);
        }
      });

      // Optional legend bar
      const legend = svg
        .append("g")
        .attr("transform", `translate(${width / 2 - 150}, ${height - 40})`);

      const legendScale = d3
        .scaleLinear()
        .domain([minRevenue, maxRevenue])
        .range([0, 300]);

      const legendAxis = d3
        .axisBottom(legendScale)
        .ticks(5)
        .tickFormat((d) => `R$ ${Math.round(d / 1000)}k`);

      const defs = svg.append("defs");
      const linearGradient = defs
        .append("linearGradient")
        .attr("id", "legend-gradient");
      linearGradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#e0f2fe");
      linearGradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#0c4a6e");

      legend
        .append("rect")
        .attr("width", 300)
        .attr("height", 10)
        .style("fill", "url(#legend-gradient)");

      legend.append("g").attr("transform", "translate(0, 10)").call(legendAxis);

      legend
        .append("text")
        .attr("x", 150)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("fill", "#333")
        .style("font-weight", "bold")
        .text("Revenue (R$)");
    })
    .catch((error) => {
      console.error("❌ Failed to load GeoJSON:", error);
    });
}
function getTextColor(bgColor) {
  const rgb = d3.color(bgColor);
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 140 ? "#000" : "#fff";
}
