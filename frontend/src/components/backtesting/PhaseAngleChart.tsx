"use client";

import React, { memo, useMemo } from "react";
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
    value: number | null;
    defectRate: number;
    referenceValue: number;
    isOutlier?: boolean;
    originalValue?: number;
  }>;
  color: string;
}

const PhaseAngleChart: React.FC<PhaseAngleChartProps> = memo(
  ({ name, data, color }) => {
    // 메모리 최적화된 Y축 도메인 계산
    const yAxisDomain = useMemo(() => {
      if (data.length === 0) return undefined;

      const validValues = [];
      for (let i = 0; i < data.length; i++) {
        const value = data[i].value;
        if (value !== null && value !== undefined && !isNaN(value)) {
          validValues.push(value);
        }
      }

      if (validValues.length === 0) return undefined;

      const minValue = Math.min(...validValues);
      const maxValue = Math.max(...validValues);
      const range = maxValue - minValue;
      const center = (minValue + maxValue) / 2;

      // 범위가 너무 작으면 중앙값 기준으로 적절한 범위 설정
      const displayRange = Math.max(range * 1.2, Math.abs(center) * 0.1, 10);
      return [center - displayRange / 2, center + displayRange / 2] as [
        number,
        number
      ];
    }, [data]);

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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
          }}
        >
          {name}
          <span
            style={{
              fontSize: "10px",
              color: "#9CA3AF",
              cursor: "help",
            }}
            title={`Real-time monitoring of ${name} - shows actual phase angle values (blue line) and defect probability (orange dashed line). Points indicate measurement data, lines show trends over time.`}
          >
            ℹ️
          </span>
        </h4>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="2 2" stroke="#444" />
            <XAxis
              dataKey="index"
              stroke="#ccc"
              fontSize={10}
              tick={false}
              domain={[1, 60]}
            />
            <YAxis
              yAxisId="left"
              stroke="#ccc"
              fontSize={10}
              width={35}
              domain={yAxisDomain}
              tickFormatter={(value) => value.toFixed(1)}
            />
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
              type="linear"
              dataKey="value"
              stroke={color}
              strokeWidth={1}
              dot={{
                r: 1,
                fill: color,
                strokeWidth: 1,
              }}
              connectNulls={true}
              isAnimationActive={false}
              name="Value"
            />
            <Line
              yAxisId="right"
              type="linear"
              dataKey="defectRate"
              stroke="#FF5722"
              strokeWidth={1}
              dot={{ r: 0.5, fill: "#FF5722", strokeWidth: 1 }}
              connectNulls={true}
              name="Defect Rate"
              strokeDasharray="3 3"
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
);

PhaseAngleChart.displayName = "PhaseAngleChart";

export default PhaseAngleChart;
