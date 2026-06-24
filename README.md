# StartPoint CN Launcher

[startpoint-cn](https://github.com/dontbealarmed/startpoint-cn)的桌面啟動器:一鍵啟停本地伺服器、首次下載/匯入遊戲資源、打包重定向 APK、原生管理面板。

## 事前準備

先備妥這三樣,以及一個 Android 模擬器(如 MuMu):

- [安裝檔](https://github.com/dennis96292/startpoint-cn-launcher/releases) `StartPointCNLauncher_0.1.0_x64-setup.exe`
- [遊戲資源 CDN 分卷](https://github.com/dennis96292/.cdn/releases/tag/cdn-1.4.54) `cn-cdn.tar.part.00`~`.05`(約 10GB)
- [World Flipper 國服原始 APK](https://github.com/dennis96292/startpoint-cn-launcher/releases)

## 使用流程

1. **下載安裝** — 執行安裝檔(免系統管理員,裝在使用者目錄)。

2. **下載或匯入 CDN** — 首次開啟會偵測到尚未有遊戲資源(約 10GB)並跳出選單:能連 GitHub 就選來源(直連或鏡像)後「從網路下載」;被牆或已備妥檔案就「匯入本地資源檔」,一次多選 `cn-cdn.tar.part.00`~`.05`。

3. **設定 host IP 並啟動** — 在「設定」填主機 IP(可按「偵測本機 IP」自動帶入區域網路 IP,即模擬器要連的位址)、連接埠,儲存;回「控制」按啟動。

4. **打包 APK** — 在「打包 APK」選原始 APK 按開始;產出的 APK 已把連線重導到上面設定的 host:port 並跳過雷霆登入,裝進模擬器即可進遊戲。

5. **管理面板** — 伺服器啟動後可用:玩家編輯、帳號/存檔管理、伺服器時間、群發郵件。

## 從原始碼建置

本 repo 不含執行檔與大型 bundled runtime(Node / server / JDK / FFDec 等,build 時組裝)。備妥 `resources/` 後執行 `pwsh scripts/build-release.ps1` 即可產生安裝檔。

授權:GPL-3.0-or-later(沿用 starpoint / startpoint-cn)。
