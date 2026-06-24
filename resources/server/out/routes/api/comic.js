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
const wdfpData_1 = require("../../data/wdfpData");
const utils_1 = require("../../utils");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const COMIC_DIR = path_1.default.join(__dirname, "..", "..", "..", "web", "public", "comic");
// Kind 1: 史黛拉的弹射世界讲座 (Stella's Classroom)
function parseKind1(filename) {
    const epMatch = filename.match(/第(\d+)课/);
    if (!epMatch)
        return null;
    const episode = parseInt(epMatch[1]);
    const titleMatch = filename.match(/今日课程：(.+?)？?\.jpg$/);
    const title = titleMatch ? titleMatch[1] : filename;
    return { episode, title };
}
// Kind 0: 弹射小世界 (Flipper World)
// Filenames: "第N话 {title}.jpg"
function parseKind0(filename) {
    const match = filename.match(/^第(\d+)话\s+(.+)\.jpg$/);
    if (!match)
        return null;
    return { episode: parseInt(match[1]), title: match[2] };
}
function getComicList(kind) {
    const dir = path_1.default.join(COMIC_DIR, String(kind));
    let files = [];
    try {
        files = (0, fs_1.readdirSync)(dir);
    }
    catch (_a) {
        return [];
    }
    const parser = kind === 1 ? parseKind1 : parseKind0;
    return files
        .filter(f => f.endsWith('.jpg'))
        .map(f => {
        const parsed = parser(f);
        return { episode: (parsed === null || parsed === void 0 ? void 0 : parsed.episode) || 0, title: (parsed === null || parsed === void 0 ? void 0 : parsed.title) || f, filename: f };
    })
        .sort((a, b) => b.episode - a.episode); // descending, newest first for getLatestComicData
}
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    // Serve comic image by kind + episode (avoids filename encoding issues)
    fastify.get("/image", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { kind, episode, size } = request.query;
        const k = parseInt(kind || "0");
        const ep = parseInt(episode || "0");
        if (!ep)
            return reply.status(400).send({ error: "Missing episode" });
        const dir = path_1.default.join(COMIC_DIR, String(k));
        let files = [];
        try {
            files = (0, fs_1.readdirSync)(dir);
        }
        catch (_a) {
            return reply.status(404).send({ error: "Not found" });
        }
        const parser = k === 1 ? parseKind1 : parseKind0;
        const match = files.find(f => {
            const p = parser(f);
            return (p === null || p === void 0 ? void 0 : p.episode) === ep;
        });
        if (!match)
            return reply.status(404).send({ error: "Not found" });
        // Use subdirectory for thumbnails/main
        let filePath;
        let contentType;
        if (size === 's') {
            filePath = path_1.default.join(dir, "thumbnail_s", match);
            contentType = "image/jpeg";
        }
        else if (size === 'l') {
            filePath = path_1.default.join(dir, "thumbnail_l", match);
            contentType = "image/jpeg";
        }
        else {
            // main: try PNG first, fallback to JPG
            const pngPath = path_1.default.join(dir, "main", match.replace(/\.jpg$/, '.png'));
            const jpgPath = path_1.default.join(dir, "main", match);
            if ((0, fs_1.existsSync)(pngPath)) {
                filePath = pngPath;
                contentType = "image/png";
            }
            else {
                filePath = jpgPath;
                contentType = "image/jpeg";
            }
        }
        if (!(0, fs_1.existsSync)(filePath))
            return reply.status(404).send({ error: "Not found" });
        reply.header("content-type", contentType);
        reply.header("cache-control", "public, max-age=86400");
        return reply.send((0, fs_1.readFileSync)(filePath));
    }));
    // Comic list (paginated, 9 per page)
    fastify.post("/get_list", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        var _b;
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid request body."
            });
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({
                error: "Bad Request",
                message: "Invalid viewer id."
            });
        const kind = body.kind || 0;
        const comics = getComicList(kind);
        const pageIndex = (_b = body.page_index) !== null && _b !== void 0 ? _b : 0;
        const perPage = 9;
        const start = pageIndex * perPage;
        const items = comics.slice(start, start + perPage);
        const base = `http://${request.headers.host || `127.0.0.1:${process.env.CN_LISTEN_PORT || "8001"}`}`;
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: {
                comic_list: items.map(c => ({
                    episode: c.episode,
                    title: c.title,
                    media_image: {
                        main: `${base}/api/index.php/comic/image?kind=${kind}&episode=${c.episode}`,
                        thumbnail_l: `${base}/api/index.php/comic/image?kind=${kind}&episode=${c.episode}&size=l`,
                        thumbnail_s: `${base}/api/index.php/comic/image?kind=${kind}&episode=${c.episode}&size=s`,
                    }
                })),
                current_page_index: pageIndex,
                total_count: comics.length,
            }
        });
    }));
});
exports.default = routes;
