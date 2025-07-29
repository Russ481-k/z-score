import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface Measurement {
  cam_number: number;
  press_force_final: number;
  torque: number;
  angle: number;
}

const fetchMeasurements = async (productId: number): Promise<Measurement[]> => {
  const { data } = await axios.get(
    `http://localhost:8000/api/data/products/${productId}/measurements`
  );
  return data.data;
};

export const useMeasurements = (productId: number | null) => {
  return useQuery<Measurement[]>({
    queryKey: ["measurements", productId],
    queryFn: () => fetchMeasurements(productId as number),
    enabled: !!productId, // productId가 있을 때만 쿼리를 실행합니다.
  });
};
