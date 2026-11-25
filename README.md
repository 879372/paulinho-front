# paulinho-front

Interface React/TypeScript para empréstimos, aluguel de motos e criação de animais.

## Desenvolvimento

```sh
npm ci
npm run dev
```

A API local é encaminhada pelo Vite para `http://127.0.0.1:8015`.

## Produção na Vercel

Repositório: `879372/paulinho-front`, branch `main`. Compilação `npm run build`, saída `dist`, Node 24. Configure `VITE_API_URL=https://gestao-web-production.up.railway.app/api` na Vercel. O backend permite a origem da interface em CORS. A configuração `vercel.json` mantém as rotas da interface funcionando ao recarregar a página. Nenhuma senha ou chave privada é enviada ao frontend.
