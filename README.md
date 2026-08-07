# Remédio na Hora

Aplicativo React/Vite para criar lembretes de medicamentos, acompanhar doses em um calendário e receber alertas no horário configurado.

## Executar localmente

**Pré-requisitos:** Node.js

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Crie um arquivo `.env.local` e configure sua chave da API Gemini:
   ```bash
   VITE_API_KEY=sua_chave_aqui
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## Build

```bash
npm run build
```

O app está configurado com `base: '/remedios_app/'` para publicação no GitHub Pages.
