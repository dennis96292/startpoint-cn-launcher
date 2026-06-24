"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RushEventBattleType = exports.PartyCategory = exports.SessionType = void 0;
// zat session
var SessionType;
(function (SessionType) {
    SessionType[SessionType["ZAT"] = 0] = "ZAT";
    SessionType[SessionType["ZRT"] = 1] = "ZRT";
    SessionType[SessionType["VIEWER"] = 2] = "VIEWER";
    SessionType[SessionType["LOGIN"] = 3] = "LOGIN";
})(SessionType || (exports.SessionType = SessionType = {}));
// party
var PartyCategory;
(function (PartyCategory) {
    PartyCategory[PartyCategory["EMPTY"] = 0] = "EMPTY";
    PartyCategory[PartyCategory["NORMAL"] = 1] = "NORMAL";
    PartyCategory[PartyCategory["EMPTY2"] = 2] = "EMPTY2";
    PartyCategory[PartyCategory["EMPTY3"] = 3] = "EMPTY3";
    PartyCategory[PartyCategory["EVENT"] = 4] = "EVENT";
})(PartyCategory || (exports.PartyCategory = PartyCategory = {}));
var RushEventBattleType;
(function (RushEventBattleType) {
    RushEventBattleType[RushEventBattleType["FOLDER"] = 0] = "FOLDER";
    RushEventBattleType[RushEventBattleType["ENDLESS"] = 1] = "ENDLESS";
})(RushEventBattleType || (exports.RushEventBattleType = RushEventBattleType = {}));
