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
function loadNews() {
    try {
        const raw = (0, fs_1.readFileSync)(path_1.default.join(__dirname, "..", "..", "..", "assets", "news.json"), "utf-8");
        const items = JSON.parse(raw);
        // Ensure all required fields exist
        return items.map((n) => ({
            id: n.id,
            title: n.title || "",
            date: n.date || new Date().toISOString().replace("T", " ").substring(0, 19),
            label: n.label || 1,
            thumbnail: n.thumbnail || 1,
            thumbnail_path: n.thumbnail_path || null,
            added_time: n.added_time || null,
            html: n.html || "",
        }));
    }
    catch (_a) {
        return [];
    }
}
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    // News list (paginated by page_index, category)
    fastify.post("/index", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
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
        const allNews = loadNews();
        const page = body.page_index || body.current_page || 1;
        const perPage = 20;
        const start = (page - 1) * perPage;
        const items = allNews.slice(start, start + perPage);
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: {
                current_page: page,
                news: items.map(n => ({
                    id: n.id,
                    title: n.title,
                    date: n.date,
                    html: n.html,
                    label: n.label,
                    thumbnail: n.thumbnail,
                    thumbnail_path: n.thumbnail_path,
                    added_time: n.added_time,
                })),
                news_count: allNews.length,
            }
        });
    }));
    // Single news detail
    fastify.post("/get_info", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
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
        const allNews = loadNews();
        const news = allNews.find(n => n.id === body.news_id);
        if (!news)
            return reply.status(400).send({
                error: "Bad Request",
                message: `News with id '${body.news_id}' not found.`
            });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: {
                id: news.id,
                title: news.title,
                date: news.date,
                html: news.html,
                label: news.label,
                thumbnail: news.thumbnail,
                thumbnail_path: news.thumbnail_path,
                added_time: news.added_time,
            }
        });
    }));
    // System news index (same format, different endpoint)
    fastify.post("/system_index", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({ error: "Bad Request", message: "Invalid request body." });
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({ error: "Bad Request", message: "Invalid viewer id." });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: { current_page: 1, news: [], news_count: 0 }
        });
    }));
    // System news detail (same format, different endpoint)
    fastify.post("/get_system_info", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({ error: "Bad Request", message: "Invalid request body." });
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({ error: "Bad Request", message: "Invalid viewer id." });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: {}
        });
    }));
    // Latest forced news popup — return empty (no forced popup)
    fastify.post("/latest_forced", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({ error: "Bad Request", message: "Invalid request body." });
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({ error: "Bad Request", message: "Invalid viewer id." });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: {}
        });
    }));
    // System forced news — return empty
    fastify.post("/latest_forced_system", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const body = request.body;
        const viewerId = body.viewer_id;
        if (!viewerId || isNaN(viewerId))
            return reply.status(400).send({ error: "Bad Request", message: "Invalid request body." });
        const session = yield (0, wdfpData_1.getSession)(viewerId.toString());
        if (!session)
            return reply.status(400).send({ error: "Bad Request", message: "Invalid viewer id." });
        reply.header("content-type", "application/x-msgpack");
        return reply.status(200).send({
            data_headers: (0, utils_1.generateDataHeaders)({ viewer_id: viewerId }),
            data: {}
        });
    }));
});
exports.default = routes;
