import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

export interface ChartDataPoint {
  analyzed_at: string;
  predicted_ppm: number;
  mean: number;
  std_dev: number;
  ppm_slope: number;
}

interface ChartDataParams {
  startDate: string;
  endDate: string;
  metric: string;
  camNumber: number;
}

const fetchChartData = async (
  params: ChartDataParams
): Promise<ChartDataPoint[]> => {
  const response = await apiClient.get("/analysis/history", {
    params: {
      start_date: params.startDate,
      end_date: params.endDate,
      metric: params.metric,
      cam_number: params.camNumber,
    },
  });
  return response.data;
};

export const useChartData = (params: ChartDataParams) => {
  return useQuery({
    queryKey: ["chartData", params],
    queryFn: () => fetchChartData(params),
    staleTime: 30000, // 30초 동안 fresh 상태 유지
    refetchInterval: 5000, // 5초마다 백그라운드에서 refetch
  });
};
