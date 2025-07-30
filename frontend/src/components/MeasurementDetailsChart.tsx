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
} from "recharts";
import { useMeasurements } from "@/hooks/useMeasurements";
import { memo } from "react";

interface Props {
  productId: number | null;
}

const MeasurementDetailsChart = memo(function MeasurementDetailsChart({
  productId,
}: Props) {
  const {
    data: measurementData,
    isLoading,
    isError,
  } = useMeasurements(productId);

  if (!productId) {
    return (
      <div style={{ textAlign: "center", paddingTop: "50px" }}>
        Select a product from the grid to see details.
      </div>
    );
  }

  if (isLoading) return <div>Loading details...</div>;
  if (isError) return <div>Error loading measurement data.</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <h3
        style={{
          margin: "0 0 12px 0",
          fontSize: "16px",
          color: "#fff",
          flexShrink: 0,
        }}
      >
        Measurement Details (Product ID: {productId})
      </h3>
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={measurementData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="cam_number" name="CAM" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar
              dataKey="press_force_final"
              fill="#8884d8"
              name="Press Force"
            />
            <Bar dataKey="torque" fill="#82ca9d" name="Torque" />
            <Bar dataKey="angle" fill="#ffc658" name="Angle" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

export default MeasurementDetailsChart;
