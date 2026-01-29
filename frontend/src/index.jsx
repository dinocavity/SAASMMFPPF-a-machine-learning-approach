import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { AnalysisProvider } from './contexts/AnalysisContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <AnalysisProvider>
            <App />
          </AnalysisProvider>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  </React.StrictMode>,
);
