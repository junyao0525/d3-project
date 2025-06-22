// === Main App ===
document.addEventListener("DOMContentLoaded", () => {
  d3.csv("olist_dataset.csv").then((data) => {
    const loading = document.getElementById("loading");
    if (loading) loading.style.display = "none";

    preprocess(data);
    populateGeoFilter();
    setupFilterEvents(data); // Initialize filtering system and allData

    // Initial render of the dashboard
    updateStats(data);
    updateTrends(data);
    updateMapInfoPanel(data);
    drawCharts(data);
    drawMap(data);
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
let selectedState = null; // Keep track of the selected state globally

// Global variables for sorting functionality
let deliverySortOrder = 'asc'; // Default: ascending (lowest to highest, left to right)
let satisfactionSortOrder = 'desc'; // Default: descending (highest to lowest, left to right)

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

  // Sort delivery data from lower to higher (left to right)
  const sortedDeliveryAgg = [...stateAgg].sort((a, b) => {
    if (deliverySortOrder === 'asc') {
      return a[1].delivery - b[1].delivery; // Ascending (lowest to highest)
    } else {
      return b[1].delivery - a[1].delivery; // Descending (highest to lowest)
    }
  });

  // Sort satisfaction data from highest to lowest (left to right)
  const sortedSatisfactionAgg = [...stateAgg].sort((a, b) => {
    if (satisfactionSortOrder === 'desc') {
      return b[1].review - a[1].review; // Descending (highest to lowest)
    } else {
      return a[1].review - b[1].review; // Ascending (lowest to highest)
    }
  });

  const labels = stateAgg.map((d) => d[0]);
  const revenue = stateAgg.map((d) => d[1].revenue);
  const delivery = stateAgg.map((d) => d[1].delivery);
  const review = stateAgg.map((d) => d[1].review);
  const freight = stateAgg.map((d) => d[1].freight);

  // Get sorted delivery data
  const deliveryLabels = sortedDeliveryAgg.map((d) => d[0]);
  const deliveryValues = sortedDeliveryAgg.map((d) => d[1].delivery);

  // Get sorted satisfaction data
  const satisfactionLabels = sortedSatisfactionAgg.map((d) => d[0]);
  const satisfactionValues = sortedSatisfactionAgg.map((d) => d[1].review);

  console.log("📊 Delivery sorting:", deliverySortOrder, "First 3 states:", deliveryLabels.slice(0, 3));
  console.log("📊 Delivery values (first 3):", deliveryValues.slice(0, 3));
  console.log("📊 Satisfaction sorting:", satisfactionSortOrder, "First 3 states:", satisfactionLabels.slice(0, 3));
  console.log("📊 Satisfaction values (first 3):", satisfactionValues.slice(0, 3));

  const total = d3.sum(revenue);
  const top5Total = revenue
    .slice()
    .sort((a, b) => b - a)
    .slice(0, 5)
    .reduce((a, b) => a + b, 0);

  charts.revenueByState = drawBarChart(
    "revenueByState",
    labels,
    revenue,
    "Revenue (R$)",
    "#0ea5e9",
    `Top 5 states account for ${((top5Total / total) * 100).toFixed(
      1
    )}% of total revenue`
  );

  charts.deliveryTimeByState = drawBarChart(
    "deliveryTimeByState",
    deliveryLabels,
    deliveryValues,
    "Avg Delivery Time (days)",
    "#0ea5e9"
  );

  // CHANGED: Use lollipop chart for review scores
  charts.reviewScoreByState = drawLollipopChart(
    "reviewScoreByState",
    satisfactionLabels,
    satisfactionValues,
    "Avg Review Score",
    "#0ea5e9"
  );

  charts.freightVsRevenue = drawScatterChart(
    "freightVsRevenue",
    stateAgg.map((d) => ({ x: d[1].freight, y: d[1].revenue, label: d[0] })),
    "Freight Cost vs Revenue",
    "#0ea5e9",
    `Correlation between freight costs and revenue by state`
  );
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

  if (canvasId === 'reviewScoreByState') {
    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label,
            data: values,
            backgroundColor: color,
            barThickness: 4,
          },
          {
            label: 'Score dot',
            data: values,
            type: 'scatter',
            backgroundColor: color,
            radius: 6,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 5,
            title: {
              display: true,
              text: 'Average Score (out of 5)'
            }
          },
          x: {
            title: {
              display: true,
              text: 'State'
            },
            grid: {
              display: false
            }
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const i = elements[0].index;
            const state = event.chart.data.labels[i];
            handleStateSelection(state);
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: function(tooltipItem) {
              return tooltipItem.datasetIndex === 1;
            },
            callbacks: {
              label: (ctx) => `${label}: ${ctx.parsed.y.toFixed(2)} ★`,
            },
          },
        },
      }
    });
  }

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
      maintainAspectRatio: false,
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const i = elements[0].index;
          const state = event.chart.data.labels[i];
          handleStateSelection(state);
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              if (canvasId === 'deliveryTimeByState') {
                return `${label}: ${ctx.parsed.y.toFixed(1)} days`;
              }
              return `${label}: R$ ${ctx.parsed.y.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}`;
            },
          },
        },
      },
      layout: {
        padding: {
          left: 0,
          right: 10,
          top: 10,
          bottom: 10,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'State'
          },
          ticks: {
            maxRotation: 45,
            minRotation: 0,
            font: {
              size: 10,
            },
          },
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: canvasId === 'deliveryTimeByState' ? 'Average Delivery Time (days)' : 'Revenue (R$)'
          },
          ticks: {
            callback: (v) => {
              if (canvasId === 'deliveryTimeByState') {
                return `${v.toFixed(1)} days`;
              }
              return `R$ ${v / 1000}k`;
            },
            font: {
              size: 10,
            },
            layout: {
              padding: {
                left: 0,
                right: 10,
                top: 10,
                bottom: 10,
              },
            },
          },
          grid: {
            color: "#f0f0f0",
          },
        },
      },
    },
  });
}

// NEW FUNCTION: Lollipop chart for review scores
function drawLollipopChart(canvasId, labels, values, label, color) {
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
    type: 'bar', // Use 'bar' type as the base
    data: {
      labels,
      datasets: [
        {
          label: label,
          data: values,
          backgroundColor: color,
          borderColor: color,
          barThickness: 4, // The "stick"
        },
        {
          label: 'Score dot',
          data: values,
          type: 'scatter', // Overlay scatter for the "dot"
          backgroundColor: color,
          radius: 8,
          hoverRadius: 8 // Ensure radius doesn't change on hover
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          left: 0,
          right: 10,
          top: 10,
          bottom: 10,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 5,
          title: {
            display: true,
            text: 'Average Score (out of 5)'
          }
        },
        x: {
          title: {
            display: true,
            text: 'State'
          },
          grid: {
            display: false
          },
          ticks: {
            maxRotation: 45,
            minRotation: 0,
            font: {
              size: 10,
            },
          }
        }
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const i = elements[0].index;
          const state = event.chart.data.labels[i];
          handleStateSelection(state);
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          filter: (tooltipItem) => tooltipItem.datasetIndex === 1,
          callbacks: {
            label: (ctx) => `${label}: ${ctx.parsed.y.toFixed(2)} ★`,
          },
        },
      },
    }
  });
}

function drawScatterChart(canvasId, dataPoints, label, color, noteText = null) {
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

  // Set chart note if provided
  const note = canvas.parentElement?.querySelector(".chart-note");
  if (note && noteText) {
    note.textContent = noteText;
  }

  return new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label,
          data: dataPoints,
          backgroundColor: color,
          pointRadius: 6,
          pointHoverRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const i = elements[0].index;
          const state = event.chart.data.datasets[0].data[i].label;
          handleStateSelection(state);
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => items[0].raw.label,
            label: (ctx) => [
              `Freight: R$ ${ctx.parsed.x.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}`,
              `Revenue: R$ ${ctx.parsed.y.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}`,
            ],
          },
        },
      },
      layout: {
        padding: {
          left: 0,
          right: 10,
          top: 10,
          bottom: 10,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Average Freight Cost (R$)",
            font: {
              size: 12,
            },
          },
          ticks: {
            font: {
              size: 10,
            },
            callback: (v) => `R$ ${v.toLocaleString("pt-BR")}`,
          },
          grid: {
            color: "#f0f0f0",
          },
        },
        y: {
          type: 'logarithmic', // Use a logarithmic scale
          title: {
            display: true,
            text: "Total Revenue (R$)",
            font: {
              size: 12,
            },
          },
          ticks: {
            font: {
              size: 10,
            },
            // Format ticks for a log scale (e.g., 1k, 10k, 100k)
            callback: function(value, index, values) {
              if (value === 1000 || value === 10000 || value === 100000 || value === 1000000) {
                return `R$ ${(value / 1000)}k`;
              }
              return null; // Hide other labels
            },
          },
          grid: {
            color: "#f0f0f0",
          },
        },
      },
    },
  });
}

// === STEP 5: Filters ===

let allData = [];

function handleStateSelection(stateAbbr) {
  // If the clicked state is already selected, un-select it. Otherwise, select the new one.
  selectedState = selectedState === stateAbbr ? null : stateAbbr;

  // Update the visual styles of all charts and the map
  updateChartStyles(selectedState);
  updateMapStyles(selectedState);

  // Also update the dropdown to reflect the current selection
  const currentFilter = document.getElementById("geo-filter");
  if (currentFilter) {
    currentFilter.value = selectedState || "";
  }
}

// This function applies visual styles for selection
function updateChartStyles(selectedState) {
  // --- Update Revenue Chart ---
  const revChart = charts.revenueByState;
  if (revChart) {
    revChart.data.datasets[0].backgroundColor = revChart.data.labels.map(
      (state) =>
        !selectedState || state === selectedState
          ? "#0ea5e9"
          : "rgba(14, 165, 233, 0.3)"
    );
    revChart.update();
  }

  // --- Update Delivery Chart ---
  const delChart = charts.deliveryTimeByState;
  if (delChart) {
    delChart.data.datasets[0].backgroundColor = delChart.data.labels.map(
      (state) =>
        !selectedState || state === selectedState
          ? "#0ea5e9"
          : "rgba(14, 165, 233, 0.3)"
    );
    delChart.update();
  }

  // --- Update Review Lollipop Chart ---
  const reviewChart = charts.reviewScoreByState;
  if (reviewChart) {
    const color = !selectedState
      ? "#0ea5e9"
      : "rgba(14, 165, 233, 0.3)";
    
    reviewChart.data.datasets[0].backgroundColor = reviewChart.data.labels.map(
        (state) => !selectedState || state === selectedState ? '#0ea5e9' : 'rgba(14, 165, 233, 0.3)'
    );
    reviewChart.data.datasets[1].backgroundColor = reviewChart.data.labels.map(
        (state) => !selectedState || state === selectedState ? '#0ea5e9' : 'rgba(14, 165, 233, 0.3)'
    );
    reviewChart.update();
  }

  // --- Update Freight/Revenue Scatter Chart ---
  const scatterChart = charts.freightVsRevenue;
  if (scatterChart) {
    scatterChart.data.datasets[0].backgroundColor = scatterChart.data.datasets[0].data.map(
      (point) =>
        !selectedState || point.label === selectedState
          ? "#0ea5e9"
          : "rgba(14, 165, 233, 0.3)"
    );
    scatterChart.update();
  }
}

function setupFilterEvents(data) {
  allData = data; // Store full dataset

  const filterEl = document.getElementById("geo-filter");
  const resetBtn = document.getElementById("reset-selection");

  if (!filterEl || !resetBtn) return;

  // When the dropdown is changed, update the selection
  filterEl.addEventListener("change", (e) => {
    handleStateSelection(e.target.value || null);
  });

  // The reset button should clear the selection
  resetBtn.addEventListener("click", () => {
    handleStateSelection(null);
  });

  // Setup sorting event handlers
  setupSortingEvents();
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

function drawMap(data) {
  console.log("🔍 Starting drawMap");

  const width = 500;
  const height = 550; // Map height
  const legendHeight = 60; // Space for legend
  const totalHeight = height + legendHeight; // Total SVG height

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
        .attr("height", totalHeight);

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

      const tooltip = d3
        .select("body")
        .append("div")
        .attr("class", "map-tooltip")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.9)")
        .style("color", "white")
        .style("padding", "10px 15px")
        .style("border-radius", "6px")
        .style("font-size", "0.9rem")
        .style("pointer-events", "none")
        .style("z-index", "1000")
        .style("opacity", "0")
        .style("transition", "opacity 0.2s")
        .style("box-shadow", "0 2px 10px rgba(0, 0, 0, 0.3)")
        .style("max-width", "200px");

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

          if (selectedState !== abbr) {
            d3.select(this).attr("stroke", "#000").attr("stroke-width", 2);
          }
        })
        .on("mouseout", function (event, d) {
          tooltip.style("opacity", 0);
          const abbr = stateNameToAbbr[d.properties.name];
          if (selectedState !== abbr) {
            d3.select(this).attr("stroke", "#fff").attr("stroke-width", 1);
          }
        })
        .on("click", function (event, d) {
          const abbr = stateNameToAbbr[d.properties.name];

          // Immediately clear all hover effects
          d3.select("#brazil-map")
            .selectAll("path")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1);

          handleStateSelection(abbr);
          updateMapStyles(); // Apply selection styling
        });

      // Add state labels using a data join to bind data correctly
      svg
        .selectAll(".state-label")
        .data(geo.features)
        .join("text")
        .attr("class", "state-label")
        .attr("x", (d) => path.centroid(d)[0])
        .attr("y", (d) => path.centroid(d)[1])
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .attr("fill", (d) => {
          const abbr = stateNameToAbbr[d.properties.name];
          const revenue = revenueByState.get(abbr) || 0;
          const fillColor = colorScale(revenue);
          return getTextColor(fillColor);
        })
        .text((d) => stateNameToAbbr[d.properties.name])
        .style("pointer-events", "none")
        .style("font-size", "10px")
        .style("display", (d) => {
          const centroid = path.centroid(d);
          // hide if outside bounds or for very small states
          return centroid[0] > 0 &&
            centroid[0] < width &&
            centroid[1] > 0 &&
            centroid[1] < height &&
            path.area(d) > 100 // Heuristic for area
            ? "initial"
            : "none";
        });

      // Optional legend bar
      const legend = svg
        .append("g")
        .attr("transform", `translate(${width / 2 - 150}, ${height + 10})`);

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

      legend.append("g").attr("transform", "translate(0, 20)").call(legendAxis);

      legend
        .append("text")
        .attr("x", 150)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .attr("fill", "#333")
        .style("font-weight", "bold")
        .text("Revenue (R$)");
    })
    .catch((err) => console.error("Error loading map data:", err));
}

function getTextColor(bgColor) {
  const rgb = d3.color(bgColor);
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 140 ? "#000" : "#fff";
}

function updateMapStyles(selectedState) {
  d3.select("#brazil-map")
    .selectAll("path") // These are state paths
    .attr("fill-opacity", (d) => {
      const abbr = stateNameToAbbr[d.properties.name];
      return !selectedState || selectedState === abbr ? 1 : 0.3;
    })
    .attr("stroke", (d) => {
      const abbr = stateNameToAbbr[d.properties.name];
      return selectedState === abbr ? "#000" : "#fff";
    })
    .attr("stroke-width", (d) => {
      const abbr = stateNameToAbbr[d.properties.name];
      return selectedState === abbr ? 3 : 1;
    });

  d3.select("#brazil-map")
    .selectAll(".state-label")
    .attr("opacity", (d) => {
      const abbr = stateNameToAbbr[d.properties.name];
      console.log(abbr, selectedState);
      return !selectedState || selectedState === abbr ? 1 : 0.5;
    });

  console.log("✅ Map styles updated for selected state:", selectedState);
}

// Function to setup sorting event handlers
function setupSortingEvents() {
  console.log("🔧 Setting up sorting events...");
  
  // Delivery sorting
  const deliveryAscBtn = document.getElementById("delivery-sort-asc");
  const deliveryDescBtn = document.getElementById("delivery-sort-desc");
  
  if (deliveryAscBtn) {
    deliveryAscBtn.addEventListener("click", () => {
      console.log("🔄 Sorting delivery: ASC (lowest to highest, left to right)");
      deliverySortOrder = 'asc';
      updateSortButtonStates('delivery', 'asc');
      console.log("📊 Redrawing charts with allData:", allData?.length || 'undefined');
      drawCharts(allData);
    });
  } else {
    console.warn("⚠️ Delivery ASC button not found");
  }

  if (deliveryDescBtn) {
    deliveryDescBtn.addEventListener("click", () => {
      console.log("🔄 Sorting delivery: DESC (highest to lowest, left to right)");
      deliverySortOrder = 'desc';
      updateSortButtonStates('delivery', 'desc');
      console.log("📊 Redrawing charts with allData:", allData?.length || 'undefined');
      drawCharts(allData);
    });
  } else {
    console.warn("⚠️ Delivery DESC button not found");
  }

  // Satisfaction sorting
  const satisfactionAscBtn = document.getElementById("satisfaction-sort-asc");
  const satisfactionDescBtn = document.getElementById("satisfaction-sort-desc");
  
  if (satisfactionAscBtn) {
    satisfactionAscBtn.addEventListener("click", () => {
      console.log("🔄 Sorting satisfaction: ASC (lowest to highest, left to right)");
      satisfactionSortOrder = 'asc';
      updateSortButtonStates('satisfaction', 'asc');
      console.log("📊 Redrawing charts with allData:", allData?.length || 'undefined');
      drawCharts(allData);
    });
  } else {
    console.warn("⚠️ Satisfaction ASC button not found");
  }

  if (satisfactionDescBtn) {
    satisfactionDescBtn.addEventListener("click", () => {
      console.log("🔄 Sorting satisfaction: DESC (highest to lowest, left to right)");
      satisfactionSortOrder = 'desc';
      updateSortButtonStates('satisfaction', 'desc');
      console.log("📊 Redrawing charts with allData:", allData?.length || 'undefined');
      drawCharts(allData);
    });
  } else {
    console.warn("⚠️ Satisfaction DESC button not found");
  }

  // Set initial button states
  updateSortButtonStates('delivery', deliverySortOrder);
  updateSortButtonStates('satisfaction', satisfactionSortOrder);
  
  console.log("✅ Sorting events setup complete");
}

// Function to update sort button visual states
function updateSortButtonStates(chartType, activeOrder) {
  const ascBtn = document.getElementById(`${chartType}-sort-asc`);
  const descBtn = document.getElementById(`${chartType}-sort-desc`);
  
  if (ascBtn && descBtn) {
    ascBtn.classList.toggle('active', activeOrder === 'asc');
    descBtn.classList.toggle('active', activeOrder === 'desc');
  }
}