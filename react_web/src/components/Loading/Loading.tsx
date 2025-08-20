import React from 'react';
import styles from './Loading.module.css';

const Loading: React.FC = () => (
  <div className={styles.container}>
    <div className={styles.spinner}></div>
    <span>Loading...</span>
  </div>
);

export default Loading;
