"use client";

import React, { memo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PPMSlopeChartProps {
  data: Array<{
    index: number;
    timestamp: string;
    slope: number;
  }>;
}

const PPMSlopeChart: React.FC<PPMSlopeChartProps> = memo(({ data }) => {
  return (
    <div
      style={{
        background: "#2a2a2a",
        borderRadius: "8px",
        padding: "15px",
        height: "200px",
      }}
    >
      <h3
        style={{
          color: "#fff",
          marginBottom: "10px",
          fontSize: "14px",
        }}
      >
        ▦ PPM Slope (Trend Direction)
      </h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="index" stroke="#ccc" fontSize={10} />
          <YAxis stroke="#ccc" fontSize={10} />
          <Tooltip
            contentStyle={{
              background: "#333",
              border: "1px solid #555",
              borderRadius: "4px",
              fontSize: "11px",
            }}
          />
          <Bar dataKey="slope" fill="#4CAF50" name="PPM Slope" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

PPMSlopeChart.displayName = "PPMSlopeChart";

export default PPMSlopeChart;
