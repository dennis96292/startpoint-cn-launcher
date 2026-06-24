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
const seed_validator_1 = __importDefault(require("../../lib/seed-validator"));
const fs_1 = require("fs");
const path_1 = require("path");
const ASSETS_DIR = (0, path_1.join)(__dirname, "..", "..", "..", "assets");
function countAllSeeds() {
    let total = 0;
    try {
        const files = (0, fs_1.readdirSync)(ASSETS_DIR).filter(f => f.startsWith("gacha_movie_seeds_") && f.endsWith(".json"));
        for (const f of files) {
            try {
                const data = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(ASSETS_DIR, f), "utf-8"));
                for (const key of Object.keys(data)) {
                    const t = data[key];
                    for (const mt of Object.keys(t))
                        total += t[mt].length;
                }
            }
            catch (_) { }
        }
    }
    catch (_) { }
    return total > 0 ? total : 19941;
}
function countMovieSeeds(movieId) {
    const f = `gacha_movie_seeds_${movieId}.json`;
    try {
        const data = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(ASSETS_DIR, f), "utf-8"));
        let total = 0;
        for (const key of Object.keys(data)) {
            const t = data[key];
            for (const mt of Object.keys(t))
                total += t[mt].length;
        }
        return total;
    }
    catch (_) {
        return 0;
    }
}
const routes = (fastify) => __awaiter(void 0, void 0, void 0, function* () {
    fastify.get("/stats", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const mid = request.query.movieId || seed_validator_1.default.getSelectedMovieId();
        const s = seed_validator_1.default.stats(mid);
        const totalSeeds = countAllSeeds();
        const movieTotal = mid ? countMovieSeeds(mid) : 0;
        const known = s.confirm_total + s.play_total + (s.verified_total || 0);
        const perMovieKnown = (s.confirm || 0) + (s.mov_play || 0) + (s.verified || 0);
        reply.status(200).send({
            movieId: mid,
            unknown: mid ? Math.max(0, movieTotal - perMovieKnown) : totalSeeds - known,
            movie_total: movieTotal,
            confirm: s.confirm, confirm_total: s.confirm_total,
            play_r3: s.play_r3, play_r4: s.play_r4, play_r5: s.play_r5, play_total: s.play_total,
            mov_play: s.mov_play,
            verified: s.verified || 0, verified_total: s.verified_total || 0,
            pending: s.pending || 0, pending_total: s.pending_total || 0,
            test_seeds: s.test_seeds,
            mode: s.mode,
            selectedMovieId: s.selectedMovieId, movieIds: s.movieIds,
            total: totalSeeds,
            tested: known, coverage: totalSeeds > 0 ? Math.round(known / totalSeeds * 100) : 0,
        });
    }));
    fastify.get("/list", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const mid = request.query.movieId || seed_validator_1.default.getSelectedMovieId() || 'fes';
        reply.status(200).send({
            play: seed_validator_1.default.getPlayList(mid),
            verified: seed_validator_1.default.getVerifiedList(mid),
            movieId: mid
        });
    }));
    fastify.post("/mode", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { mode, selectedMovieId } = request.body;
        if (mode && ['natural', 'play', 'test'].includes(mode))
            seed_validator_1.default.setMode(mode);
        if (selectedMovieId)
            seed_validator_1.default.setSelectedMovieId(selectedMovieId);
        reply.status(200).send({ mode: seed_validator_1.default.getMode(), selectedMovieId: seed_validator_1.default.getSelectedMovieId() });
    }));
    fastify.post("/tag", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { seed, tag, movieId } = request.body;
        if (typeof seed !== "number" || !['未测试', '热血躲避球', '普通躲避球', '冷血躲避球'].includes(tag))
            return reply.status(400).send({ error: "Invalid" });
        const mid = movieId || seed_validator_1.default.getSelectedMovieId() || 'fes';
        reply.status(200).send({ seed, tag, ok: seed_validator_1.default.setTag(mid, seed, tag) });
    }));
    fastify.post("/test-seed", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const { seed, rarity } = request.body;
        const mid = seed_validator_1.default.getSelectedMovieId() || 'fes';
        if (typeof seed !== "number" || ![3, 4, 5].includes(rarity))
            return reply.status(400).send({ error: "Invalid" });
        reply.status(200).send({ ok: seed_validator_1.default.setTestSeed(mid, rarity, seed) });
    }));
    fastify.delete("/test-seed", (request, reply) => __awaiter(void 0, void 0, void 0, function* () {
        const rarity = Number(request.query.rarity);
        const mid = seed_validator_1.default.getSelectedMovieId() || 'fes';
        if (![3, 4, 5].includes(rarity))
            return reply.status(400).send({ error: "Invalid" });
        reply.status(200).send({ ok: seed_validator_1.default.clearTestSeed(rarity) });
    }));
});
exports.default = routes;
