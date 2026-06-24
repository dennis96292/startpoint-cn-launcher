"use strict";
/**
 * Seed Validator — 种子验证系统
 *
 * 池:
 *   confirmPool — play=0，rarity 正确
 *   playPool — play=1，rarity 正确
 *   verifiedPool — play=1 + rarity 已验证
 *   pendingPool — /crash 已知 r，待重测
 *
 * 选择优先级:
 *   natural: testSeed > playPool(10%/first) > verifiedPool > confirmPool > playFallback > pending > unknown
 *   play:    testSeed > playPool > playFallback > confirmPool > ...
 *   test:    testSeed > playPool > pendingPool > unknown
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeedValidator = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const ASSETS_DIR = (0, path_1.join)(__dirname, "..", "..", "assets");
const CONFIRMED_FILE = (0, path_1.join)(ASSETS_DIR, "confirmed_seeds.json");
const PURIFIED_FILE = (0, path_1.join)(ASSETS_DIR, "purified_seeds.json");
const VERIFIED_FILE = (0, path_1.join)(ASSETS_DIR, "verified_seeds.json");
const CONFIG_FILE = (0, path_1.join)(ASSETS_DIR, "pool_config.json");
const TEST_SEEDS_FILE = (0, path_1.join)(ASSETS_DIR, "test_seeds.json");
class MoviePool {
    constructor() {
        this.confirmPool = new Map();
        this.playPool = new Map();
        this.verifiedPool = new Map();
        this.pendingPool = new Map();
        this.sentSeeds = new Map();
        this.sentPlayFlags = new Map();
    }
}
// ============================================================================
// SeedValidator
// ============================================================================
class SeedValidator {
    constructor() {
        this.pools = new Map();
        this.testSeeds = [null, null, null];
        this.mode = 'natural';
        this.selectedMovieId = 'fes';
        this.load();
    }
    pool(m) { if (!this.pools.has(m))
        this.pools.set(m, new MoviePool()); return this.pools.get(m); }
    // ====== 持久化 ======
    load() {
        var _a;
        try {
            if ((0, fs_1.existsSync)(CONFIRMED_FILE)) {
                const o = JSON.parse((0, fs_1.readFileSync)(CONFIRMED_FILE, "utf-8"));
                for (const [mid, seeds] of Object.entries(o)) {
                    if (mid.endsWith("_play")) { /* skip */ }
                    else if (mid.endsWith("_pend")) {
                        const m = mid.replace("_pend", "");
                        for (const [s, r] of Object.entries(seeds))
                            this.pool(m).pendingPool.set(Number(s), r);
                    }
                    else {
                        const p = this.pool(mid);
                        if (Array.isArray(seeds)) {
                            for (const s of seeds) {
                                if (!p.playPool.has(Number(s)))
                                    p.confirmPool.set(Number(s), null);
                            }
                        }
                        else {
                            for (const [s, r] of Object.entries(seeds)) {
                                if (!p.playPool.has(Number(s)))
                                    p.confirmPool.set(Number(s), r);
                            }
                        }
                    }
                }
            }
        }
        catch (_) { }
        try {
            if ((0, fs_1.existsSync)(PURIFIED_FILE)) {
                const o = JSON.parse((0, fs_1.readFileSync)(PURIFIED_FILE, "utf-8"));
                for (const [mid, seeds] of Object.entries(o)) {
                    if (typeof seeds !== 'object' || seeds === null)
                        continue;
                    const p = this.pool(mid);
                    for (const [s, e] of Object.entries(seeds)) {
                        p.confirmPool.delete(Number(s));
                        p.playPool.set(Number(s), { r: (_a = e.r) !== null && _a !== void 0 ? _a : 0, tag: e.tag || '未测试', play: true });
                    }
                }
            }
        }
        catch (_) { }
        try {
            if ((0, fs_1.existsSync)(TEST_SEEDS_FILE)) {
                const a = JSON.parse((0, fs_1.readFileSync)(TEST_SEEDS_FILE, "utf-8"));
                if (Array.isArray(a)) {
                    this.testSeeds = [null, null, null];
                    for (let i = 0; i < 3; i++)
                        if (typeof a[i] === 'number')
                            this.testSeeds[i] = a[i];
                }
            }
        }
        catch (_) { }
        try {
            if ((0, fs_1.existsSync)(CONFIG_FILE)) {
                const c = JSON.parse((0, fs_1.readFileSync)(CONFIG_FILE, "utf-8"));
                if (c.selectedMovieId)
                    this.selectedMovieId = c.selectedMovieId;
            }
        }
        catch (_) { }
        try {
            if ((0, fs_1.existsSync)(VERIFIED_FILE)) {
                const o = JSON.parse((0, fs_1.readFileSync)(VERIFIED_FILE, "utf-8"));
                for (const [mid, seeds] of Object.entries(o)) {
                    const p = this.pool(mid);
                    for (const [s, r] of Object.entries(seeds)) {
                        p.verifiedPool.set(Number(s), r);
                    }
                }
            }
        }
        catch (_) { }
        // 去重：验证池是播放池+确认池的超集，移除重复条目
        for (const [, p] of this.pools) {
            for (const seed of p.verifiedPool.keys()) {
                if (p.playPool.has(seed))
                    p.playPool.delete(seed);
                if (p.confirmPool.has(seed))
                    p.confirmPool.delete(seed);
            }
        }
        this.mode = 'natural';
        let pl = 0, cf = 0, vf = 0;
        for (const m of this.pools.values()) {
            pl += m.playPool.size;
            cf += m.confirmPool.size;
            vf += m.verifiedPool.size;
        }
        console.log(`[SEED] Play:${pl} Confirm:${cf} Verified:${vf} Mode:${this.mode}`);
    }
    saveConfirm() { const o = {}; for (const [mid, p] of this.pools) {
        o[mid] = Object.fromEntries(p.confirmPool);
        o[mid + "_pend"] = Object.fromEntries(p.pendingPool);
    } (0, fs_1.writeFileSync)(CONFIRMED_FILE, JSON.stringify(o, null, 2), "utf-8"); }
    savePlay() { const o = {}; for (const [mid, p] of this.pools) {
        o[mid] = {};
        for (const [s, e] of p.playPool)
            o[mid][String(s)] = e;
    } (0, fs_1.writeFileSync)(PURIFIED_FILE, JSON.stringify(o, null, 2), "utf-8"); }
    saveVerified() { const o = {}; for (const [mid, p] of this.pools) {
        o[mid] = Object.fromEntries(p.verifiedPool);
    } (0, fs_1.writeFileSync)(VERIFIED_FILE, JSON.stringify(o, null, 2), "utf-8"); }
    saveConfig() { (0, fs_1.writeFileSync)(CONFIG_FILE, JSON.stringify({ selectedMovieId: this.selectedMovieId }, null, 2), "utf-8"); }
    saveTestSeeds() { (0, fs_1.writeFileSync)(TEST_SEEDS_FILE, JSON.stringify(this.testSeeds, null, 2), "utf-8"); }
    // ====== 共享工具 ======
    trace(msg) { console.log(`[SEED] ${msg}`); }
    /** _guarantee 池回退到基础池 */
    basePool(movieId) {
        const baseMovie = movieId.replace('_guarantee', '');
        return baseMovie !== movieId ? this.pool(baseMovie) : null;
    }
    /** 通用 base-pool fallback getter */
    poolGet(p, base, getter, fallback) {
        const v = getter(p);
        if (v === undefined && base) {
            const bv = getter(base);
            if (bv !== undefined)
                return bv;
        }
        return (v !== undefined ? v : fallback);
    }
    /** 播放池稀有度匹配 */
    isPlayMatch(s, p, ri) {
        const e = p.playPool.get(s);
        return !!(e && e.r === ri && e.tag !== '冷血躲避球');
    }
    /** 确认池稀有度匹配（同池，不跨池回退） */
    isConfirmMatch(ri, p, _base, s) {
        const r = p.confirmPool.get(s);
        const ok = r !== undefined && (r === null || r === ri);
        return ok;
    }
    /** 多池检查（种子在任何已知池中） */
    inAnyPool(p, s, base) {
        const has = p.confirmPool.has(s) || p.playPool.has(s) || p.verifiedPool.has(s) || p.pendingPool.has(s);
        if (base)
            return has || base.confirmPool.has(s) || base.playPool.has(s) || base.verifiedPool.has(s) || base.pendingPool.has(s);
        if (!has)
            console.log(`[DBG] inAnyPool seed=${s} NOT in any pool (confirm/pending/play/verified all empty)`);
        return has;
    }
    /** 种子被确认/播放后清理 sentSeeds */
    cleanupPending(seed, p) {
        p.sentSeeds.delete(seed);
        p.sentPlayFlags.delete(seed);
    }
    // ====== 种子状态变更 ======
    confirm(movieId, seed, r) {
        const p = this.pool(movieId);
        this.cleanupPending(seed, p);
        if (p.playPool.has(seed))
            return;
        if (p.confirmPool.has(seed)) {
            if (r !== undefined && r !== null) {
                p.confirmPool.set(seed, r);
                this.saveConfirm();
            }
            return;
        }
        p.pendingPool.delete(seed);
        p.confirmPool.set(seed, r !== undefined ? r : null);
        if (r !== undefined)
            console.log(`[TRACE] confirm seed=${seed} r=${'★' + (r + 3)} confirmPool.size=${p.confirmPool.size}`);
        this.saveConfirm();
    }
    addPlay(movieId, seed, r, didPlay) {
        const p = this.pool(movieId);
        this.cleanupPending(seed, p);
        if (didPlay === true) {
            p.confirmPool.delete(seed);
            p.pendingPool.delete(seed);
            p.playPool.set(seed, { r, tag: '未测试', play: true });
            console.log(`[TRACE] addPlay seed=${seed} r=${'★' + (r + 3)} play=true playPool.size=${p.playPool.size}`);
            this.savePlay();
            this.saveConfirm();
            console.log(`[SEED] PLAY [${movieId}] seed=${seed} ★${r + 3} play=1`);
        }
        else if (didPlay === false) {
            this.confirm(movieId, seed, r);
        }
        else {
            this.addPending(movieId, seed, r);
        }
    }
    /** 稀有度经 C3032 客户端校验后移入验证池，同时跨池去重 */
    moveToVerified(movieId, seed, r) {
        const p = this.pool(movieId);
        this.cleanupPending(seed, p);
        p.verifiedPool.set(seed, r);
        p.pendingPool.delete(seed);
        p.confirmPool.delete(seed);
        if (p.playPool.has(seed)) {
            p.playPool.delete(seed);
            this.savePlay();
        }
        // 跨池清理：种子已验证，base/guarantee 池中的确认/播放旧条目不再可靠
        const other = this.basePool(movieId) || (movieId.endsWith('_guarantee') ? null : this.pool(movieId + '_guarantee'));
        if (other) {
            if (other.confirmPool.has(seed))
                other.confirmPool.delete(seed);
            if (other.playPool.has(seed)) {
                other.playPool.delete(seed);
                this.savePlay();
            }
        }
        this.saveVerified();
        console.log(`[SEED] VERIFY [${movieId}] seed=${seed} ★${r + 3} (rarity verified by C3032)`);
    }
    addPending(movieId, seed, r) {
        const p = this.pool(movieId);
        const e = p.playPool.get(seed);
        if (e) {
            this.cleanupPending(seed, p);
            e.r = r !== null ? r : e.r;
            this.savePlay();
            return;
        }
        if (r !== null) {
            this.confirm(movieId, seed, r);
            return;
        }
        this.cleanupPending(seed, p);
        this.saveConfirm();
    }
    markSent(movieId, seed, rarity) {
        const p = this.pool(movieId);
        const r = rarity !== undefined ? rarity - 3 : null;
        p.sentSeeds.set(seed, r);
        // 同时阻塞 base pool，防止同一种子在 base/guarantee 池被重复选取
        const base = this.basePool(movieId);
        if (base)
            base.sentSeeds.set(seed, r);
        console.log(`[SEED] SENT [${movieId}] seed=${seed} r=${r !== null ? '★' + (r + 3) : 'null'}  [DBG] sentSeeds.size=${p.sentSeeds.size}`);
    }
    getSentR(movieId, seed) {
        return this.pool(movieId).sentSeeds.get(seed);
    }
    /** 记录客户端返回的 play=1/0，供 flushAll 使用 */
    recordPlay(movieId, seed, didPlay) {
        this.pool(movieId).sentPlayFlags.set(seed, didPlay);
    }
    /** 清理 sentSeeds：有 play 标记的按标记入池，无标记的入 pendingPool 重测 */
    flushAll() {
        for (const [movieId, p] of this.pools) {
            let flushed = 0, play1 = 0, play0 = 0, unmarked = 0;
            for (const [seed, r] of p.sentSeeds) {
                const didPlay = p.sentPlayFlags.get(seed);
                if (didPlay === true) {
                    this.addPlay(movieId, seed, r !== null && r !== void 0 ? r : 0, true);
                    this.moveToVerified(movieId, seed, r !== null && r !== void 0 ? r : 0);
                    play1++;
                }
                else if (didPlay === false) {
                    this.confirm(movieId, seed, r);
                    play0++;
                }
                else {
                    // 完全丢失：pendingPool 下次重测
                    this.addPending(movieId, seed, r);
                    unmarked++;
                }
                flushed++;
            }
            if (flushed > 0)
                console.log(`[SEED] flushAll [${movieId}] flushed ${flushed} stale seeds  [DBG] play=1:${play1} play=0:${play0} unmarked:${unmarked}`);
        }
    }
    // Tag / testSeed / mode — unchanged
    setTag(movieId, seed, tag) {
        const e = this.pool(movieId).playPool.get(seed);
        if (!e)
            return false;
        e.tag = tag;
        if (tag === '冷血躲避球')
            this.clearTestSeed(e.r);
        this.savePlay();
        return true;
    }
    setTestSeed(_movieId, rarity, seed) {
        const r = rarity - 3;
        this.testSeeds[r] = seed;
        this.saveTestSeeds();
        return true;
    }
    clearTestSeed(rarity) {
        const r = rarity - 3;
        if (this.testSeeds[r] === null)
            return false;
        this.testSeeds[r] = null;
        this.saveTestSeeds();
        return true;
    }
    getMode() { return this.mode; }
    getSelectedMovieId() { return this.selectedMovieId; }
    setMode(m) { this.mode = m; }
    setSelectedMovieId(id) { this.selectedMovieId = id; this.saveConfig(); }
    getMovieIds() { return Array.from(this.pools.keys()); }
    // ====== 种子选取 ======
    getSeed(movieId, rarity, pool, characterId, drawIndex) {
        const ri = rarity - 3;
        if (this.testSeeds[ri] !== null) {
            console.log(`[DBG] getSeed mode=${this.mode} ★${rarity} ${movieId} di=${drawIndex} → testSeed=${this.testSeeds[ri]}`);
            return this.testSeeds[ri];
        } // ①
        const p = this.pool(movieId);
        const base = this.basePool(movieId);
        const avail = pool.filter(s => !p.sentSeeds.has(s));
        const rand = (arr) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : undefined;
        if (avail.length < pool.length)
            this.trace(`★${rarity} avail: ${avail.length}/${pool.length} (sentSeeds blocked ${pool.length - avail.length})`);
        // Natural mode: log verifiedPool match count
        if (this.mode === 'play') {
            const pur = rand(avail.filter(s => this.isPlayMatch(s, p, ri)));
            if (pur !== undefined)
                return pur;
        }
        // ④ 测试模式
        if (this.mode === 'test') {
            // 1. 播放池种子（play=1 已确认，稀有度待 C3032 校验），排除已入验证池的（含 base pool）
            const pur = rand(avail.filter(s => this.isPlayMatch(s, p, ri) && !this.poolGet(p, base, mp => mp.verifiedPool.has(s), false)));
            if (pur !== undefined)
                return pur;
            // 2. pendingPool（/crash 已知 r，待重测 play）
            const pend = rand(avail.filter(s => this.poolGet(p, base, mp => mp.pendingPool.get(s), undefined) !== undefined));
            if (pend !== undefined)
                return pend;
            // 3. unknown（不在任何池的未测试种子）
            const unk = rand(avail.filter(s => !this.inAnyPool(p, s, base)));
            if (unk !== undefined) {
                console.log(`[DBG] getSeed mode=${this.mode} ★${rarity} ${movieId} → unknown=${unk}`);
                return unk;
            }
            const fb = characterId * 1000;
            console.log(`[DBG] getSeed mode=${this.mode} ★${rarity} ${movieId} → fallback=${fb}`);
            return fb;
        }
        // ⑤ 自然模式
        if (this.mode === 'natural') {
            const isFirst = drawIndex !== undefined && drawIndex === 0;
            const verList = avail.filter(s => p.verifiedPool.has(s) && p.verifiedPool.get(s) === ri);
            if (isFirst) {
                const ver = rand(verList);
                if (ver !== undefined) {
                    console.log(`[DBG] getSeed ★${rarity} ri=${ri} → natural:verified=★${p.verifiedPool.get(ver) + 3}`);
                    return ver;
                }
            }
            const ver = rand(verList);
            if (ver !== undefined && Math.random() < 0.10) {
                console.log(`[DBG] getSeed ★${rarity} ri=${ri} → natural:verified=★${p.verifiedPool.get(ver) + 3}`);
                return ver;
            }
            if (verList.length > 0)
                console.log(`[DBG] getSeed ★${rarity} ri=${ri} verifiedPool matches=${verList.length} (none picked this time)`);
        }
        // ⑥ 兜底链
        const confList = avail.filter(s => this.isConfirmMatch(ri, p, base, s));
        const conf = rand(confList);
        if (conf !== undefined) {
            const cr = p.confirmPool.get(conf);
            console.log(`[DBG] getSeed ★${rarity} ri=${ri} mode=${this.mode} → confirm=${conf} r=${cr !== undefined && cr !== null ? '★' + (cr + 3) : 'null'} (${confList.length} matches)`);
            return conf;
        }
        const pend = rand(avail.filter(s => this.poolGet(p, base, mp => mp.pendingPool.get(s), undefined) !== undefined));
        if (pend !== undefined) {
            console.log(`[DBG] getSeed ★${rarity} → pending=${pend}`);
            return pend;
        }
        const unk = rand(avail.filter(s => !this.inAnyPool(p, s, base)));
        if (unk !== undefined) {
            console.log(`[DBG] getSeed ★${rarity} mode=${this.mode} → unknown=${unk}`);
            return unk;
        }
        const fb = characterId * 1000;
        console.log(`[DBG] getSeed ★${rarity} mode=${this.mode} → fallback=${fb} charId=${characterId}`);
        return fb;
    }
    getPlayForRarity(movieId, rarity) {
        const ri = rarity - 3;
        return Array.from(this.pool(movieId).playPool.entries())
            .filter(([, e]) => e.r === ri && e.tag !== '冷血躲避球')
            .map(([s]) => s);
    }
    stats(movieId) {
        const mid = movieId || this.selectedMovieId || 'fes';
        const p = this.pool(mid);
        let allPlay = { r3: 0, r4: 0, r5: 0, total: 0 };
        let allConfirm = 0, allPending = 0, allVerified = 0;
        for (const [, pool] of this.pools) {
            for (const [, e] of pool.playPool) {
                if (e.r === 0)
                    allPlay.r3++;
                else if (e.r === 1)
                    allPlay.r4++;
                else {
                    allPlay.r5++;
                }
                allPlay.total++;
            }
            allConfirm += pool.confirmPool.size;
            allPending += pool.pendingPool.size;
            allVerified += pool.verifiedPool.size;
        }
        return {
            confirm: p.confirmPool.size, confirm_total: allConfirm,
            play_r3: allPlay.r3, play_r4: allPlay.r4, play_r5: allPlay.r5, play_total: allPlay.total,
            mov_play: p.playPool.size,
            verified: p.verifiedPool.size, verified_total: allVerified,
            pending: p.pendingPool.size, pending_total: allPending,
            test_seeds: this.testSeeds,
            mode: this.mode, selectedMovieId: this.selectedMovieId, movieIds: Array.from(this.pools.keys()),
        };
        return {
            confirm: p.confirmPool.size, confirm_total: allConfirm,
            play_r3: allPlay.r3, play_r4: allPlay.r4, play_r5: allPlay.r5, play_total: allPlay.total,
            mov_play: p.playPool.size,
            pending: p.pendingPool.size, pending_total: allPending,
            test_seeds: this.testSeeds,
            mode: this.mode, selectedMovieId: this.selectedMovieId, movieIds: Array.from(this.pools.keys()),
        };
    }
    getPlayList(movieId) {
        return Array.from(this.pool(movieId).playPool.entries()).map(([s, e]) => ({ seed: s, rarity: e.r + 3, tag: e.tag, play: e.play }));
    }
    getVerifiedList(movieId) {
        return Array.from(this.pool(movieId).verifiedPool.entries())
            .map(([s, r]) => ({ seed: s, rarity: r + 3 }));
    }
}
exports.SeedValidator = SeedValidator;
const validator = new SeedValidator();
exports.default = validator;
