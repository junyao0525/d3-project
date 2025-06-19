d3.csv("olist_combined_clean_3.csv").then((data) => {
  preprocess(data);
  drawCategoryAnalysis(data);
  setupFilterEvents3(data);
});

function drawCategoryAnalysis(data) {
  const categories = Array.from(
    new Set(data.map((d) => d.product_category_name))
  );

  // === Filter Dropdown ===
  const select = document.getElementById("category-filter");
  categories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });

  select.addEventListener("change", () => {
    const val = select.value;
    const filtered = val
      ? data.filter((d) => d.product_category_name === val)
      : data;
    document.getElementById("category-filter-display").textContent =
      val || "All categories";
    drawCategoryCharts(filtered);
  });

  drawCategoryCharts(data);
}

function drawCategoryCharts(data) {
  ["catChart1", "catChart2", "catChart3", "catChart4"].forEach((id) => {
    if (window[id]) window[id].destroy();
  });

  // === Aggregations ===
  const catAgg = d3
    .rollups(
      data,
      (v) => ({
        totalRevenue: d3.sum(v, (d) => +d.payment_value),
        avgReview: d3.mean(v, (d) => +d.review_score),
        cancelRate:
          v.filter((d) => d.order_status !== "delivered").length / v.length,
      }),
      (d) => d.product_category_name
    )
    .filter(([k, v]) => k && v.totalRevenue > 0);

  // Sort top 10 for bar charts
  const topRevenue = catAgg
    .sort((a, b) => d3.descending(a[1].totalRevenue, b[1].totalRevenue))
    .slice(0, 10);
  const topReview = catAgg
    .sort((a, b) => d3.descending(a[1].avgReview, b[1].avgReview))
    .slice(0, 10);
  const topCancel = catAgg
    .sort((a, b) => d3.descending(a[1].cancelRate, b[1].cancelRate))
    .slice(0, 10);

  const revLabels = topRevenue.map((d) => d[0]);
  const revValues = topRevenue.map((d) => d[1].totalRevenue);

  const revCtx = document.getElementById("revenueByCategory").getContext("2d");
  window.catChart1 = new Chart(revCtx, {
    type: "bar",
    data: {
      labels: revLabels,
      datasets: [
        { label: "Revenue (R$)", data: revValues, backgroundColor: "#0ea5e9" },
      ],
    },
    options: { responsive: true, scales: { y: { beginAtZero: true } } },
  });

  const reviewLabels = topReview.map((d) => d[0]);
  const reviewValues = topReview.map((d) => d[1].avgReview);

  const reviewCtx = document
    .getElementById("reviewByCategory")
    .getContext("2d");
  window.catChart2 = new Chart(reviewCtx, {
    type: "bar",
    data: {
      labels: reviewLabels,
      datasets: [
        {
          label: "Avg Review Score",
          data: reviewValues,
          backgroundColor: "#f59e0b",
        },
      ],
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, max: 5 } },
    },
  });

  const scatterCtx = document
    .getElementById("scatterRevenueReview")
    .getContext("2d");
  const scatterData = catAgg.map(([cat, val]) => ({
    x: val.avgReview,
    y: val.totalRevenue,
    label: cat,
  }));

  window.catChart3 = new Chart(scatterCtx, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "Categories",
          data: scatterData,
          backgroundColor: "#6366f1",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${ctx.raw.label}: R$${ctx.raw.y.toFixed(
                2
              )}, Score: ${ctx.raw.x.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          title: { display: true, text: "Avg Review Score" },
          min: 0,
          max: 5,
        },
        y: {
          title: { display: true, text: "Revenue (R$)" },
          beginAtZero: true,
        },
      },
    },
  });

  const cancelLabels = topCancel.map((d) => d[0]);
  const cancelRates = topCancel.map((d) => (d[1].cancelRate * 100).toFixed(2));

  const cancelCtx = document
    .getElementById("cancelByCategory")
    .getContext("2d");
  window.catChart4 = new Chart(cancelCtx, {
    type: "bar",
    data: {
      labels: cancelLabels,
      datasets: [
        {
          label: "Cancellation Rate (%)",
          data: cancelRates,
          backgroundColor: "#ef4444",
        },
      ],
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, max: 100 } },
    },
  });

  // === Key Insight Text ===
  const worstRev = catAgg.reduce((min, curr) =>
    curr[1].totalRevenue < min[1].totalRevenue ? curr : min
  );
  const worstReview = catAgg.reduce((min, curr) =>
    curr[1].avgReview < min[1].avgReview ? curr : min
  );
  document.getElementById("lowest-revenue-cat").textContent = worstRev[0];
  document.getElementById("lowest-review-cat").textContent = worstReview[0];
}
function setupFilterEvents3(originalData) {
  document
    .getElementById("reset-category-filter")
    .addEventListener("click", () => {
      document.getElementById("category-filter").value = "";
      document.getElementById("category-filter-display").textContent =
        "All categories";

      // 🔄 Call the category-related redraw function instead
      drawCategoryAnalysis(originalData);
      showCategoryInsights(originalData);
    });
}
