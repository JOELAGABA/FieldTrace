(function () {
  const BASE_URL = window.FIELDTRACE_API_URL || "http://localhost:8000";

  async function get(path) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${BASE_URL}${path}`, { signal: controller.signal });
      if (!response.ok) throw new Error(`API request failed (${response.status}): ${path}`);
      return await response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function fetchDashboard() {
    const [nodes, deployments, measurements] = await Promise.all([
      get("/sensor-nodes"),
      get("/deployments"),
      get("/measurements"),
    ]);
    if (![nodes, deployments, measurements].every(Array.isArray)) {
      throw new Error("The API returned an unexpected response. Expected lists for nodes, deployments, and measurements.");
    }
    return { nodes, deployments, measurements };
  }

  async function post(path, payload) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`API request failed (${response.status}): ${details || path}`);
    }
    return response.json();
  }

  function createNode(payload) {
    return post("/sensor-nodes", payload);
  }

  function createDeployment(payload) {
    return post("/deployments", payload);
  }

  function demoData() {
    const now = Date.now();
    const nodes = [{
      id: 1,
      node_name: "NODE-001",
      device_identifier: "FT-UG-001",
      status: "active",
      created_at: new Date(now - 86400000 * 29).toISOString(),
    }];
    const deployments = [
      {
        id: 1,
        sensor_id: 1,
        location_name: "Makerere University, Kampala",
        latitude: 0.3347,
        longitude: 32.5678,
        started_at: new Date(now - 86400000 * 28).toISOString(),
        ended_at: null,
      },
      {
        id: 2,
        sensor_id: 1,
        location_name: "Jinja Agricultural Station",
        latitude: 0.4479,
        longitude: 33.2026,
        started_at: new Date(now - 86400000 * 79).toISOString(),
        ended_at: new Date(now - 86400000 * 33).toISOString(),
      },
    ];
    const measurements = Array.from({ length: 24 }, (_, index) => {
      const wave = (base, amplitude, phase = 0) =>
        +(base + amplitude * Math.sin(index / 4 + phase)).toFixed(1);
      return {
        id: index + 1,
        deployment_id: 1,
        recorded_at: new Date(now - (23 - index) * 3600000).toISOString(),
        temperature: wave(26, 3.4),
        humidity: wave(70, 7, 1),
        soil_temperature: wave(24, 1.5, 2),
        soil_moisture: wave(53, 5, 3),
        soil_ph: wave(6.4, 0.2, 1),
      };
    });
    return { nodes, deployments, measurements };
  }

  window.FieldTraceApi = { fetchDashboard, createNode, createDeployment, demoData };
})();
