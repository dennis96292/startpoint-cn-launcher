// StartPoint CN Launcher — Tauri backend.
// Ports the former Electron config.js + serverManager.js, plus a reqwest-based
// API proxy so the native admin UI can talk to the local Node server without CORS.

use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_dialog::DialogExt;

// Default to the working packaged server from this session until we vendor our own copy.
const DEFAULT_SERVER_PATH: &str = "D:/世界弹射物语国服/3. 服务端主体/startpoint_cn";
// Default public GitHub repo hosting the CDN release assets (split tar parts).
const DEFAULT_CDN_REPO: &str = "dennis96292/.cdn";
// Dev location of bundled resources (node / server / tools); P3 installer ships these via resource_dir.
const RESOURCES_DEV: &str = "D:/starpoint-cn-launcher/resources";

// Resolve the bundled-resources directory: prefer the packaged resource_dir, fall back to the dev path.
fn resources_dir(app: &AppHandle) -> PathBuf {
    if let Ok(rd) = app.path().resource_dir() {
        let p = rd.join("resources");
        if p.join("server").exists() || p.join("node").exists() {
            return p;
        }
    }
    PathBuf::from(RESOURCES_DEV)
}

// Strip the Windows extended-length (verbatim) prefix `\\?\` — Node mis-resolves it
// (its realpath splits `\\?\C:` into a bare `C:` component → EISDIR lstat 'C:').
fn strip_verbatim(s: String) -> String {
    s.strip_prefix(r"\\?\").map(|x| x.to_string()).unwrap_or(s)
}

// The CDN lives under the server dir (`<serverRoot>/.cdn`), i.e. inside the install dir.
// This is the server's own default location (`process.env.CDN_DIR || ".cdn"`), so the launcher
// and server agree without any env override, and the NSIS uninstaller removes it in one sweep —
// everything stays under one folder, no scatter, clean uninstall.
fn cdn_dir(app: &AppHandle) -> PathBuf {
    PathBuf::from(read_launcher_config(app).server_path).join(".cdn")
}

// Bundled node.exe if present, else fall back to system "node".
fn node_exe(app: &AppHandle) -> String {
    let p = resources_dir(app).join("node").join("node.exe");
    if p.exists() {
        strip_verbatim(p.to_string_lossy().to_string())
    } else {
        "node".to_string()
    }
}

// The APK patch script lives in <bundle>/tools/patch-apk.mjs (sibling of resources/).
fn patch_script(app: &AppHandle) -> String {
    if let Some(parent) = resources_dir(app).parent() {
        let p = parent.join("tools").join("patch-apk.mjs");
        if p.exists() {
            return strip_verbatim(p.to_string_lossy().to_string());
        }
    }
    strip_verbatim(PATCH_SCRIPT.to_string())
}

// ---------- shared server state ----------

#[derive(Default)]
struct ServerState {
    pid: Option<u32>,
    status: String, // stopped | starting | running | error
}

struct AppState(Mutex<ServerState>);

// ---------- config types ----------

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LauncherConfig {
    server_path: String,
    #[serde(default)]
    cdn_repo: Option<String>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AppConfig {
    server_path: String,
    host: String,
    port: String,
    cdn_base_url: String,
    res_version: String,
    cdn_repo: String,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SaveUi {
    server_path: Option<String>,
    host: Option<String>,
    port: Option<String>,
    res_version: Option<String>,
    cdn_repo: Option<String>,
}

// ---------- config helpers (port of config.js) ----------

fn launcher_config_path(app: &AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_config_dir()
        .unwrap_or_else(|_| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")));
    let _ = std::fs::create_dir_all(&dir);
    dir.join("launcher-config.json")
}

fn read_launcher_config(app: &AppHandle) -> LauncherConfig {
    let p = launcher_config_path(app);
    if let Ok(text) = std::fs::read_to_string(&p) {
        if let Ok(cfg) = serde_json::from_str::<LauncherConfig>(&text) {
            return cfg;
        }
    }
    // Default to the bundled/vendored server if present, else the legacy external path.
    let vendored = resources_dir(app).join("server");
    let default_sp = if vendored.join("out").join("cn-server.js").exists() {
        strip_verbatim(vendored.to_string_lossy().to_string())
    } else {
        DEFAULT_SERVER_PATH.to_string()
    };
    LauncherConfig {
        server_path: default_sp,
        cdn_repo: None,
    }
}

fn write_launcher_config(app: &AppHandle, cfg: &LauncherConfig) {
    let p = launcher_config_path(app);
    if let Ok(text) = serde_json::to_string_pretty(cfg) {
        let _ = std::fs::write(&p, text);
    }
}

fn env_path(server_path: &str) -> PathBuf {
    PathBuf::from(server_path).join(".env")
}

fn read_env(server_path: &str) -> HashMap<String, String> {
    let mut out = HashMap::new();
    if let Ok(text) = std::fs::read_to_string(env_path(server_path)) {
        for raw in text.lines() {
            let line = raw.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if let Some(eq) = line.find('=') {
                let key = line[..eq].trim().to_string();
                let mut val = line[eq + 1..].trim().to_string();
                if val.len() >= 2
                    && ((val.starts_with('"') && val.ends_with('"'))
                        || (val.starts_with('\'') && val.ends_with('\'')))
                {
                    val = val[1..val.len() - 1].to_string();
                }
                out.insert(key, val);
            }
        }
    }
    out
}

// Update the server's .env in place, preserving unrelated lines/comments.
fn set_env(server_path: &str, updates: &[(String, String)]) {
    let p = env_path(server_path);
    let existing = std::fs::read_to_string(&p).unwrap_or_default();
    let mut remaining: HashMap<&str, &str> =
        updates.iter().map(|(k, v)| (k.as_str(), v.as_str())).collect();

    let mut out_lines: Vec<String> = Vec::new();
    for raw in existing.lines() {
        let t = raw.trim();
        if t.is_empty() || t.starts_with('#') {
            out_lines.push(raw.to_string());
            continue;
        }
        if let Some(eq) = t.find('=') {
            let key = t[..eq].trim();
            if let Some(v) = remaining.remove(key) {
                out_lines.push(format!("{key}=\"{v}\""));
                continue;
            }
        }
        out_lines.push(raw.to_string());
    }
    // Append any keys that weren't present.
    for (k, v) in updates.iter() {
        if remaining.contains_key(k.as_str()) {
            out_lines.push(format!("{k}=\"{v}\""));
        }
    }
    let _ = std::fs::write(&p, out_lines.join("\n"));
}

// ---------- config commands ----------

#[tauri::command]
fn get_config(app: AppHandle) -> AppConfig {
    let lc = read_launcher_config(&app);
    let env = read_env(&lc.server_path);
    let host = env
        .get("CN_LISTEN_HOST")
        .cloned()
        .unwrap_or_else(|| "127.0.0.1".to_string());
    let port = env
        .get("CN_LISTEN_PORT")
        .cloned()
        .unwrap_or_else(|| "8001".to_string());
    AppConfig {
        cdn_base_url: env
            .get("CDN_BASE_URL")
            .cloned()
            .unwrap_or_else(|| format!("http://{host}:{port}/patch/cn")),
        res_version: env
            .get("CN_RES_VERSION")
            .cloned()
            .unwrap_or_else(|| "1.4.54".to_string()),
        cdn_repo: lc
            .cdn_repo
            .clone()
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| DEFAULT_CDN_REPO.to_string()),
        server_path: lc.server_path,
        host,
        port,
    }
}

// High-level save: keeps host/port/cdn in sync (the IP feeds both server binding and CDN base).
#[tauri::command]
fn save_config(app: AppHandle, ui: SaveUi) -> AppConfig {
    let mut lc = read_launcher_config(&app);
    let mut lc_changed = false;
    if let Some(sp) = ui.server_path.filter(|s| !s.is_empty()) {
        lc.server_path = sp;
        lc_changed = true;
    }
    if let Some(repo) = ui.cdn_repo.filter(|s| !s.is_empty()) {
        lc.cdn_repo = Some(repo);
        lc_changed = true;
    }
    if lc_changed {
        write_launcher_config(&app, &lc);
    }
    let host = ui
        .host
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "127.0.0.1".to_string());
    let port = ui
        .port
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "8001".to_string());

    let mut updates: Vec<(String, String)> = vec![
        ("CN_LISTEN_HOST".to_string(), host.clone()),
        ("CN_LISTEN_PORT".to_string(), port.clone()),
        (
            "CDN_BASE_URL".to_string(),
            format!("http://{host}:{port}/patch/cn"),
        ),
    ];
    if let Some(rv) = ui.res_version.filter(|s| !s.is_empty()) {
        updates.push(("CN_RES_VERSION".to_string(), rv));
    }
    set_env(&lc.server_path, &updates);
    get_config(app)
}

#[tauri::command]
fn pick_dir(app: AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .blocking_pick_folder()
        .and_then(|fp| fp.into_path().ok())
        .map(|pb| pb.to_string_lossy().to_string())
}

// ---------- server lifecycle (port of serverManager.js) ----------

fn set_status(app: &AppHandle, status: &str) {
    {
        let st = app.state::<AppState>();
        let mut s = st.0.lock().unwrap();
        s.status = status.to_string();
    }
    let _ = app.emit("server-state", status.to_string());
}

#[tauri::command]
fn start_server(app: AppHandle) -> Result<(), String> {
    {
        let st = app.state::<AppState>();
        if st.0.lock().unwrap().pid.is_some() {
            return Err("伺服器已在執行".to_string());
        }
    }

    let lc = read_launcher_config(&app);
    let server_path = PathBuf::from(&lc.server_path);
    let entry = server_path.join("out").join("cn-server.js");
    if !entry.exists() {
        let msg = format!(
            "找不到伺服器進入點：{}（請先在伺服器目錄 npm run build）",
            entry.display()
        );
        let _ = app.emit("server-log", format!("[launcher] {msg}"));
        set_status(&app, "error");
        return Err(msg);
    }

    set_status(&app, "starting");
    let _ = app.emit("server-log", format!("[launcher] 啟動 {}", entry.display()));

    // Mirror the server's own start command: node --env-file=.env out/cn-server.js
    // CDN + DB use the server's own defaults (<serverRoot>/.cdn, <serverRoot>/.database) — no env
    // override — so everything lives under the install dir and uninstall removes it in one sweep.
    let mut cmd = Command::new(node_exe(&app));
    cmd.args(["--env-file=.env", "out/cn-server.js"])
        .current_dir(&server_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
    }

    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            let _ = app.emit("server-log", format!("[launcher] 啟動失敗: {e}"));
            set_status(&app, "error");
            return Err(e.to_string());
        }
    };

    let pid = child.id();
    {
        let st = app.state::<AppState>();
        st.0.lock().unwrap().pid = Some(pid);
    }

    let stdout = child.stdout.take().expect("piped stdout");
    let stderr = child.stderr.take().expect("piped stderr");

    // stderr reader
    {
        let app2 = app.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                if line.to_lowercase().contains("listening") {
                    set_status(&app2, "running");
                }
                let _ = app2.emit("server-log", line);
            }
        });
    }

    // stdout reader; this thread owns `child` and reaps it on exit.
    {
        let app3 = app.clone();
        std::thread::spawn(move || {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                if line.to_lowercase().contains("listening") {
                    set_status(&app3, "running");
                }
                let _ = app3.emit("server-log", line);
            }
            // stdout closed → the process has exited; reap it.
            let _ = child.wait();
            {
                let st = app3.state::<AppState>();
                st.0.lock().unwrap().pid = None;
            }
            set_status(&app3, "stopped");
            let _ = app3.emit("server-log", "[launcher] 伺服器結束".to_string());
        });
    }

    Ok(())
}

#[tauri::command]
fn stop_server(app: AppHandle) -> Result<(), String> {
    let pid = {
        let st = app.state::<AppState>();
        let p = st.0.lock().unwrap().pid;
        p
    };
    let Some(pid) = pid else {
        return Ok(());
    };
    let _ = app.emit("server-log", "[launcher] 停止伺服器…".to_string());

    // Kill the whole tree (the node proc + any children).
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let mut c = Command::new("taskkill");
        c.args(["/pid", &pid.to_string(), "/T", "/F"])
            .creation_flags(0x0800_0000);
        let _ = c.spawn();
    }
    #[cfg(not(windows))]
    {
        let _ = Command::new("kill").arg(pid.to_string()).spawn();
    }
    Ok(())
}

#[derive(Serialize)]
struct StateInfo {
    status: String,
    pid: Option<u32>,
}

#[tauri::command]
fn server_state(app: AppHandle) -> StateInfo {
    let st = app.state::<AppState>();
    let s = st.0.lock().unwrap();
    StateInfo {
        status: if s.status.is_empty() {
            "stopped".to_string()
        } else {
            s.status.clone()
        },
        pid: s.pid,
    }
}

// ---------- API proxy (avoids webview CORS to the LAN Node server) ----------

#[derive(Serialize)]
struct ApiResponse {
    status: u16,
    body: String,
    location: Option<String>,
}

#[tauri::command]
async fn api_request(
    app: AppHandle,
    method: String,
    path: String,
    body: Option<String>,
    content_type: Option<String>,
) -> Result<ApiResponse, String> {
    let cfg = get_config(app);
    let url = format!("http://{}:{}{}", cfg.host, cfg.port, path);

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| e.to_string())?;

    let m = reqwest::Method::from_bytes(method.to_uppercase().as_bytes())
        .map_err(|e| e.to_string())?;
    let mut req = client.request(m, &url);
    if let Some(ct) = content_type {
        req = req.header("content-type", ct);
    }
    if let Some(b) = body {
        req = req.body(b);
    }

    let resp = req.send().await.map_err(|e| e.to_string())?;
    let status = resp.status().as_u16();
    let location = resp
        .headers()
        .get("location")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    let text = resp.text().await.unwrap_or_default();

    Ok(ApiResponse {
        status,
        body: text,
        location,
    })
}

// ---------- first-run CDN download (P1) ----------

#[derive(Serialize)]
struct CdnStatus {
    present: bool,
    cn_dir: String,
}

#[tauri::command]
fn cdn_status(app: AppHandle) -> CdnStatus {
    let cn = cdn_dir(&app).join("cn");
    // Present if the manifest file `path` exists, or the dir has any content.
    let present = cn.join("path").exists()
        || (cn.is_dir()
            && std::fs::read_dir(&cn)
                .map(|mut d| d.next().is_some())
                .unwrap_or(false));
    CdnStatus {
        present,
        cn_dir: cn.to_string_lossy().to_string(),
    }
}

// Delete the downloaded CDN to reclaim disk without uninstalling the whole app.
// (Uninstall already removes it via the NSIS hook; this is just a manual "free space" button.)
#[tauri::command]
fn cdn_clear(app: AppHandle) -> Result<(), String> {
    let cdn = cdn_dir(&app);
    if cdn.exists() {
        std::fs::remove_dir_all(&cdn).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(Deserialize)]
struct CdnPart {
    name: String,
    size: u64,
    sha256: String,
}

#[derive(Deserialize)]
struct CdnManifest {
    parts: Vec<CdnPart>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct CdnProgress {
    phase: String, // download | extract
    current: u64,
    total: u64,
    percent: u32,
    label: String,
}

// A Read that concatenates several files in order (streamed reassembly of the split tar).
struct MultiFileReader {
    paths: Vec<PathBuf>,
    idx: usize,
    cur: Option<std::fs::File>,
}
impl MultiFileReader {
    fn new(paths: Vec<PathBuf>) -> Self {
        Self {
            paths,
            idx: 0,
            cur: None,
        }
    }
}
impl Read for MultiFileReader {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        loop {
            if self.cur.is_none() {
                if self.idx >= self.paths.len() {
                    return Ok(0);
                }
                self.cur = Some(std::fs::File::open(&self.paths[self.idx])?);
                self.idx += 1;
            }
            let n = self.cur.as_mut().unwrap().read(buf)?;
            if n == 0 {
                self.cur = None;
                continue;
            }
            return Ok(n);
        }
    }
}

fn hex(bytes: impl AsRef<[u8]>) -> String {
    bytes.as_ref().iter().map(|b| format!("{:02x}", b)).collect()
}

fn sha256_file(p: &Path) -> std::io::Result<String> {
    let mut f = std::fs::File::open(p)?;
    let mut h = Sha256::new();
    let mut buf = vec![0u8; 1 << 20];
    loop {
        let n = f.read(&mut buf)?;
        if n == 0 {
            break;
        }
        h.update(&buf[..n]);
    }
    Ok(hex(h.finalize()))
}

fn emit_progress(app: &AppHandle, phase: &str, current: u64, total: u64, label: &str) {
    let percent = if total > 0 {
        ((current as f64 / total as f64) * 100.0) as u32
    } else {
        0
    };
    let _ = app.emit(
        "cdn-progress",
        CdnProgress {
            phase: phase.to_string(),
            current,
            total,
            percent,
            label: label.to_string(),
        },
    );
}

#[tauri::command]
fn cdn_download(app: AppHandle, mirror: Option<String>) -> Result<(), String> {
    let lc = read_launcher_config(&app);
    let cfg = get_config(app.clone());
    let repo = lc
        .cdn_repo
        .clone()
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| DEFAULT_CDN_REPO.to_string());
    let tag = format!("cdn-{}", cfg.res_version);
    let cdn_root = cdn_dir(&app).to_string_lossy().to_string();
    let mirror = mirror.unwrap_or_default();

    std::thread::spawn(move || {
        if let Err(e) = run_cdn_download(&app, &repo, &tag, &cdn_root, &mirror) {
            let _ = app.emit("server-log", format!("[cdn] 失敗: {e}"));
            let _ = app.emit("cdn-error", e);
        }
    });
    Ok(())
}

// Download one part with categorized errors; deletes the file on checksum failure so a
// retry re-fetches it (and the skip-if-already check won't wrongly accept a bad file).
fn download_one(
    app: &AppHandle,
    client: &reqwest::blocking::Client,
    url: &str,
    dest: &Path,
    expected_sha: &str,
    base_done: u64,
    total: u64,
    name: &str,
) -> Result<(), String> {
    let mut resp = client.get(url).send().map_err(|e| format!("連線失敗: {e}"))?;
    let st = resp.status();
    if !st.is_success() {
        return Err(format!("HTTP {}（來源回應錯誤,可能限流或失效）", st.as_u16()));
    }
    let mut file = std::fs::File::create(dest).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut buf = vec![0u8; 1 << 20];
    let mut cur: u64 = 0;
    loop {
        let n = resp.read(&mut buf).map_err(|e| format!("傳輸中斷: {e}"))?;
        if n == 0 {
            break;
        }
        file.write_all(&buf[..n]).map_err(|e| e.to_string())?;
        hasher.update(&buf[..n]);
        cur += n as u64;
        emit_progress(app, "download", base_done + cur, total, name);
    }
    drop(file);
    if hex(hasher.finalize()) != expected_sha {
        let _ = std::fs::remove_file(dest);
        return Err("內容校驗失敗(來源可能回傳錯誤頁或檔案不完整)".to_string());
    }
    Ok(())
}

fn run_cdn_download(app: &AppHandle, repo: &str, tag: &str, cdn_root: &str, mirror: &str) -> Result<(), String> {
    // A China mirror prefixes the github URL, e.g. https://gh-proxy.com/https://github.com/owner/repo/...
    let gh = format!("https://github.com/{repo}/releases/download/{tag}");
    let base = if mirror.is_empty() { gh } else { format!("{mirror}{gh}") };
    let _ = app.emit("server-log", format!("[cdn] 來源: {base}"));
    let _ = app.emit(
        "server-log",
        format!("[cdn] 讀取 manifest: {base}/cdn-manifest.json"),
    );

    let client = reqwest::blocking::Client::builder()
        .build()
        .map_err(|e| e.to_string())?;

    // Fetch the manifest with up to 3 retries (mirrors are flaky).
    let manifest: CdnManifest = {
        let mut last = String::new();
        let mut got = None;
        for attempt in 1..=3u32 {
            match client
                .get(format!("{base}/cdn-manifest.json"))
                .send()
                .and_then(|r| r.error_for_status())
                .and_then(|r| r.json::<CdnManifest>())
            {
                Ok(m) => {
                    got = Some(m);
                    break;
                }
                Err(e) => {
                    last = e.to_string();
                    let _ = app.emit("server-log", format!("[cdn] manifest 第 {attempt}/3 次失敗: {last}"));
                    if attempt < 3 {
                        std::thread::sleep(std::time::Duration::from_secs(2 * attempt as u64));
                    }
                }
            }
        }
        got.ok_or_else(|| {
            format!("無法取得資源清單: {last}（GitHub 可能被牆;請在「下載來源」改選鏡像,或改用「匯入本地資源檔」）")
        })?
    };

    let dl_dir = PathBuf::from(cdn_root).join("_dl");
    std::fs::create_dir_all(&dl_dir).map_err(|e| e.to_string())?;

    let total: u64 = manifest.parts.iter().map(|p| p.size).sum();
    let mut done: u64 = 0; // bytes from fully-completed parts

    // Download + verify each part, with up to 3 retries (already-correct parts skipped → resumable).
    for part in &manifest.parts {
        let dest = dl_dir.join(&part.name);
        let already = dest.metadata().map(|m| m.len() == part.size).unwrap_or(false)
            && sha256_file(&dest).map(|h| h == part.sha256).unwrap_or(false);
        if already {
            done += part.size;
            emit_progress(app, "download", done, total, &format!("{} 已存在", part.name));
            let _ = app.emit("server-log", format!("[cdn] {} 已存在(略過)", part.name));
            continue;
        }

        let _ = app.emit("server-log", format!("[cdn] 下載 {}", part.name));
        let url = format!("{base}/{}", part.name);
        let mut ok = false;
        let mut last = String::new();
        for attempt in 1..=3u32 {
            match download_one(app, &client, &url, &dest, &part.sha256, done, total, &part.name) {
                Ok(_) => {
                    ok = true;
                    break;
                }
                Err(e) => {
                    last = e;
                    let _ = app.emit("server-log", format!("[cdn] {} 第 {attempt}/3 次失敗: {last}", part.name));
                    if attempt < 3 {
                        std::thread::sleep(std::time::Duration::from_secs(2 * attempt as u64));
                    }
                }
            }
        }
        if !ok {
            return Err(format!(
                "{}：{last}（已重試 3 次。請在「下載來源」改選其他鏡像,或改用「匯入本地資源檔」）",
                part.name
            ));
        }
        done += part.size;
        let _ = app.emit("server-log", format!("[cdn] {} 校驗 OK", part.name));
    }

    // Extract: stream the parts straight into tar (no intermediate full tar on disk).
    let _ = app.emit("server-log", "[cdn] 解壓中…".to_string());
    let cdn_root = PathBuf::from(cdn_root);
    let part_paths: Vec<PathBuf> = manifest.parts.iter().map(|p| dl_dir.join(&p.name)).collect();
    let mut archive = tar::Archive::new(MultiFileReader::new(part_paths));
    let mut count: u64 = 0;
    for entry in archive.entries().map_err(|e| e.to_string())? {
        let mut e = entry.map_err(|er| er.to_string())?;
        e.unpack_in(&cdn_root).map_err(|er| er.to_string())?;
        count += 1;
        if count % 25 == 0 {
            // 706 是已知的條目總數，僅作進度估算。
            emit_progress(app, "extract", count, 706, "解壓中");
        }
    }
    emit_progress(app, "extract", count, count, "解壓完成");

    let _ = std::fs::remove_dir_all(&dl_dir);
    let _ = app.emit("server-log", format!("[cdn] 完成 ✓（{count} 個項目）"));
    let _ = app.emit("cdn-done", count);
    Ok(())
}

// ---------- APK patch / redirect (P2) ----------

// Dev path to the patcher script; P3 will bundle this as a Tauri resource.
const PATCH_SCRIPT: &str = "D:/starpoint-cn-launcher/tools/patch-apk.mjs";

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ApkProgress {
    current: u32,
    total: u32,
    label: String,
}

#[tauri::command]
fn pick_file(app: AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .add_filter("APK", &["apk"])
        .blocking_pick_file()
        .and_then(|fp| fp.into_path().ok())
        .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn patch_apk(app: AppHandle, apk_path: String) -> Result<(), String> {
    if apk_path.is_empty() {
        return Err("請先選擇原始 APK".to_string());
    }
    let apk = PathBuf::from(&apk_path);
    if !apk.exists() {
        return Err(format!("APK 不存在：{apk_path}"));
    }
    let cfg = get_config(app.clone());
    let out = apk
        .parent()
        .unwrap_or(Path::new("."))
        .join("wf-redirected.apk")
        .to_string_lossy()
        .to_string();
    let ks = launcher_config_path(&app)
        .parent()
        .map(|d| d.join("launcher.jks"))
        .unwrap_or_else(|| PathBuf::from("launcher.jks"))
        .to_string_lossy()
        .to_string();
    let host = cfg.host.clone();
    let port = cfg.port.clone();
    let script = patch_script(&app);

    std::thread::spawn(move || {
        let _ = app.emit(
            "server-log",
            format!("[apk] 開始打包：{apk_path} → {out}（{host}:{port}）"),
        );
        let _ = app.emit("server-log", format!("[apk] node={} | script={}", node_exe(&app), script));
        let mut cmd = Command::new(node_exe(&app));
        cmd.arg(&script)
            .arg(format!("--apk={apk_path}"))
            .arg(format!("--host={host}"))
            .arg(format!("--port={port}"))
            .arg(format!("--out={out}"))
            .arg(format!("--keystore={ks}"))
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x0800_0000);
        }
        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                let _ = app.emit("apk-error", format!("無法啟動 node：{e}"));
                return;
            }
        };
        let stdout = child.stdout.take().expect("stdout");
        let stderr = child.stderr.take().expect("stderr");
        {
            let a = app.clone();
            std::thread::spawn(move || {
                for l in BufReader::new(stderr).lines().map_while(Result::ok) {
                    let _ = a.emit("server-log", format!("[apk] {l}"));
                }
            });
        }
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            if let Some(rest) = line.strip_prefix("STEP ") {
                let mut it = rest.splitn(2, ' ');
                let frac = it.next().unwrap_or("");
                let label = it.next().unwrap_or("").to_string();
                let mut fp = frac.split('/');
                let current = fp.next().and_then(|s| s.parse().ok()).unwrap_or(0);
                let total = fp.next().and_then(|s| s.parse().ok()).unwrap_or(8);
                let _ = app.emit("apk-progress", ApkProgress { current, total, label });
            } else if let Some(p) = line.strip_prefix("DONE ") {
                let _ = app.emit("apk-done", p.to_string());
            } else if let Some(m) = line.strip_prefix("ERROR ") {
                let _ = app.emit("apk-error", m.to_string());
            }
            let _ = app.emit("server-log", format!("[apk] {line}"));
        }
        let _ = child.wait();
    });
    Ok(())
}

// ---------- misc helpers (P3 polish) ----------

// Pick any file (used for importing a save JSON).
#[tauri::command]
fn pick_file_any(app: AppHandle) -> Option<String> {
    app.dialog()
        .file()
        .blocking_pick_file()
        .and_then(|fp| fp.into_path().ok())
        .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

// Save text to a user-chosen path (used to export a player's save JSON).
#[tauri::command]
fn save_text_file(app: AppHandle, default_name: String, content: String) -> Result<bool, String> {
    match app
        .dialog()
        .file()
        .set_file_name(&default_name)
        .blocking_save_file()
        .and_then(|fp| fp.into_path().ok())
    {
        Some(p) => {
            std::fs::write(&p, content).map_err(|e| e.to_string())?;
            Ok(true)
        }
        None => Ok(false),
    }
}

// Pick multiple files (used for importing all CDN split parts at once).
#[tauri::command]
fn pick_files_any(app: AppHandle) -> Vec<String> {
    app.dialog()
        .file()
        .blocking_pick_files()
        .map(|v| {
            v.into_iter()
                .filter_map(|fp| fp.into_path().ok())
                .map(|p| p.to_string_lossy().to_string())
                .collect()
        })
        .unwrap_or_default()
}

// ---------- network helpers (P3 polish) ----------

// Detect the primary LAN IPv4 by opening a UDP socket toward a public IP (no traffic sent).
#[tauri::command]
fn local_ip() -> String {
    use std::net::UdpSocket;
    UdpSocket::bind("0.0.0.0:0")
        .and_then(|s| {
            s.connect("8.8.8.8:80")?;
            s.local_addr()
        })
        .map(|a| a.ip().to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string())
}

// True if the given host:port can be bound (i.e. the port is free).
#[tauri::command]
fn port_available(host: String, port: u16) -> bool {
    let h = if host.is_empty() { "0.0.0.0".to_string() } else { host };
    std::net::TcpListener::bind((h.as_str(), port)).is_ok()
}

// Import the CDN from a local archive (for users who can't reach GitHub).
// Accepts the single `cn-cdn.tar` or any one of the `cn-cdn.tar.part.NN` split parts
// (siblings are gathered + concatenated), and stream-extracts into <serverPath>/.cdn.
#[tauri::command]
fn cdn_import(app: AppHandle, archive_paths: Vec<String>) -> Result<(), String> {
    let cdn_root = cdn_dir(&app).to_string_lossy().to_string();
    std::thread::spawn(move || {
        if let Err(e) = run_cdn_import(&app, archive_paths, &cdn_root) {
            let _ = app.emit("server-log", format!("[cdn] 匯入失敗: {e}"));
            let _ = app.emit("cdn-error", e);
        }
    });
    Ok(())
}

fn run_cdn_import(app: &AppHandle, archive_paths: Vec<String>, cdn_root: &str) -> Result<(), String> {
    let _ = app.emit("server-log", format!("[cdn] 匯入本地資源（{} 個檔）", archive_paths.len()));
    let cdn_root = PathBuf::from(cdn_root);
    std::fs::create_dir_all(&cdn_root).map_err(|e| e.to_string())?;

    let parts: Vec<PathBuf> = if archive_paths.len() > 1 {
        // user multi-selected the parts → sort by name and concatenate
        let mut v: Vec<PathBuf> = archive_paths.iter().map(PathBuf::from).collect();
        v.sort();
        v
    } else {
        // single pick: if it's one split part, gather its siblings; else a single tar
        let picked = PathBuf::from(archive_paths.first().cloned().unwrap_or_default());
        let name = picked
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();
        if name.contains(".tar.part.") {
            let dir = picked.parent().unwrap_or(Path::new("."));
            let stem = format!("{}.part.", name.split(".part.").next().unwrap_or(""));
            let mut v: Vec<PathBuf> = std::fs::read_dir(dir)
                .map_err(|e| e.to_string())?
                .filter_map(|e| e.ok().map(|e| e.path()))
                .filter(|x| {
                    x.file_name()
                        .map(|n| n.to_string_lossy().starts_with(&stem))
                        .unwrap_or(false)
                })
                .collect();
            v.sort();
            v
        } else {
            vec![picked]
        }
    };
    if parts.is_empty() {
        return Err("找不到資源檔".to_string());
    }
    let _ = app.emit("server-log", format!("[cdn] 解壓 {} 個檔案", parts.len()));
    emit_progress(app, "extract", 0, 706, "解壓中");

    let mut archive = tar::Archive::new(MultiFileReader::new(parts));
    let mut count: u64 = 0;
    for entry in archive.entries().map_err(|e| e.to_string())? {
        let mut e = entry.map_err(|er| er.to_string())?;
        e.unpack_in(&cdn_root).map_err(|er| er.to_string())?;
        count += 1;
        if count % 25 == 0 {
            emit_progress(app, "extract", count, 706, "解壓中");
        }
    }
    emit_progress(app, "extract", count, count, "完成");
    let _ = app.emit("server-log", format!("[cdn] 匯入完成（{count} 個項目）"));
    let _ = app.emit("cdn-done", count);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState(Mutex::new(ServerState {
            pid: None,
            status: "stopped".to_string(),
        })))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            save_config,
            pick_dir,
            start_server,
            stop_server,
            server_state,
            api_request,
            cdn_status,
            cdn_download,
            cdn_import,
            cdn_clear,
            pick_file,
            patch_apk,
            local_ip,
            port_available,
            pick_file_any,
            pick_files_any,
            read_text_file,
            save_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
