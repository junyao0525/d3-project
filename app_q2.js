// === Question 2: Payment Analysis ===
d3.csv("olist_combined_clean_3.csv").then((data) => {
  preprocess(data);
  initPaymentDashboard(data);
  drawPaymentCharts(data);
  showPaymentInsights(data);
  setupFilterEvents2(data);
});

// === Optional: Friendly labels for payment types ===
const paymentLabels = {
  credit_card: "Credit Card",
  boleto: "Boleto",
  voucher: "Voucher",
  debit_card: "Debit Card",
};

function formatPaymentLabel(type) {
  return paymentLabels[type] || type;
}

function initPaymentDashboard(data) {
  const paymentTypes = Array.from(new Set(data.map((d) => d.payment_type)));

  const select = document.getElementById("payment-filter");
  paymentTypes.forEach((type) => {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = formatPaymentLabel(type);
    select.appendChild(opt);
  });

  select.addEventListener("change", () => {
    const selected = select.value;
    const filtered = selected
      ? data.filter((d) => d.payment_type === selected)
      : data;

    document.getElementById("payment-filter-display").textContent = selected
      ? formatPaymentLabel(selected)
      : "All payment types";

    drawPaymentCharts(filtered);
    showPaymentInsights(filtered);
  });
}

function drawPaymentCharts(data) {
  // Destroy existing charts
  ["paymentChart1", "paymentChart2", "paymentChart3", "paymentChart4"].forEach(
    (chart) => {
      if (window[chart]) window[chart].destroy();
    }
  );

  // === Aggregation ===
  const paymentAgg = d3.rollups(
    data,
    (v) => ({
      avgPayment: d3.mean(v, (d) => +d.payment_value),
      avgReview: d3.mean(v, (d) => +d.review_score),
      count: v.length,
    }),
    (d) => d.payment_type
  );

  const labels = paymentAgg.map((d) => formatPaymentLabel(d[0]));
  const avgPayments = paymentAgg.map((d) => d[1].avgPayment);
  const avgReviews = paymentAgg.map((d) => d[1].avgReview);

  // === Chart 1: Avg Payment Value ===
  window.paymentChart1 = new Chart(document.getElementById("avgPaymentValue"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Avg Payment Value (R$)",
          data: avgPayments,
          backgroundColor: "#0ea5e9",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `R$ ${ctx.parsed.y.toFixed(2)}`,
          },
        },
        legend: { display: false },
      },
      scales: { y: { beginAtZero: true } },
    },
  });

  const lowestPayment = paymentAgg.reduce((a, b) =>
    a[1].avgPayment < b[1].avgPayment ? a : b
  );
  document
    .querySelector("#avgPaymentValue")
    .parentElement.querySelector(
      ".chart-note"
    ).textContent = `${formatPaymentLabel(
    lowestPayment[0]
  )} payments typically smaller`;

  // === Chart 2: Avg Review Score ===
  window.paymentChart2 = new Chart(document.getElementById("avgReviewScore"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Avg Review Score",
          data: avgReviews,
          backgroundColor: "#f59e0b",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}`,
          },
        },
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 5,
        },
      },
    },
  });

  const lowestReview = paymentAgg.reduce((a, b) =>
    a[1].avgReview < b[1].avgReview ? a : b
  );
  document
    .querySelector("#avgReviewScore")
    .parentElement.querySelector(
      ".chart-note"
    ).textContent = `${formatPaymentLabel(
    lowestReview[0]
  )} shows lower satisfaction`;

  // === Chart 3: Order Value Distribution ===
  const bins = [0, 50, 100, 150, 200, 1000];
  const binLabels = ["0–50", "51–100", "101–150", "151–200", "200+"];

  const paymentTypes = Array.from(new Set(data.map((d) => d.payment_type)));
  const binned = {};
  paymentTypes.forEach((type) => {
    binned[type] = Array(bins.length - 1).fill(0);
  });

  data.forEach((d) => {
    const value = +d.payment_value;
    const type = d.payment_type;
    for (let i = 0; i < bins.length - 1; i++) {
      if (value >= bins[i] && value < bins[i + 1]) {
        binned[type][i]++;
        break;
      }
    }
  });

  const histDatasets = paymentTypes.map((type, i) => ({
    label: formatPaymentLabel(type),
    data: binned[type],
    backgroundColor: `hsl(${i * 60}, 70%, 60%)`,
  }));

  window.paymentChart3 = new Chart(
    document.getElementById("orderValueDistribution"),
    {
      type: "bar",
      data: {
        labels: binLabels,
        datasets: histDatasets,
      },
      options: {
        responsive: true,
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true },
        },
      },
    }
  );

  const creditGrowth =
    ((binned["credit_card"]?.[2] ?? 0) + (binned["credit_card"]?.[3] ?? 0)) /
    d3.sum(binned["credit_card"] ?? []);
  document
    .querySelector("#orderValueDistribution")
    .parentElement.querySelector(
      ".chart-note"
    ).textContent = `Credit card usage in higher value orders is ${(
    creditGrowth * 100
  ).toFixed(0)}%`;

  // === Chart 4: Payment Type by Product Category ===
  const catPayAgg = d3.rollups(
    data,
    (v) => v.length,
    (d) => d.product_category_name,
    (d) => d.payment_type
  );

  const categories = catPayAgg.map((d) => d[0]);
  const datasets = paymentTypes.map((type, i) => ({
    label: formatPaymentLabel(type),
    data: categories.map((cat) => {
      const found = catPayAgg.find((d) => d[0] === cat);
      const sub = found ? found[1].find(([t]) => t === type) : undefined;
      return sub ? sub[1] : 0;
    }),
    backgroundColor: `hsl(${i * 60}, 80%, 60%)`,
  }));

  window.paymentChart4 = new Chart(
    document.getElementById("paymentByCategory"),
    {
      type: "bar",
      data: {
        labels: categories,
        datasets,
      },
      options: {
        responsive: true,
        scales: {
          x: { stacked: true },
          y: { stacked: true, beginAtZero: true },
        },
      },
    }
  );

  // Find which category has highest credit card usage
  let topCat = "";
  let topRatio = 0;
  catPayAgg.forEach(([cat, list]) => {
    const total = d3.sum(list, (d) => d[1]);
    const credit = list.find(([type]) => type === "credit_card");
    const ratio = credit ? credit[1] / total : 0;
    if (ratio > topRatio) {
      topRatio = ratio;
      topCat = cat;
    }
  });

  document
    .querySelector("#paymentByCategory")
    .parentElement.querySelector(".chart-note").textContent = topCat
    ? `${topCat} dominated by credit cards (${(topRatio * 100).toFixed(0)}%)`
    : "No clear leader by credit card usage";
}
function formatPaymentLabel(label) {
  switch (label) {
    case "credit_card":
      return "Credit Card";
    case "debit_card":
      return "Debit Card";
    case "boleto":
      return "Boleto";
    case "voucher":
      return "Voucher";
    case "":
    case null:
    case undefined:
      return "Unknown";
    default:
      return label.charAt(0).toUpperCase() + label.slice(1);
  }
}
function showPaymentInsights(data) {
  const paymentAgg = d3
    .rollups(
      data,
      (v) => ({
        count: v.length,
        avgPayment: d3.mean(v, (d) => +d.payment_value),
        avgReview: d3.mean(v, (d) => +d.review_score),
      }),
      (d) => d.payment_type
    )
    .filter(([type]) => type); // exclude empty/null types

  if (!paymentAgg.length) return;

  // Calculate overall average values for trend comparison
  const totalCount = d3.sum(paymentAgg, ([, val]) => val.count);
  const overallAvgPayment =
    d3.sum(paymentAgg, ([, val]) => val.avgPayment * val.count) / totalCount;
  const overallAvgReview =
    d3.sum(paymentAgg, ([, val]) => val.avgReview * val.count) / totalCount;

  // === Highest Avg Payment
  const topPayment = paymentAgg.reduce((a, b) =>
    a[1].avgPayment > b[1].avgPayment ? a : b
  );

  const paymentDiff = topPayment[1].avgPayment - overallAvgPayment;
  const paymentTrendText =
    paymentAgg.length > 1
      ? `${Math.abs((paymentDiff / overallAvgPayment) * 100).toFixed(0)}% ${
          paymentDiff >= 0 ? "higher" : "lower"
        } than average`
      : "Only method shown";

  document.querySelector(
    "#insight-highest-payment .value"
  ).textContent = `R$${topPayment[1].avgPayment.toFixed(2)}`;
  document.querySelector(
    "#insight-highest-payment .label"
  ).textContent = `${formatPaymentLabel(topPayment[0])} payments`;
  document.querySelector(
    "#insight-highest-payment .trend-indicator"
  ).textContent = paymentTrendText;

  // === Best Customer Feedback
  const topReview = paymentAgg.reduce((a, b) =>
    a[1].avgReview > b[1].avgReview ? a : b
  );

  const reviewDiff = topReview[1].avgReview - overallAvgReview;
  const reviewTrendText =
    paymentAgg.length > 1
      ? `${Math.abs((reviewDiff / overallAvgReview) * 100).toFixed(0)}% ${
          reviewDiff >= 0 ? "higher" : "lower"
        } satisfaction`
      : "Only method shown";

  document.querySelector(
    "#insight-best-review .value"
  ).textContent = `${topReview[1].avgReview.toFixed(2)} ★`;
  document.querySelector(
    "#insight-best-review .label"
  ).textContent = `${formatPaymentLabel(topReview[0])} payments`;
  document.querySelector("#insight-best-review .trend-indicator").textContent =
    reviewTrendText;

  // === Most Used
  const mostUsed = paymentAgg.reduce((a, b) =>
    a[1].count > b[1].count ? a : b
  );

  const usagePercent = ((mostUsed[1].count / totalCount) * 100).toFixed(1);
  document.querySelector(
    "#insight-most-popular .value"
  ).textContent = `${usagePercent}%`;
  document.querySelector(
    "#insight-most-popular .label"
  ).textContent = `${formatPaymentLabel(mostUsed[0])} dominance`;
  document.querySelector("#insight-most-popular .trend-indicator").textContent =
    paymentAgg.length > 1 ? "Stable from last quarter" : "Only method shown";

  console.log("📊 Payment Aggregation (cleaned):", paymentAgg);
}

function setupFilterEvents2(originalData) {
  document
    .getElementById("reset-payment-filter")
    .addEventListener("click", () => {
      document.getElementById("payment-filter").value = "";
      document.getElementById("payment-filter-display").textContent =
        "All payment types";
      drawPaymentCharts(originalData);
      showPaymentInsights(originalData);
    });
}
