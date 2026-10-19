# FieldTrace

FieldTrace is a low-cost IoT and web application platform for monitoring regional soil and climate variables. ESP32 sensor nodes send readings to a FastAPI backend; the web dashboard visualizes sensor, deployment, and measurement data.

## Project structure

```text
FieldTrace-main/
├── Analytics/                  # Python analytics work
├── Backend/
│   ├── app/
│   │   ├── routes/              # Sensor-node, deployment, measurement endpoints
│   │   ├── main.py              # FastAPI application and CORS configuration
│   │   ├── database.py          # Database connection and session
│   │   ├── models.py            # SQLAlchemy models
│   │   └── schema.py            # API request/response schemas
│   └── requirements.txt
├── Data/                        # Dataset storage
├── docs/                        # Project documentation
├── firmware/
│   └── fieldtrace_temperature_test/
│       └── fieldtrace_temperature_test.ino
├── Frontend/
│   ├── api.js                   # Backend requests and offline sample data
│   ├── app.js                   # Dashboard rendering and interactions
│   ├── index.html
│   └── styles.css
├── Hardware/                    # Hardware designs and notes
└── tests/                       # Test assets
```

The existing `Backend/app/.history/` directory contains preserved editor recovery snapshots. It is not runtime application code and is excluded by the root `.gitignore`. The original root `test.txt` was preserved under `tests/legacy-smoke-test.txt`; it is a placeholder, not an automated test.

## Run locally

1. In a terminal, install the backend requirements and run the API:

   ```powershell
   cd Backend
   python -m pip install -r requirements.txt
   python -m uvicorn app.main:app --reload
   ```

2. In another terminal opened at the project root, serve the dashboard:

   ```powershell
   python -m http.server 5500 --directory Frontend
   ```

3. Open `http://localhost:5500`.

The dashboard reads `/sensor-nodes`, `/deployments`, and `/measurements` from `http://localhost:8000`. When the API cannot be reached, it displays clearly labeled sample data. To use another API host, define `window.FIELDTRACE_API_URL` before `api.js` loads in `Frontend/index.html`.

## GPS heatmap

Open **Field Heatmap & GIS** to navigate the GPS coordinate grid. Drag to pan, use the mouse wheel or zoom buttons to zoom, or focus the map and use the arrow keys, `+`/`-`, and `Home`. Click or tap a point to see its latitude and longitude, then choose **Use point for deployment** to prefill those coordinates in a new deployment. The grid plots the available GPS coordinates; it is not a street map or turn-by-turn navigation service.

## Technology

- **Hardware:** ESP32 and environmental sensors
- **Backend:** Python, FastAPI, SQLAlchemy, PostgreSQL
- **Frontend:** HTML, CSS, and JavaScript
- **Analytics:** Python

## Project objectives

1. Design a low-cost IoT sensor node.
2. Develop a web platform for viewing collected data.
3. Store and manage environmental measurements.
4. Apply analytics to identify patterns in collected data.

## Team

Joel, Enoch, Hillary, Emmanuel
