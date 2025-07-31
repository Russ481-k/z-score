"use client";

import { useState } from "react";
import DashboardView from "./DashboardView";
import RawDataGrid from "./RawDataGrid";
import ColumnMapperGrid from "./ColumnMapperGrid";
import BacktestingPanel from "./BacktestingPanel";
import ToastContainer from "./ToastContainer";

type Tab = "dashboard" | "raw-data" | "column-mapper" | "backtesting";

const TabSystem = () => {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const tabs = [
    { id: "dashboard" as Tab, label: "▦ Dashboard", component: DashboardView },
    { id: "raw-data" as Tab, label: "▤ Raw Data", component: RawDataGrid },
    {
      id: "column-mapper" as Tab,
      label: "⚙ Column Mapper",
      component: ColumnMapperGrid,
    },
    {
      id: "backtesting" as Tab,
      label: "⟲ Backtesting",
      component: BacktestingPanel,
    },
  ];

  const ActiveComponent =
    tabs.find((tab) => tab.id === activeTab)?.component || DashboardView;

  return (
    <ToastContainer>
      <div className="tab-system">
        <style jsx>{`
          .tab-system {
            min-height: 100vh;
            background: linear-gradient(
              135deg,
              #0a0a0a 0%,
              #1a1a1a 50%,
              #2a2a2a 100%
            );
            color: #e0e0e0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
              sans-serif;
          }

          .tab-header {
            background: rgba(255, 255, 255, 0.02);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding: 0;
            position: sticky;
            top: 0;
            z-index: 100;
          }

          .tab-nav {
            display: flex;
            gap: 0;
            width: 100%;
            padding: 4px 20px;
          }

          .tab-button {
            padding: 10px 16px;
            min-width: 100px;
            font-size: 12px;
          }

          .tab-content {
            margin: 0;
            margin-top: 12px;
            border-radius: 12px 12px 0 0;
            width: 100%;
          }

          .tab-content-inner {
            padding: 16px 20px;
            width: 100%;
          }

          .tab-button {
            padding: 12px 20px;
            background: transparent;
            border: none;
            color: #888;
            cursor: pointer;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 120px;
            justify-content: center;
            letter-spacing: 0.3px;
          }

          .tab-button:hover {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.04);
            transform: translateY(-1px);
          }

          .tab-button.active {
            color: #ffffff;
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          }

          @media (max-width: 768px) {
            .tab-nav {
              flex-wrap: wrap;
              padding: 4px 16px;
              width: 100%;
            }

            .tab-button {
              padding: 10px 16px;
              min-width: 100px;
              font-size: 12px;
            }

            .tab-content {
              margin: 0;
              margin-top: 12px;
              border-radius: 12px 12px 0 0;
              width: 100%;
            }

            .tab-content-inner {
              padding: 16px;
              width: 100%;
            }
          }
        `}</style>

        <div className="tab-header">
          <nav className="tab-nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="tab-content">
          <div className="tab-content-inner">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </ToastContainer>
  );
};

export default TabSystem;
