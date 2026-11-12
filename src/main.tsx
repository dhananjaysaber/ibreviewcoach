import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { initMotion } from './lib/motion';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/source-serif-4/wght-italic.css';
import '@fontsource-variable/jetbrains-mono';
import './index.css';

initMotion();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
