// src/pages/Watchlist/index.tsx
import React from 'react';
import { Card, Empty, Button } from 'antd';
import { HeartOutlined } from '@ant-design/icons';

const Watchlist: React.FC = () => {
  return (
    <Card>
      <Empty
        image={<HeartOutlined style={{ fontSize: '64px', color: '#ff4d4f' }} />}
        description={
          <div>
            <h3>关注列表</h3>
            <p>这里将显示您关注的股票列表</p>
          </div>
        }
      >
        <Button type="primary">添加关注股票</Button>
      </Empty>
    </Card>
  );
};

export default Watchlist;