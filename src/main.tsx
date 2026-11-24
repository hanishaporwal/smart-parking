import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { enableLiquidRefractionSupport, initGlassPerformanceBudget } from '@/lib/glassPerformance';
import './index.css';

enableLiquidRefractionSupport();
initGlassPerformanceBudget();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
