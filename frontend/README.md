# sample-envelope-frontend — 信封產生器前端

使用 Rsbuild、React 19、TypeScript、Tailwind v4 與 shadcn/ui。所有介面文字集中在 `src/i18n/zh-Hant.ts`。

```sh
nvm use
corepack enable
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

詳見[專案說明](../README.md)。部署使用 hash 路由；建置 base 可透過 `PUBLIC_BASE` 調整。

GitHub Pages 已啟用（Source: GitHub Actions），從 main 部署至 <https://vibe-backend.github.io/sample-envelope/>。預設建置 base 為 `/sample-envelope/`。
