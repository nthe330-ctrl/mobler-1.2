import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ShopAuthProvider } from './context/ShopAuthContext';
import { LanguageProvider } from '@shared/context/LanguageContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/*
      The dashboard's own language, under its own storage key. Both apps are served from
      one origin in production, so sharing the customer app's key would mean a staff
      member switching the dashboard to Thai also switched the app their guests see.
    */}
    <LanguageProvider storageKey="mobler_shop_language">
      <ShopAuthProvider>
        <App />
      </ShopAuthProvider>
    </LanguageProvider>
  </StrictMode>
);
