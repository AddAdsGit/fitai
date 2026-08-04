import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const query = new URLSearchParams(window.location.search);
// Share-card test harness is dev-only; it must never ship in production builds.
const testCard = import.meta.env.DEV ? query.get('test_card') : null;

if (testCard) {
  import('./TestCardRunner.tsx').then(({ TestCardRunner }) => {
    createRoot(document.getElementById('root')!).render(
      <TestCardRunner type={testCard as any} format={query.get('format') as any} />
    );
  });
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
