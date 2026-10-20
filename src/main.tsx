import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import './styles/base.css';
import './styles/ui.css';
import './styles/shell.css';
import './styles/features.css';
import './styles/screens.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);

// Test hook for the local screenshot/sweep scripts. Exposes demo state only.
import { useApp } from './state/store';
import { openModal, closeModal } from './state/actions/ui';
(window as unknown as Record<string, unknown>).__ghar = { useApp, openModal, closeModal };
