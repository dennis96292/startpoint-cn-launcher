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
const player_1 = __importDefault(require("./player"));
const server_1 = __importDefault(require("./server"));
const mail_1 = __importDefault(require("./mail"));
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.register(require('@fastify/multipart'), {
        limits: {
            fieldNameSize: 100, // Max field name size in bytes
            fieldSize: 100, // Max field value size in bytes
            fields: 10, // Max number of non-file fields
            fileSize: 5000000, // For multipart forms, the max file size in bytes
            files: 1, // Max number of file fields
            headerPairs: 2000, // Max number of header key=>value pairs
            parts: 1000 // For multipart forms, the max number of parts (fields + files)
        }
    });
    fastify.register(player_1.default, { prefix: "/player" });
    fastify.register(server_1.default, { prefix: "/server" });
    fastify.register(mail_1.default, { prefix: "/mail" });
});
exports.default = routes;
