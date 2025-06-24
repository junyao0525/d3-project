// Fixed version of your JavaScript functions

// Register Chart.js datalabels plugin
Chart.register(ChartDataLabels);

// Global variables for highlighting functionality
let selectedCategory = null;
let originalChartData = {};
let categoryData = null; // Store the full dataset locally for category charts

// Global variables for sorting functionality
let revenueSortOrder = "desc"; // Default: descending (highest first)
let reviewSortOrder = "desc"; // Default: descending (highest first)
let returnSortOrder = "desc"; // Default: descending (highest first)

console.log("revenueSortOrder", revenueSortOrder);

function formatCategoryName(name) {
  if (!name || typeof name !== "string") return "";
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Preprocess function to convert string values to numbers and dates
function preprocess(data) {
  data.forEach((d) => {
    d.payment_value = +d.payment_value;
    d.review_score = +d.review_score;
    d.freight_value = +d.freight_value;
    d.order_purchase_timestamp = new Date(d.order_purchase_timestamp);
    d.order_delivered_customer_date = new Date(d.order_delivered_customer_date);
  });
}

d3.csv("olist_dataset.csv").then((data) => {
  preprocess(data);
  drawCategoryAnalysis(data);
  setupFilterEvents3(data);
  setupSortingEvents();
  setTimeout(() => {
    showCategoryInsights(data);
  }, 0);
});

function drawCategoryAnalysis(data) {
  // Store data locally for access in toggleCategorySelection
  categoryData = data;

  const categories = Array.from(
    new Set(data.map((d) => d.product_category_name_english)) // Use English name
  ).filter(Boolean); // Remove any null/undefined entries

  // === Filter Dropdown ===
  const select = document.getElementById("category-filter");

  // Clear existing options first
  select.innerHTML = '<option value="">All Categories</option>';

  categories.sort().forEach((cat) => {
    // Sort categories alphabetically
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = formatCategoryName(cat); // Format for display
    select.appendChild(opt);
  });

  select.addEventListener("change", () => {
    const val = select.value;

    // Update the selected category for highlighting
    selectedCategory = val || null;

    // Update the filter display
    document.getElementById("category-filter-display").textContent =
      val || "All categories";

    // Smoothly update chart highlighting without redrawing
    updateChartHighlighting();
  });

  drawCategoryCharts(data);
  showCategoryInsights(data);
}

function drawCategoryCharts(data) {
  // Destroy existing charts
  ["catChart1", "catChart2", "catChart3", "catChart4"].forEach((id) => {
    if (window[id]) window[id].destroy();
  });

  // Check if data is valid
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.error("❌ Invalid data passed to drawCategoryCharts:", data);
    return;
  }

  console.log("📊 drawCategoryCharts called with data length:", data.length);

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
      (d) => d.product_category_name_english
    )
    .filter(([k, v]) => k && v.totalRevenue > 0);

  // === Derived Metrics ===
  const totalRevenue = d3.sum(catAgg, ([_, v]) => v.totalRevenue);

  // Get top 10 for each metric
  const topRevenue = catAgg
    .sort((a, b) =>
      revenueSortOrder === "desc"
        ? d3.descending(a[1].totalRevenue, b[1].totalRevenue)
        : d3.ascending(a[1].totalRevenue, b[1].totalRevenue)
    )
    .slice(0, 10);
  const topReview = catAgg
    .sort((a, b) =>
      reviewSortOrder === "desc"
        ? d3.descending(a[1].avgReview, b[1].avgReview)
        : d3.ascending(a[1].avgReview, b[1].avgReview)
    )
    .slice(0, 10);
  const topCancel = catAgg
    .sort((a, b) =>
      returnSortOrder === "desc"
        ? d3.descending(a[1].cancelRate, b[1].cancelRate)
        : d3.ascending(a[1].cancelRate, b[1].cancelRate)
    )
    .slice(0, 10);

  // Function to get chart data including selected category if not in top 10
  function getChartData(topData, selectedCategory, sortOrder) {
    if (!selectedCategory) {
      return topData;
    }

    // Check if selected category is already in top data
    const isInTop = topData.some(([cat, _]) => cat === selectedCategory);

    if (isInTop) {
      return topData;
    }

    // Find the selected category data
    const selectedData = catAgg.find(([cat, _]) => cat === selectedCategory);

    if (!selectedData) {
      return topData;
    }

    // Add selected category to the data and sort appropriately
    const combinedData = [...topData, selectedData];

    // Sort based on the metric (revenue, review, or cancel rate)
    if (topData === topRevenue) {
      return combinedData.sort((a, b) =>
        sortOrder === "desc"
          ? d3.descending(a[1].totalRevenue, b[1].totalRevenue)
          : d3.ascending(a[1].totalRevenue, b[1].totalRevenue)
      );
    } else if (topData === topReview) {
      return combinedData.sort((a, b) =>
        sortOrder === "desc"
          ? d3.descending(a[1].avgReview, b[1].avgReview)
          : d3.ascending(a[1].avgReview, b[1].avgReview)
      );
    } else if (topData === topCancel) {
      return combinedData.sort((a, b) =>
        sortOrder === "desc"
          ? d3.descending(a[1].cancelRate, b[1].cancelRate)
          : d3.ascending(a[1].cancelRate, b[1].cancelRate)
      );
    }

    return combinedData;
  }

  // Get chart data with selected category included if necessary
  const revenueData = getChartData(
    topRevenue,
    selectedCategory,
    revenueSortOrder
  );
  const reviewData = getChartData(topReview, selectedCategory, reviewSortOrder);
  const cancelData = getChartData(topCancel, selectedCategory, returnSortOrder);

  // === Chart 1: Revenue by Category ===
  const revLabels = revenueData.map((d) => d[0]);
  const revValues = revenueData.map((d) => d[1].totalRevenue);
  const topRevCat = revenueData[0];
  const revenuePct = ((topRevCat[1].totalRevenue / totalRevenue) * 100).toFixed(
    1
  );
  console.log(revenueSortOrder, "revenueSortOrder");
  const revCtx = document.getElementById("revenueByCategory").getContext("2d");
  window.catChart1 = new Chart(revCtx, {
    type: "bar",
    data: {
      labels: revLabels,
      datasets: [
        {
          label: "Revenue (R$)",
          data: revValues,
          backgroundColor: revLabels.map((label) =>
            getBarColor(label, selectedCategory)
          ),
          borderColor: revLabels.map((label) =>
            getBarColor(label, selectedCategory)
          ),
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      indexAxis: "y",
      scales: {
        x: {
          // Value Axis
          beginAtZero: true,
          title: {
            display: true,
            text: "Revenue (R$)",
          },
          ticks: {
            callback: function (value) {
              return `R$ ${(value / 1000).toFixed(0)}k`;
            },
          },
        },
        y: {
          // Category Axis
          grid: {
            display: false,
          },
          ticks: {
            callback: function (value) {
              // 'value' is the index
              const label = this.getLabelForValue(value);
              return formatCategoryName(label);
            },
          },
        },
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const clickedIndex = elements[0].index;
          const clickedCategory = revLabels[clickedIndex];
          toggleCategorySelection(clickedCategory);
        }
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            title: function (tooltipItems) {
              // Return the formatted category name as the tooltip title
              if (tooltipItems.length > 0) {
                const label = tooltipItems[0].label;
                return formatCategoryName(label);
              }
              return "";
            },
            label: function (context) {
              // Return the formatted revenue as the tooltip body
              const revenue = context.parsed.x;
              if (revenue !== null) {
                return `Revenue: R$ ${revenue.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`;
              }
              return "";
            },
          },
        },
        datalabels: {
          display: true,
          color: revenueSortOrder === "desc" ? "#fffde7 " : "black",
          anchor: revenueSortOrder === "desc" ? "center" : "end",
          align: revenueSortOrder === "desc" ? "end" : "right",
          clamp: true,
          font: {
            weight: "bold",
            size: 11,
          },
          formatter: function (value) {
            return `R$ ${value.toFixed(2)}k`;
          },
        },
      },
    },
  });
  document
    .querySelector("#revenueByCategory")
    .parentElement.querySelector(
      ".chart-note"
    ).textContent = `${formatCategoryName(
    topRevCat[0]
  )} accounts for ${revenuePct}% of total revenue (${
    revenueSortOrder === "desc" ? "Highest" : "Lowest"
  } first)`;

  // === Chart 2: Avg Review Score (Lollipop) ===
  const reviewLabels = reviewData.map((d) => d[0]);
  const reviewValues = reviewData.map((d) => d[1].avgReview);
  const bestReviewCat = reviewData[0];

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
          backgroundColor: reviewLabels.map((label) =>
            getBarColor(label, selectedCategory)
          ),
          borderColor: reviewLabels.map((label) =>
            getBarColor(label, selectedCategory)
          ),
          barThickness: 4, // This makes the bar look like a stick
          datalabels: {
            display: true,
            color: "black",
            anchor: "end",
            align: "right",
            offset: 8,
            clamp: true,
            font: {
              weight: "bold",
              size: 11,
            },
            formatter: function (value) {
              return value.toFixed(2);
            },
          },
        },
        {
          label: "Avg Review Score dot",
          data: reviewValues,
          type: "scatter",
          backgroundColor: reviewLabels.map((label) =>
            getBarColor(label, selectedCategory)
          ),
          borderColor: reviewLabels.map((label) =>
            getBarColor(label, selectedCategory)
          ),
          radius: 8,
          hoverRadius: 8,
          datalabels: {
            display: false,
          },
        },
      ],
    },
    options: {
      responsive: true,
      indexAxis: "y",
      scales: {
        x: {
          // Value Axis
          beginAtZero: true,
          max: 6,
          title: {
            display: true,
            text: "Average Score (out of 5)",
          },
        },
        y: {
          // Category Axis
          grid: {
            display: false,
          },
          ticks: {
            callback: function (value) {
              const label = this.getLabelForValue(value);
              return formatCategoryName(label);
            },
          },
        },
      },
      onClick: (event, elements) => {
        if (elements.length > 0) {
          // elements can be from either dataset, we just need the index
          const clickedIndex = elements[0].index;
          const clickedCategory = reviewLabels[clickedIndex];
          toggleCategorySelection(clickedCategory);
        }
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          // Only show tooltips for the scatter plot points (the lollipop head)
          filter: function (tooltipItem) {
            return tooltipItem.datasetIndex === 1;
          },
          callbacks: {
            title: function (tooltipItems) {
              if (tooltipItems.length > 0) {
                const label = tooltipItems[0].label;
                return formatCategoryName(label);
              }
              return "";
            },
            label: function (context) {
              const score = context.parsed.x;
              if (score !== null) {
                return `Avg. Score: ${score.toFixed(2)} / 5`;
              }
              return "";
            },
          },
        },
      },
    },
  });
  document
    .querySelector("#reviewByCategory")
    .parentElement.querySelector(
      ".chart-note"
    ).textContent = `${formatCategoryName(bestReviewCat[0])} has the ${
    reviewSortOrder === "desc" ? "highest" : "lowest"
  } satisfaction with ${bestReviewCat[1].avgReview.toFixed(2)} stars (${
    reviewSortOrder === "desc" ? "Highest" : "Lowest"
  } first)`;

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
          backgroundColor: scatterData.map((point) =>
            getPointColor(point.label, selectedCategory)
          ),
          borderColor: scatterData.map((point) =>
            getPointColor(point.label, selectedCategory)
          ),
          borderWidth: 1,
          pointRadius: 6,
          pointHoverRadius: 8,
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
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (ctx) =>
              `${formatCategoryName(ctx.raw.label)}: R$${ctx.raw.y.toFixed(
                2
              )}, Score: ${ctx.raw.x.toFixed(2)}`,
          },
        },
        datalabels: {
          display: false,
        },
      },
      scales: {
        x: {
          min: 2,
          max: 5,
          title: { display: true, text: "Avg Review Score" },
          ticks: {
            callback: function (value) {
              const label = this.getLabelForValue(value);
              return formatCategoryName(label);
            },
          },
        },
        y: {
          title: { display: true, text: "Revenue (R$)" },
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return `R$ ${(value / 1000).toFixed(0)}k`;
            },
          },
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
    ? `${formatCategoryName(
        quadrantWinner.label
      )} shows strong growth in both revenue and satisfaction`
    : "No standout category in both metrics";

  // === Chart 4: Return Rates by Category ===
  const cancelLabels = cancelData.map((d) => d[0]);
  const cancelRates = cancelData.map((d) => d[1].cancelRate * 100);
  const worstCancelCat = cancelData[0];

  // Calculate the maximum return rate from all categories to maintain consistent x-axis scale
  const allCancelRates = catAgg.map(([_, val]) => val.cancelRate * 100);
  const maxCancelRate = Math.max(...allCancelRates);

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
          backgroundColor: cancelLabels.map((label) =>
            getBarColor(label, selectedCategory)
          ),
        },
      ],
    },
    options: {
      responsive: true,
      indexAxis: "y", // Make it horizontal
      onClick: (event, elements) => {
        if (elements.length > 0) {
          const clickedIndex = elements[0].index;
          const clickedCategory = cancelLabels[clickedIndex];
          toggleCategorySelection(clickedCategory);
        }
      },
      scales: {
        x: {
          // Value axis
          beginAtZero: true,
          max: 14, // Fixed maximum to maintain consistent scale
          title: {
            display: true,
            text: "Cancellation Rate (%)",
          },
        },
        y: {
          // Category axis
          grid: {
            display: false,
          },
          ticks: {
            callback: function (value) {
              const label = this.getLabelForValue(value);
              return formatCategoryName(label);
            },
          },
        },
      },
      plugins: {
        legend: {
          display: false, // Hide legend for single-dataset chart
        },
        tooltip: {
          callbacks: {
            title: function (tooltipItems) {
              if (tooltipItems.length > 0) {
                const label = tooltipItems[0].label;
                return formatCategoryName(label);
              }
              return "";
            },
            label: function (context) {
              const rate = context.parsed.x;
              if (rate !== null) {
                return `Cancellation Rate: ${rate.toFixed(2)}%`;
              }
              return "";
            },
          },
        },
        datalabels: {
          display: true,
          color: "#000",
          anchor: "end",
          align: "right",
          offset: 4,
          font: {
            size: 11,
            weight: "bold",
          },
          formatter: function (value) {
            return value.toFixed(1) + "%";
          },
        },
      },
    },
  });
  document
    .querySelector("#returnByCategory")
    .parentElement.querySelector(
      ".chart-note"
    ).textContent = `${formatCategoryName(worstCancelCat[0])} has the ${
    returnSortOrder === "desc" ? "highest" : "lowest"
  } return rate at ${(worstCancelCat[1].cancelRate * 100).toFixed(1)}% (${
    returnSortOrder === "desc" ? "Highest" : "Lowest"
  } first)`;

  // Store original data for highlighting
  originalChartData = {
    revLabels,
    revValues,
    reviewLabels,
    reviewValues,
    scatterData,
    cancelLabels,
    cancelRates,
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
  // Fallback to the original color scheme if colorScale fails
  const baseColor = "#f59e0b";
  const baseColorTransparent = "rgba(245, 158, 11, 0.3)";

  if (!selectedCategory || category === selectedCategory) {
    return baseColor;
  } else {
    return baseColorTransparent;
  }
}

// Function to toggle category selection - now with smooth animation like geographic tab
function toggleCategorySelection(category) {
  if (selectedCategory === category) {
    // If clicking the same category, deselect it
    selectedCategory = null;
  } else {
    // Select the new category
    selectedCategory = category;
  }

  // Update the dropdown to reflect the current selection
  const currentFilter = document.getElementById("category-filter");
  if (currentFilter) {
    currentFilter.value = selectedCategory || "";
  }

  // Update the filter display
  document.getElementById("category-filter-display").textContent =
    selectedCategory ? formatCategoryName(selectedCategory) : "All categories";

  // Smoothly update chart highlighting without redrawing
  updateChartHighlighting();
}

// Function to update highlighting across all charts with smooth animation
function updateChartHighlighting() {
  // Update Chart 1 (Revenue)
  if (window.catChart1 && originalChartData.revLabels) {
    window.catChart1.data.datasets[0].backgroundColor =
      originalChartData.revLabels.map((label) =>
        getBarColor(label, selectedCategory)
      );
    window.catChart1.data.datasets[0].borderColor =
      originalChartData.revLabels.map((label) =>
        getBarColor(label, selectedCategory)
      );
    window.catChart1.update();
  }

  // Update Chart 2 (Review)
  if (window.catChart2 && originalChartData.reviewLabels) {
    const getColors = () =>
      originalChartData.reviewLabels.map((label) =>
        getBarColor(label, selectedCategory)
      );
    // Update both datasets (stick and dot)
    window.catChart2.data.datasets[0].backgroundColor = getColors();
    window.catChart2.data.datasets[0].borderColor = getColors();
    window.catChart2.data.datasets[1].backgroundColor = getColors();
    window.catChart2.data.datasets[1].borderColor = getColors();
    window.catChart2.update();
  }

  // Update Chart 3 (Scatter)
  if (window.catChart3 && originalChartData.scatterData) {
    window.catChart3.data.datasets[0].backgroundColor =
      originalChartData.scatterData.map((point) =>
        getPointColor(point.label, selectedCategory)
      );
    window.catChart3.data.datasets[0].borderColor =
      originalChartData.scatterData.map((point) =>
        getPointColor(point.label, selectedCategory)
      );
    window.catChart3.update();
  }

  // Update Chart 4 (Cancellation)
  if (window.catChart4 && originalChartData.cancelLabels) {
    window.catChart4.data.datasets[0].backgroundColor =
      originalChartData.cancelLabels.map((label) =>
        getBarColor(label, selectedCategory)
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

      // Reset sorting to default (descending)
      revenueSortOrder = "desc";
      reviewSortOrder = "desc";
      returnSortOrder = "desc";

      // Update button states
      updateSortButtonStates("revenue", "desc");
      updateSortButtonStates("review", "desc");
      updateSortButtonStates("return", "desc");

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
        category: v[0]?.product_category_name_english, // Use English name
      }),
      (d) => d.product_category_name_english // Use English name
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
  console.log("💸 Lowest Revenue:", formatCategoryName(lowestRevenue[0]));

  const card0 = document.getElementById("lowest-revenue-card");
  if (card0) {
    card0.querySelector(".summary-value").textContent = formatCategoryName(
      lowestRevenue[0]
    );
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
    card2.querySelector(".summary-value").textContent = formatCategoryName(
      fastestGrowing[0]
    );
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

// Function to setup sorting event handlers
function setupSortingEvents() {
  console.log(
    "🔧 Setting up sorting events with categoryData:",
    categoryData?.length
  );

  // Revenue sorting
  document.getElementById("revenue-sort-asc")?.addEventListener("click", () => {
    revenueSortOrder = "asc";
    updateSortButtonStates("revenue", "asc");
    console.log("📊 Smooth sorting revenue charts");
    updateChartSorting("revenue", "asc");
  });

  document
    .getElementById("revenue-sort-desc")
    ?.addEventListener("click", () => {
      revenueSortOrder = "desc";
      updateSortButtonStates("revenue", "desc");
      console.log("📊 Smooth sorting revenue charts");
      updateChartSorting("revenue", "desc");
    });

  // Review sorting
  document.getElementById("review-sort-asc")?.addEventListener("click", () => {
    reviewSortOrder = "asc";
    updateSortButtonStates("review", "asc");
    console.log("📊 Smooth sorting review charts");
    updateChartSorting("review", "asc");
  });

  document.getElementById("review-sort-desc")?.addEventListener("click", () => {
    reviewSortOrder = "desc";
    updateSortButtonStates("review", "desc");
    console.log("📊 Smooth sorting review charts");
    updateChartSorting("review", "desc");
  });

  // Return rate sorting
  document.getElementById("return-sort-asc")?.addEventListener("click", () => {
    returnSortOrder = "asc";
    updateSortButtonStates("return", "asc");
    console.log("📊 Smooth sorting return charts");
    updateChartSorting("return", "asc");
  });

  document.getElementById("return-sort-desc")?.addEventListener("click", () => {
    returnSortOrder = "desc";
    updateSortButtonStates("return", "desc");
    console.log("📊 Smooth sorting return charts");
    updateChartSorting("return", "desc");
  });

  // Set initial button states
  updateSortButtonStates("revenue", revenueSortOrder);
  updateSortButtonStates("review", reviewSortOrder);
  updateSortButtonStates("return", returnSortOrder);

  console.log("✅ Sorting events setup complete");
}

// Function to smoothly update chart sorting without redrawing
function updateChartSorting(chartType, sortOrder) {
  if (
    !categoryData ||
    !Array.isArray(categoryData) ||
    categoryData.length === 0
  ) {
    console.error("❌ No valid data available for sorting");
    return;
  }

  // Recalculate aggregated data
  const catAgg = d3
    .rollups(
      categoryData,
      (v) => ({
        totalRevenue: d3.sum(v, (d) => +d.payment_value),
        avgReview: d3.mean(v, (d) => +d.review_score),
        cancelRate:
          v.filter((d) => d.order_status !== "delivered").length / v.length,
      }),
      (d) => d.product_category_name_english
    )
    .filter(([k, v]) => k && v.totalRevenue > 0);

  // Get sorted data based on chart type
  let sortedData;
  if (chartType === "revenue") {
    sortedData = catAgg
      .sort((a, b) =>
        sortOrder === "desc"
          ? d3.descending(a[1].totalRevenue, b[1].totalRevenue)
          : d3.ascending(a[1].totalRevenue, b[1].totalRevenue)
      )
      .slice(0, 10);
  } else if (chartType === "review") {
    sortedData = catAgg
      .sort((a, b) =>
        sortOrder === "desc"
          ? d3.descending(a[1].avgReview, b[1].avgReview)
          : d3.ascending(a[1].avgReview, b[1].avgReview)
      )
      .slice(0, 10);
  } else if (chartType === "return") {
    sortedData = catAgg
      .sort((a, b) =>
        sortOrder === "desc"
          ? d3.descending(a[1].cancelRate, b[1].cancelRate)
          : d3.ascending(a[1].cancelRate, b[1].cancelRate)
      )
      .slice(0, 10);
  }

  // Include selected category if not in top 10
  if (selectedCategory) {
    const isInTop = sortedData.some(([cat, _]) => cat === selectedCategory);
    if (!isInTop) {
      const selectedData = catAgg.find(([cat, _]) => cat === selectedCategory);
      if (selectedData) {
        sortedData.push(selectedData);
        // Re-sort to maintain order
        if (chartType === "revenue") {
          sortedData.sort((a, b) =>
            sortOrder === "desc"
              ? d3.descending(a[1].totalRevenue, b[1].totalRevenue)
              : d3.ascending(a[1].totalRevenue, b[1].totalRevenue)
          );
        } else if (chartType === "review") {
          sortedData.sort((a, b) =>
            sortOrder === "desc"
              ? d3.descending(a[1].avgReview, b[1].avgReview)
              : d3.ascending(a[1].avgReview, b[1].avgReview)
          );
        } else if (chartType === "return") {
          sortedData.sort((a, b) =>
            sortOrder === "desc"
              ? d3.descending(a[1].cancelRate, b[1].cancelRate)
              : d3.ascending(a[1].cancelRate, b[1].cancelRate)
          );
        }
      }
    }
  }

  // Update the specific chart
  if (chartType === "revenue" && window.catChart1) {
    const labels = sortedData.map((d) => d[0]);
    const values = sortedData.map((d) => d[1].totalRevenue);

    window.catChart1.data.labels = labels;
    window.catChart1.data.datasets[0].data = values;
    window.catChart1.data.datasets[0].backgroundColor = labels.map((label) =>
      getBarColor(label, selectedCategory)
    );
    window.catChart1.data.datasets[0].borderColor = labels.map((label) =>
      getBarColor(label, selectedCategory)
    );

    // Update datalabels configuration based on sort order
    window.catChart1.options.plugins.datalabels.color = sortOrder === "desc" ? "#fffde7" : "black";
    window.catChart1.options.plugins.datalabels.anchor = sortOrder === "desc" ? "center" : "end";
    window.catChart1.options.plugins.datalabels.align = sortOrder === "desc" ? "end" : "right";

    // Update chart note
    const topRevCat = sortedData[0];
    const totalRevenue = d3.sum(catAgg, ([_, v]) => v.totalRevenue);
    const revenuePct = (
      (topRevCat[1].totalRevenue / totalRevenue) *
      100
    ).toFixed(1);
    document
      .querySelector("#revenueByCategory")
      .parentElement.querySelector(
        ".chart-note"
      ).textContent = `${formatCategoryName(
      topRevCat[0]
    )} accounts for ${revenuePct}% of total revenue (${
      sortOrder === "desc" ? "Highest" : "Lowest"
    } first)`;

    window.catChart1.update();
  } else if (chartType === "review" && window.catChart2) {
    const labels = sortedData.map((d) => d[0]);
    const values = sortedData.map((d) => d[1].avgReview);

    window.catChart2.data.labels = labels;
    window.catChart2.data.datasets[0].data = values;
    window.catChart2.data.datasets[1].data = values;

    const getColors = () =>
      labels.map((label) => getBarColor(label, selectedCategory));
    window.catChart2.data.datasets[0].backgroundColor = getColors();
    window.catChart2.data.datasets[0].borderColor = getColors();
    window.catChart2.data.datasets[1].backgroundColor = getColors();
    window.catChart2.data.datasets[1].borderColor = getColors();

    // Update chart note
    const bestReviewCat = sortedData[0];
    document
      .querySelector("#reviewByCategory")
      .parentElement.querySelector(
        ".chart-note"
      ).textContent = `${formatCategoryName(bestReviewCat[0])} has the ${
      sortOrder === "desc" ? "highest" : "lowest"
    } satisfaction with ${bestReviewCat[1].avgReview.toFixed(2)} stars (${
      sortOrder === "desc" ? "Highest" : "Lowest"
    } first)`;

    window.catChart2.update();
  } else if (chartType === "return" && window.catChart4) {
    const labels = sortedData.map((d) => d[0]);
    const values = sortedData.map((d) => d[1].cancelRate * 100);

    window.catChart4.data.labels = labels;
    window.catChart4.data.datasets[0].data = values;
    window.catChart4.data.datasets[0].backgroundColor = labels.map((label) =>
      getBarColor(label, selectedCategory)
    );

    // Update chart note
    const worstCancelCat = sortedData[0];
    document
      .querySelector("#returnByCategory")
      .parentElement.querySelector(
        ".chart-note"
      ).textContent = `${formatCategoryName(worstCancelCat[0])} has the ${
      sortOrder === "desc" ? "highest" : "lowest"
    } return rate at ${(worstCancelCat[1].cancelRate * 100).toFixed(1)}% (${
      sortOrder === "desc" ? "Highest" : "Lowest"
    } first)`;

    window.catChart4.update();
  }

  // Update original chart data for highlighting
  if (chartType === "revenue") {
    originalChartData.revLabels = sortedData.map((d) => d[0]);
    originalChartData.revValues = sortedData.map((d) => d[1].totalRevenue);
  } else if (chartType === "review") {
    originalChartData.reviewLabels = sortedData.map((d) => d[0]);
    originalChartData.reviewValues = sortedData.map((d) => d[1].avgReview);
  } else if (chartType === "return") {
    originalChartData.cancelLabels = sortedData.map((d) => d[0]);
    originalChartData.cancelRates = sortedData.map(
      (d) => d[1].cancelRate * 100
    );
  }
}

// Function to update sort button visual states
function updateSortButtonStates(chartType, activeOrder) {
  const ascBtn = document.getElementById(`${chartType}-sort-asc`);
  const descBtn = document.getElementById(`${chartType}-sort-desc`);

  if (ascBtn && descBtn) {
    ascBtn.classList.toggle("active", activeOrder === "asc");
    descBtn.classList.toggle("active", activeOrder === "desc");
  }
}
