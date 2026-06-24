"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = void 0;
const _1 = __importDefault(require("."));
const db = (0, _1.default)(0 /* Database.WDFP_DATA */);
function getDb() { return db; }
exports.getDb = getDb;
