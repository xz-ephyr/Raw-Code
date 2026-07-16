import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App';
import { AppProviders } from './components/layout/AppProviders';
import './styles/index.css';
import 'katex/dist/katex.min.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error("Failed to find the root element with id 'root'");
} else {
  try {
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <AppProviders>
          <App />
        </AppProviders>
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Failed to mount React application:", error);
    rootElement.innerHTML = `<div style="color:red; padding: 20px;"><h1>Application failed to mount</h1><pre>${error}</pre></div>`;
  }
}
