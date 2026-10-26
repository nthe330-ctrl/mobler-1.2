import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@shared/context/ThemeContext';
import { LanguageProvider } from '@shared/context/LanguageContext';
import CelebrationModal, { CelebrationPayload } from '../apps/customer/src/components/CelebrationModal';
import './harness.css';

const PAYLOAD: CelebrationPayload = {
  kind: 'rank', title: 'Kẻ Khám Phá', subtitle: 'Bắt đầu lần theo những quán lạ',
  icon: '🔎', color: '#2E8B8B', pointsEarned: 45, points: 320
};

function Harness() {
  const [p, setP] = useState<CelebrationPayload | null>(null);
  return (
    <>
      <button id="opener" onClick={() => setP(PAYLOAD)}>mở</button>
      <CelebrationModal payload={p} onClose={() => setP(null)} />
    </>
  );
}
createRoot(document.getElementById('root')!).render(<StrictMode><ThemeProvider><LanguageProvider><Harness /></LanguageProvider></ThemeProvider></StrictMode>);
