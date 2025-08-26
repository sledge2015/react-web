import React, { useEffect, useState } from 'react';
import { Table, message, Spin } from 'antd';
import { ColumnsType } from 'antd/es/table';
import 'antd/dist/antd.css';  // 导入 Ant Design 样式

const AssetAccountTable = () => {
  const [dataSource, setDataSource] = useState<any[]>([]); // 存储API返回的数据
  const [loading, setLoading] = useState<boolean>(false); // 加载状态

  // 表格列定义
  const columns: ColumnsType<any> = [
    {
      title: '资产名称',
      dataIndex: 'asset_name', // 需要根据API返回的数据字段名称修改
      key: 'asset_name',
    },
    {
      title: '资产类型',
      dataIndex: 'asset_type', // 需要根据API返回的数据字段名称修改
      key: 'asset_type',
    },
    {
      title: '账户余额',
      dataIndex: 'balance', // 需要根据API返回的数据字段名称修改
      key: 'balance',
    },
    {
      title: '持仓价值',
      dataIndex: 'position_value', // 需要根据API返回的数据字段名称修改
      key: 'position_value',
    },
  ];

  // 使用 useEffect 来获取数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      const apiUrl = 'https://open.longportapp.com/v1/asset/account'; // API URL

      try {
        const token = 'm_eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJsb25nYnJpZGdlIiwic3ViIjoiYWNjZXNzX3Rva2VuIiwiZXhwIjoxNzYzOTU4NzYzLCJpYXQiOjE3NTYxODI3NjMsImFrIjoiNzI5ZWQ2OWUyMzE5MGM0ODczM2ZiM2JjMGNmOGRlYTciLCJhYWlkIjoyMDM0Mzg1NiwiYWMiOiJsYiIsIm1pZCI6MTM4NDc0NjQsInNpZCI6IitwUTBkR0FzWXR5Z0J5UlZVdzc5bGc9PSIsImJsIjozLCJ1bCI6MCwiaWsiOiJsYl8yMDM0Mzg1NiJ9.URvAIhOq8N9ui1J_lC7pCiRq_mmsLr_lxSNRIXXxZIhawXguk2vo_bBoS1OsYZJaKsp2NVftSL42KcjUYK1G9vx5V24mTjYmsW2IyzymHlIQA3jE72rFyGlQed4f0_k1tB_i5Ile6Yg5bP0rgyP8fzZTlGMaPl9iqSfdXIXdWTEJqeY6Qq8RgIcF48e60BEKUVk361TQExScRC1dG5TJcOtMabTB1upi6QnCbvDr8uwJEpGfgeaz4mbeXATGyO0RsgprbRFaZwq5A34BQxXZMVmc-zhBZHBuyqOfp4VKXSFcE5lQWTQ0Lwj0bVMX0g8pg1q8qRBws0hzKPGkfVQoMdQTIYED-vqtbMSEDSF8ryx05GwaFd1cARi4rQhVaOad1BsQlUaS7mJ0L5u1nhrzLaw917y1833gI7mHdYGFuR4_VIT_Xq4xTsSyf_5VSDI1XqCkkZMWPXMnC3a-Olxl6YWji3h__1QnAQ49D45xPKkYsFvSJBgMDPgY55hV1evlvB6HwYpBfmKgvsAxLjsyBOWX3PFi5mxfFKHUZ1A193sC5yR0Tx0jrQJ2-FhRhhTtkxPIxxM299AbWClKbtsYNmypITmh1ImlnqOefGiO3jpxjW4QR6e6nXuRrmg9mmeLwzEv-R7ttSF06wsL_jRvMCoayRHH5wFhef7Lv79JwuY'; // 直接将 Token 插入

        // 发起 GET 请求
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('API 请求失败');
        }

        // 解析返回的 JSON 数据
        const data = await response.json();
        console.log('API 数据：', data);

        // 设置表格数据
        setDataSource(data.account_assets || []); // 根据实际返回的数据结构进行修改
      } catch (error) {
        console.error('获取数据时出错：', error);
        message.error('获取数据失败');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div style={{ padding: '20px' }}>
      <h1>资产账户信息</h1>
      {loading ? (
        <Spin size="large" />
      ) : (
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id" // 请根据实际数据中的字段进行修改
          pagination={{ pageSize: 10 }}
        />
      )}
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <AssetAccountTable />
    </div>
  );
}

export default App;
