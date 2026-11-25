# paulinho-front

Interface React/TypeScript para empréstimos, aluguel de motos e criação de animais.

## Desenvolvimento

```sh
npm ci
npm run dev
```

A API local é encaminhada pelo Vite para `http://127.0.0.1:8015`.

## Produção na Vercel

Repositório: `879372/paulinho-front`, branch `main`. Compilação `npm run build`, saída `dist`, Node 24. Não defina `VITE_API_URL`: a configuração `vercel.json` encaminha `/api/` para a API no Railway e mantém as rotas da interface funcionando ao recarregar a página. Nenhuma senha ou chave privada é enviada ao frontend.
