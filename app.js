// Main app
d3.csv("olist_combined_clean_3.csv").then((data) => {
  document.getElementById("loading").style.display = "none"; // Hide spinner

  preprocess(data);
  updateStats(data);
  populateGeoFilter(data);
  drawCharts(data);
  drawMap(data); // ✅ map included
  setupFilterEvents(data);
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

  document.getElementById(
    "total-revenue"
  ).textContent = `R$ ${totalRevenue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
  })}`;
  document.getElementById("avg-review").textContent = `${avgReview} ★`;
  document.getElementById("avg-delivery").textContent = `${avgDelivery} days`;
}

// === STEP 3: Geo Filter Dropdown ===
function populateGeoFilter(data) {
  const states = Array.from(new Set(data.map((d) => d.customer_state))).sort();
  const select = document.getElementById("geo-filter");
  states.forEach((state) => {
    const opt = document.createElement("option");
    opt.value = state;
    opt.textContent = state;
    select.appendChild(opt);
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
}

function drawBarChart(canvasId, labels, values, label, color) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (charts[canvasId]) charts[canvasId].destroy();

  return new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: label,
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
            maxTicksLimit: 10,
          },
        },
      },
    },
  });
}

// === STEP 5: Filters ===
function setupFilterEvents(data) {
  document.getElementById("geo-filter").addEventListener("change", function () {
    const selectedState = this.value;
    const filtered = selectedState
      ? data.filter((d) => d.customer_state === selectedState)
      : data;

    updateStats(filtered);
    drawCharts(filtered);

    document.getElementById("active-filter-display").textContent = selectedState
      ? `Showing data for: ${selectedState}`
      : "Showing all states";
  });

  document.getElementById("reset-selection").addEventListener("click", () => {
    document.getElementById("geo-filter").value = "";
    document.getElementById("geo-filter").dispatchEvent(new Event("change"));
  });
}

// === GEO MAP STATE ABBREVIATIONS ===
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

// === DRAW MAP ===
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
