import { render } from 'preact';
import './estilo/tokens.css';
import './estilo/base.css';
import './estilo/componentes.css';
import { App } from './ui/App';
import { iniciarRoteador } from './app/roteador';
import { registrarServiceWorker } from './app/pwa';
import { iniciarEstado } from './app/estado';
import { restaurarTreino } from './app/controlador-treino';

iniciarRoteador();
render(<App />, document.getElementById('app')!);
void iniciarEstado(restaurarTreino);
registrarServiceWorker();
