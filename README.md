# Paste → JPG

貼上或上傳圖片，直接在瀏覽器內轉成可調品質的 JPG 或網頁用的 WebP。純前端、沒有建置步驟，圖片不會上傳到任何伺服器。

👉 https://mason276752.github.io/paste2jpg/

## 功能

- **貼上**：桌機在頁面任何地方按 `⌘V` / `Ctrl+V`；手機長按虛線框 →「貼上」，或按「讀取剪貼簿」
- **上傳 / 拖曳**：選擇多張圖片，或直接拖進頁面
- **輸出 JPG 或 WebP**：WebP 適合放在網站上（同畫質通常比 JPG 小 25–35%，並保留透明背景），品質 100 為無損。Safari／iOS 無法原生編碼 WebP，會自動改用內建的 libwebp（WebAssembly，在 Web Worker 執行）
- **HEIC / HEIF**：Safari 原生解碼；其他瀏覽器在遇到 HEIF 時才載入 libheif（WebAssembly，同樣在本機運算）
- **品質**：1–100 滑桿或直接輸入數字，即時重新轉檔並顯示檔案大小與壓縮比例
- **最長邊**：可縮小尺寸（只縮不放大），大幅縮小時分段縮放以保持清晰
- **透明處填色**：輸出 JPG 時透明區域要填的顏色（預設白色）；WebP 會保留透明
- **輸出**：點圖片或「複製」直接複製；也可下載、分享（手機可存相簿或傳到 App）、切換原圖比較
- **傳給其他工具**：把轉好的圖片打包成 ZIP，透過 BroadcastChannel 傳給同網域的 [簡繁轉換工具](https://mason276752.github.io/ziptotaiwanzip/) 或 [ZIP 編輯器](https://mason276752.github.io/zipeditor/)；沒開的話會自動開新分頁。ZIP 編輯器也可以把裡面的圖片傳過來轉檔
- 設定會記在瀏覽器（localStorage），下次打開沿用

> 瀏覽器剪貼簿目前只接受 PNG 圖片，所以「複製」出去的是轉檔後的畫面（品質與尺寸都已套用），貼上時格式為 PNG；需要真正的 .jpg／.webp 檔請用下載或分享。

## 檔案

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 整個工具（HTML + CSS + JS） |
| `vendor/heic-to.js` | HEIF 解碼器，只在瀏覽器無法原生解碼時載入 |
| `vendor/webp-enc.js` | WebP 編碼器，只在瀏覽器無法原生編碼時（Safari／iOS）載入；由 `tools/build-webp-encoder.mjs` 產生 |
| `og-image.png`、`favicon.svg`、`icon-*.png`、`apple-touch-icon.png`、`manifest.webmanifest` | 分享預覽圖、網站圖示、加入主畫面 |
| `sitemap.xml` | 給搜尋引擎 |
| `.nojekyll` | 讓 GitHub Pages 直接提供靜態檔案 |

## 部署到 GitHub Pages

Repo → **Settings → Pages** → Source 選 *Deploy from a branch*，Branch 選 `main`、資料夾 `/ (root)`。

如果改了 repo 名稱或改用自訂網域，請把 `index.html`（canonical、og、JSON-LD）、`sitemap.xml` 裡的 `https://mason276752.github.io/paste2jpg/` 一起換掉。

## 讓 Google 找得到

頁面本身已經處理好 title／description、canonical、Open Graph、JSON-LD 結構化資料、語意化標題和 FAQ 內容。上線後：

1. 到 [Google Search Console](https://search.google.com/search-console) 新增「網址前置字元」資源：`https://mason276752.github.io/paste2jpg/`，用 HTML 標記或 HTML 檔案驗證
2. 在「Sitemap」提交 `sitemap.xml`
3. 用「網址審查」→「要求建立索引」加快收錄
4. （選用）[Bing Webmaster Tools](https://www.bing.com/webmasters) 可直接從 Search Console 匯入
5. 在 GitHub repo 的 About 填上網址與 topics，在其他地方分享連結，都有助於被發現

## 本機預覽

```sh
python3 -m http.server 8000
# 開啟 http://localhost:8000
```

## 授權

- `vendor/heic-to.js` 是 [heic-to](https://github.com/hoppergee/heic-to) 1.6.7 的 IIFE 版（內含 [libheif](https://github.com/strukturag/libheif) 1.23.7，未修改），以 LGPL-3.0 授權，授權全文見 `vendor/heic-to.LICENSE`。用一般 `<script>` 載入而非 ES module，所以直接開啟本機的 `index.html` 也能解 HEIF。
- `vendor/webp-enc.js` 打包了 [@jsquash/webp](https://github.com/jamsinclair/jSquash) 1.5.0（Apache-2.0，源自 Squoosh）與 [libwebp](https://chromium.googlesource.com/webm/libwebp)（BSD-3-Clause），授權全文見 `vendor/webp-enc.LICENSE`。重新產生：在裝有 `esbuild@0.24.2`、`@jsquash/webp@1.5.0` 的目錄執行 `node tools/build-webp-encoder.mjs vendor/webp-enc.js`。
