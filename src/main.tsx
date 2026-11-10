import { render } from 'preact';
import './estilo/tokens.css';
import './estilo/base.css';
import { App } from './ui/App';
import { iniciarRoteador } from './app/roteador';
import { registrarServiceWorker } from './app/pwa';

iniciarRoteador();
render(<App />, document.getElementById('app')!);
registrarServiceWorker();
