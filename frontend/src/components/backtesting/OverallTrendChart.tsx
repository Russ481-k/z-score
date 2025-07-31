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
        }}
      >
        ▦ Overall Mean & PPM Trends
      </h3>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="index" stroke="#ccc" fontSize={10} />
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
            type="monotone"
            dataKey="mean"
            stroke="#4CAF50"
            strokeWidth={2}
            dot={{ r: 1, fill: "#4CAF50", strokeWidth: 0 }}
            connectNulls={false}
            name="Mean"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="ppm"
            stroke="#FF5722"
            strokeWidth={2}
            dot={{ r: 1, fill: "#FF5722", strokeWidth: 0 }}
            connectNulls={false}
            name="PPM"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

OverallTrendChart.displayName = "OverallTrendChart";

export default OverallTrendChart;
