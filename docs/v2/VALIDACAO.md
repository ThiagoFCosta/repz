# Validação no celular — v2

> Roteiro por marco (docs/v2/PLAN.md). Precisa do app publicado na Netlify (deploy só quando o Thiago pedir) e de
> uma conta convidada no Supabase. O roteiro da v1 (`docs/VALIDACAO.md`) continua valendo para o fluxo de treino.

## V1 · Base

1. Abrir o endereço da Netlify no Chrome do Android: aparece a tela **Entrar** com o logo do Repz.
2. Entrar com o e-mail e a senha do convite. Errar a senha uma vez: aparece "E-mail ou senha incorretos."
3. O Início abre no visual do Prisma, no tema do celular (trocar o tema do sistema e conferir claro e escuro).
4. Barra inferior: Início · Corpo · **Treino** (botão lime no centro) · Dieta · Coach. Corpo, Dieta e Coach mostram
   "em breve".
5. Menu ☰: Histórico, Cardio, Plano de treino, Plano alimentar, Referências e Perfil abrem a tela certa.
6. Plano de treino → importar o PDF do plano (ou colar o texto), revisar e salvar.
7. Fazer um treino curto (2 exercícios, com descanso): registrar séries com RIR + Concluir, ver o resumo.
8. Fechar o app no meio do treino e abrir de novo: o treino continua de onde parou.
9. Modo avião, fechar e abrir o app: abre direto no Início, sem pedir login.
10. Perfil → Sair → Entrar de novo: o plano e o treino feitos continuam lá (os dados ainda ficam só no celular;
    a sincronização com o servidor é o marco V2).
11. Instalar na tela inicial (menu do Chrome → Instalar app) e repetir o passo 9 pelo app instalado.
