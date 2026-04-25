const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, unique: true, required: true },
    credits: { type: Number, default: 1000 },
    points: { type: Number, default: 0 },
    fishInventory: { type: Map, of: Number, default: {} },
    items: { type: Map, of: Number, default: {} },
    equippedRod: { type: String, default: "Basic Rod" },
    equippedBait: { type: String, default: "Basic Bait" },
    favoriteFish: { type: [String], default: [] },
    activePotion: { type: Object, default: null },
    activeCooldownPotion: { type: Object, default: null },
    lastFishTime: { type: Number, default: 0 },
    lastChatTimes: { type: Map, of: Number, default: {} },
    lastGalleryTimes: { type: Map, of: Number, default: {} },
    lastReactionTime: { type: Number, default: 0 },
    lastVoiceTime: { type: Number, default: 0 },
    totalVoiceMinutes: { type: Number, default: 0 },
    seasonPoints: { type: Number, default: 0 },
    seasonFishCaught: { type: Number, default: 0 },
    activityPoints: { type: Number, default: 0 },
    totalFishingCredits: { type: Number, default: 0 },
    totalFishCaught: { type: Number, default: 0 },
    redeemedRewards: { type: [String], default: [] }
}, { timestamps: true });

const cooldownSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    command: { type: String, required: true },
    lastUsed: { type: Date, default: Date.now }
});

cooldownSchema.index({ userId: 1, command: 1 }, { unique: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Cooldown = mongoose.models.Cooldown || mongoose.model('Cooldown', cooldownSchema);

module.exports = { User, Cooldown };