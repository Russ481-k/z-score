"use client";

import React, { useState } from "react";
import DashboardView from "./DashboardView";
import RawDataGrid from "./RawDataGrid";
import ColumnMapperGrid from "./ColumnMapperGrid";
import BacktestingPanel from "./BacktestingPanel";

const TabSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  const tabs = [
    { id: "dashboard", label: "대시보드", icon: "▦" },
    { id: "rawdata", label: "로우 데이터", icon: "▤" },
    { id: "columnmapper", label: "컬럼 매퍼", icon: "⚙" },
    { id: "backtest", label: "백테스팅", icon: "⧗" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView />;
      case "rawdata":
        return <RawDataGrid />;
      case "columnmapper":
        return <ColumnMapperGrid />;
      case "backtest":
        return <BacktestingPanel />;
      default:
        return <DashboardView />;
    }
  };

  return (
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
          background: rgba(20, 20, 20, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          padding: 0;
          position: sticky;
          top: 0;
          z-index: 100;
          box-shadow: 0 2px 20px rgba(0, 0, 0, 0.4);
        }

        .tab-nav {
          display: flex;
          max-width: 1400px;
          margin: 0 auto;
          gap: 1px;
          padding: 4px 16px;
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
          position: relative;
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

        .tab-icon {
          font-size: 14px;
          transition: transform 0.2s ease;
        }

        .tab-button:hover .tab-icon {
          transform: scale(1.1);
        }

        .tab-content {
          background: rgba(10, 10, 10, 0.8);
          border-radius: 16px 16px 0 0;
          margin: 0 16px;
          margin-top: 16px;
          box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.3);
          overflow: hidden;
          animation: fadeIn 0.4s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .tab-content-inner {
          padding: 20px;
          min-height: calc(100vh - 120px);
          background: rgba(10, 10, 10, 0.95);
        }

        @media (max-width: 768px) {
          .tab-nav {
            flex-wrap: wrap;
            padding: 4px 12px;
          }

          .tab-button {
            padding: 10px 16px;
            min-width: 100px;
            font-size: 12px;
          }

          .tab-content {
            margin: 0 12px;
            margin-top: 12px;
            border-radius: 12px 12px 0 0;
          }

          .tab-content-inner {
            padding: 16px;
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
              <span className="tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="tab-content">
        <div className="tab-content-inner">{renderTabContent()}</div>
      </div>
    </div>
  );
};

export default TabSystem;
