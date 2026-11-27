import { createRoot } from 'react-dom/client';
import './estilo/tokens.css';
import './estilo/base.css';
import './estilo/componentes.css';
import { App } from './ui/App';
import { iniciarRoteador } from './app/roteador';
import { registrarServiceWorker } from './app/pwa';
import { iniciarInstalacao } from './app/instalacao';
import { iniciarEstado } from './app/estado';
import { restaurarTreino } from './app/controlador-treino';

iniciarRoteador();
iniciarInstalacao();
createRoot(document.getElementById('app')!).render(<App />);
void iniciarEstado(restaurarTreino);
registrarServiceWorker();
