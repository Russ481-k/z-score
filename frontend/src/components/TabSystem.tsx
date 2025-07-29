"use client";

import React, { useState } from "react";

interface TabProps {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface TabSystemProps {
  tabs: TabProps[];
  defaultTab?: string;
}

const TabSystem: React.FC<TabSystemProps> = ({ tabs, defaultTab }) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div style={{ width: "100%", background: "#1a1a1a" }}>
      {/* Tab Headers */}
      <div
        style={{
          display: "flex",
          borderBottom: "2px solid #333",
          background: "#2a2a2a",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "15px 25px",
              background: activeTab === tab.id ? "#1a1a1a" : "transparent",
              color: activeTab === tab.id ? "#fff" : "#ccc",
              border: "none",
              borderBottom:
                activeTab === tab.id
                  ? "2px solid #4CAF50"
                  : "2px solid transparent",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: activeTab === tab.id ? "bold" : "normal",
              transition: "all 0.3s ease",
              borderRadius: "8px 8px 0 0",
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = "#333";
                e.currentTarget.style.color = "#fff";
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.id) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#ccc";
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        style={{
          padding: "20px",
          minHeight: "500px",
          background: "#1a1a1a",
          borderRadius: "0 0 8px 8px",
        }}
      >
        {activeTabContent}
      </div>
    </div>
  );
};

export default TabSystem;
