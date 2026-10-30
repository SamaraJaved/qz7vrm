import { useState } from "react";
import AccuracyView from "./pages/AccuracyView.jsx";
import DecisionView from "./pages/DecisionView.jsx";

const TABS = [
  { id: "decision", label: "Decision view", Page: DecisionView },
  { id: "accuracy", label: "Forecast accuracy", Page: AccuracyView },
];

function WindMark() {
  return (
    <svg className="wind-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path className="wind-mark-tower" d="M16 15 15 29h2Z" />
      <g className="wind-mark-rotor">
        <path d="M16 13.5c-1.2-3-1.4-6.6-.4-10 .6 3 1.6 6.2 1.9 9.4Z" />
        <path d="M16 13.5c-1.2-3-1.4-6.6-.4-10 .6 3 1.6 6.2 1.9 9.4Z" transform="rotate(120 16 14)" />
        <path d="M16 13.5c-1.2-3-1.4-6.6-.4-10 .6 3 1.6 6.2 1.9 9.4Z" transform="rotate(240 16 14)" />
      </g>
      <circle className="wind-mark-hub" cx="16" cy="14" r="1.8" />
    </svg>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const ActivePage = TABS.find((tab) => tab.id === activeTab).Page;

  // Arrow keys / Home / End move between tabs, following the WAI-ARIA tabs pattern.
  const handleKeyDown = (event) => {
    const index = TABS.findIndex((tab) => tab.id === activeTab);
    const target = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: TABS.length - 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    const next = TABS[(target + TABS.length) % TABS.length];
    setActiveTab(next.id);
    document.getElementById(`tab-${next.id}`).focus();
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="brand">
          <WindMark />
          <div>
            <h1 className="wordmark">WindSight</h1>
            <p className="tagline">UK national wind · Day-ahead decision support · January 2026 pilot</p>
          </div>
        </div>
        <div className="tabs" role="tablist" aria-label="Views" onKeyDown={handleKeyDown}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              type="button"
              role="tab"
              className="tab"
              aria-selected={tab.id === activeTab}
              aria-controls={`panel-${tab.id}`}
              tabIndex={tab.id === activeTab ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} className="app-main">
        <ActivePage />
      </main>

      <footer className="app-footer">
        <h2>About the data</h2>
        <ul>
          <li>
            Forecasts come from Elexon BMRS <strong>WINDFOR</strong> (hourly); actuals from <strong>FUELHH</strong>{" "}
            (half-hourly, fuel type WIND). Hourly forecasts are compared with the on-the-hour actuals.
          </li>
          <li>
            A forecast is only used if it was published before the decision deadline, so there is no look-ahead.
          </li>
          <li>A horizon of N hours means the forecast was published at least N hours before the delivery hour.</li>
          <li>
            Positive error means the forecast was too high (shortfall risk); negative means too low (surplus). The
            persistent positive bias may partly reflect wind curtailment, which lowers metered output — a possibility,
            not a confirmed cause.
          </li>
        </ul>
      </footer>
    </div>
  );
}
