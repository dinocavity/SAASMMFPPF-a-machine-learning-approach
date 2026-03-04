import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { ToastProvider } from './contexts/ToastContext';
import { HistoryProvider } from './contexts/HistoryContext';
import { AnalysisProvider } from './contexts/AnalysisContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ToastProvider>
        <HistoryProvider>
          <AnalysisProvider>
            <App />
          </AnalysisProvider>
        </HistoryProvider>
      </ToastProvider>
    </HashRouter>
  </React.StrictMode>,
);
