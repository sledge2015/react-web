// src/pages/Favorites/index.tsx
import React from 'react';
import { Card, Empty, Button } from 'antd';
import { StarOutlined } from '@ant-design/icons';

const Favorites: React.FC = () => {
  return (
    <Card>
      <Empty
        image={<StarOutlined style={{ fontSize: '64px', color: '#722ed1' }} />}
        description={
          <div>
            <h3>收藏夹</h3>
            <p>这里将显示您收藏的投资策略和分析报告</p>
          </div>
        }
      >
        <Button type="primary">管理收藏</Button>
      </Empty>
    </Card>
  );
};

export default Favorites;