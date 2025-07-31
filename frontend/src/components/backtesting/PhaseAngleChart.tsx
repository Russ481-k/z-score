"use client";

import React, { memo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PhaseAngleChartProps {
  name: string;
  data: Array<{
    index: number;
    timestamp: string;
    value: number;
    defectRate: number;
    referenceValue: number;
    isOutlier?: boolean;
    originalValue?: number;
  }>;
  color: string;
}

const PhaseAngleChart: React.FC<PhaseAngleChartProps> = memo(
  ({ name, data, color }) => {
    return (
      <div
        style={{
          background: "#2a2a2a",
          borderRadius: "8px",
          padding: "10px",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h4
          style={{
            color: "#fff",
            marginBottom: "8px",
            fontSize: "12px",
            textAlign: "center",
          }}
        >
          {name}
        </h4>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="2 2" stroke="#444" />
            <XAxis dataKey="index" stroke="#ccc" fontSize={10} tick={false} />
            <YAxis yAxisId="left" stroke="#ccc" fontSize={10} width={35} />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#FF5722"
              fontSize={9}
              width={30}
            />
            <Tooltip
              contentStyle={{
                background: "#333",
                border: "1px solid #555",
                borderRadius: "4px",
                fontSize: "11px",
              }}
              formatter={(value: any, name: string, props: any) => {
                const data = props.payload;
                if (name === "Defect Rate") {
                  return [Number(value).toFixed(1) + "%", name];
                }
                if (name === "Value" && data?.isOutlier) {
                  return [
                    `${Number(value).toFixed(
                      2
                    )} (원본: ${data.originalValue?.toFixed(2)}) ⚠️`,
                    name + " (조정됨)",
                  ];
                }
                return [Number(value).toFixed(2), name];
              }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              dot={(props: any) => {
                const { cx, cy, payload } = props;
                return (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={payload?.isOutlier ? 3 : 0}
                    fill={payload?.isOutlier ? "#ff4444" : color}
                    stroke={payload?.isOutlier ? "#fff" : "none"}
                    strokeWidth={payload?.isOutlier ? 1 : 0}
                  />
                );
              }}
              connectNulls={true}
              name="Value"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="defectRate"
              stroke="#FF5722"
              strokeWidth={1}
              dot={false}
              connectNulls={true}
              name="Defect Rate"
              strokeDasharray="3 3"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
);

PhaseAngleChart.displayName = "PhaseAngleChart";

export default PhaseAngleChart;
