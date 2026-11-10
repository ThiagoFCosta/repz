import { useEffect, useState } from 'preact/hooks';

// Hora atual para desenhar cronômetros: só redesenha; a fonte da verdade são os timestamps
export function useRelogio(intervaloMs: number): number {
  const [agora, setAgora] = useState(Date.now());
  useEffect(() => {
    const tick = () => setAgora(Date.now());
    const id = setInterval(tick, intervaloMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervaloMs]);
  return agora;
}
