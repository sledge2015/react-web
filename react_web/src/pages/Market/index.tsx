// src/components/Market/index.tsx
import React, { useState } from "react";
import { Table, Button, Upload, Space, Popconfirm } from "antd";
import { UploadOutlined, PlusOutlined } from "@ant-design/icons";

const Market: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);

  // 解析 CSV 文件
  const handleUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
      if (lines.length === 0) return;

      // 第一行作为表头
      const headers = lines[0].split(",");
      const jsonData = lines.slice(1).map((line) => {
        const values = line.split(",");
        const obj: any = {};
        headers.forEach((header, idx) => {
          obj[header] = values[idx] ?? "";
        });
        return obj;
      });

      // 动态生成列
      const cols = headers.map((key) => ({
        title: key,
        dataIndex: key,
        editable: true,
      }));
      setColumns([
        ...cols,
        {
          title: "操作",
          dataIndex: "actions",
          render: (_: any, record: any, index: number) => (
            <Space>
              <Popconfirm
                title="确定删除吗？"
                onConfirm={() => handleDelete(index)}
              >
                <Button danger size="small">
                  删除
                </Button>
              </Popconfirm>
            </Space>
          ),
        },
      ]);
      setData(jsonData);
    };
    reader.readAsText(file, "utf-8"); // 用 UTF-8 读取 CSV
    return false; // 阻止默认上传
  };

  // 新增一行
  const handleAdd = () => {
    if (columns.length === 0) return;
    const newRow: any = {};
    columns.forEach((col: any) => {
      if (col.dataIndex !== "actions") newRow[col.dataIndex] = "";
    });
    setData([...data, newRow]);
  };

  // 删除一行
  const handleDelete = (index: number) => {
    const newData = [...data];
    newData.splice(index, 1);
    setData(newData);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>市场行情（支持CSV导入 & 增删改查）</h2>

      <Space style={{ marginBottom: 16 }}>
        <Upload beforeUpload={handleUpload} showUploadList={false}>
          <Button icon={<UploadOutlined />}>导入CSV</Button>
        </Upload>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          新增一行
        </Button>
      </Space>

      <Table
        bordered
        rowKey={(record, index) =>
          index !== undefined
            ? index.toString()
            : record.id?.toString() ?? Math.random().toString()
        }
        dataSource={data}
        columns={columns}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
};

export default Market;
