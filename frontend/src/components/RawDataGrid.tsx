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
    <div className="raw-data-container">
      <style jsx>{`
        .raw-data-container {
          background: transparent;
          border-radius: 12px;
          overflow: hidden;
        }

        .header-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 16px rgba(0, 0, 0, 0.2);
        }

        .header-title {
          font-size: 24px;
          font-weight: 600;
          color: #ffffff;
          margin: 0;
          margin-bottom: 12px;
        }

        .header-stats {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          font-size: 13px;
          font-weight: 500;
          color: #ccc;
        }

        .stat-icon {
          font-size: 12px;
          color: #999;
        }

        .grid-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 16px rgba(0, 0, 0, 0.2);
          transition: all 0.3s ease;
        }

        .grid-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
        }

        .grid-wrapper {
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
        }

        .controls-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 12px;
        }

        .control-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .control-label {
          font-weight: 500;
          color: #ccc;
          font-size: 13px;
        }

        .modern-select {
          padding: 8px 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #e0e0e0;
          font-size: 13px;
          font-weight: 500;
          min-width: 100px;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .modern-select:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
        }

        .modern-select:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
        }

        .loading-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 400px;
          color: #888;
          font-size: 14px;
          font-weight: 500;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top: 2px solid #666;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-right: 10px;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          .header-stats {
            flex-direction: column;
            align-items: flex-start;
          }

          .controls-card {
            flex-direction: column;
            align-items: stretch;
          }

          .control-group {
            justify-content: space-between;
          }
        }
      `}</style>

      <div className="header-card">
        <h1 className="header-title">매핑된 로우 데이터</h1>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-icon">▤</span>
            <span>총 {mappedData?.total?.toLocaleString() || 0}개 항목</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">⚬</span>
            <span>활성 컬럼 {mappedDataColumns?.length || 0}개</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">⊞</span>
            <span>현재 페이지 {mappedData?.items?.length || 0}개</span>
          </div>
        </div>
      </div>

      <div className="grid-card">
        <div className="grid-wrapper">
          {mappedLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <span>데이터를 불러오는 중...</span>
            </div>
          ) : (
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
          )}
        </div>
      </div>

      <div className="controls-card">
        <div className="control-group">
          <span className="control-label">페이지 크기:</span>
          <select
            className="modern-select"
            value={pagination.limit}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          >
            <option value={50}>50개씩</option>
            <option value={100}>100개씩</option>
            <option value={200}>200개씩</option>
            <option value={500}>500개씩</option>
          </select>
        </div>
        <div className="control-group">
          <span className="control-label">
            ▤ 현재 표시: {mappedData?.items?.length || 0} /{" "}
            {mappedData?.total?.toLocaleString() || 0}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RawDataGrid;
