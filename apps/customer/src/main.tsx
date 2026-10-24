import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ThemeProvider } from '@shared/context/ThemeContext';
import { LanguageProvider } from '@shared/context/LanguageContext';
import { UserProvider } from './context/UserContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { registerServiceWorker } from './services/push.ts';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <UserProvider>
            <App />
          </UserProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
);

// The worker is what makes the app installable and lets a notification arrive with
// every tab closed. Registering it asks for nothing: the permission prompt only
// appears when the person turns notifications on themselves.
registerServiceWorker();



