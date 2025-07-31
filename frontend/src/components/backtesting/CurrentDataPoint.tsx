"use client";

import React, { memo } from "react";

interface PhaseAngleData {
  timestamp: string;
  barcode: string;
  angle_1?: number;
  angle_2?: number;
  angle_3?: number;
  angle_4?: number;
  angle_5?: number;
  angle_6?: number;
  mean_value: number;
  std_dev: number;
  predicted_ppm: number;
  ppm_slope?: number;
  quality_status: string;
  defect_probability: number;
}

interface CurrentDataPointProps {
  currentData: PhaseAngleData;
}

const CurrentDataPoint: React.FC<CurrentDataPointProps> = memo(
  ({ currentData }) => {
    return (
      <div
        style={{
          background: "#2a2a2a",
          borderRadius: "8px",
          padding: "15px",
        }}
      >
        <h3
          style={{
            color: "#fff",
            marginBottom: "15px",
            fontSize: "16px",
          }}
        >
          ▦ Current Data Point
        </h3>
        <div style={{ color: "#ccc", fontSize: "14px" }}>
          <div style={{ marginBottom: "8px" }}>
            <strong style={{ color: "#4CAF50" }}>Barcode:</strong>{" "}
            {currentData.barcode}
          </div>
          <div style={{ marginBottom: "8px" }}>
            <strong style={{ color: "#2196F3" }}>Time:</strong>{" "}
            {new Date(currentData.timestamp).toLocaleString()}
          </div>
          <div style={{ marginBottom: "8px" }}>
            <strong style={{ color: "#FF9800" }}>Mean:</strong>{" "}
            {currentData.mean_value.toFixed(6)}
          </div>
          <div style={{ marginBottom: "8px" }}>
            <strong style={{ color: "#9C27B0" }}>Std Dev:</strong>{" "}
            {currentData.std_dev.toFixed(6)}
          </div>
          <div style={{ marginBottom: "8px" }}>
            <strong style={{ color: "#f44336" }}>PPM:</strong>{" "}
            {currentData.predicted_ppm.toFixed(2)}
          </div>
          {currentData.ppm_slope !== null && (
            <div>
              <strong style={{ color: "#607D8B" }}>Slope:</strong>{" "}
              {currentData.ppm_slope?.toFixed(4)}
            </div>
          )}
        </div>
      </div>
    );
  }
);

CurrentDataPoint.displayName = "CurrentDataPoint";

export default CurrentDataPoint;
