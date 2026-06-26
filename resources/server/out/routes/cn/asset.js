"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENTITY_LISTS_DIR = exports.CDN_TOTAL_SIZE = void 0;
const utils_1 = require("../../utils");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const CN_PORT = process.env.CN_LISTEN_PORT || "8001";
const CDN_BASE = process.env.CDN_BASE_URL;
/** Get CDN base URL from request Host header, fall back to CDN_BASE_URL env or default. */
function getCdnBase(request) {
    if (CDN_BASE)
        return CDN_BASE;
    const host = request.headers.host || `localhost:${CN_PORT}`;
    return `http://${host}/patch/cn`;
}
/** Detect CDN path-list dir name: `EntityLists` (cn_cdn) or `entities` (cn_cdn_new). */
function entityListsDirName() {
    if ((0, fs_1.existsSync)(path_1.default.join(cdnDir, "EntityLists")))
        return "EntityLists";
    if ((0, fs_1.existsSync)(path_1.default.join(cdnDir, "entities")))
        return "entities";
    return "EntityLists";
}
function getVersionInfo(baseUrl) {
    const el = entityListsDirName();
    // files_list -> empty.csv: skip the client's AssetSufficiencyChecking (upstream known-issues.md).
    // The 1.8.1 APK references assets newer than the 1.4.54 CDN (waterdragon_kunfu/谢胧, character_level_up_effect,
    // etc.). With the real manifest, the client preloads/verifies and hits those missing assets -> C8100
    // notify_asset_recovery crash. The full CDN is already downloaded via get_path (phase 1, with real sha256),
    // so the per-file sufficiency check (phase 2) is redundant; pointing it at an empty list makes
    // isAssetComplete() return true -> recovery never triggers -> missing newer assets render blank instead of crashing.
    ensureEmptyCsv(el);
    return {
        base_url: `${baseUrl}/${el}/`,
        files_list: `${baseUrl}/${el}/empty.csv`,
        total_size: TOTAL_SIZE,
        delayed_assets_size: 0
    };
}
// Ensure an empty.csv exists in the entity-lists dir so the static /patch route can serve it (HTTP 200, 0 rows).
let emptyCsvEnsured = false;
function ensureEmptyCsv(el) {
    if (emptyCsvEnsured)
        return;
    try {
        const p = path_1.default.join(cdnDir, el, "empty.csv");
        if (!(0, fs_1.existsSync)(p))
            (0, fs_1.writeFileSync)(p, "");
        emptyCsvEnsured = true;
    }
    catch (e) {
        console.error("[CDN] ensureEmptyCsv failed:", e.message);
    }
}
function buildArchiveList(baseUrl, cdnDir, subdir) {
    const dir = path_1.default.join(cdnDir, subdir);
    try {
        return (0, fs_1.readdirSync)(dir)
            .filter(f => f.endsWith(".zip"))
            .map(f => {
            const stats = (0, fs_1.statSync)(path_1.default.join(dir, f));
            return {
                location: `${baseUrl}/${subdir}/${f}`,
                size: stats.size,
                sha256: ""
            };
        });
    }
    catch (e) {
        console.error(`[CDN] buildArchiveList failed for ${subdir}:`, e.message);
        return [];
    }
}
function parseVersion(v) {
    return v.split(".").map(Number);
}
function compareVersion(a, b) {
    const av = parseVersion(a), bv = parseVersion(b);
    for (let i = 0; i < 3; i++) {
        if (av[i] !== bv[i])
            return av[i] - bv[i];
    }
    return 0;
}
function buildDiffList(baseUrl, cdnDir) {
    const groups = new Map();
    for (const subdir of ["archive-common-diff", "archive-medium-diff", "archive-android-diff"]) {
        const dir = path_1.default.join(cdnDir, subdir);
        try {
            for (const f of (0, fs_1.readdirSync)(dir).filter(f => f.endsWith(".zip"))) {
                const match = f.match(/pinball-(\d+\.\d+\.\d+)-(\d+\.\d+\.\d+)-\d+-/);
                if (match) {
                    const from = match[1];
                    const to = match[2];
                    const stats = (0, fs_1.statSync)(path_1.default.join(dir, f));
                    if (!groups.has(to))
                        groups.set(to, { original_version: from, archive: [] });
                    groups.get(to).archive.push({ location: `${baseUrl}/${subdir}/${f}`, size: stats.size, sha256: "" });
                }
            }
        }
        catch (e) {
            console.error(`[CDN] buildDiffList failed for ${subdir}:`, e.message);
        }
    }
    return [...groups.entries()]
        .sort(([a], [b]) => compareVersion(a, b))
        .map(([version, data]) => ({ original_version: data.original_version, version, archive: data.archive }));
}
const envCdnDir = process.env.CDN_DIR || ".cdn";
const cdnDir = path_1.default.isAbsolute(envCdnDir) ? path_1.default.join(envCdnDir, "cn") : path_1.default.join(__dirname, "..", "..", "..", envCdnDir, "cn");
// 启动时扫描一次，动态计算总大小
const TOTAL_SIZE = (() => {
    let total = 0;
    for (const subdir of ["archive-common-full", "archive-medium-full", "archive-android-full", "archive-common-diff", "archive-medium-diff", "archive-android-diff"]) {
        try {
            for (const f of (0, fs_1.readdirSync)(path_1.default.join(cdnDir, subdir)).filter(f => f.endsWith(".zip")))
                total += (0, fs_1.statSync)(path_1.default.join(cdnDir, subdir, f)).size;
        }
        catch (e) {
            console.error(`[CDN] TOTAL_SIZE failed for ${subdir}:`, e.message);
        }
    }
    return total;
})();
// The CDN ships its own `path` manifest (.cdn/cn/path) listing every full/diff archive with the
// REAL sha256 + size. The original server fed those hashes to the client so it could verify each
// downloaded archive and re-fetch any that were corrupt/truncated (e.g. a stream that dropped
// mid-download). Our old get_path re-scanned the dir with sha256:"" → no integrity check → a
// half-downloaded archive was silently accepted, leaving assets missing → C8100 asset_recovery
// crash. Read the manifest and pass its hashes through (rewriting leiting URLs → our local host).
let cachedPathManifest = undefined;
function loadPathManifest() {
    if (cachedPathManifest !== undefined)
        return cachedPathManifest;
    try {
        const raw = (0, fs_1.readFileSync)(path_1.default.join(cdnDir, "path"), "utf8");
        const m = JSON.parse(raw);
        cachedPathManifest = (m && m.full && Array.isArray(m.full.archive)) ? m : null;
    }
    catch (_a) {
        cachedPathManifest = null;
    }
    return cachedPathManifest;
}
// Rewrite an archive URL from the leiting CDN host to our local /patch/cn host, keeping the
// `<subdir>/<file>` tail intact (e.g. archive-common-full/pinball-1.4.0-72-....zip).
function rewriteArchiveLocation(loc, baseUrl) {
    const marker = "/upload_assets/";
    const i = loc.indexOf(marker);
    return i >= 0 ? `${baseUrl}/${loc.slice(i + marker.length)}` : loc;
}
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.post("/version_info", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const baseUrl = getCdnBase(request);
        reply.header("content-type", "application/x-msgpack");
        reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)(),
            data: getVersionInfo(baseUrl)
        });
    }));
    fastify.post("/get_path", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        const baseUrl = getCdnBase(request);
        const resVer = request.headers['res_ver'];
        // Preferred path: serve the CDN's own manifest with its REAL sha256 (enables client-side
        // integrity verification + auto re-download of any corrupt/truncated archive).
        const manifest = loadPathManifest();
        if (manifest) {
            const mapArchive = (a) => {
                var _a;
                return ({
                    location: rewriteArchiveLocation(a.location, baseUrl),
                    size: a.size,
                    sha256: (_a = a.sha256) !== null && _a !== void 0 ? _a : ""
                });
            };
            const full = {
                version: (_a = manifest.full.version) !== null && _a !== void 0 ? _a : "1.4.0",
                archive: ((_b = manifest.full.archive) !== null && _b !== void 0 ? _b : []).map(mapArchive)
            };
            const diff = (Array.isArray(manifest.diff) ? manifest.diff : []).map((d) => {
                var _a;
                return ({
                    original_version: d.original_version,
                    version: d.version,
                    archive: ((_a = d.archive) !== null && _a !== void 0 ? _a : []).map(mapArchive)
                });
            });
            const targetVer = resVer !== null && resVer !== void 0 ? resVer : (diff.length > 0 ? diff[diff.length - 1].version : full.version);
            reply.header("content-type", "application/x-msgpack");
            return reply.status(200).send({
                data_headers: (0, utils_1.generateDataHeaders)({ asset_update: true }),
                data: {
                    info: {
                        client_asset_version: resVer !== null && resVer !== void 0 ? resVer : "",
                        target_asset_version: targetVer,
                        eventual_target_asset_version: targetVer,
                        is_initial: true,
                        latest_maj_first_version: (_d = (_c = manifest.info) === null || _c === void 0 ? void 0 : _c.latest_maj_first_version) !== null && _d !== void 0 ? _d : "1.4.0"
                    },
                    full,
                    diff,
                    asset_version_hash: (_e = manifest.asset_version_hash) !== null && _e !== void 0 ? _e : ""
                }
            });
        }
        // Fallback (no manifest): scan dirs, sha256 unavailable.
        const fullArchives = [
            ...buildArchiveList(baseUrl, cdnDir, "archive-common-full"),
            ...buildArchiveList(baseUrl, cdnDir, "archive-medium-full"),
            ...buildArchiveList(baseUrl, cdnDir, "archive-android-full"),
        ];
        const diffArchives = buildDiffList(baseUrl, cdnDir);
        const highestDiff = diffArchives.length > 0
            ? diffArchives[diffArchives.length - 1].version
            : "1.4.0";
        const targetVer = resVer !== null && resVer !== void 0 ? resVer : highestDiff;
        reply.header("content-type", "application/x-msgpack");
        reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ asset_update: true }),
            data: {
                info: {
                    client_asset_version: resVer !== null && resVer !== void 0 ? resVer : "",
                    target_asset_version: targetVer,
                    eventual_target_asset_version: targetVer,
                    is_initial: true,
                    latest_maj_first_version: "1.4.0"
                },
                full: {
                    version: "1.4.0",
                    archive: fullArchives
                },
                diff: diffArchives,
                asset_version_hash: ""
            }
        });
    }));
});
exports.default = routes;
exports.CDN_TOTAL_SIZE = TOTAL_SIZE;
exports.ENTITY_LISTS_DIR = entityListsDirName();
