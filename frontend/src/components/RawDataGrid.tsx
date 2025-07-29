"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { ColDef, GridReadyEvent } from "ag-grid-community";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

ModuleRegistry.registerModules([AllCommunityModule]);

interface MappedRawDataItem {
  [key: string]: string | number; // 동적 컬럼 이름
}

interface MappedDataResponse {
  total: number;
  items: MappedRawDataItem[];
  column_mapping: Record<string, string>;
}

const RawDataGrid: React.FC = () => {
  const [pagination, setPagination] = useState({ skip: 0, limit: 100 });

  // 매핑된 로우 데이터 조회 (활성화된 컬럼만)
  const { data: mappedData, isLoading: mappedLoading } = useQuery({
    queryKey: ["mapped-raw-data", pagination],
    queryFn: async (): Promise<MappedDataResponse> => {
      const response = await apiClient.get("/raw-data/mapped", {
        params: pagination,
      });
      return response.data;
    },
  });

  // 매핑된 데이터의 컬럼 정의 동적 생성
  const mappedDataColumns: ColDef[] = useMemo(() => {
    if (!mappedData?.items?.length) return [];

    // 첫 번째 항목에서 컬럼 이름들을 가져와서 정렬
    const firstItem = mappedData.items[0];
    const columnNames = Object.keys(firstItem);

    return columnNames.map((columnName) => ({
      headerName: columnName,
      field: columnName,
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 120,
    }));
  }, [mappedData]);

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({
      ...prev,
      skip: page * prev.limit,
    }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      limit: pageSize,
      skip: 0,
    }));
  };

  return (
    <div style={{ padding: "20px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2>매핑된 로우 데이터</h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span style={{ color: "#ededed" }}>
            총 {mappedData?.total || 0}개 항목
          </span>
        </div>
      </div>

      <div
        className="ag-theme-alpine-dark"
        style={{ height: "600px", width: "100%" }}
      >
        <AgGridReact
          columnDefs={mappedDataColumns}
          rowData={mappedData?.items || []}
          loading={mappedLoading}
          suppressPaginationPanel={true}
          animateRows={true}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
          }}
        />
      </div>

      <div
        style={{
          marginTop: "10px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#ededed",
        }}
      >
        <div>
          페이지 크기:
          <select
            value={pagination.limit}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            style={{
              marginLeft: "10px",
              padding: "5px",
              backgroundColor: "#1a1a1a",
              color: "#ededed",
              border: "1px solid #333",
            }}
          >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
        </div>
        <div>
          현재 표시: {mappedData?.items?.length || 0} / {mappedData?.total || 0}
        </div>
      </div>
    </div>
  );
};

export default RawDataGrid;
