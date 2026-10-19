const metricOptions = {
  temperature: { label: "Air temperature", shortLabel: "Air temp.", unit: "°C", color: "#e7a45e", digits: 1, low: 10, high: 35 },
  humidity: { label: "Air humidity", shortLabel: "Humidity", unit: "%", color: "#70b4e8", digits: 1, low: 35, high: 85 },
  soil_temperature: { label: "Soil temperature", shortLabel: "Soil temp.", unit: "°C", color: "#df7f59", digits: 1, low: 10, high: 35 },
  soil_moisture: { label: "Soil moisture", shortLabel: "Soil moisture", unit: "%", color: "#38c995", digits: 1, low: 30, high: 70 },
  soil_ph: { label: "Soil pH", shortLabel: "Soil pH", unit: "pH", color: "#ac8be3", digits: 1, low: 5.5, high: 7.5 },
};

const state = {
  nodes: [],
  deployments: [],
  measurements: [],
  deploymentId: null,
  metric: "soil_moisture",
  demo: false,
  loading: false,
  mapZoom: 1,
  mapCenterX: 450,
  mapCenterY: 240,
  mapFocusDeploymentId: null,
  mapGeoBounds: null,
  mapDrag: null,
  selectedMapCoordinate: null,
};

const byId = (id) => document.getElementById(id);
const isNumeric = (value) =>
  value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
const number = (value, digits = 1) =>
  isNumeric(value) ? Number(value).toFixed(digits) : "—";
const timestamp = (value, options) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(undefined, options).format(date);
};
const dateTimeOptions = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" };

function currentDeployment() {
  return state.deployments.find((deployment) => String(deployment.id) === String(state.deploymentId)) || null;
}

function currentMeasurements() {
  const deployment = currentDeployment();
  return state.measurements
    .filter((reading) => !deployment || String(reading.deployment_id) === String(deployment.id))
    .slice()
    .sort((first, second) => new Date(first.recorded_at) - new Date(second.recorded_at));
}

function currentNode(deployment) {
  if (!deployment) return null;
  return state.nodes.find((node) => String(node.id) === String(deployment.sensor_id)) || null;
}

function setMetricValue(id, captionId, value, unit, caption, series) {
  byId(id).innerHTML = `${number(value)}<span>${unit}</span>`;
  byId(captionId).textContent = caption;
  renderSparkline(`${id.replace("-value", "")}-sparkline`, series);
}

function renderSparkline(elementId, values) {
  const container = byId(elementId);
  const data = values.filter(Number.isFinite).slice(-18);
  if (data.length < 2) {
    container.innerHTML = "";
    return;
  }
  const min = Math.min(...data);
  const range = Math.max(...data) - min || 1;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 31 - ((value - min) / range) * 21;
    return `${x},${y}`;
  }).join(" ");
  container.innerHTML = `<svg viewBox="0 0 100 38" preserveAspectRatio="none"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="1.5" vector-effect="non-scaling-stroke"/></svg>`;
}

function renderMetrics(readings) {
  const latest = readings[readings.length - 1];
  const fields = [
    { id: "temperature", caption: "temperature-caption", value: latest?.temperature, unit: "°C", field: "temperature" },
    { id: "moisture", caption: "moisture-caption", value: latest?.soil_moisture, unit: "%", field: "soil_moisture" },
    { id: "humidity", caption: "humidity-caption", value: latest?.humidity, unit: "%", field: "humidity" },
    { id: "ph", caption: "ph-caption", value: latest?.soil_ph, unit: "pH", field: "soil_ph" },
    { id: "soil-temperature", caption: "soil-temperature-caption", value: latest?.soil_temperature, unit: "°C", field: "soil_temperature" },
  ];
  for (const item of fields) {
    const series = readings.map((reading) => reading[item.field]).filter(isNumeric).map(Number);
    const caption = isNumeric(item.value)
      ? `Recorded at ${timestamp(latest.recorded_at, { hour: "numeric", minute: "2-digit" })}`
      : "No reading available";
    setMetricValue(`${item.id}-value`, item.caption, item.value, item.unit, caption, series);
  }
}

function renderChart(readings) {
  const option = metricOptions[state.metric];
  const series = readings
    .map((reading) => ({ value: reading[state.metric], recordedAt: reading.recorded_at }))
    .filter((point) => isNumeric(point.value))
    .map((point) => ({ ...point, value: Number(point.value) }))
    .slice(-24);
  byId("chart-legend-label").textContent = option.label;
  byId("chart-unit").textContent = option.unit;
  byId("chart-record-count").textContent = `${series.length} DATA POINT${series.length === 1 ? "" : "S"}`;
  byId("trend-chart").setAttribute("aria-label", `${option.label} trend chart`);
  byId("chart-current").textContent = series.length ? number(series[series.length - 1].value, option.digits) : "—";

  const svg = byId("trend-chart");
  if (!series.length) {
    svg.innerHTML = `<text x="380" y="118" text-anchor="middle" class="chart-y-label">No readings for this deployment yet</text>`;
    byId("chart-axis").innerHTML = "<span>—</span><span>—</span><span>—</span><span>—</span><span>—</span>";
    return;
  }

  const chart = { left: 42, right: 750, top: 12, bottom: 207 };
  const values = series.map((point) => point.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  const padding = max === min ? Math.max(Math.abs(max) * .08, 1) : (max - min) * .2;
  min -= padding;
  max += padding;
  const xAt = (index) => chart.left + (series.length === 1 ? .5 : index / (series.length - 1)) * (chart.right - chart.left);
  const yAt = (value) => chart.bottom - ((value - min) / (max - min)) * (chart.bottom - chart.top);
  const points = series.map((point, index) => `${xAt(index).toFixed(1)},${yAt(point.value).toFixed(1)}`);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${point}`).join(" ");
  const area = `${path} L${xAt(series.length - 1).toFixed(1)},${chart.bottom} L${chart.left},${chart.bottom} Z`;
  const grid = Array.from({ length: 4 }, (_, index) => {
    const y = chart.top + index * ((chart.bottom - chart.top) / 3);
    const label = max - index * ((max - min) / 3);
    return `<line class="chart-grid-line" x1="${chart.left}" y1="${y}" x2="${chart.right}" y2="${y}"/><text class="chart-y-label" x="32" y="${y + 3}" text-anchor="end">${number(label)}</text>`;
  }).join("");
  const dots = series.length > 1
    ? `<circle class="chart-point" cx="${xAt(series.length - 1)}" cy="${yAt(series[series.length - 1].value)}" r="4"/>`
    : `<circle class="chart-point" cx="${xAt(0)}" cy="${yAt(series[0].value)}" r="4"/>`;
  svg.innerHTML = `<defs><linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="${option.color}"/><stop offset="100%" stop-color="${option.color}" stop-opacity="0"/></linearGradient></defs>${grid}<path class="chart-area" d="${area}" fill="url(#chart-fill)"/><path class="chart-path" d="${path}" style="stroke:${option.color}"/>${dots}`;
  const axisIndexes = [0, Math.floor((series.length - 1) / 4), Math.floor((series.length - 1) / 2), Math.floor((3 * (series.length - 1)) / 4), series.length - 1];
  byId("chart-axis").innerHTML = axisIndexes.map((index) => `<span>${timestamp(series[index].recordedAt, { hour: "numeric", minute: "2-digit" })}</span>`).join("");
}

function renderReadings(readings) {
  const recent = readings.slice(-5).reverse();
  byId("reading-count").textContent = `Showing ${recent.length} of ${readings.length} readings`;
  if (!recent.length) {
    byId("readings-body").innerHTML = '<tr><td class="table-empty" colspan="7">No readings available for this deployment yet.</td></tr>';
    return;
  }
  byId("readings-body").innerHTML = recent.map((reading) => `
    <tr>
      <td>${timestamp(reading.recorded_at, dateTimeOptions)}</td>
      <td>${number(reading.temperature)} °C</td>
      <td>${number(reading.soil_temperature)} °C</td>
      <td>${number(reading.soil_moisture)}%</td>
      <td>${number(reading.humidity)}%</td>
      <td>${number(reading.soil_ph, 1)}</td>
      <td><span class="row-status"><i></i> Recorded</span></td>
    </tr>`).join("");
}

function renderField() {
  const deployment = currentDeployment();
  const node = currentNode(deployment);
  const archived = Boolean(deployment?.ended_at);
  byId("location-name").textContent = deployment?.location_name || "No deployment selected";
  byId("location-started").textContent = deployment
    ? `Started ${timestamp(deployment.started_at, { month: "short", day: "numeric", year: "numeric" })}`
    : "Select a field to view its details";
  byId("field-node").textContent = node?.node_name || node?.device_identifier || "—";
  byId("field-status").textContent = node?.status || "Unknown";
  byId("deployment-state-label").textContent = archived ? "PAST DEPLOYMENT" : "ACTIVE DEPLOYMENT";
  byId("deployment-state-badge").classList.toggle("archived", archived);
  byId("deployment-state-badge").lastChild.textContent = archived ? " ARCHIVED" : " LIVE";
  const coordinates = isNumeric(deployment?.latitude) && isNumeric(deployment?.longitude)
    ? `${number(deployment.latitude, 4)}°, ${number(deployment.longitude, 4)}°`
    : "Coordinates not available";
  const live = byId("field-status").parentElement.querySelector("i");
  live.style.background = node?.status?.toLowerCase() === "active" ? "#11c691" : "#d6a45d";
  byId("map-coordinate-detail").textContent = coordinates;
  byId("map-node-detail").textContent = node?.node_name || node?.device_identifier || "—";
  byId("map-node-status").textContent = node?.status || "Waiting for node data";
}

function heatColor(value, minimum, maximum) {
  const option = metricOptions[byId("heatmap-metric-select").value];
  let intensity = maximum === minimum ? .5 : (value - minimum) / (maximum - minimum);
  const mid = [34, 197, 94];
  const low = [59, 130, 246];
  const high = [239, 68, 68];
  const start = intensity < .5 ? low : mid;
  const end = intensity < .5 ? mid : high;
  const amount = intensity < .5 ? intensity * 2 : (intensity - .5) * 2;
  const rgb = start.map((channel, index) => Math.round(channel + (end[index] - channel) * amount));
  return { color: `rgb(${rgb.join(",")})`, intensity, option };
}

function renderHeatmap() {
  const selectedMetric = byId("heatmap-metric-select").value;
  const option = metricOptions[selectedMetric] || metricOptions.soil_moisture;
  const sites = state.deployments.flatMap((deployment) => {
    if (!isNumeric(deployment.latitude) || !isNumeric(deployment.longitude)) return [];
    const readings = state.measurements
      .filter((reading) => String(reading.deployment_id) === String(deployment.id))
      .slice()
      .sort((first, second) => new Date(first.recorded_at) - new Date(second.recorded_at));
    const latest = readings[readings.length - 1];
    if (!latest || !isNumeric(latest[selectedMetric])) return [];
    return [{ deployment, reading: latest, value: Number(latest[selectedMetric]) }];
  });
  const svg = byId("heatmap-svg");
  const empty = byId("heatmap-empty");
  byId("heatmap-low-label").textContent = `${option.label} · LOW`;
  byId("heatmap-high-label").textContent = `${option.label} · HIGH`;
  empty.hidden = sites.length > 0;
  empty.textContent = "No sensor readings with GPS coordinates yet. Click the map to choose a point.";

  const latitudes = sites.map((site) => Number(site.deployment.latitude));
  const longitudes = sites.map((site) => Number(site.deployment.longitude));
  const minLat = latitudes.length ? Math.min(...latitudes) : -1.5;
  const maxLat = latitudes.length ? Math.max(...latitudes) : 4.5;
  const minLon = longitudes.length ? Math.min(...longitudes) : 29.5;
  const maxLon = longitudes.length ? Math.max(...longitudes) : 35.5;
  const latSpan = maxLat - minLat || .06;
  const lonSpan = maxLon - minLon || .06;
  const mapBounds = {
    minLon: latitudes.length ? minLon - lonSpan * .1 : minLon,
    maxLon: latitudes.length ? maxLon + lonSpan * .1 : maxLon,
    minLat: latitudes.length ? minLat - latSpan * .1 : minLat,
    maxLat: latitudes.length ? maxLat + latSpan * .1 : maxLat,
  };
  state.mapGeoBounds = mapBounds;
  const points = sites.map((site) => {
    const x = 80 + ((Number(site.deployment.longitude) - mapBounds.minLon) / (mapBounds.maxLon - mapBounds.minLon)) * 740;
    const y = 80 + ((mapBounds.maxLat - Number(site.deployment.latitude)) / (mapBounds.maxLat - mapBounds.minLat)) * 320;
    return { ...site, x, y, ...heatColor(site.value, option.low, option.high) };
  });
  if (state.mapFocusDeploymentId !== String(state.deploymentId)) {
    const selectedPoint = points.find((point) => String(point.deployment.id) === String(state.deploymentId));
    state.mapCenterX = selectedPoint?.x ?? 450;
    state.mapCenterY = selectedPoint?.y ?? 240;
    state.mapFocusDeploymentId = String(state.deploymentId);
  }
  const longitudeGrid = Array.from({ length: 5 }, (_, index) => {
    const x = 80 + index * 185;
    const longitude = mapBounds.minLon + (index / 4) * (mapBounds.maxLon - mapBounds.minLon);
    return `<path d="M${x} 70V410" class="heatmap-grid-line"/><text x="${x}" y="455" text-anchor="middle" class="heatmap-coordinate-label">${longitude.toFixed(4)}°</text>`;
  }).join("");
  const latitudeGrid = Array.from({ length: 5 }, (_, index) => {
    const y = 80 + index * 80;
    const latitude = mapBounds.maxLat - (index / 4) * (mapBounds.maxLat - mapBounds.minLat);
    return `<path d="M55 ${y}H865" class="heatmap-grid-line"/><text x="48" y="${y + 3}" text-anchor="end" class="heatmap-coordinate-label">${latitude.toFixed(4)}°</text>`;
  }).join("");
  const gradients = points.map((point, index) => `
    <radialGradient id="heat-${index}">
      <stop offset="0%" stop-color="${point.color}" stop-opacity=".85"/>
      <stop offset="38%" stop-color="${point.color}" stop-opacity=".5"/>
      <stop offset="100%" stop-color="${point.color}" stop-opacity="0"/>
    </radialGradient>`).join("");
  const contours = Array.from({ length: 7 }, (_, index) => {
    const offset = index * 30;
    return `<path d="M ${-50 + offset} ${100 + offset} Q 240 ${-30 + offset} 465 ${190 + offset} T 960 ${85 + offset}" />`;
  }).join("");
  const heatSpots = points.map((point, index) => `
    <circle cx="${point.x}" cy="${point.y}" r="144" fill="url(#heat-${index})"/>
    <circle cx="${point.x}" cy="${point.y}" r="9" class="heat-marker-halo"/>
    <circle cx="${point.x}" cy="${point.y}" r="5.5" fill="${point.color}" class="heat-marker"
      tabindex="0" role="button" data-deployment-id="${escapeHtml(point.deployment.id)}"
      aria-label="${escapeHtml(point.deployment.location_name)}: ${option.label} ${number(point.value)} ${option.unit}">
      <title>${escapeHtml(point.deployment.location_name)} · ${option.label}: ${number(point.value)} ${option.unit}</title>
    </circle>
    <text x="${point.x + 12}" y="${point.y - 11}" class="heat-site-label">${escapeHtml(point.deployment.location_name)}</text>
    <text x="${point.x + 12}" y="${point.y + 7}" class="heat-site-value">${number(point.value)} ${option.unit}</text>
    <text x="${point.x + 12}" y="${point.y + 22}" class="heat-site-coordinate">${Number(point.deployment.latitude).toFixed(4)}°, ${Number(point.deployment.longitude).toFixed(4)}°</text>`).join("");
  const selectedX = state.selectedMapCoordinate
    ? 80 + ((state.selectedMapCoordinate.longitude - mapBounds.minLon) / (mapBounds.maxLon - mapBounds.minLon)) * 740
    : 0;
  const selectedY = state.selectedMapCoordinate
    ? 80 + ((mapBounds.maxLat - state.selectedMapCoordinate.latitude) / (mapBounds.maxLat - mapBounds.minLat)) * 320
    : 0;
  const selectedCoordinate = state.selectedMapCoordinate
    ? `<g class="map-selected-point" aria-label="Selected coordinate ${state.selectedMapCoordinate.latitude.toFixed(5)}, ${state.selectedMapCoordinate.longitude.toFixed(5)}"><circle cx="${selectedX}" cy="${selectedY}" r="11"/><path d="M${selectedX - 16} ${selectedY}h32m-16-16v32"/></g>`
    : "";
  svg.setAttribute("aria-label", `${option.label} heatmap showing ${sites.length} sensor deployments`);
  const viewWidth = 900 / state.mapZoom;
  const viewHeight = 480 / state.mapZoom;
  svg.setAttribute("viewBox", `${state.mapCenterX - viewWidth / 2} ${state.mapCenterY - viewHeight / 2} ${viewWidth} ${viewHeight}`);
  svg.innerHTML = `
    <defs>${gradients}</defs>
    <rect width="900" height="480" rx="14" class="heatmap-ground"/>
    <g class="heatmap-grid">${longitudeGrid}${latitudeGrid}</g>
    <text x="80" y="42" class="heatmap-region-label">GPS COORDINATES · LONGITUDE →</text>
    <text x="82" y="472" class="heatmap-region-label">LATITUDE ↑</text>
    <g class="heatmap-contours">${contours}</g>
    ${heatSpots}${selectedCoordinate}`;
  byId("map-selected-coordinate").textContent = state.selectedMapCoordinate
    ? `${state.selectedMapCoordinate.latitude.toFixed(5)}°, ${state.selectedMapCoordinate.longitude.toFixed(5)}°`
    : "Click or tap the map to choose a GPS point";
  byId("use-map-coordinate-button").disabled = !state.selectedMapCoordinate;
  svg.querySelectorAll(".heat-marker").forEach((marker) => {
    const selectSite = () => {
      state.deploymentId = marker.dataset.deploymentId;
      byId("deployment-select").value = String(state.deploymentId);
      renderDashboard();
    };
    marker.addEventListener("click", selectSite);
    marker.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectSite();
      }
    });
  });
  byId("heatmap-scope").textContent = sites.length === 1
    ? "1 site · marker shows measured value (no spatial interpolation)"
    : sites.length
      ? `${sites.length} sites · colors show the current measured range`
      : "No sensor readings with GPS coordinates";
}

function populateVariableSelects() {
  const options = Object.entries(metricOptions).map(([key, option]) =>
    `<option value="${key}">${option.label}</option>`).join("");
  byId("heatmap-metric-select").innerHTML = options;
}

function renderDeploymentOptions() {
  const select = byId("deployment-select");
  const sorted = state.deployments.slice().sort((first, second) => {
    if (Boolean(first.ended_at) !== Boolean(second.ended_at)) return first.ended_at ? 1 : -1;
    return new Date(second.started_at) - new Date(first.started_at);
  });
  if (!state.deploymentId || !sorted.some((item) => String(item.id) === String(state.deploymentId))) {
    state.deploymentId = sorted[0]?.id ?? null;
  }
  select.innerHTML = sorted.length
    ? sorted.map((deployment) => `<option value="${String(deployment.id)}">${escapeHtml(deployment.location_name)}${deployment.ended_at ? " · Past" : ""}</option>`).join("")
    : '<option value="">No deployments</option>';
  select.value = state.deploymentId == null ? "" : String(state.deploymentId);
  select.disabled = sorted.length === 0;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function renderHardware() {
  byId("hardware-node-count").textContent = String(state.nodes.length);
  byId("deployment-count").textContent = String(state.deployments.length);
  byId("nodes-body").innerHTML = state.nodes.length
    ? state.nodes.map((node) => `
      <tr>
        <td>${escapeHtml(node.node_name || `Node ${node.id}`)}</td>
        <td>${escapeHtml(node.device_identifier || "—")}</td>
        <td><span class="row-status"><i></i> ${escapeHtml(node.status || "unknown")}</span></td>
        <td>${timestamp(node.created_at, { month: "short", day: "numeric", year: "numeric" })}</td>
      </tr>`).join("")
    : '<tr><td class="table-empty" colspan="4">No sensor nodes found.</td></tr>';
  byId("deployments-body").innerHTML = state.deployments.length
    ? state.deployments.map((deployment) => `
      <tr>
        <td>${escapeHtml(deployment.location_name || "Unnamed field")}</td>
        <td>${escapeHtml(currentNode(deployment)?.node_name || `Node ${deployment.sensor_id}`)}</td>
        <td>${timestamp(deployment.started_at, { month: "short", day: "numeric", year: "numeric" })}</td>
        <td><span class="deployment-state ${deployment.ended_at ? "archived" : "active"}">${deployment.ended_at ? "Archived" : "Active"}</span></td>
      </tr>`).join("")
    : '<tr><td class="table-empty" colspan="4">No deployments found.</td></tr>';
}

function populateDeploymentSensorSelect() {
  const select = byId("deployment-sensor");
  select.innerHTML = state.nodes.map((node) =>
    `<option value="${escapeHtml(node.id)}">${escapeHtml(node.node_name || node.device_identifier || `Node ${node.id}`)}</option>`).join("");
  select.disabled = state.nodes.length === 0;
}

function renderFeed(readings) {
  const deployment = currentDeployment();
  const node = currentNode(deployment);
  const latest = readings[readings.length - 1] || null;
  const payload = latest && deployment
    ? {
      sensor_id: node?.node_name || node?.device_identifier || null,
      deployment_id: deployment.id,
      location: deployment.location_name,
      timestamp: latest.recorded_at,
      temperature: latest.temperature,
      humidity: latest.humidity,
      soil_temperature: latest.soil_temperature,
      soil_moisture: latest.soil_moisture,
      soil_ph: latest.soil_ph,
    }
    : null;
  byId("live-json").textContent = payload
    ? JSON.stringify(payload, null, 2)
    : "Waiting for a sensor reading…";
  byId("feed-node").textContent = node?.node_name || node?.device_identifier || "—";
  byId("feed-deployment").textContent = deployment ? String(deployment.id) : "—";
  byId("feed-timestamp").textContent = latest
    ? timestamp(latest.recorded_at, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" })
    : "Waiting for data";
  byId("feed-state").textContent = state.demo ? "DEMO DATA" : latest ? "LIVE" : "WAITING";
  byId("feed-reading-count").textContent = `${readings.length} ${readings.length === 1 ? "record" : "records"}`;
}

function activateTab(name, focus = false) {
  const tab = document.querySelector(`[data-tab="${name}"]`);
  if (!tab) return;
  document.querySelectorAll(".app-tab").forEach((button) => {
    const selected = button === tab;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
  document.querySelectorAll(".tab-view").forEach((view) => {
    const selected = view.id === tab.getAttribute("aria-controls");
    view.classList.toggle("active", selected);
    view.hidden = !selected;
  });
  byId("active-page-title").textContent = tab.querySelector("span").textContent;
  if (focus) tab.focus();
}

function renderDashboard() {
  renderDeploymentOptions();
  const readings = currentMeasurements();
  renderMetrics(readings);
  renderChart(readings);
  renderReadings(readings);
  renderField();
  renderHeatmap();
  renderHardware();
  renderFeed(readings);
  populateDeploymentSensorSelect();
  byId("last-updated").textContent = `Synced ${timestamp(new Date(), { hour: "numeric", minute: "2-digit" })}`;
}

function setNotice() {
  const notice = byId("data-notice");
  notice.hidden = !state.demo;
  notice.textContent = state.demo
    ? "Showing sample data because the FieldTrace API could not be reached. Start the backend to view live field readings."
    : "";
}

async function refreshDashboard() {
  if (state.loading) return;
  state.loading = true;
  const button = byId("refresh-button");
  button.disabled = true;
  button.classList.add("is-loading");
  byId("error-notice").hidden = true;
  try {
    const result = await window.FieldTraceApi.fetchDashboard();
    state.nodes = result.nodes;
    state.deployments = result.deployments;
    state.measurements = result.measurements;
    state.demo = false;
    setNotice();
    renderDashboard();
  } catch (error) {
    if (error instanceof TypeError || error?.name === "AbortError") {
      Object.assign(state, window.FieldTraceApi.demoData(), { demo: true });
      setNotice();
      renderDashboard();
    } else {
      byId("error-notice").textContent = `Could not load dashboard data: ${error.message}`;
      byId("error-notice").hidden = false;
    }
  } finally {
    button.disabled = false;
    button.classList.remove("is-loading");
    state.loading = false;
  }
}

function downloadFile(name, content, type) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(new Blob([content], { type }));
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportMeasurementsCsv() {
  const readings = currentMeasurements();
  if (!readings.length) {
    byId("error-notice").textContent = "There are no measurement rows to export for this deployment.";
    byId("error-notice").hidden = false;
    return;
  }
  const columns = [
    ["recorded_at", "Recorded at"],
    ["temperature", "Air temperature (C)"],
    ["humidity", "Air humidity (%)"],
    ["soil_temperature", "Soil temperature (C)"],
    ["soil_moisture", "Soil moisture (%)"],
    ["soil_ph", "Soil pH"],
  ];
  const csv = [
    columns.map(([, label]) => label).join(","),
    ...readings.map((reading) => columns.map(([key]) => {
      const value = reading[key] ?? "";
      return `"${String(value).replace(/"/g, '""')}"`;
    }).join(",")),
  ].join("\r\n");
  downloadFile(`fieldtrace-deployment-${state.deploymentId || "all"}.csv`, csv, "text/csv;charset=utf-8");
}

function openManageDialog(type = "node") {
  populateDeploymentSensorSelect();
  byId("dialog-error").hidden = true;
  byId("manage-form").reset();
  byId("manage-type").value = type;
  updateManageFields();
  if (type === "deployment" && state.selectedMapCoordinate) {
    byId("manage-form").elements.latitude.value = state.selectedMapCoordinate.latitude.toFixed(6);
    byId("manage-form").elements.longitude.value = state.selectedMapCoordinate.longitude.toFixed(6);
  }
  byId("manage-dialog").showModal();
}

function setMapZoom(zoom, anchor) {
  const nextZoom = Math.max(1, Math.min(zoom, 8));
  if (anchor && nextZoom !== state.mapZoom) {
    const oldWidth = 900 / state.mapZoom;
    const oldHeight = 480 / state.mapZoom;
    const nextWidth = 900 / nextZoom;
    const nextHeight = 480 / nextZoom;
    state.mapCenterX = anchor.x - ((anchor.x - state.mapCenterX) / oldWidth) * nextWidth;
    state.mapCenterY = anchor.y - ((anchor.y - state.mapCenterY) / oldHeight) * nextHeight;
  }
  state.mapZoom = nextZoom;
  renderHeatmap();
}

function bindMapNavigation() {
  const map = byId("field-map");
  const svg = byId("heatmap-svg");
  const pointInSvg = (event) => {
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(svg.getScreenCTM().inverse());
  };
  map.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".heat-marker") || event.button !== 0) return;
    const rect = svg.getBoundingClientRect();
    state.mapDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      centerX: state.mapCenterX,
      centerY: state.mapCenterY,
      moved: false,
      scaleX: (900 / state.mapZoom) / rect.width,
      scaleY: (480 / state.mapZoom) / rect.height,
    };
    map.setPointerCapture(event.pointerId);
    map.classList.add("is-panning");
  });
  map.addEventListener("pointermove", (event) => {
    const drag = state.mapDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4) drag.moved = true;
    if (!drag.moved) return;
    state.mapCenterX = drag.centerX - (event.clientX - drag.startX) * drag.scaleX;
    state.mapCenterY = drag.centerY - (event.clientY - drag.startY) * drag.scaleY;
    const viewWidth = 900 / state.mapZoom;
    const viewHeight = 480 / state.mapZoom;
    svg.setAttribute("viewBox", `${state.mapCenterX - viewWidth / 2} ${state.mapCenterY - viewHeight / 2} ${viewWidth} ${viewHeight}`);
    drag.lastX = event.clientX;
    drag.lastY = event.clientY;
  });
  map.addEventListener("pointerup", (event) => {
    const drag = state.mapDrag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    state.mapDrag = null;
    map.classList.remove("is-panning");
    if (drag.moved) renderHeatmap();
  });
  map.addEventListener("pointercancel", () => {
    state.mapDrag = null;
    map.classList.remove("is-panning");
    renderHeatmap();
  });
  map.addEventListener("wheel", (event) => {
    event.preventDefault();
    setMapZoom(state.mapZoom * (event.deltaY < 0 ? 1.2 : 1 / 1.2), pointInSvg(event));
  }, { passive: false });
  map.addEventListener("click", (event) => {
    if (event.detail === 0 || event.target.closest(".heat-marker") || !state.mapGeoBounds) return;
    const position = pointInSvg(event);
    const longitude = state.mapGeoBounds.minLon
      + ((position.x - 80) / 740) * (state.mapGeoBounds.maxLon - state.mapGeoBounds.minLon);
    const latitude = state.mapGeoBounds.maxLat
      - ((position.y - 80) / 320) * (state.mapGeoBounds.maxLat - state.mapGeoBounds.minLat);
    state.selectedMapCoordinate = {
      latitude: Math.max(-90, Math.min(90, latitude)),
      longitude: Math.max(-180, Math.min(180, longitude)),
    };
    renderHeatmap();
  });
  map.addEventListener("keydown", (event) => {
    const pan = 45 / state.mapZoom;
    if (event.key === "ArrowLeft") state.mapCenterX -= pan;
    else if (event.key === "ArrowRight") state.mapCenterX += pan;
    else if (event.key === "ArrowUp") state.mapCenterY -= pan;
    else if (event.key === "ArrowDown") state.mapCenterY += pan;
    else if (event.key === "+" || event.key === "=") {
      setMapZoom(state.mapZoom * 1.35);
      event.preventDefault();
      return;
    } else if (event.key === "-") {
      setMapZoom(state.mapZoom / 1.35);
      event.preventDefault();
      return;
    }     else if (event.key === "Home") {
      state.mapZoom = 1;
      state.mapFocusDeploymentId = null;
    } else return;
    event.preventDefault();
    renderHeatmap();
  });
}

function updateManageFields() {
  const deployment = byId("manage-type").value === "deployment";
  byId("node-fields").hidden = deployment;
  byId("deployment-fields").hidden = !deployment;
  byId("node-fields").querySelectorAll("input, select, textarea").forEach((field) => {
    field.disabled = deployment;
  });
  byId("deployment-fields").querySelectorAll("input, select, textarea").forEach((field) => {
    field.disabled = !deployment;
  });
  byId("dialog-submit").disabled = deployment && !state.nodes.length;
  byId("dialog-submit").textContent = deployment && !state.nodes.length ? "Add a sensor first" : "Create";
}

async function submitManageForm(event) {
  event.preventDefault();
  const form = byId("manage-form");
  if (!form.reportValidity()) return;
  const submit = byId("dialog-submit");
  const values = new FormData(form);
  const deployment = values.get("type") === "deployment";
  const payload = deployment
    ? {
      sensor_id: Number(values.get("sensor_id")),
      location_name: String(values.get("location_name")).trim(),
      latitude: values.get("latitude") === "" ? null : Number(values.get("latitude")),
      longitude: values.get("longitude") === "" ? null : Number(values.get("longitude")),
      started_at: new Date(values.get("started_at")).toISOString(),
      ended_at: null,
    }
    : {
      node_name: String(values.get("node_name")).trim(),
      device_identifier: String(values.get("device_identifier")).trim(),
      status: values.get("status"),
    };
  submit.disabled = true;
  submit.textContent = "Saving…";
  byId("dialog-error").hidden = true;
  try {
    const created = deployment
      ? await window.FieldTraceApi.createDeployment(payload)
      : await window.FieldTraceApi.createNode(payload);
    if (deployment) state.deploymentId = created.id;
    byId("manage-dialog").close();
    await refreshDashboard();
    activateTab("hardware");
  } catch (error) {
    byId("dialog-error").textContent = `Could not save: ${error.message}`;
    byId("dialog-error").hidden = false;
  } finally {
    submit.disabled = false;
    submit.textContent = "Create";
    updateManageFields();
  }
}

async function copyJson() {
  const payload = byId("live-json").textContent;
  try {
    await navigator.clipboard.writeText(payload);
    byId("copy-json-button").textContent = "Copied!";
    window.setTimeout(() => { byId("copy-json-button").textContent = "Copy JSON"; }, 1800);
  } catch (error) {
    byId("error-notice").textContent = `Clipboard access failed: ${error.message}. You can select and copy the JSON text directly.`;
    byId("error-notice").hidden = false;
  }
}

function bindEvents() {
  byId("deployment-select").addEventListener("change", (event) => {
    state.deploymentId = event.target.value || null;
    renderDashboard();
  });
  byId("refresh-button").addEventListener("click", refreshDashboard);
  byId("add-node-button").addEventListener("click", openManageDialog);
  byId("theme-button").addEventListener("click", () => {
    const isLight = document.body.classList.toggle("light-theme");
    byId("theme-button").setAttribute("aria-label", isLight ? "Toggle dark theme" : "Toggle light theme");
  });
  byId("manage-type").addEventListener("change", updateManageFields);
  byId("manage-form").addEventListener("submit", submitManageForm);
  byId("dialog-close").addEventListener("click", () => byId("manage-dialog").close());
  byId("dialog-cancel").addEventListener("click", () => byId("manage-dialog").close());
  byId("heatmap-metric-select").addEventListener("change", renderHeatmap);
  byId("map-zoom-in").addEventListener("click", () => setMapZoom(state.mapZoom * 1.35));
  byId("map-zoom-out").addEventListener("click", () => setMapZoom(state.mapZoom / 1.35));
  byId("map-zoom-reset").addEventListener("click", () => {
    state.mapZoom = 1;
    state.mapFocusDeploymentId = null;
    renderHeatmap();
  });
  byId("use-map-coordinate-button").addEventListener("click", () => openManageDialog("deployment"));
  byId("export-csv-button").addEventListener("click", exportMeasurementsCsv);
  byId("copy-json-button").addEventListener("click", copyJson);
  byId("download-json-button").addEventListener("click", () => {
    downloadFile(`fieldtrace-deployment-${state.deploymentId || "all"}.json`, byId("live-json").textContent, "application/json");
  });
  document.querySelectorAll(".app-tab").forEach((tab, index, tabs) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
    tab.addEventListener("keydown", (event) => {
      const next = event.key === "ArrowRight" ? (index + 1) % tabs.length
        : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length
          : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : -1;
      if (next >= 0) {
        event.preventDefault();
        activateTab(tabs[next].dataset.tab, true);
      }
    });
  });
  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      state.metric = button.dataset.metric;
      document.querySelectorAll(".segment").forEach((segment) => {
        const selected = segment === button;
        segment.classList.toggle("active", selected);
        segment.setAttribute("aria-pressed", String(selected));
      });
      renderChart(currentMeasurements());
    });
  });
  bindMapNavigation();
  document.querySelectorAll(".metric-menu").forEach((button) => {
    button.addEventListener("click", () => {
      state.metric = button.dataset.metric;
      activateTab("metrics");
      document.querySelectorAll(".segment").forEach((segment) => {
        const selected = segment.dataset.metric === state.metric;
        segment.classList.toggle("active", selected);
        segment.setAttribute("aria-pressed", String(selected));
      });
      renderChart(currentMeasurements());
      byId("trends").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

populateVariableSelects();
updateManageFields();
activateTab("feed");
bindEvents();
refreshDashboard();
window.setInterval(() => {
  if (document.visibilityState === "visible") refreshDashboard();
}, 30000);
