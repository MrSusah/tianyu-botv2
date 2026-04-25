const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  credits: { type: Number, default: 0, min: 0 },
  points: { type: Number, default: 0, min: 0 },
  
  fishInventory: { type: Map, of: Number, default: new Map() },
  items: { type: Map, of: Number, default: new Map() },
  
  equippedRod: { type: String, default: "Basic Rod" },
  equippedBait: { type: String, default: "Basic Bait" },
  
  favoriteFish: { type: [String], default: [] },
  
  activePotion: { type: Object, default: null },
  activeCooldownPotion: { type: Object, default: null },
  
  lastFishTime: { type: Number, default: 0 },
  lastChatTimes: { type: Map, of: Number, default: new Map() },
  lastGalleryTimes: { type: Map, of: Number, default: new Map() },
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

const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = { User };