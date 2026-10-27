import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, 
  Thermometer, 
  Droplets, 
  FlaskConical, 
  Sun, 
  Battery, 
  MapPin, 
  Cpu, 
  RefreshCw, 
  Plus, 
  SlidersHorizontal, 
  Layers, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Moon, 
  SunMedium,
  ExternalLink,
  ChevronRight,
  Database,
  Wifi,
  Navigation
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';

// FastAPI backend (use your laptop's LAN IP, e.g. http://192.168.1.133:8000, if the dashboard runs on another device)
const API_BASE = 'http://127.0.0.1:8000';

// Render a sensor reading; unmeasured sensors arrive as null from the backend and are shown as 'null'
const fmt = (value, unit = '') => (value === null || value === undefined ? 'null' : `${value}${unit}`);

// Default initial deployments data matching handwritten project notes
const INITIAL_DEPLOYMENTS = [
  {
    id: 1,
    location_name: "Makerere University - Plot A",
    node_id: "NODE-001",
    node_name: "ESP32-Agri-Alpha",
    latitude: 0.3476,
    longitude: 32.5825,
    started_at: "2026-10-01",
    ended_at: null,
    status: "Active",
    battery: 88,
    solar_charging: true,
    recent: {
      temperature: null,
      humidity: null,
      soil_temperature: null,
      soil_moisture: null,
      soil_ph: null
    }
  },
  {
    id: 2,
    location_name: "Jinja Demonstration Farm",
    node_id: "NODE-002",
    node_name: "ESP32-Jinja-Beta",
    latitude: 0.4479,
    longitude: 33.2026,
    started_at: "2026-10-10",
    ended_at: null,
    status: "Active",
    battery: 94,
    solar_charging: true,
    recent: {
      temperature: 29.1,
      humidity: 64.5,
      soil_temperature: 27.2,
      soil_moisture: 42.1,
      soil_ph: 6.8
    }
  },
  {
    id: 3,
    location_name: "Kasese Research Station",
    node_id: "NODE-003",
    node_name: "ESP32-Kasese-Gamma",
    latitude: 0.1864,
    longitude: 30.0821,
    started_at: "2026-09-15",
    ended_at: "2026-10-15",
    status: "Offline",
    battery: 12,
    solar_charging: false,
    recent: {
      temperature: 31.8,
      humidity: 52.0,
      soil_temperature: 29.5,
      soil_moisture: 31.0,
      soil_ph: 5.9
    }
  }
];

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState(true);

  // Active view tab
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'map', 'nodes', 'terminal'

  // Selected deployment context
  const [selectedDeploymentId, setSelectedDeploymentId] = useState(1);

  // Heatmap variable toggle for map view
  const [heatmapVariable, setHeatmapVariable] = useState('soil_moisture'); // 'soil_moisture', 'soil_temperature', 'soil_ph', 'temperature'

  // Live telemetry stream state
  const [liveStreamActive, setLiveStreamActive] = useState(true);
  const [telemetryLogs, setTelemetryLogs] = useState([]);
  
  // Live data from the FastAPI backend
  const [backendMeasurements, setBackendMeasurements] = useState([]);
  const [apiConnected, setApiConnected] = useState(false);

  // Historical chart time frame
  const [timeRange, setTimeRange] = useState('24h');

  // Modal State for New Deployment
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployments, setDeployments] = useState(INITIAL_DEPLOYMENTS);
  const [newDeploymentForm, setNewDeploymentForm] = useState({
    node_id: "NODE-004",
    node_name: "ESP32-Field-Delta",
    location_name: "Mbarara Sub-Station",
    latitude: -0.6072,
    longitude: 30.6545
  });

  // Current selected deployment
  const currentDeployment = useMemo(() => {
    return deployments.find(d => d.id === Number(selectedDeploymentId)) || deployments[0];
  }, [deployments, selectedDeploymentId]);

  // Live Data generator generator
  const [historicalData, setHistoricalData] = useState(() => generateHistoricalData(24));

  // Does the backend hold real readings for the selected deployment?
  const hasLiveData = useMemo(
    () => apiConnected && backendMeasurements.some(m => m.deployment_id === currentDeployment.id),
    [apiConnected, backendMeasurements, currentDeployment.id]
  );

  // Chart data: real DB rows (nulls preserved as gaps) when available, otherwise simulated history
  const chartData = useMemo(() => {
    if (!hasLiveData) return historicalData;
    return backendMeasurements
      .filter(m => m.deployment_id === currentDeployment.id)
      .slice(-60)
      .map(m => ({
        time: new Date(m.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: m.recorded_at,
        temperature: m.temperature ?? null,
        humidity: m.humidity ?? null,
        soil_temperature: m.soil_temperature ?? null,
        soil_moisture: m.soil_moisture ?? null,
        soil_ph: m.soil_ph ?? null,
        battery: currentDeployment.battery
      }));
  }, [hasLiveData, backendMeasurements, historicalData, currentDeployment.id, currentDeployment.battery]);

  // Terminal feed: real DB rows when available, otherwise simulated POST log
  const displayLogs = useMemo(() => {
    if (!hasLiveData) return telemetryLogs;
    return backendMeasurements
      .filter(m => m.deployment_id === currentDeployment.id)
      .slice(-20)
      .reverse()
      .map(m => ({
        id: m.id,
        time: new Date(m.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        status: 200,
        payload: m
      }));
  }, [hasLiveData, backendMeasurements, telemetryLogs, currentDeployment.id]);

  function generateHistoricalData(hours) {
    const data = [];
    const now = new Date();
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 3600 * 1000);
      const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      // Dynamic curves based on diurnal cycles
      const hourVal = timestamp.getHours();
      const baseTemp = 24 + Math.sin((hourVal - 8) / 24 * Math.PI * 2) * 5;
      
      data.push({
        time: timeStr,
        timestamp: timestamp.toISOString(),
        temperature: Number((baseTemp + (Math.random() - 0.5) * 1.5).toFixed(1)),
        humidity: Number((65 - Math.sin((hourVal - 8) / 24 * Math.PI * 2) * 15 + (Math.random() - 0.5) * 3).toFixed(1)),
        soil_temperature: Number((baseTemp - 2 + (Math.random() - 0.5) * 0.8).toFixed(1)),
        soil_moisture: Number((50 + Math.cos(i / 5) * 8 + (Math.random() - 0.5) * 2).toFixed(1)),
        soil_ph: Number((6.3 + (Math.random() - 0.5) * 0.2).toFixed(2)),
        battery: Math.min(100, Math.max(20, Math.round(85 + Math.sin(i / 10) * 10)))
      });
    }
    return data;
  }

  // Fetch real measurements from the FastAPI backend (polls every 3s)
  useEffect(() => {
    if (!liveStreamActive) return;

    const fetchBackendData = async () => {
      try {
        const response = await fetch(`${API_BASE}/measurements`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        // Oldest -> newest, so the last element is the latest record
        const sorted = [...data].sort(
          (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime() || a.id - b.id
        );
        setBackendMeasurements(sorted);
        setApiConnected(true);

        // Latest record per deployment
        const latestByDeployment = {};
        sorted.forEach(m => { latestByDeployment[m.deployment_id] = m; });

        setDeployments(prev => prev.map(d => {
          const latest = latestByDeployment[d.id];
          if (!latest) return d;
          return {
            ...d,
            recent: {
              temperature: latest.temperature ?? null,
              humidity: latest.humidity ?? null, // null if sensor not attached
              soil_temperature: latest.soil_temperature ?? null,
              soil_moisture: latest.soil_moisture ?? null,
              soil_ph: latest.soil_ph ?? null
            }
          };
        }));
      } catch (error) {
        console.error('FastAPI connection error:', error);
        setApiConnected(false);
      }
    };

    fetchBackendData();
    const interval = setInterval(fetchBackendData, 3000);
    return () => clearInterval(interval);
  }, [liveStreamActive]);

  // Simulate real-time stream (demo fallback only: runs when the backend has no real data for this deployment)
  useEffect(() => {
    if (!liveStreamActive || hasLiveData) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      // Mutate current readings slightly
      const deltaTemp = (Math.random() - 0.48) * 0.4;
      const deltaMoisture = (Math.random() - 0.51) * 0.3;
      const deltaHum = (Math.random() - 0.5) * 0.6;

      // null readings stay null: never fabricate values for unmeasured sensors
      const r = currentDeployment.recent;
      const updatedTemp = r.temperature == null ? null : Number((r.temperature + deltaTemp).toFixed(1));
      const updatedMoisture = r.soil_moisture == null ? null : Number(Math.max(10, Math.min(95, r.soil_moisture + deltaMoisture)).toFixed(1));
      const updatedHum = r.humidity == null ? null : Number(Math.max(20, Math.min(99, r.humidity + deltaHum)).toFixed(1));
      const updatedSoilTemp = r.soil_temperature == null ? null : Number((r.soil_temperature + deltaTemp * 0.7).toFixed(1));
      const updatedPh = r.soil_ph == null ? null : Number((r.soil_ph + (Math.random() - 0.5) * 0.02).toFixed(2));

      // Update current deployment state
      setDeployments(prev => prev.map(d => {
        if (d.id === currentDeployment.id) {
          return {
            ...d,
            recent: {
              temperature: updatedTemp,
              humidity: updatedHum,
              soil_temperature: updatedSoilTemp,
              soil_moisture: updatedMoisture,
              soil_ph: updatedPh
            }
          };
        }
        return d;
      }));

      // Append to historical charts
      setHistoricalData(prev => {
        const next = [...prev.slice(1)];
        next.push({
          time: timeStr.split(':')[0] + ':' + timeStr.split(':')[1],
          timestamp: now.toISOString(),
          temperature: updatedTemp,
          humidity: updatedHum,
          soil_temperature: updatedSoilTemp,
          soil_moisture: updatedMoisture,
          soil_ph: updatedPh,
          battery: currentDeployment.battery
        });
        return next;
      });

      // Construct raw JSON HTTP POST Payload matching API schema
      const jsonPayload = {
        sensor_id: currentDeployment.node_id,
        deployment_id: currentDeployment.id,
        location: currentDeployment.location_name,
        timestamp: now.toISOString(),
        temperature: updatedTemp,
        humidity: updatedHum,
        soil_temperature: updatedSoilTemp,
        soil_moisture: updatedMoisture,
        soil_ph: updatedPh,
        latitude: currentDeployment.latitude,
        longitude: currentDeployment.longitude,
        battery_pct: currentDeployment.battery,
        solar_charging: currentDeployment.solar_charging
      };

      setTelemetryLogs(prev => [
        {
          id: Date.now(),
          time: timeStr,
          status: 201,
          payload: jsonPayload
        },
        ...prev.slice(0, 19) // keep last 20 logs
      ]);

    }, 3500);

    return () => clearInterval(interval);
  }, [liveStreamActive, hasLiveData, currentDeployment]);

  // Handle Deployment creation
  const handleCreateDeployment = (e) => {
    e.preventDefault();
    const newEntry = {
      id: deployments.length + 1,
      location_name: newDeploymentForm.location_name,
      node_id: newDeploymentForm.node_id,
      node_name: newDeploymentForm.node_name,
      latitude: parseFloat(newDeploymentForm.latitude),
      longitude: parseFloat(newDeploymentForm.longitude),
      started_at: new Date().toISOString().split('T')[0],
      ended_at: null,
      status: "Active",
      battery: 100,
      solar_charging: true,
      recent: {
        temperature: 26.5,
        humidity: 68.0,
        soil_temperature: 24.2,
        soil_moisture: 58.0,
        soil_ph: 6.5
      }
    };
    setDeployments([...deployments, newEntry]);
    setSelectedDeploymentId(newEntry.id);
    setShowDeployModal(false);
  };

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'}`}>
      
      {/* HEADER / NAVIGATION BAR */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md ${darkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Brand Title */}
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg leading-none tracking-tight">FieldTrace</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-medium border border-emerald-500/20">
                  YieldMesh v1.2
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">IoT Soil & Climate Intelligence</p>
            </div>
          </div>

          {/* Deployment Location Selector */}
          <div className="hidden md:flex items-center space-x-3">
            <div className={`flex items-center px-3 py-1.5 rounded-lg border text-sm font-medium ${darkMode ? 'bg-slate-800/80 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-700'}`}>
              <MapPin className="w-4 h-4 text-emerald-500 mr-2 shrink-0" />
              <span className="text-xs text-slate-400 mr-2">Deployment:</span>
              <select 
                value={selectedDeploymentId} 
                onChange={(e) => setSelectedDeploymentId(e.target.value)}
                className="bg-transparent focus:outline-none cursor-pointer font-semibold text-sm"
              >
                {deployments.map(d => (
                  <option key={d.id} value={d.id} className={darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-800'}>
                    {d.location_name} ({d.node_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Hardware Status Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${
              currentDeployment.status === 'Active' 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}>
              <span className={`w-2 h-2 rounded-full ${currentDeployment.status === 'Active' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <span>{currentDeployment.status === 'Active' ? `ESP32 ${currentDeployment.node_id} Live` : 'Hardware Disconnected'}</span>
            </div>

            {/* Backend API Status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${
              apiConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <Database className="w-3.5 h-3.5" />
              <span>{apiConnected ? 'API Connected' : 'API Offline (demo data)'}</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setLiveStreamActive(!liveStreamActive)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                liveStreamActive 
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20' 
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
              }`}
              title="Toggle Simulated Sensor Stream"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${liveStreamActive ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{liveStreamActive ? 'Streaming' : 'Paused'}</span>
            </button>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg border transition ${
                darkMode ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
              }`}
              title="Toggle Theme"
            >
              {darkMode ? <SunMedium className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button 
              onClick={() => setShowDeployModal(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Deployment</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={`px-4 max-w-7xl mx-auto flex space-x-1 border-t text-sm ${darkMode ? 'border-slate-800/80' : 'border-slate-200'}`}>
          {[
            { id: 'overview', label: 'Dashboard & Metrics', icon: Activity },
            { id: 'map', label: 'Field Heatmap & GIS', icon: MapPin },
            { id: 'nodes', label: 'Hardware & Deployments', icon: Cpu },
            { id: 'terminal', label: 'Live JSON Feed', icon: Terminal }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2.5 px-3 border-b-2 font-medium text-xs sm:text-sm transition-colors ${
                  isActive
                    ? 'border-emerald-500 text-emerald-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* OVERVIEW TAB CONTENT */}
        {activeTab === 'overview' && (
          <>
            {/* TOP METRICS KPI GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
              
              {/* Air Temperature */}
              <MetricCard
                title="Air Temperature"
                value={fmt(currentDeployment.recent.temperature, '°C')}
                subtitle="Ambient Sensor"
                icon={Thermometer}
                trend={currentDeployment.recent.temperature == null ? 'No data' : hasLiveData ? 'Live from DB' : '+0.3° vs 1h ago'}
                trendUp={currentDeployment.recent.temperature != null}
                color="orange"
                darkMode={darkMode}
              />

              {/* Air Humidity */}
              <MetricCard
                title="Air Humidity"
                value={fmt(currentDeployment.recent.humidity, '%')}
                subtitle="Relative Air"
                icon={Droplets}
                trend={currentDeployment.recent.humidity == null ? 'No sensor attached' : '-1.2% vs 1h ago'}
                trendUp={false}
                color="blue"
                darkMode={darkMode}
              />

              {/* Soil Temperature */}
              <MetricCard
                title="Soil Temperature"
                value={fmt(currentDeployment.recent.soil_temperature, '°C')}
                subtitle="Root Zone (10cm)"
                icon={Thermometer}
                trend={currentDeployment.recent.soil_temperature == null ? 'No sensor attached' : 'Stable'}
                trendUp={currentDeployment.recent.soil_temperature != null}
                color="amber"
                darkMode={darkMode}
              />

              {/* Soil Moisture */}
              <MetricCard
                title="Soil Moisture"
                value={fmt(currentDeployment.recent.soil_moisture, '%')}
                subtitle="Volumetric Water"
                icon={Droplets}
                trend={currentDeployment.recent.soil_moisture == null ? 'No sensor attached' : 'Optimal Range'}
                trendUp={currentDeployment.recent.soil_moisture != null}
                color="emerald"
                darkMode={darkMode}
              />

              {/* Soil pH */}
              <MetricCard
                title="Soil pH Level"
                value={fmt(currentDeployment.recent.soil_ph)}
                subtitle="Acidity Index"
                icon={FlaskConical}
                trend={currentDeployment.recent.soil_ph == null ? 'No sensor attached' : 'Slightly Acidic'}
                trendUp={currentDeployment.recent.soil_ph != null}
                color="purple"
                darkMode={darkMode}
              />

              {/* GPS Coordinates */}
              <MetricCard
                title="GPS Position"
                value={`${currentDeployment.latitude.toFixed(2)}, ${currentDeployment.longitude.toFixed(2)}`}
                subtitle={currentDeployment.location_name.split('-')[0]}
                icon={Navigation}
                trend="Fix Locked"
                trendUp={true}
                color="cyan"
                darkMode={darkMode}
              />

              {/* Battery & Solar */}
              <MetricCard
                title="Power & Solar"
                value={`${currentDeployment.battery}%`}
                subtitle={currentDeployment.solar_charging ? "Solar Charging" : "Battery Only"}
                icon={Sun}
                trend={currentDeployment.solar_charging ? "+4.2W Solar" : "Discharging"}
                trendUp={currentDeployment.solar_charging}
                color="green"
                darkMode={darkMode}
              />
            </div>

            {/* CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Primary Soil Moisture & pH Graph */}
              <div className={`lg:col-span-2 p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800/40 gap-2">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <Droplets className="w-5 h-5 text-emerald-400" />
                      Soil Hydration & pH Balance Time Series
                    </h3>
                    <p className="text-xs text-slate-400">Continuous 10-minute automated telemetry ingestion from {currentDeployment.node_id}</p>
                  </div>
                  
                  {/* Time frame selector */}
                  <div className={`flex items-center rounded-lg border p-1 text-xs font-semibold ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                    {['Live', '24h', '7d', '30d'].map((range) => (
                      <button
                        key={range}
                        onClick={() => setTimeRange(range)}
                        className={`px-2.5 py-1 rounded-md transition ${
                          timeRange === range
                            ? 'bg-emerald-500 text-slate-950 shadow-sm font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-72 mt-4 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="moistureGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                      <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                      <Tooltip content={<CustomChartTooltip darkMode={darkMode} />} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Area type="monotone" dataKey="soil_moisture" name="Soil Moisture (%)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#moistureGrad)" />
                      <Line type="monotone" dataKey="soil_ph" name="Soil pH" stroke="#a855f7" strokeWidth={2} dot={false} yAxisId={0} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Climate Temperature Correlation (Air vs Soil) */}
              <div className={`p-5 rounded-2xl border ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="pb-4 border-b border-slate-800/40">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Thermometer className="w-5 h-5 text-amber-400" />
                    Thermal Differential
                  </h3>
                  <p className="text-xs text-slate-400">Air vs. Soil Temperature buffer</p>
                </div>

                <div className="h-72 mt-4 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#334155' : '#e2e8f0'} />
                      <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={11} domain={['dataMin - 2', 'dataMax + 2']} />
                      <Tooltip content={<CustomChartTooltip darkMode={darkMode} />} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Line type="monotone" dataKey="temperature" name="Air Temp (°C)" stroke="#f97316" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="soil_temperature" name="Soil Temp (°C)" stroke="#eab308" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* QUICK STATUS & ARCHITECTURE BANNER */}
            <div className={`p-4 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-4 ${
              darkMode ? 'bg-slate-900/40 border-slate-800' : 'bg-emerald-50/50 border-emerald-100'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm">PostgreSQL Data Model Architectural Separation Active</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Physical hardware ID <code className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded font-mono">NODE-001</code> is abstractly decoupled from location deployments. Hardware relocated from Kampala to Jinja retains full historical lineage without rewriting records.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setActiveTab('nodes')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs whitespace-nowrap transition flex items-center gap-1.5"
              >
                Manage Deployments <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* MAP & HEATMAP TAB */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            
            {/* Map Header Controls */}
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-400" />
                  Spatial Regional GIS & Interpolated Soil Heatmap
                </h3>
                <p className="text-xs text-slate-400">Regional deployment node locations across Uganda with real-time field gradients</p>
              </div>

              {/* Heatmap Variable Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Layer Overlay:</span>
                <div className={`flex rounded-lg border p-1 text-xs font-semibold ${darkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                  {[
                    { id: 'soil_moisture', label: 'Moisture (%)' },
                    { id: 'soil_temperature', label: 'Soil Temp (°C)' },
                    { id: 'soil_ph', label: 'pH Level' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setHeatmapVariable(item.id)}
                      className={`px-3 py-1.5 rounded-md transition ${
                        heatmapVariable === item.id 
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Canvas Map Representation */}
            <div className={`relative h-[500px] w-full rounded-2xl border overflow-hidden ${
              darkMode ? 'bg-slate-950 border-slate-800' : 'bg-emerald-900/10 border-slate-300'
            }`}>
              {/* Map Canvas Background Grid Mockup */}
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]" />
              
              {/* Regional Map Background Vector Lines Simulation */}
              <svg className="absolute inset-0 w-full h-full stroke-slate-700/40 fill-none" strokeWidth="1">
                <path d="M 50 120 Q 200 80 400 150 T 800 200 T 1200 180" strokeDasharray="4 4" />
                <path d="M 100 400 Q 300 350 600 420 T 1000 380" strokeDasharray="4 4" />
                <circle cx="280" cy="220" r="180" className="fill-emerald-500/5 stroke-emerald-500/20" />
                <circle cx="650" cy="180" r="150" className="fill-amber-500/5 stroke-amber-500/20" />
                <circle cx="850" cy="340" r="140" className="fill-purple-500/5 stroke-purple-500/20" />
              </svg>

              {/* Heatmap Color Gradient Legend Overlay */}
              <div className={`absolute bottom-4 left-4 p-3 rounded-xl border backdrop-blur-md z-10 ${
                darkMode ? 'bg-slate-900/90 border-slate-800 text-slate-200' : 'bg-white/90 border-slate-200 text-slate-800'
              }`}>
                <div className="text-xs font-bold mb-1">
                  Interpolated {heatmapVariable.replace('_', ' ').toUpperCase()} Intensity
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">Low</span>
                  <div className="h-2.5 w-36 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 via-emerald-400 to-blue-500" />
                  <span className="text-[10px] text-slate-400">High</span>
                </div>
              </div>

              {/* Node Map Markers */}
              {deployments.map((dep, index) => {
                // Approximate coordinate projection to canvas %
                const positions = [
                  { top: '35%', left: '28%' }, // Makerere / KLA
                  { top: '28%', left: '62%' }, // Jinja
                  { top: '65%', left: '18%' }, // Kasese
                  { top: '75%', left: '48%' }  // Mbarara
                ];
                const pos = positions[index % positions.length];
                const isSelected = dep.id === currentDeployment.id;

                return (
                  <div 
                    key={dep.id} 
                    style={{ top: pos.top, left: pos.left }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
                    onClick={() => setSelectedDeploymentId(dep.id)}
                  >
                    {/* Pulsing radius */}
                    <div className={`absolute -inset-4 rounded-full opacity-40 animate-ping ${
                      isSelected ? 'bg-emerald-500' : 'bg-slate-500'
                    }`} />

                    {/* Node Marker Pin */}
                    <div className={`relative p-2.5 rounded-full border shadow-xl transition-transform group-hover:scale-110 flex items-center justify-center ${
                      isSelected 
                        ? 'bg-emerald-500 border-white text-slate-950 font-bold scale-110' 
                        : 'bg-slate-900 border-slate-700 text-slate-200'
                    }`}>
                      <MapPin className="w-5 h-5" />
                    </div>

                    {/* Interactive Marker Tooltip Box */}
                    <div className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-3 w-56 p-3 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-200 pointer-events-none ${
                      isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-95 group-hover:opacity-100 group-hover:pointer-events-auto'
                    } ${darkMode ? 'bg-slate-900/95 border-emerald-500/40 text-slate-100' : 'bg-white/95 border-slate-300 text-slate-800'}`}>
                      <div className="flex items-center justify-between pb-1 border-b border-slate-700/50">
                        <span className="font-bold text-xs text-emerald-400">{dep.node_id}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          dep.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {dep.status}
                        </span>
                      </div>
                      <div className="text-xs font-bold mt-1.5 truncate">{dep.location_name}</div>
                      <div className="mt-2 space-y-1 text-[11px] text-slate-300 font-mono">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Moisture:</span>
                          <span className="font-bold text-emerald-400">{fmt(dep.recent.soil_moisture, '%')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Soil Temp:</span>
                          <span>{fmt(dep.recent.soil_temperature, '°C')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">pH Level:</span>
                          <span className="text-purple-400">{fmt(dep.recent.soil_ph)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>
        )}

        {/* HARDWARE & DEPLOYMENTS TAB */}
        {activeTab === 'nodes' && (
          <div className="space-y-6">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Registered Hardware & Active Deployments</h3>
                <p className="text-xs text-slate-400">Database mapping between physical ESP32 microcontrollers and location deployments</p>
              </div>
              <button 
                onClick={() => setShowDeployModal(true)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg transition"
              >
                <Plus className="w-4 h-4" /> Deploy Hardware Node
              </button>
            </div>

            {/* Table of Deployments */}
            <div className={`rounded-2xl border overflow-hidden ${darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className={`border-b uppercase text-[10px] tracking-wider font-mono ${
                    darkMode ? 'bg-slate-950/60 border-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <tr>
                      <th className="py-3 px-4">Device ID</th>
                      <th className="py-3 px-4">Node Alias</th>
                      <th className="py-3 px-4">Deployment Site</th>
                      <th className="py-3 px-4">GPS Position</th>
                      <th className="py-3 px-4">Start Date</th>
                      <th className="py-3 px-4">Battery & Solar</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 font-mono">
                    {deployments.map(dep => (
                      <tr key={dep.id} className={`transition ${darkMode ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                        <td className="py-3.5 px-4 font-bold text-emerald-400">{dep.node_id}</td>
                        <td className="py-3.5 px-4 font-sans font-medium text-slate-200">{dep.node_name}</td>
                        <td className="py-3.5 px-4 font-sans text-slate-300">{dep.location_name}</td>
                        <td className="py-3.5 px-4 text-slate-400">{dep.latitude.toFixed(4)}, {dep.longitude.toFixed(4)}</td>
                        <td className="py-3.5 px-4 text-slate-400">{dep.started_at}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-200">{dep.battery}%</span>
                            {dep.solar_charging && <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin" />}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            dep.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${dep.status === 'Active' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                            {dep.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button 
                            onClick={() => {
                              setSelectedDeploymentId(dep.id);
                              setActiveTab('overview');
                            }}
                            className="text-emerald-400 hover:text-emerald-300 font-sans text-xs font-semibold hover:underline"
                          >
                            Inspect Data &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* LIVE JSON TERMINAL / TELEMETRY LOGS */}
        {activeTab === 'terminal' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-emerald-400" />
                  Live FastAPI Telemetry Ingestion Log
                </h3>
                <p className="text-xs text-slate-400">Real-time HTTP POST JSON payloads received from ESP32 clients</p>
              </div>
              <button 
                onClick={() => setTelemetryLogs([])}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
              >
                Clear Log Output
              </button>
            </div>

            {/* Terminal Console View */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3 text-slate-400 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                  <span className="ml-2 font-bold text-slate-300">fieldtrace-api / v1 / measurements</span>
                </div>
                <span>Status: 201 Created Ingestion</span>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                {displayLogs.length === 0 ? (
                  <div className="text-slate-500 py-12 text-center">
                    Waiting for incoming HTTP POST request from ESP32 hardware...
                  </div>
                ) : (
                  displayLogs.map(log => (
                    <div key={log.id} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-emerald-400 font-bold">POST /api/v1/measurements</span>
                        <span className="text-slate-500">{log.time}</span>
                      </div>
                      <pre className="text-slate-300 text-[11px] overflow-x-auto p-2 rounded bg-slate-950/60 border border-slate-800/40">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* NEW DEPLOYMENT MODAL */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl ${
            darkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <h3 className="text-lg font-bold mb-1">Deploy Hardware Node</h3>
            <p className="text-xs text-slate-400 mb-4">Relocate or register a physical ESP32 device to a new site</p>

            <form onSubmit={handleCreateDeployment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Physical Device ID</label>
                <input 
                  type="text"
                  required
                  value={newDeploymentForm.node_id}
                  onChange={e => setNewDeploymentForm({...newDeploymentForm, node_id: e.target.value})}
                  className={`w-full p-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300'
                  }`}
                  placeholder="e.g. NODE-004"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Hardware Alias Name</label>
                <input 
                  type="text"
                  required
                  value={newDeploymentForm.node_name}
                  onChange={e => setNewDeploymentForm({...newDeploymentForm, node_name: e.target.value})}
                  className={`w-full p-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300'
                  }`}
                  placeholder="e.g. ESP32-Field-Delta"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Deployment Location Name</label>
                <input 
                  type="text"
                  required
                  value={newDeploymentForm.location_name}
                  onChange={e => setNewDeploymentForm({...newDeploymentForm, location_name: e.target.value})}
                  className={`w-full p-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 ${
                    darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300'
                  }`}
                  placeholder="e.g. Mbarara Sub-Station"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Latitude</label>
                  <input 
                    type="number"
                    step="0.0001"
                    required
                    value={newDeploymentForm.latitude}
                    onChange={e => setNewDeploymentForm({...newDeploymentForm, latitude: e.target.value})}
                    className={`w-full p-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Longitude</label>
                  <input 
                    type="number"
                    step="0.0001"
                    required
                    value={newDeploymentForm.longitude}
                    onChange={e => setNewDeploymentForm({...newDeploymentForm, longitude: e.target.value})}
                    className={`w-full p-2.5 rounded-lg border focus:outline-none focus:border-emerald-500 ${
                      darkMode ? 'bg-slate-950 border-slate-800 text-slate-100' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeployModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-md"
                >
                  Save Deployment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

// Sub-component: Reusable Metric Card
function MetricCard({ title, value, subtitle, icon: Icon, trend, trendUp, color, darkMode }) {
  const colorStyles = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20'
  };

  return (
    <div className={`p-4 rounded-2xl border transition hover:border-slate-700 flex flex-col justify-between ${
      darkMode ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
    }`}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-slate-400 truncate">{title}</span>
          <div className={`p-1.5 rounded-lg border ${colorStyles[color] || colorStyles.emerald}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-lg font-black tracking-tight">{value}</div>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-800/30 flex items-center justify-between text-[10px]">
        <span className="text-slate-400 truncate">{subtitle}</span>
        <span className={`font-semibold ${trendUp ? 'text-emerald-400' : 'text-amber-400'}`}>{trend}</span>
      </div>
    </div>
  );
}

// Custom Recharts Tooltip
function CustomChartTooltip({ active, payload, label, darkMode }) {
  if (active && payload && payload.length) {
    return (
      <div className={`p-3 rounded-xl border backdrop-blur-md shadow-xl text-xs space-y-1 font-mono ${
        darkMode ? 'bg-slate-900/95 border-slate-800 text-slate-100' : 'bg-white/95 border-slate-200 text-slate-800'
      }`}>
        <p className="font-bold text-slate-400 text-[10px] pb-1 border-b border-slate-800">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex justify-between gap-4">
            <span style={{ color: entry.color }}>{entry.name}:</span>
            <span className="font-bold">{entry.value ?? 'null'}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
}