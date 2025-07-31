"use client";

import React, { memo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface OverallTrendChartProps {
  data: Array<{
    index: number;
    timestamp: string;
    mean: number;
    ppm: number;
    std_dev: number;
  }>;
}

const OverallTrendChart: React.FC<OverallTrendChartProps> = memo(({ data }) => {
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
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        ▦ Overall Mean & PPM Trends
        <span
          style={{
            fontSize: "12px",
            color: "#9CA3AF",
            cursor: "help",
          }}
          title="Overall trend analysis showing mean values (green line, left axis) and PPM defect rates (red line, right axis) over time. Log scale is used for PPM to better visualize large value ranges."
        >
          ℹ️
        </span>
      </h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="index" stroke="#ccc" fontSize={10} domain={[1, 60]} />
          <YAxis yAxisId="left" stroke="#4CAF50" fontSize={10} />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#FF5722"
            fontSize={10}
            scale="log"
            domain={["dataMin", "dataMax"]}
          />
          <Tooltip
            contentStyle={{
              background: "#333",
              border: "1px solid #555",
              borderRadius: "4px",
              fontSize: "11px",
            }}
            formatter={(value: any, name: string) => {
              if (name === "PPM") {
                return [Number(value).toFixed(2), name];
              }
              return [Number(value).toFixed(4), name];
            }}
          />
          <Legend fontSize={11} />
          <Line
            yAxisId="left"
            type="linear"
            dataKey="mean"
            stroke="#4CAF50"
            strokeWidth={1}
            dot={{ r: 0.5, fill: "#4CAF50", strokeWidth: 1 }}
            connectNulls={true}
            isAnimationActive={false}
            name="Mean"
          />
          <Line
            yAxisId="right"
            type="linear"
            dataKey="ppm"
            stroke="#FF5722"
            strokeWidth={1}
            dot={{ r: 0.5, fill: "#FF5722", strokeWidth: 1 }}
            connectNulls={true}
            isAnimationActive={false}
            name="PPM"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

OverallTrendChart.displayName = "OverallTrendChart";

export default OverallTrendChart;
