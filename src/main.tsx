
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App.tsx';
import 'react-international-phone/style.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <Toaster richColors position="top-right" />
  </>,
);
  