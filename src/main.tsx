import React from 'react';
import ReactDOM from 'react-dom/client';
import { EditorShell } from './shell/EditorShell';
import './index.css'; // eslint-disable-line @typescript-eslint/no-require-imports
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EditorShell />
  </React.StrictMode>
);
