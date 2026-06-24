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
    return {
        base_url: `${baseUrl}/${el}/`,
        files_list: `${baseUrl}/${el}/10939-android_medium.csv`,
        total_size: TOTAL_SIZE,
        delayed_assets_size: 0
    };
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
        const baseUrl = getCdnBase(request);
        const resVer = request.headers['res_ver'];
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
