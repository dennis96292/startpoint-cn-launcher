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
const unzipper_1 = require("unzipper");
const path_1 = __importDefault(require("path"));
const cli_progress_1 = __importDefault(require("cli-progress"));
const concurrency = 8;
const validCDNFolders = {
    "en": true,
    "ko": true,
    "th": true
};
const tempDir = path_1.default.join(__dirname, "..", ".unzip-temp");
if (!(0, fs_1.existsSync)(tempDir)) {
    (0, fs_1.mkdirSync)(tempDir);
}
const cdn_dir = process.env.CDN_DIR || ".cdn";
const output_dir = path_1.default.isAbsolute(cdn_dir) ? cdn_dir : path_1.default.join(__dirname, "..", cdn_dir);
if (!(0, fs_1.existsSync)(output_dir)) {
    throw new Error(`CDN does not exist at directory '${output_dir}'`);
}
/**
 * Parses an entity CDN csv file.
 *
 * @param path The path to the csv file.
 * @returns A map of zipPath => EntityData objects.
 */
function parseEntityCSV(path, existing) {
    const entityMap = existing === undefined ? new Map() : existing;
    // read file
    const file = (0, fs_1.readFileSync)(path, { encoding: "utf-8" });
    const lines = file.split("\n");
    // parse file
    for (const line of lines) {
        const data = line.trim().split(",");
        const zipPath = data[0];
        entityMap.set(zipPath, {
            zipPath: zipPath,
            version: data[1],
            size: data[2],
            hash: data[3],
            tag: data[4]
        });
    }
    return entityMap;
}
function unzipArchives(start, end, zipPaths, 
// directory data
entitiesFilesPath, entityMap, 
// bar data
bar) {
    return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
        try {
            for (let i = start; i < end; i++) {
                const zipPath = zipPaths[i];
                const tempPath = path_1.default.join(tempDir, zipPath);
                if (!(0, fs_1.existsSync)(tempPath)) {
                    (0, fs_1.mkdirSync)(tempPath, { recursive: true });
                }
                const open = yield unzipper_1.Open.file(zipPath);
                yield open.extract({ path: tempPath, concurrency: concurrency });
                // iterate extracted files
                for (const productionFile of (0, fs_1.readdirSync)(tempPath)) {
                    if (productionFile === "production") {
                        const productionPath = path_1.default.join(tempPath, productionFile);
                        const productionFiles = (0, fs_1.readdirSync)(productionPath);
                        const uploadFile = productionFiles[0];
                        if (uploadFile !== undefined) {
                            const uploadPath = path_1.default.join(productionPath, uploadFile);
                            for (const hex of (0, fs_1.readdirSync)(uploadPath)) {
                                if (hex !== "hash") {
                                    const hexPath = path_1.default.join(uploadPath, hex);
                                    for (const hash of (0, fs_1.readdirSync)(hexPath)) {
                                        const hashDir = path_1.default.join(hexPath, hash);
                                        const zipPath = `production/${uploadFile}/${hex}/${hash}`;
                                        const entityData = entityMap.get(zipPath);
                                        if (entityData !== undefined) {
                                            const newPath = path_1.default.join(entitiesFilesPath, entityData.hash);
                                            if (!(0, fs_1.existsSync)(newPath)) {
                                                (0, fs_1.renameSync)(hashDir, newPath);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                // increment bar
                bar.increment();
                // remove temp folder
                (0, fs_1.rmSync)(tempPath, { recursive: true });
            }
            resolve();
        }
        catch (error) {
            reject(error);
        }
    }));
}
/**
 * Unzips a language's files into its entities path for partial asset downloading
 *
 * @param path The path to the
 */
function unzipLanguage(dirPath) {
    return __awaiter(this, void 0, void 0, function* () {
        // verify that the language exists
        if (!(0, fs_1.existsSync)(dirPath))
            throw new Error(`Language does not exist at path '${path_1.default}'`);
        // get entity lists
        let entityMap = new Map();
        const entitiesPath = path_1.default.join(dirPath, "entities");
        for (const entityName of (0, fs_1.readdirSync)(entitiesPath)) {
            if (entityName.endsWith(".csv")) {
                parseEntityCSV(path_1.default.join(entitiesPath, entityName), entityMap);
            }
        }
        const entitiesFilesPath = path_1.default.join(entitiesPath, "files");
        if (!(0, fs_1.existsSync)(entitiesFilesPath)) {
            (0, fs_1.mkdirSync)(entitiesFilesPath);
        }
        // get individual zips
        const zipPaths = [];
        for (const archiveName of (0, fs_1.readdirSync)(dirPath)) {
            if (archiveName !== "entities") {
                const archivePath = path_1.default.join(dirPath, archiveName);
                for (const zipName of (0, fs_1.readdirSync)(archivePath)) {
                    zipPaths.push(path_1.default.join(archivePath, zipName));
                }
            }
        }
        // prepare progress bar
        const unzipBar = new cli_progress_1.default.SingleBar({}, cli_progress_1.default.Presets.shades_classic);
        // unzip each zip
        const zipCount = zipPaths.length;
        const threadCount = Math.min(zipCount, concurrency);
        const zipsPerThread = Math.floor(zipCount / threadCount);
        // start unzipping
        const work = [];
        console.log(`Unzipping '${dirPath}'...`);
        unzipBar.start(zipCount, 0);
        for (let i = 0; i < threadCount; i++) {
            const start = zipsPerThread * i;
            const end = (i === (threadCount - 1)) ? zipCount : Math.min(zipCount, start + zipsPerThread);
            work.push(unzipArchives(start, end, zipPaths, entitiesFilesPath, entityMap, unzipBar));
        }
        yield Promise.all(work);
        console.log(`Successfully unzipped '${dirPath}'.`);
    });
}
function unzip() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Unzipping CDN...");
        for (const fileName of (0, fs_1.readdirSync)(cdn_dir)) {
            if (validCDNFolders[fileName] === true) {
                yield unzipLanguage(path_1.default.join(cdn_dir, fileName));
            }
        }
        console.log("Successfully unzipped CDN.");
        (0, fs_1.rmSync)(tempDir, { recursive: true });
    });
}
unzip();
