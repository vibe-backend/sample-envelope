# sample-envelope — 信封產生器

前端限定的 v1 中文信封排版工具，支援直書、橫書與實際尺寸列印。資料僅儲存在目前瀏覽器的 localStorage，無需帳號，也不會傳送至伺服器。

## 專案結構

- [frontend/](frontend/README.md)：Rsbuild、React 19、TypeScript、Tailwind v4、shadcn/ui 與 Vitest。
- [backend/](backend/README.md)：v2 後端預留位置。

## 本機開發

使用 Node 22.22.2（或 package.json engines 支援的版本）。

```sh
cd frontend
nvm use
corepack enable
pnpm install
pnpm dev
```

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm preview
```

## 使用方法

1. 填寫收件人姓名與地址（寄件人姓名、地址皆選填）；可使用「載入範例」填入虛構資料。
2. 選擇信封尺寸。每張卡片都會即時呈現相同資料。
3. 調整方向、字型、字級、位置、姓名字距、電話與郵遞區號方格，然後列印。

草稿與每種尺寸的設定會自動保存在瀏覽器。「清除」清空草稿；「重設為預設值」還原目前信封設定。請避免在共用電腦留下個人地址。

## 支援尺寸

預設尺寸以短邊 × 長邊記錄，橫式會交換寬高。自訂欄位直接對應實際寬 × 高；方向切換會交換兩者。

| 信封 | 尺寸 (mm) | 預設方向 | 預設書寫 |
| --- | --- | --- | --- |
| 中式直式（台灣標準） | 120 × 230 | 直式 | 直書 |
| DL | 110 × 220 | 橫式 | 橫書 |
| C5 | 162 × 229 | 橫式 | 橫書 |
| C6 | 114 × 162 | 橫式 | 橫書 |
| C4 | 229 × 324 | 橫式 | 橫書 |
| #10 | 105 × 241 | 橫式 | 橫書 |
| 自訂 | 120 × 180 | 直式 | 橫書 |

中式直式採常見商用尺寸 120 × 230 mm，符合[中華郵政標準信封規格](https://www.post.gov.tw/post/internet/Customer_service/index.jsp?ID=16020316)：長 140–235 mm、寬 90–165 mm，長邊至少為短邊 1.3 倍（直式及橫式相同）。

自訂寬高可在 50–500 mm 範圍調整。字型使用電腦上的中文字型，未安裝時會依序使用替代字型。

## 列印提示

點選「列印」先開啟設定確認視窗，顯示實際 W × H mm 與四項設定步驟；確認後才開啟瀏覽器列印。勾選「不再顯示」會在此瀏覽器記住選擇，之後直接列印。

- 選擇與信封相同的紙張尺寸。
- 縮放選擇 100%／實際大小，邊界選擇「無」，關閉頁首頁尾。
- 請按照印表機手冊的信封進紙方向裝入信封。
- 建議先用普通紙試印，確認位置與印表機的不可列印邊緣。

預覽依視窗縮放；列印使用毫米尺寸與動態 `@page` 設定。瀏覽器與印表機驅動程式仍可能需要手動選取紙張尺寸。

## CI/CD

[ci.yml](.github/workflows/ci.yml) 在 pull request 與推送至 main 時執行 Markdown lint、離線連結檢查，以及前端 lint、型別檢查、測試及建置。[deps.yml](.github/workflows/deps.yml) 執行 pnpm audit。

[pages.yml](.github/workflows/pages.yml) 僅從 main 部署至 <https://vibe-backend.github.io/sample-envelope/>，也支援手動觸發。使用 hash 路由，重新整理不會產生 GitHub Pages 路徑 404。

Pages 已啟用（Settings → Pages → Source: GitHub Actions），從 main 部署。建置預設 base 為 `/sample-envelope/`，可用 `PUBLIC_BASE` 覆寫。

## v2 計畫

後端將透過 vibe-backend SDK 提供通訊錄同步、儲存範本與 PDF 匯出。v1 不含後端或 API 模擬。

## License

[MIT](LICENSE)。

## English

A frontend-only Chinese envelope generator with vertical and horizontal writing, seven envelope presets, browser-local drafts, per-size settings, and exact-size printing.

Run `cd frontend`, `nvm use`, `corepack enable`, `pnpm install`, then `pnpm dev`. Fill addresses, choose a size, adjust the layout, and print at 100% with no margins or headers/footers. Follow your printer manual for envelope feeding. GitHub Pages deploys only from main; Pages is enabled with Source: GitHub Actions. The backend is planned for v2. MIT licensed.
