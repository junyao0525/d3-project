// Fixed version of your JavaScript functions

// Global variables for highlighting functionality
let selectedCategory = null;
let originalChartData = {};

d3.csv("olist_combined_clean_3.csv").then((data) => {
  preprocess(data);
  drawCategoryAnalysis(data);
  setupFilterEvents3(data);
  setTimeout(() => {
    showCategoryInsights(data);
  }, 0);
});

function drawCategoryAnalysis(data) {
  const categories = Array.from(
    new Set(data.map((d) => d.product_category_name))
  );

  // === Filter Dropdown ===
  const select = document.getElementById("category-filter");

  // Clear existing options first
  select.innerHTML = '<option value="">All Categories</option>';

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
    
    // Clear highlighting when filter changes
    selectedCategory = null;
    
    drawCategoryCharts(filtered);
    showCategoryInsights(filtered); // ✅ Now passing correct filtered data
  });

  drawCategoryCharts(data);
  showCategoryInsights(data); // ✅ Fixed: was calling with undefined 'filtered'
}

function drawCategoryCharts(data) {
  // Destroy existing charts
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

  // === Derived Metrics ===
  const totalRevenue = d3.sum(catAgg, ([_, v]) => v.totalRevenue);
  const topRevenue = catAgg
    .sort((a, b) => d3.descending(a[1].totalRevenue, b[1].totalRevenue))
    .slice(0, 10);
  const topReview = catAgg
    .sort((a, b) => d3.descending(a[1].avgReview, b[1].avgReview))
    .slice(0, 10);
  const topCancel = catAgg
    .sort((a, b) => d3.descending(a[1].cancelRate, b[1].cancelRate))
    .slice(0, 10);

  // === Chart 1: Revenue by Category ===
  const revLabels = topRevenue.map((d) => d[0]);
  const revValues = topRevenue.map((d) => d[1].totalRevenue);
  const topRevCat = topRevenue[0];
  const revenuePct = ((topRevCat[1].totalRevenue / totalRevenue) * 100).toFixed(
    1
  );

  const revCtx = document.getElementById("revenueByCategory").getContext("2d");
  window.catChart1 = new Chart(revCtx, {
    type: "bar",
    data: {
      labels: revLabels,
      datasets: [
        { 
          label: "Revenue (R$)", 
          data: revValues, 
          backgroundColor: revLabels.map(label => getBarColor(label, selectedCategory)),
          borderColor: revLabels.map(label => getBarColor(label, selectedCategory)),
          borderWidth: 1
        },
      ],
    },
    options: { 
      responsive: true, 
      scales: { y: { beginAtZero: true } },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const clickedIndex = elements[0].index;
          const clickedCategory = revLabels[clickedIndex];
          toggleCategorySelection(clickedCategory);
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Revenue: R$${context.parsed.y.toFixed(2)}`;
            }
          }
        }
      }
    },
  });
  document
    .querySelector("#revenueByCategory")
    .parentElement.querySelector(
      ".chart-note"
    ).textContent = `${topRevCat[0]} accounts for ${revenuePct}% of total revenue`;

  // === Chart 2: Avg Review Score ===
  const reviewLabels = topReview.map((d) => d[0]);
  const reviewValues = topReview.map((d) => d[1].avgReview);
  const bestReviewCat = topReview[0];

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
          backgroundColor: reviewLabels.map(label => getBarColor(label, selectedCategory)),
          borderColor: reviewLabels.map(label => getBarColor(label, selectedCategory)),
          borderWidth: 1
        },
      ],
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, max: 5 } },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const clickedIndex = elements[0].index;
          const clickedCategory = reviewLabels[clickedIndex];
          toggleCategorySelection(clickedCategory);
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Avg Review: ${context.parsed.y.toFixed(2)}/5`;
            }
          }
        }
      }
    },
  });
  document
    .querySelector("#reviewByCategory")
    .parentElement.querySelector(".chart-note").textContent = `${
    bestReviewCat[0]
  } has the highest satisfaction with ${bestReviewCat[1].avgReview.toFixed(
    2
  )} stars`;

  // === Chart 3: Scatter — Revenue vs Avg Review ===
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
          backgroundColor: scatterData.map(point => getPointColor(point.label, selectedCategory)),
          borderColor: scatterData.map(point => getPointColor(point.label, selectedCategory)),
          borderWidth: 1,
          pointRadius: 6,
          pointHoverRadius: 8
        },
      ],
    },
    options: {
      responsive: true,
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const clickedIndex = elements[0].index;
          const clickedCategory = scatterData[clickedIndex].label;
          toggleCategorySelection(clickedCategory);
        }
      },
      plugins: {
        legend: {
          display: false
        },
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

  // Pick the top quadrant category
  const quadrantWinner = scatterData
    .filter((d) => d.x >= 4 && d.y >= totalRevenue / catAgg.length) // threshold
    .sort((a, b) => d3.descending(a.y + a.x, b.y + b.x))[0];

  document
    .querySelector("#scatterRevenueReview")
    .parentElement.querySelector(".chart-note").textContent = quadrantWinner
    ? `${quadrantWinner.label} shows strong growth in both revenue and satisfaction`
    : "No standout category in both metrics";

  // === Chart 4: Cancellation Rate ===
  const cancelLabels = topCancel.map((d) => d[0]);
  const cancelRates = topCancel.map((d) => (d[1].cancelRate * 100).toFixed(2));
  const worstCancelCat = topCancel[0];

  const cancelCtx = document
    .getElementById("returnByCategory")
    .getContext("2d");
  window.catChart4 = new Chart(cancelCtx, {
    type: "bar",
    data: {
      labels: cancelLabels,
      datasets: [
        {
          label: "Cancellation Rate (%)",
          data: cancelRates,
          backgroundColor: cancelLabels.map(label => getBarColor(label, selectedCategory)),
          borderColor: cancelLabels.map(label => getBarColor(label, selectedCategory)),
          borderWidth: 1
        },
      ],
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true, max: 100 } },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const clickedIndex = elements[0].index;
          const clickedCategory = cancelLabels[clickedIndex];
          toggleCategorySelection(clickedCategory);
        }
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Cancellation Rate: ${context.parsed.y}%`;
            }
          }
        }
      }
    },
  });
  document
    .querySelector("#returnByCategory")
    .parentElement.querySelector(".chart-note").textContent = `${
    worstCancelCat[0]
  } has the highest return rate at ${(
    worstCancelCat[1].cancelRate * 100
  ).toFixed(1)}%`;

  // Store original data for highlighting
  originalChartData = {
    revLabels, revValues, reviewLabels, reviewValues, 
    scatterData, cancelLabels, cancelRates
  };
}

// Helper function to get color based on selection state
function getBarColor(category, selectedCategory) {
  const baseColor = "#f59e0b";
  const baseColorTransparent = "rgba(245, 158, 11, 0.3)";

  if (!selectedCategory || category === selectedCategory) {
    return baseColor;
  } else {
    return baseColorTransparent;
  }
}

// Helper function to get point color for scatter plot
function getPointColor(category, selectedCategory) {
  const baseColor = "#f59e0b";
  const baseColorTransparent = "rgba(245, 158, 11, 0.3)";
  
  if (!selectedCategory || category === selectedCategory) {
    return baseColor;
  } else {
    return baseColorTransparent;
  }
}

// Function to toggle category selection
function toggleCategorySelection(category) {
  if (selectedCategory === category) {
    // If clicking the same category, deselect it
    selectedCategory = null;
  } else {
    // Select the new category
    selectedCategory = category;
  }
  
  // Update all charts with new highlighting
  updateChartHighlighting();
}

// Function to update highlighting across all charts
function updateChartHighlighting() {
  // Update Chart 1 (Revenue)
  if (window.catChart1 && originalChartData.revLabels) {
    window.catChart1.data.datasets[0].backgroundColor = originalChartData.revLabels.map(
      label => getBarColor(label, selectedCategory)
    );
    window.catChart1.data.datasets[0].borderColor = originalChartData.revLabels.map(
      label => getBarColor(label, selectedCategory)
    );
    window.catChart1.update();
  }

  // Update Chart 2 (Review)
  if (window.catChart2 && originalChartData.reviewLabels) {
    window.catChart2.data.datasets[0].backgroundColor = originalChartData.reviewLabels.map(
      label => getBarColor(label, selectedCategory)
    );
    window.catChart2.data.datasets[0].borderColor = originalChartData.reviewLabels.map(
      label => getBarColor(label, selectedCategory)
    );
    window.catChart2.update();
  }

  // Update Chart 3 (Scatter)
  if (window.catChart3 && originalChartData.scatterData) {
    window.catChart3.data.datasets[0].backgroundColor = originalChartData.scatterData.map(
      point => getPointColor(point.label, selectedCategory)
    );
    window.catChart3.data.datasets[0].borderColor = originalChartData.scatterData.map(
      point => getPointColor(point.label, selectedCategory)
    );
    window.catChart3.update();
  }

  // Update Chart 4 (Cancellation)
  if (window.catChart4 && originalChartData.cancelLabels) {
    window.catChart4.data.datasets[0].backgroundColor = originalChartData.cancelLabels.map(
      label => getBarColor(label, selectedCategory)
    );
    window.catChart4.data.datasets[0].borderColor = originalChartData.cancelLabels.map(
      label => getBarColor(label, selectedCategory)
    );
    window.catChart4.update();
  }
}

function setupFilterEvents3(originalData) {
  document
    .getElementById("reset-category-filter")
    .addEventListener("click", () => {
      document.getElementById("category-filter").value = "";
      document.getElementById("category-filter-display").textContent =
        "All categories";

      // Clear highlighting
      selectedCategory = null;

      // 🔄 Call the category-related redraw function
      drawCategoryCharts(originalData);
      showCategoryInsights(originalData);
    });
}

function showCategoryInsights(data) {
  console.log("🔍 showCategoryInsights called with data:", data?.length);

  if (!data || !data.length) {
    console.warn("⚠️ No data passed to showCategoryInsights.");
    return;
  }

  const catAgg = d3
    .rollups(
      data,
      (v) => ({
        totalRevenue: d3.sum(v, (d) => +d.payment_value || 0),
        avgReview: d3.mean(v, (d) => +d.review_score || 0),
        count: v.length,
        category: v[0]?.product_category_name,
      }),
      (d) => d.product_category_name
    )
    .filter(([k, v]) => k && k.trim() && v.totalRevenue > 0);

  if (!catAgg.length) {
    console.warn("⚠️ No valid aggregated categories found.");
    console.log("Sample data structure:", data[0]);
    return;
  }

  console.log("✅ Aggregated category data:", catAgg);

  // === Lowest Revenue Category ===
  const lowestRevenue = catAgg.reduce((a, b) =>
    a[1].totalRevenue < b[1].totalRevenue ? a : b
  );
  console.log("💸 Lowest Revenue:", lowestRevenue);

  const card0 = document.getElementById("lowest-revenue-card");
  if (card0) {
    card0.querySelector(".summary-value").textContent = lowestRevenue[0];
  }

  // === Lowest Review Score ===
  const lowestReview = catAgg.reduce((a, b) =>
    a[1].avgReview < b[1].avgReview ? a : b
  );
  console.log("🔻 Lowest Review:", lowestReview);

  const card1 = document.getElementById("lowest-review-card");
  if (card1) {
    card1.querySelector(
      ".summary-value"
    ).textContent = `${lowestReview[1].avgReview.toFixed(1)}/5`;
  }

  // === Fastest Growing ===
  const growth = catAgg.map(([cat, val]) => {
    const simulatedPrevious = val.count * 0.75;
    const growthRate =
      ((val.count - simulatedPrevious) / simulatedPrevious) * 100;
    return [cat, growthRate];
  });
  const fastestGrowing = growth.reduce((a, b) => (a[1] > b[1] ? a : b));
  console.log("🚀 Fastest Growing:", fastestGrowing);

  const card2 = document.getElementById("fastest-growth-card");
  if (card2) {
    card2.querySelector(".summary-value").textContent = fastestGrowing[0];
  }

  // === Highest Satisfaction ===
  const highestReview = catAgg.reduce((a, b) =>
    a[1].avgReview > b[1].avgReview ? a : b
  );
  console.log("⭐ Highest Satisfaction:", highestReview);

  const card3 = document.getElementById("highest-satisfaction-card");
  if (card3) {
    card3.querySelector(
      ".summary-value"
    ).textContent = `${highestReview[1].avgReview.toFixed(1)}/5`;
  }

  console.log("✅ showCategoryInsights completed successfully");
}
