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
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const index_1 = require("./index");
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    const template = (0, fs_1.readFileSync)(path_1.default.join(__dirname, index_1.staticPagesDir, "mail.html"), "utf-8");
    fastify.get("/mail", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const okMsg = request.query.ok || "";
        const errMsg = request.query.error || "";
        let html = template;
        if (okMsg) {
            html = html.replace('<p id="result" class="text-sm mt-2"></p>', `<p id="result" class="text-sm mt-2 text-green-600">${okMsg}</p>`);
        }
        else if (errMsg) {
            html = html.replace('<p id="result" class="text-sm mt-2"></p>', `<p id="result" class="text-sm mt-2 text-error">${errMsg}</p>`);
        }
        reply.header("content-type", "text/html; charset=utf-8");
        reply.status(200).send(html);
    }));
});
exports.default = routes;
