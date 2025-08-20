// src/components/Loading/Loading.tsx
import React from 'react';
import './Loading.css'; // 使用普通CSS而不是CSS模块

interface LoadingProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

const Loading: React.FC<LoadingProps> = ({ 
  message = 'Loading...', 
  size = 'medium' 
}) => {
  return (
    <div className={`loading-container loading-${size}`}>
      <div className="loading-spinner"></div>
      <span className="loading-message">{message}</span>
    </div>
  );
};

export default Loading;