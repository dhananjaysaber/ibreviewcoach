import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import PolicyPage, { getPolicyPage } from './PolicyPages';
import { initMotion } from './lib/motion';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/source-serif-4';
import '@fontsource-variable/source-serif-4/wght-italic.css';
import '@fontsource-variable/jetbrains-mono';
import './index.css';

const policyPage = getPolicyPage(window.location.pathname);
if (!policyPage) initMotion();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {policyPage ? <PolicyPage page={policyPage} /> : <App />}
  </StrictMode>
);
