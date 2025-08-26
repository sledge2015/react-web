// src/pages/Analysis/index.tsx
import React from 'react';
import { Card, Empty, Button } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';

const Analysis: React.FC = () => {
  return (
    <Card>
      <Empty
        image={<TrophyOutlined style={{ fontSize: '64px', color: '#faad14' }} />}
        description={
          <div>
            <h3>分析工具</h3>
            <p>这里将提供专业的股票分析工具和图表</p>
          </div>
        }
      >
        <Button type="primary">开始分析</Button>
      </Empty>
    </Card>
  );
};

export default Analysis;
