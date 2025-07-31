"use client";

import React, { useState, useMemo, useEffect } from "react";
import { AgGridReact } from "ag-grid-react";
import { ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { ColDef, ICellRendererParams } from "ag-grid-community";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { useToast } from "./ToastContainer";

ModuleRegistry.registerModules([AllCommunityModule]);

interface ColumnMapper {
  id: number;
  raw_column_name: string;
  mapped_column_name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

interface ColumnMapperCreate {
  raw_column_name: string;
  mapped_column_name: string;
  description?: string;
  display_order?: number;
  is_active?: boolean;
}

const ColumnMapperGrid: React.FC = () => {
  const [isAddMode, setIsAddMode] = useState(false);
  const [newMapper, setNewMapper] = useState<ColumnMapperCreate>({
    raw_column_name: "",
    mapped_column_name: "",
    description: "",
    display_order: 0,
    is_active: true,
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  // 컬럼 매퍼 목록 조회
  const { data, isLoading, error } = useQuery({
    queryKey: ["column-mappers"],
    queryFn: async () => {
      const response = await apiClient.get("/raw-data/column-mapper");
      return response.data;
    },
  });

  // 컬럼 매퍼 생성
  const createMutation = useMutation({
    mutationFn: async (mapper: ColumnMapperCreate) => {
      const response = await apiClient.post("/raw-data/column-mapper", mapper);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["column-mappers"] });
      queryClient.invalidateQueries({ queryKey: ["mapped-raw-data"] });
      setIsAddMode(false);
      setNewMapper({
        raw_column_name: "",
        mapped_column_name: "",
        description: "",
        display_order: 0,
        is_active: true,
      });
      showToast("새로운 컬럼 매핑이 추가되었습니다.", "success");
    },
    onError: (error: any) => {
      showToast(
        error.response?.data?.detail || "컬럼 매핑을 추가하는데 실패했습니다.",
        "error"
      );
    },
  });

  // 컬럼 매퍼 수정
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: Partial<ColumnMapper>;
    }) => {
      const response = await apiClient.put(
        `/raw-data/column-mapper/${id}`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["column-mappers"] });
      queryClient.invalidateQueries({ queryKey: ["mapped-raw-data"] });
      setEditingId(null); // 편집 모드 해제
      showToast("컬럼 매핑이 수정되었습니다.", "success");
    },
    onError: (error: any) => {
      showToast(
        error.response?.data?.detail || "컬럼 매핑을 수정하는데 실패했습니다.",
        "error"
      );
    },
  });

  // 컬럼 매퍼 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiClient.delete(`/raw-data/column-mapper/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["column-mappers"] });
      queryClient.invalidateQueries({ queryKey: ["mapped-raw-data"] });
      showToast("컬럼 매핑이 삭제되었습니다.", "success");
    },
    onError: (error: any) => {
      showToast(
        error.response?.data?.detail || "컬럼 매핑을 삭제하는데 실패했습니다.",
        "error"
      );
    },
  });

  // 전체 컬럼 초기화
  const initializeAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post(
        "/raw-data/column-mapper/initialize-all"
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["column-mappers"] });
      queryClient.invalidateQueries({ queryKey: ["mapped-raw-data"] });
      showToast("전체 컬럼 매핑이 초기화되었습니다.", "success");
    },
    onError: (error: any) => {
      showToast(
        error.response?.data?.detail ||
          "컬럼 매핑을 초기화하는데 실패했습니다.",
        "error"
      );
    },
  });

  // 활성화/비활성화 토글
  const toggleActiveMutation = useMutation({
    mutationFn: async ({
      id,
      is_active,
    }: {
      id: number;
      is_active: boolean;
    }) => {
      const response = await apiClient.put(`/raw-data/column-mapper/${id}`, {
        is_active,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["column-mappers"] });
      queryClient.invalidateQueries({ queryKey: ["mapped-raw-data"] });
      showToast("컬럼 매핑의 활성 상태가 변경되었습니다.", "info");
    },
    onError: (error: any) => {
      showToast(
        error.response?.data?.detail ||
          "컬럼 매핑의 활성 상태를 변경하는데 실패했습니다.",
        "error"
      );
    },
  });

  // 활성화 토글 렌더러
  const ActiveToggleRenderer = (params: ICellRendererParams) => {
    const [isChecked, setIsChecked] = useState(params.value);

    // params.value가 변경될 때 로컬 상태 업데이트
    useEffect(() => {
      setIsChecked(params.value);
    }, [params.value]);

    const handleToggle = (checked: boolean) => {
      setIsChecked(checked); // 즉시 UI 반영
      toggleActiveMutation.mutate({
        id: params.data.id,
        is_active: checked,
      });
    };

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={(e) => handleToggle(e.target.checked)}
          disabled={toggleActiveMutation.isPending}
          style={{
            width: "16px",
            height: "16px",
            accentColor: isChecked ? "#4CAF50" : "#666",
            cursor: "pointer",
            alignItems: "center",
            justifyContent: "center",
          }}
        />
      </div>
    );
  };

  // 액션 버튼 렌더러
  const ActionCellRenderer = (params: ICellRendererParams) => {
    const isEditing = editingId === params.data.id;

    if (isEditing) {
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            gap: "6px",
          }}
        >
          <button
            onClick={() => {
              updateMutation.mutate({
                id: params.data.id,
                data: {
                  raw_column_name: params.data.raw_column_name,
                  mapped_column_name: params.data.mapped_column_name,
                  description: params.data.description,
                  display_order: params.data.display_order,
                },
              });
            }}
            className="action-btn save-btn"
          >
            ✓
          </button>
          <button
            onClick={() => setEditingId(null)}
            className="action-btn cancel-btn"
          >
            ✕
          </button>
        </div>
      );
    }

    return (
      <div
        style={{
          display: "flex",
          gap: "6px",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
        }}
      >
        <button
          onClick={() => setEditingId(params.data.id)}
          className="action-btn edit-btn"
        >
          ✎
        </button>
        <button
          onClick={() => {
            const isConfirmed = window.confirm("정말 삭제하시겠습니까?");
            if (isConfirmed) {
              deleteMutation.mutate(params.data.id);
            }
          }}
          className="action-btn delete-btn"
        >
          ✕
        </button>
      </div>
    );
  };

  // 편집 가능한 셀 렌더러
  const EditableCellRenderer = (params: ICellRendererParams) => {
    const isEditing = editingId === params.data.id;
    const field = params.colDef?.field;
    const [localValue, setLocalValue] = useState(params.value);

    // params.value가 변경될 때 로컬 상태 업데이트
    useEffect(() => {
      setLocalValue(params.value);
    }, [params.value]);

    if (isEditing && field) {
      if (field === "display_order") {
        return (
          <input
            type="number"
            value={localValue || 0}
            onChange={(e) => {
              const newValue = Number(e.target.value);
              setLocalValue(newValue); // 즉시 UI 반영
              params.data[field] = newValue; // 데이터 업데이트
            }}
            className="edit-input number-input"
          />
        );
      } else {
        return (
          <input
            type="text"
            value={localValue || ""}
            onChange={(e) => {
              const newValue = e.target.value;
              setLocalValue(newValue); // 즉시 UI 반영
              params.data[field] = newValue; // 데이터 업데이트
            }}
            className="edit-input"
          />
        );
      }
    }

    return <span>{params.value}</span>;
  };

  const colDefs: ColDef[] = useMemo(
    () => [
      {
        field: "is_active",
        headerName: "활성",
        width: 80,
        cellRenderer: ActiveToggleRenderer,
      },
      {
        field: "display_order",
        headerName: "순서",
        width: 80,
        cellRenderer: EditableCellRenderer,
      },
      {
        field: "raw_column_name",
        headerName: "Raw Column",
        width: 150,
        cellRenderer: EditableCellRenderer,
      },
      {
        field: "mapped_column_name",
        headerName: "Mapped Column",
        width: 200,
        cellRenderer: EditableCellRenderer,
      },
      {
        flex: 1,
        field: "description",
        headerName: "Description",
        width: 200,
        cellRenderer: EditableCellRenderer,
      },

      {
        headerName: "Actions",
        width: 120,
        cellRenderer: ActionCellRenderer,
        sortable: false,
        filter: false,
      },
    ],
    [editingId]
  );

  const handleAddMapper = () => {
    if (!newMapper.raw_column_name || !newMapper.mapped_column_name) {
      showToast(
        "Please enter both raw column name and mapped column name.",
        "warning"
      );
      return;
    }
    createMutation.mutate(newMapper);
  };

  const handleInitializeAll = () => {
    const isConfirmed = window.confirm(
      "Initialize all columns (d000~d149)? All existing data will be deleted."
    );
    if (isConfirmed) {
      initializeAllMutation.mutate();
    }
  };

  if (isLoading)
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <span>Loading column mappers...</span>
      </div>
    );

  if (error)
    return (
      <div className="error-container">
        <span>⚠ Error occurred while loading data.</span>
      </div>
    );

  return (
    <div className="column-mapper-container">
      <style jsx>{`
        .column-mapper-container {
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

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .header-title {
          font-size: 24px;
          font-weight: 600;
          color: #ffffff;
          margin: 0;
        }

        .header-controls {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .header-stats {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .modern-btn {
          padding: 10px 18px;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          position: relative;
          overflow: hidden;
        }

        .modern-btn:hover {
          transform: translateY(-1px);
        }

        .modern-btn:active {
          transform: translateY(0);
        }

        .primary-btn {
          background: rgba(255, 255, 255, 0.08);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .primary-btn:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .warning-btn {
          background: rgba(255, 255, 255, 0.06);
          color: #ccc;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .warning-btn:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .add-form-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 20px;
          box-shadow: 0 2px 16px rgba(0, 0, 0, 0.2);
        }

        .form-title {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 16px;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .form-input {
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          color: #e0e0e0;
          font-size: 13px;
          transition: all 0.2s ease;
        }

        .form-input:focus {
          outline: none;
          border-color: rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.06);
        }

        .form-input::placeholder {
          color: #888;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
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

        .grid-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 20px;
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

        :global(.action-btn) {
          padding: 6px 8px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          min-width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
          letter-spacing: 0.3px;
        }

        :global(.save-btn) {
          background: rgba(76, 175, 80, 0.15);
          color: #4caf50;
          border: 1px solid rgba(76, 175, 80, 0.3);
        }

        :global(.save-btn:hover) {
          background: rgba(76, 175, 80, 0.25);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(76, 175, 80, 0.2);
        }

        :global(.cancel-btn) {
          background: rgba(255, 255, 255, 0.08);
          color: #bbb;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        :global(.cancel-btn:hover) {
          background: rgba(255, 255, 255, 0.15);
          color: #fff;
          transform: translateY(-1px);
        }

        :global(.edit-btn) {
          background: rgba(33, 150, 243, 0.15);
          color: #2196f3;
          border: 1px solid rgba(33, 150, 243, 0.3);
        }

        :global(.edit-btn:hover) {
          background: rgba(33, 150, 243, 0.25);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(33, 150, 243, 0.2);
        }

        :global(.delete-btn) {
          background: rgba(244, 67, 54, 0.15);
          color: #f44336;
          border: 1px solid rgba(244, 67, 54, 0.3);
        }

        :global(.delete-btn:hover) {
          background: rgba(244, 67, 54, 0.25);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(244, 67, 54, 0.2);
        }

        :global(.edit-input) {
          width: 100%;
          height: 100%;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.08);
          color: #e0e0e0;
          padding: 3px 6px;
          border-radius: 3px;
          font-size: 11px;
        }

        :global(.edit-input:focus) {
          outline: none;
          border-color: rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.12);
        }

        .loading-container,
        .error-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 400px;
          color: #888;
          font-size: 14px;
          font-weight: 500;
          gap: 10px;
        }

        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-top: 2px solid #666;
          border-radius: 50%;
          animation: spin 1s linear infinite;
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
          .header-controls {
            flex-direction: column;
          }

          .form-grid {
            grid-template-columns: 1fr;
          }

          .stats-card {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="header-card">
        <div className="header-top">
          <h1 className="header-title">Column Mapper Management</h1>
          <div className="header-controls">
            <button
              onClick={handleInitializeAll}
              disabled={initializeAllMutation.isPending}
              className="modern-btn warning-btn"
            >
              ↻{" "}
              {initializeAllMutation.isPending
                ? "Initializing..."
                : "Initialize All Columns"}
            </button>
            <button
              onClick={() => setIsAddMode(!isAddMode)}
              className="modern-btn primary-btn"
            >
              {isAddMode ? "✕ Cancel" : "+ Add New Mapping"}
            </button>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span>▤</span>
            <span>Total {data?.total || 0} mappings</span>
          </div>
          <div className="stat-item">
            <span>●</span>
            <span>
              Active:{" "}
              {data?.items?.filter((item: ColumnMapper) => item.is_active)
                .length || 0}
            </span>
          </div>
          <div className="stat-item">
            <span>○</span>
            <span>
              Inactive:{" "}
              {data?.items?.filter((item: ColumnMapper) => !item.is_active)
                .length || 0}
            </span>
          </div>
        </div>
      </div>

      {isAddMode && (
        <div className="add-form-card">
          <h3 className="form-title">Add New Column Mapping</h3>
          <div className="form-grid">
            <input
              type="text"
              placeholder="Raw column name (e.g: d001)"
              value={newMapper.raw_column_name}
              onChange={(e) =>
                setNewMapper({ ...newMapper, raw_column_name: e.target.value })
              }
              className="form-input"
            />
            <input
              type="text"
              placeholder="Mapped column name"
              value={newMapper.mapped_column_name}
              onChange={(e) =>
                setNewMapper({
                  ...newMapper,
                  mapped_column_name: e.target.value,
                })
              }
              className="form-input"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={newMapper.description || ""}
              onChange={(e) =>
                setNewMapper({ ...newMapper, description: e.target.value })
              }
              className="form-input"
            />
            <input
              type="number"
              placeholder="Display order"
              value={newMapper.display_order}
              onChange={(e) =>
                setNewMapper({
                  ...newMapper,
                  display_order: Number(e.target.value),
                })
              }
              className="form-input"
            />
            <div className="checkbox-group">
              <label style={{ color: "#e0e0e0", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={newMapper.is_active || false}
                  onChange={(e) =>
                    setNewMapper({ ...newMapper, is_active: e.target.checked })
                  }
                  style={{ marginRight: "6px" }}
                />
                Active
              </label>
            </div>
          </div>
          <button
            onClick={handleAddMapper}
            disabled={createMutation.isPending}
            className="modern-btn primary-btn"
          >
            {createMutation.isPending ? "Adding..." : "+ Add"}
          </button>
        </div>
      )}

      <div className="grid-card">
        <div className="grid-wrapper">
          <div
            className="ag-theme-alpine-dark"
            style={{ height: "600px", width: "100%" }}
          >
            <AgGridReact
              columnDefs={colDefs}
              rowData={data?.items || []}
              defaultColDef={{
                resizable: true,
                sortable: true,
                filter: true,
              }}
              animateRows={true}
              suppressClickEdit={true}
              suppressCellFocus={true}
              getRowId={(params) => params.data.id.toString()}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColumnMapperGrid;
