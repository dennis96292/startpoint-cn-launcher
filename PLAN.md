# StartPoint CN Launcher — 規劃

桌面啟動器,專為 CN(雷霆)版 World Flipper 私服(startpoint_cn)。
目標:**使用者只下載一個小 GUI 就能「開始」,首啟時抓一次 CDN 變肥,之後全是 patched APK ↔ 本地 server。**

## 技術選型
- **GUI 殼:Tauri v2**(已從 Electron 遷移 —— Rust 後端 + 系統 webview,體積遠小於 Electron)。前端仍是純 HTML/JS(`withGlobalTauri`,免打包步驟)。
- **後端:沿用 startpoint_cn(Node/Fastify),不重寫**,由 Tauri 的 Rust 端當子進程管理(spawn / taskkill / 串流 stdout)。
- **管理面板:原生重構**(非 iframe 內嵌)—— 用我們的暗色風格,透過 Rust 的 `api_request` 代理直接呼叫 server REST API(繞過 webview CORS)。
- **SQLite 痛點:** 目標改用 Node 22 內建 `node:sqlite` 取代 better-sqlite3(消除原生模組版本問題);或 pin Node + 預編。
- **APK patch:** FFDec + build-tools + keystore(64 位 JRE;ASCII 路徑)。

## 元件邊界
| 位置 | 內容 |
|---|---|
| Installer(小) | Tauri 殼 + Node + server 程式碼 + assets/*.json + JRE + FFDec + build-tools |
| GitHub Releases | CDN 6×2GB 分片(11GB),只在安裝時抓一次 |
| 首啟下載到本地 | .cdn/cn(11GB) |
| 本地生成 | .database / .env / patched.apk |

## GUI 功能
1. 主畫面(WARP 風):大開關鈕啟停 server + 狀態 + URL。
2. 設定:host IP / port / res 版本 → 寫 .env(IP 同步 server 綁定 + CDN base + 日後 APK 重定向)。
3. 首啟精靈:無 .cdn/cn → 下載 6 分片 → 解壓。
4. 打包 APK:選原始 APK + ☑ 重定向 → 用設定 IP patch+簽名 → patched.apk(可選 adb 裝)。
5. 管理面板（**原生重構**,我們的暗色風格,經 Rust `api_request` 代理呼叫 REST API):
   - 玩家:主從編輯 —— 分頁清單 + 資源/欄位即時 PATCH + 角色/道具增刪 + 補資源/重置每日挑戰/清信箱。
   - 伺服器時間:顯示/設定/重置。
   - 群發郵件:type / type_id / number / 標題 / 正文。
6. 日誌:顯示 server stdout(Rust 串流 → `server-log` 事件)。

## 階段路線
- **P0 MVP（完成）**:Tauri 殼 + 啟停 server + 寫 .env + **原生管理面板** + 日誌。實機遊玩迴路驗過。
- **P1 首啟下載（已實作）**:`資源` 分頁 —— `cdn_status` 偵測 `.cdn/cn` → `cdn_download` 讀 Release `cdn-manifest.json` → 逐卷下載(reqwest blocking 串流)+ SHA256 校驗(已存在的卷略過/可修復)→ `MultiFileReader` 串流餵 `tar` 解壓到 `.cdn` → 進度事件 `cdn-progress`/`cdn-done`/`cdn-error`。CDN 來源 = `cdnRepo`(預設 `dennis96292/.cdn`)+ tag `cdn-<resVersion>`。已上傳並對齊驗證(見記憶 project-cn-launcher)。待:對空 serverPath 跑一次完整 10GB 實測。
- **P2 打包 APK（已實作）**:重定向配方 = 主 SWF `assets/worldflipper_android_release.swf` 兩處 AS3 —— `DevConfig.sdkDummy=true`(免雷霆登入)+ `DevConfig_gf_android` apiServer host → `http://<設定IP:port>`。管線(已 CLI 全驗、產出 apksigner verify=Verifies 的簽名 APK):`tools/patch-apk.mjs`(node)做 jar 解 SWF → FFDec 匯出 2 class → 字串 patch → FFDec `-replace` → jar uf0 重組 → zipalign → keytool(launcher 自有 keystore，alias `wf`/pass `android`)→ apksigner 簽。Rust `patch_apk` spawn 該腳本、把 `STEP n/8` 串成 `apk-progress`;`pick_file` 選 APK;`打包 APK` 分頁 UI。工具路徑(FFDec/JDK/build-tools)暫用 dev 預設(P3 bundle)。待:GUI 實機點一次 + adb 自動安裝。
- **P3**:vendor startpoint_cn + Node 執行檔 + 工具鏈(FFDec/JRE/build-tools)bundle、`node:sqlite` 改造、adb 自動裝、tauri build 出 installer + Releases 上傳腳本。

## 已知雷(本次摸索得到)
- ffdec 要 **64 位 Java**、**路徑不能有中文/空格**。
- better-sqlite3 綁 Node 版本(node:sqlite 可解)。
- 教程 C8601 → 用完整存檔繞;伺服器時間倒退會讓「隨時間累積」的值(經驗池)歸零。
- 公開 host 11GB 資產 = 版權/DMCA 風險。

## 目前狀態（P0）
- 已建:**Tauri 骨架**(`src-tauri/` Rust 後端 + `renderer/` 純 HTML/JS)、server 子進程管理、.env 讀寫、**原生管理面板**(玩家/時間/郵件)、日誌串流。
- Rust 指令:`get_config` / `save_config` / `pick_dir` / `start_server` / `stop_server` / `server_state` / `api_request`(reqwest 代理)。
- serverPath 暫指向現有可運行的 `D:\世界弹射物语国服\3. 服务端主体\startpoint_cn`;launcher 設定存於 OS app-config 目錄的 `launcher-config.json`。
- 舊 Electron 檔(`main.js` / `preload.js` / `src/*.js`)已停用(邏輯改寫進 Rust),保留作參考。
- 待:`npm run dev`(= `tauri dev`)實測啟停 + 管理面板;之後 `npm run build` 出安裝檔。
