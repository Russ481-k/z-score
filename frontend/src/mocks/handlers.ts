import { http, HttpResponse } from "msw";

const initialProducts = {
  total: 5,
  items: [
    {
      id: 1,
      barcode: "2401020001C",
      model_name: "KAPPA-1.0",
      line_info: "CM1P9",
      final_position: 18.67,
      final_press_force: 30.38,
      result: "OK",
      created_at: new Date(Date.now() - 50000).toISOString(),
    },
    {
      id: 2,
      barcode: "2401020002C",
      model_name: "KAPPA-1.0",
      line_info: "CM1P9",
      final_position: 18.68,
      final_press_force: 30.45,
      result: "OK",
      created_at: new Date(Date.now() - 40000).toISOString(),
    },
    {
      id: 3,
      barcode: "2401020003C",
      model_name: "KAPPA-1.0",
      line_info: "CM1P9",
      final_position: 19.1,
      final_press_force: 31.1,
      result: "NG",
      created_at: new Date(Date.now() - 30000).toISOString(),
    },
    {
      id: 4,
      barcode: "2401020004C",
      model_name: "KAPPA-1.0",
      line_info: "CM1P9",
      final_position: 18.65,
      final_press_force: 30.31,
      result: "OK",
      created_at: new Date(Date.now() - 20000).toISOString(),
    },
    {
      id: 5,
      barcode: "2401020005C",
      model_name: "KAPPA-1.0",
      line_info: "CM1P9",
      final_position: 18.7,
      final_press_force: 30.5,
      result: "OK",
      created_at: new Date(Date.now() - 10000).toISOString(),
    },
  ],
};

const initialChartData = [
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

export const handlers = [
  http.get("/api/data/products", ({ request }) => {
    return HttpResponse.json({
      status: "success",
      data: initialProducts,
      message: null,
    });
  }),
  http.get("/api/analysis/history", () => {
    return HttpResponse.json({
      status: "success",
      data: initialChartData,
      message: null,
    });
  }),

  // 상세 계측 데이터를 위한 핸들러 추가
  http.get("/api/data/products/:productId/measurements", ({ params }) => {
    const { productId } = params;

    if (!productId) {
      return new HttpResponse(null, { status: 404 });
    }

    // 9개의 CAM에 대한 가상 데이터 생성
    const measurementData = Array.from({ length: 9 }, (_, i) => ({
      cam_number: i + 1,
      press_force_final: 30 + Math.random() * 2,
      torque: 1.5 + (Math.random() - 0.5) * 0.5,
      angle: 90 + (Math.random() - 0.5) * 5,
    }));

    return HttpResponse.json({
      status: "success",
      data: measurementData,
      message: null,
    });
  }),

  // 공정 분포 데이터를 위한 핸들러 추가
  http.get("/api/analysis/distribution", ({ request }) => {
    const url = new URL(request.url);
    const metric = url.searchParams.get("metric") || "angle";

    const distributionData = Array.from({ length: 9 }, (_, i) => ({
      cam_number: `CAM ${i + 1}`,
      mean: (Math.random() - 0.5) * 0.1, // -0.05 ~ 0.05
      std_dev: 0.05 + Math.random() * 0.05, // 0.05 ~ 0.10
    }));

    return HttpResponse.json({
      status: "success",
      data: distributionData,
      message: null,
    });
  }),
];
