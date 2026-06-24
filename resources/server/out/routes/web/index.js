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
exports.staticPagesDir = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const player_1 = __importDefault(require("./player"));
const mail_1 = __importDefault(require("./mail"));
const utils_1 = require("../../utils");
exports.staticPagesDir = "../../../web/pages";
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.get("/", (_, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const currentServerTime = (0, utils_1.getServerDate)().toISOString().replace(/\.\d\d\dZ/, "");
        let html = (0, fs_1.readFileSync)(path_1.default.join(__dirname, exports.staticPagesDir, "index.html")).toString("utf-8");
        html = html.replace("{{currentServerTime}}", currentServerTime);
        reply.header("content-type", "text/html; charset=utf-8");
        reply.send(html);
    }));
    fastify.get("/seeds", (_, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const html = (0, fs_1.readFileSync)(path_1.default.join(__dirname, exports.staticPagesDir, "seeds.html")).toString("utf-8");
        reply.header("content-type", "text/html; charset=utf-8");
        reply.send(html);
    }));
    fastify.register(player_1.default, { prefix: "/player" });
    fastify.register(mail_1.default);
});
exports.default = routes;
