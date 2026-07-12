import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const query = new URLSearchParams(window.location.search);
const testCard = query.get('test_card');

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
