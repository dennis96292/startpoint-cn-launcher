# StartPoint CN Launcher

CN(雷霆)版 World Flipper 私服(startpoint_cn)的桌面啟動器。

> 一鍵啟停本地伺服器、設定主機 IP、**原生管理面板**;之後支援首啟下載 CDN 與一鍵打包重定向 APK。詳見 [PLAN.md](PLAN.md)。

技術:**Tauri v2**(Rust 後端 + 系統 webview)+ 純 HTML/JS 前端。

## 開發 / 執行(P0)

需求:Node 20+(本機 v21)、Rust(`cargo`)、Windows 上的 WebView2(Win10/11 內建)。

```bash
npm install      # 安裝 @tauri-apps/cli + api
npm run dev      # = tauri dev：編譯 Rust 後端並開啟視窗
```

預設「伺服器目錄」指向現有可運行的 `D:\世界弹射物语国服\3. 服务端主体\startpoint_cn`,
可在「設定」分頁改。啟動後「管理面板」分頁是**原生重構**的編輯器(玩家/伺服器時間/群發郵件),
透過 Rust 的 `api_request` 代理直接呼叫該伺服器的 REST API(繞過 webview CORS)。

## 打包

```bash
npm run build    # = tauri build：產出 Windows installer (NSIS/MSI)
```

## 授權

GPL-3.0-or-later(沿用 startpoint / startpoint_cn 的 copyleft)。
