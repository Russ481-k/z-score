"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ErrorBar,
} from "recharts";
import { useState, memo } from "react";
import { useProcessDistribution } from "@/hooks/useProcessDistribution";

const USL = 0.25;
const LSL = -0.25;

const ProcessDistributionChart = memo(function ProcessDistributionChart() {
  const [metric, setMetric] = useState<"angle" | "torque">("angle");
  const {
    data: chartData,
    isLoading,
    isError,
  } = useProcessDistribution(metric);

  const chartDataWithError = chartData?.map((item) => ({
    ...item,
    error: [item.mean - item.std_dev, item.mean + item.std_dev],
  }));

  if (isLoading) return <div>Loading distribution data...</div>;
  if (isError) return <div>Error loading distribution data.</div>;

  return (
    <div>
      <h3>Process Distribution ({metric})</h3>
      <div style={{ marginBottom: "16px" }}>
        <select
          value={metric}
          onChange={(e) => setMetric(e.target.value as "angle" | "torque")}
        >
          <option value="angle">Angle</option>
          <option value="torque">Torque</option>
        </select>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chartDataWithError}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="cam_number" />
          <YAxis domain={[-0.4, 0.4]} />
          <Tooltip />
          <Legend />
          <ReferenceLine
            key="usl"
            y={USL}
            label="USL"
            stroke="red"
            strokeDasharray="3 3"
          />
          <ReferenceLine
            key="lsl"
            y={LSL}
            label="LSL"
            stroke="red"
            strokeDasharray="3 3"
          />
          <Bar dataKey="mean" fill="#8884d8">
            <ErrorBar
              dataKey="error"
              width={4}
              strokeWidth={2}
              stroke="orange"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

export default ProcessDistributionChart;
