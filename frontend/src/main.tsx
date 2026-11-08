import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { store } from '@/app/store';
import App from '@/app/App';
import { API_BASE_URL } from '@/features/catalog/catalogApi';
import { warmUpApi } from '@/lib/serverWake';
import '@/styles/index.css';

warmUpApi(API_BASE_URL);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
