"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GachaMovieType = exports.GachaType = exports.BoxGachaRewardTier = exports.RushEventFolder = exports.ShopType = exports.ShopItemUserCostType = exports.ShopItemRewardType = exports.ScoreRewardType = exports.Element = exports.QuestCategory = exports.BoxGachaRewardType = exports.RewardType = void 0;
// enums
var RewardType;
(function (RewardType) {
    RewardType[RewardType["ITEM"] = 0] = "ITEM";
    RewardType[RewardType["EQUIPMENT"] = 1] = "EQUIPMENT";
    RewardType[RewardType["CHARACTER"] = 2] = "CHARACTER";
    RewardType[RewardType["BEADS"] = 3] = "BEADS";
    RewardType[RewardType["MANA"] = 4] = "MANA";
    RewardType[RewardType["EXP"] = 5] = "EXP";
    RewardType[RewardType["ELEMENT"] = 6] = "ELEMENT";
    RewardType[RewardType["AETHER"] = 7] = "AETHER";
})(RewardType || (exports.RewardType = RewardType = {}));
var BoxGachaRewardType;
(function (BoxGachaRewardType) {
    BoxGachaRewardType[BoxGachaRewardType["ITEM"] = 0] = "ITEM";
    BoxGachaRewardType[BoxGachaRewardType["EQUIPMENT"] = 1] = "EQUIPMENT";
    BoxGachaRewardType[BoxGachaRewardType["EMPTY"] = 2] = "EMPTY";
    BoxGachaRewardType[BoxGachaRewardType["MANA"] = 3] = "MANA";
    BoxGachaRewardType[BoxGachaRewardType["EXP"] = 4] = "EXP";
    BoxGachaRewardType[BoxGachaRewardType["CHARACTER"] = 5] = "CHARACTER";
})(BoxGachaRewardType || (exports.BoxGachaRewardType = BoxGachaRewardType = {}));
var QuestCategory;
(function (QuestCategory) {
    QuestCategory[QuestCategory["EMPTY"] = 0] = "EMPTY";
    QuestCategory[QuestCategory["MAIN"] = 1] = "MAIN";
    QuestCategory[QuestCategory["BOSS_BATTLE"] = 2] = "BOSS_BATTLE";
    QuestCategory[QuestCategory["CHARACTER"] = 3] = "CHARACTER";
    QuestCategory[QuestCategory["EX"] = 4] = "EX";
    QuestCategory[QuestCategory["EMPTY2"] = 5] = "EMPTY2";
    QuestCategory[QuestCategory["DAILY_WEEK_EVENT"] = 6] = "DAILY_WEEK_EVENT";
    QuestCategory[QuestCategory["ADVENT_EVENT_SINGLE"] = 7] = "ADVENT_EVENT_SINGLE";
    QuestCategory[QuestCategory["ADVENT_EVENT_MULTI"] = 8] = "ADVENT_EVENT_MULTI";
    QuestCategory[QuestCategory["TUTORIAL"] = 9] = "TUTORIAL";
    QuestCategory[QuestCategory["STORY_EVENT_SINGLE"] = 10] = "STORY_EVENT_SINGLE";
    QuestCategory[QuestCategory["RANKING_EVENT_SINGLE"] = 11] = "RANKING_EVENT_SINGLE";
    QuestCategory[QuestCategory["EMPTY3"] = 12] = "EMPTY3";
    QuestCategory[QuestCategory["CHALLENGE_DUNGEON_EVENT"] = 13] = "CHALLENGE_DUNGEON_EVENT";
    QuestCategory[QuestCategory["DAILY_EXP_MANA_EVENT"] = 14] = "DAILY_EXP_MANA_EVENT";
    QuestCategory[QuestCategory["PRACTICE"] = 15] = "PRACTICE";
    QuestCategory[QuestCategory["SKILL_PREVIEW"] = 16] = "SKILL_PREVIEW";
    QuestCategory[QuestCategory["EMPTY4"] = 17] = "EMPTY4";
    QuestCategory[QuestCategory["WORLD_STORY_EVENT"] = 18] = "WORLD_STORY_EVENT";
    QuestCategory[QuestCategory["WORLD_STORY_EVENT_BOSS_BATTLE"] = 19] = "WORLD_STORY_EVENT_BOSS_BATTLE";
    QuestCategory[QuestCategory["TOWER_DUNGEON_EVENT"] = 20] = "TOWER_DUNGEON_EVENT";
    QuestCategory[QuestCategory["EXPERT_SINGLE_EVENT"] = 21] = "EXPERT_SINGLE_EVENT";
    QuestCategory[QuestCategory["CARNIVAL_EVENT"] = 22] = "CARNIVAL_EVENT";
    QuestCategory[QuestCategory["RAID_EVENT"] = 23] = "RAID_EVENT";
    QuestCategory[QuestCategory["RUSH_EVENT"] = 24] = "RUSH_EVENT";
    QuestCategory[QuestCategory["SOLO_TIME_ATTACK_EVENT"] = 25] = "SOLO_TIME_ATTACK_EVENT";
    QuestCategory[QuestCategory["HARD_MULTI_EVENT"] = 26] = "HARD_MULTI_EVENT";
    QuestCategory[QuestCategory["SCORE_ATTACK_EVENT"] = 27] = "SCORE_ATTACK_EVENT"; //?
})(QuestCategory || (exports.QuestCategory = QuestCategory = {}));
var Element;
(function (Element) {
    Element[Element["FIRE"] = 0] = "FIRE";
    Element[Element["WATER"] = 1] = "WATER";
    Element[Element["LIGHTNING"] = 2] = "LIGHTNING";
    Element[Element["WIND"] = 3] = "WIND";
    Element[Element["LIGHT"] = 4] = "LIGHT";
    Element[Element["DARK"] = 5] = "DARK";
})(Element || (exports.Element = Element = {}));
var ScoreRewardType;
(function (ScoreRewardType) {
    ScoreRewardType[ScoreRewardType["ITEM"] = 0] = "ITEM";
    ScoreRewardType[ScoreRewardType["RARE_POOL"] = 1] = "RARE_POOL";
})(ScoreRewardType || (exports.ScoreRewardType = ScoreRewardType = {}));
var ShopItemRewardType;
(function (ShopItemRewardType) {
    ShopItemRewardType[ShopItemRewardType["ITEM"] = 0] = "ITEM";
    ShopItemRewardType[ShopItemRewardType["EXP"] = 1] = "EXP";
    ShopItemRewardType[ShopItemRewardType["MANA"] = 2] = "MANA";
    ShopItemRewardType[ShopItemRewardType["CHARACTER"] = 3] = "CHARACTER";
    ShopItemRewardType[ShopItemRewardType["EQUIPMENT"] = 4] = "EQUIPMENT";
})(ShopItemRewardType || (exports.ShopItemRewardType = ShopItemRewardType = {}));
var ShopItemUserCostType;
(function (ShopItemUserCostType) {
    ShopItemUserCostType[ShopItemUserCostType["BEADS"] = 0] = "BEADS";
    ShopItemUserCostType[ShopItemUserCostType["MANA"] = 1] = "MANA";
    ShopItemUserCostType[ShopItemUserCostType["AMITY_SCROLL"] = 2] = "AMITY_SCROLL";
})(ShopItemUserCostType || (exports.ShopItemUserCostType = ShopItemUserCostType = {}));
var ShopType;
(function (ShopType) {
    ShopType[ShopType["U0"] = 0] = "U0";
    ShopType[ShopType["U1"] = 1] = "U1";
    ShopType[ShopType["TREASURE"] = 2] = "TREASURE";
    ShopType[ShopType["SPECIAL_PACK"] = 3] = "SPECIAL_PACK";
    ShopType[ShopType["EVENT_ITEM"] = 4] = "EVENT_ITEM";
    ShopType[ShopType["U5"] = 5] = "U5";
    ShopType[ShopType["U6"] = 6] = "U6";
    ShopType[ShopType["BOSS_COIN"] = 7] = "BOSS_COIN";
    ShopType[ShopType["GENERAL"] = 8] = "GENERAL";
    ShopType[ShopType["STAR_GRAIN"] = 9] = "STAR_GRAIN";
    ShopType[ShopType["TREASURE_EQUIPMENT"] = 10] = "TREASURE_EQUIPMENT"; // CN: 追忆装备强化 / 特殊装备强化
})(ShopType || (exports.ShopType = ShopType = {}));
var RushEventFolder;
(function (RushEventFolder) {
    RushEventFolder[RushEventFolder["NONE"] = 0] = "NONE";
    RushEventFolder[RushEventFolder["INTERMEDIATE"] = 1] = "INTERMEDIATE";
    RushEventFolder[RushEventFolder["ADVANCED"] = 2] = "ADVANCED";
    RushEventFolder[RushEventFolder["GODLY"] = 3] = "GODLY";
    RushEventFolder[RushEventFolder["ENDLESS"] = 4] = "ENDLESS";
})(RushEventFolder || (exports.RushEventFolder = RushEventFolder = {}));
// box gachas
var BoxGachaRewardTier;
(function (BoxGachaRewardTier) {
    BoxGachaRewardTier[BoxGachaRewardTier["COMMON"] = 0] = "COMMON";
    BoxGachaRewardTier[BoxGachaRewardTier["RARE"] = 1] = "RARE";
    BoxGachaRewardTier[BoxGachaRewardTier["FEATURED"] = 2] = "FEATURED";
})(BoxGachaRewardTier || (exports.BoxGachaRewardTier = BoxGachaRewardTier = {}));
// gacha
var GachaType;
(function (GachaType) {
    GachaType[GachaType["CHARACTER"] = 0] = "CHARACTER";
    GachaType[GachaType["WEAPON"] = 1] = "WEAPON";
})(GachaType || (exports.GachaType = GachaType = {}));
var GachaMovieType;
(function (GachaMovieType) {
    GachaMovieType[GachaMovieType["NORMAL"] = 0] = "NORMAL";
    GachaMovieType[GachaMovieType["GUARANTEE"] = 1] = "GUARANTEE";
})(GachaMovieType || (exports.GachaMovieType = GachaMovieType = {}));
