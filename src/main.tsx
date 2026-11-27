import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import './estilo/app.css';
import { App } from './ui/App';
import { criarRoteador } from './app/roteador';
import { registrarServiceWorker } from './app/pwa';
import { iniciarInstalacao } from './app/instalacao';
import { iniciarSessao } from './app/sessao';

iniciarInstalacao();
createRoot(document.getElementById('app')!).render(<RouterProvider router={criarRoteador(<App />)} />);
void iniciarSessao();
registrarServiceWorker();
