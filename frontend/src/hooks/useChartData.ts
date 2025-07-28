import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface ChartDataPoint {
  analyzed_at: string;
  predicted_ppm: number;
  mean: number;
  std_dev: number;
  ppm_slope: number;
}

const initialChartData: ChartDataPoint[] = [
  {
    analyzed_at: new Date(Date.now() - 50000).toISOString(),
    predicted_ppm: 150.5,
    mean: 0.01,
    std_dev: 0.08,
    ppm_slope: 15.2,
  },
  {
    analyzed_at: new Date(Date.now() - 40000).toISOString(),
    predicted_ppm: 165.2,
    mean: 0.02,
    std_dev: 0.082,
    ppm_slope: 15.2,
  },
  {
    analyzed_at: new Date(Date.now() - 30000).toISOString(),
    predicted_ppm: 158.8,
    mean: 0.015,
    std_dev: 0.081,
    ppm_slope: 15.2,
  },
  {
    analyzed_at: new Date(Date.now() - 20000).toISOString(),
    predicted_ppm: 180.1,
    mean: 0.03,
    std_dev: 0.085,
    ppm_slope: 15.2,
  },
  {
    analyzed_at: new Date(Date.now() - 10000).toISOString(),
    predicted_ppm: 210.7,
    mean: 0.04,
    std_dev: 0.09,
    ppm_slope: 15.2,
  },
];

const fetchChartData = async (
  startDate: string,
  endDate: string,
  metric: "angle" | "torque",
  camNumber: number
): Promise<ChartDataPoint[]> => {
  const { data } = await axios.get("/api/analysis/history", {
    params: {
      start_date: startDate,
      end_date: endDate,
      metric,
      cam_number: camNumber,
    },
  });
  return data.data;
};

export const useChartData = (
  startDate: string,
  endDate: string,
  metric: "angle" | "torque",
  camNumber: number
) => {
  return useQuery<ChartDataPoint[]>({
    queryKey: ["chartData", { startDate, endDate, metric, camNumber }],
    queryFn: () => fetchChartData(startDate, endDate, metric, camNumber),
    initialData: initialChartData,
  });
};
