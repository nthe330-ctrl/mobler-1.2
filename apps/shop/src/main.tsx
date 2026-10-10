import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ShopAuthProvider } from './context/ShopAuthContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ShopAuthProvider>
      <App />
    </ShopAuthProvider>
  </StrictMode>
);
