// app_q2.js
// === Question 2: Payment Analysis ===
d3.csv("olist_combined_clean_3.csv").then((data) => {
  preprocess(data);
  initPaymentDashboard(data);
  drawPaymentCharts(data);
  showPaymentInsights(data);
  setupFilterEvents2(data);
});

function initPaymentDashboard(data) {
  const paymentTypes = Array.from(new Set(data.map((d) => d.payment_type)));

  const select = document.getElementById("payment-filter");
  paymentTypes.forEach((type) => {
    const opt = document.createElement("option");
    opt.value = type;
    opt.textContent = type;
    select.appendChild(opt);
  });

  select.addEventListener("change", () => {
    const selected = select.value;
    const filtered = selected
      ? data.filter((d) => d.payment_type === selected)
      : data;

    document.getElementById("payment-filter-display").textContent =
      selected || "All payment types";

    drawPaymentCharts(filtered);
    showPaymentInsights(filtered);
  });
}
function drawPaymentCharts(data) {
  // === Destroy existing charts if any ===
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
    }),
    (d) => d.payment_type
  );

  const labels = paymentAgg.map((d) => d[0]);
  const avgPayments = paymentAgg.map((d) => d[1].avgPayment);
  const avgReviews = paymentAgg.map((d) => d[1].avgReview);

  // === Chart 1: Avg Payment Value ===
  window.paymentChart1 = new Chart(document.getElementById("avgPaymentValue"), {
    type: "bar",
    data: {
      labels: labels,
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

  // === Chart 2: Avg Review Score ===
  window.paymentChart2 = new Chart(document.getElementById("avgReviewScore"), {
    type: "bar",
    data: {
      labels: labels,
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
    label: type,
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

  // === Chart 4: Payment Type by Product Category ===
  const catPayAgg = d3.rollups(
    data,
    (v) => v.length,
    (d) => d.product_category_name,
    (d) => d.payment_type
  );

  const categories = catPayAgg.map((d) => d[0]);
  const datasets = paymentTypes.map((type, i) => ({
    label: type,
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
        datasets: datasets,
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
}
function showPaymentInsights(data) {
  const paymentAgg = d3.rollups(
    data,
    (v) => ({
      count: v.length,
      avgPayment: d3.mean(v, (d) => +d.payment_value),
      avgReview: d3.mean(v, (d) => +d.review_score),
    }),
    (d) => d.payment_type
  );
  console.log("Sample data row:", data[0]);
  // Highest payment
  const topPayment = paymentAgg.reduce((a, b) =>
    a[1].avgPayment > b[1].avgPayment ? a : b
  );
  document.getElementById("top-payment-type").textContent = `${
    topPayment[0]
  } (R$${topPayment[1].avgPayment.toFixed(2)})`;

  // Best review
  const topReview = paymentAgg.reduce((a, b) =>
    a[1].avgReview > b[1].avgReview ? a : b
  );
  document.getElementById("top-review-type").textContent = `${
    topReview[0]
  } (${topReview[1].avgReview.toFixed(2)})`;

  // Most used
  const mostUsed = paymentAgg.reduce((a, b) =>
    a[1].count > b[1].count ? a : b
  );
  document.getElementById(
    "most-used-type"
  ).textContent = `${mostUsed[0]} (${mostUsed[1].count} orders)`;
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
