"use client";

import React, { memo, useMemo } from "react";
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
  // 메모리 최적화된 데이터 처리
  const { processedData, domain } = useMemo(() => {
    if (data.length === 0) {
      return { processedData: [], domain: [-1, 1] as [number, number] };
    }

    // 기울기 값 스케일링 및 통계 계산
    const processed = new Array(data.length);
    const slopes = new Array(data.length);

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      const scaledSlope = item.slope; // 현재 스케일링 유지
      const displaySlope = Math.abs(scaledSlope) < 0.001 ? 0 : scaledSlope;

      processed[i] = {
        ...item,
        slope: item.slope,
        scaledSlope: scaledSlope,
        displaySlope: displaySlope,
      };
      slopes[i] = displaySlope;
    }

    // Y축 도메인 계산
    const minSlope = Math.min(...slopes);
    const maxSlope = Math.max(...slopes);
    const range = Math.max(Math.abs(minSlope), Math.abs(maxSlope));
    const calculatedDomain =
      range === 0 ? [-1, 1] : [-range * 1.1, range * 1.1];

    return {
      processedData: processed,
      domain: calculatedDomain as [number, number],
    };
  }, [data]);

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
        ▦ PPM Slope (Trend Direction) × 1000
        <span
          style={{
            fontSize: "12px",
            color: "#9CA3AF",
            cursor: "help",
          }}
          title="PPM slope analysis showing the rate of change in defect rates over time. Positive values indicate increasing defect rates (deteriorating quality), negative values indicate improving quality. Values are scaled by 1000 for better visibility."
        >
          ℹ️
        </span>
      </h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={processedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="index" stroke="#ccc" fontSize={10} domain={[1, 60]} />
          <YAxis
            stroke="#ccc"
            fontSize={10}
            domain={domain}
            tickFormatter={(value) => value.toFixed(3)}
          />
          <Tooltip
            contentStyle={{
              background: "#333",
              border: "1px solid #555",
              borderRadius: "4px",
              fontSize: "11px",
            }}
            formatter={(value: any, name: string) => {
              if (name === "PPM Slope (Scaled)") {
                return [Number(value).toFixed(6), "PPM Slope (×1000)"];
              }
              return [Number(value).toFixed(6), "Original PPM Slope"];
            }}
          />
          <Bar
            dataKey="displaySlope"
            fill="#4CAF50"
            name="PPM Slope (Scaled)"
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

PPMSlopeChart.displayName = "PPMSlopeChart";

export default PPMSlopeChart;
