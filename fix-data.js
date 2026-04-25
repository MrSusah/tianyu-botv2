require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder
} = require("discord.js");
const mongoose = require("mongoose");

// ================= CLIENT =================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ================= CONFIG =================
const FISHING_CHANNELS = [
  "1492058905499402271",
  "1492077755322470530",
  "1492077857042862161",
  "1492077877301084351",
  "1492077899870765166"
];

const ANNOUNCE_CHANNEL = "1492368085410254978";
const ACTIVITY_LEADERBOARD_CHANNEL = "1493595313376592013";
const ADMIN_IDS = ["756609192277835858"];
const OWNER_ID = "756609192277835858";

// ================= COOLDOWN & ANTI-EXPLOIT =================
const cooldowns = new Map();
const processingLocks = new Map();

async function acquireLock(userId, action, timeout = 5000) {
  const key = `${userId}:${action}`;
  if (processingLocks.has(key)) {
    return false;
  }
  processingLocks.set(key, Date.now());
  setTimeout(() => {
    if (processingLocks.get(key)) {
      processingLocks.delete(key);
    }
  }, timeout);
  return key;
}

function releaseLock(key) {
  if (key && processingLocks.has(key)) {
    processingLocks.delete(key);
  }
}

function hasCooldown(userId, action, cooldownMs = 2000) {
  const key = `${userId}:${action}`;
  const lastUsed = cooldowns.get(key);
  if (lastUsed && Date.now() - lastUsed < cooldownMs) {
    return true;
  }
  cooldowns.set(key, Date.now());
  return false;
}

// ================= CHANNEL POINTS =================
const POINTS_CONFIG = {
  chatChannels: ["756621945725911170", "862959540436598804"],
  chatPointsPerMessage: 1,
  chatCooldown: 60000,
  galleryChannels: ["1492135262514446346"],
  galleryPostPoints: 5,
  galleryCommentPoints: 2,
  galleryCooldown: 120000,
  announcementChannel: "1492368085410254978",
  reactionPoints: 3,
  reactionCooldown: 300000,
  voicePointsPerMinute: 1,
  voiceCheckInterval: 120000,
  minMembers: 2
};

// ================= LUCK SYSTEM =================
let globalLuckBoost = 1;
let channelBoost = {};
let boss = null;
let activeBoss = null;
let bossSpawnTime = null;

const bossList = [
  { name: "👑 Kraken Purba", rarity: "Secret", value: 55000, emoji: "🐙" },
  { name: "👑 Naga Laut", rarity: "Secret", value: 58000, emoji: "🐉" },
  { name: "👑 Leviathan Abyss", rarity: "Secret", value: 60000, emoji: "🌊" },
  { name: "👑 Poseidon Wrath", rarity: "Secret", value: 55000, emoji: "⚡" }
];

// ================= ANTI EXPLOIT =================
const antiExploit = {
  tempBlacklist: new Map(),
  exploitLogs: [],
  
  isBlacklisted(userId) {
    if (userId === OWNER_ID) return false;
    const entry = this.tempBlacklist.get(userId);
    if (entry && entry > Date.now()) return true;
    this.tempBlacklist.delete(userId);
    return false;
  },
  
  addToBlacklist(userId, duration = 3600000, reason = "Exploit detected") {
    if (userId === OWNER_ID) return;
    this.tempBlacklist.set(userId, Date.now() + duration);
    this.exploitLogs.push({ userId, reason, time: new Date().toISOString(), duration: duration / 60000 + " menit" });
    console.log(`⚠️ Anti-Exploit: ${userId} di-blacklist selama ${duration/60000} menit. Alasan: ${reason}`);
  },
  
  userActivity: new Map(),
  
  recordActivity(userId, type, amount = 1) {
    if (userId === OWNER_ID) return true;
    
    const now = Date.now();
    let activity = this.userActivity.get(userId);
    if (!activity) {
      activity = { chats: [], galleries: [], reactions: [], voiceMinutes: [], lastReset: now };
      this.userActivity.set(userId, activity);
    }
    
    if (now - activity.lastReset > 86400000) {
      activity.chats = [];
      activity.galleries = [];
      activity.reactions = [];
      activity.lastReset = now;
    }
    
    if (type === "chat") {
      activity.chats = activity.chats.filter(t => now - t < 60000);
      activity.chats.push(now);
      if (activity.chats.length > 10) {
        this.addToBlacklist(userId, 1800000, "Spam chat melebihi batas");
        return false;
      }
    } else if (type === "gallery") {
      activity.galleries = activity.galleries.filter(t => now - t < 86400000);
      activity.galleries.push(now);
      if (activity.galleries.length > 20) {
        this.addToBlacklist(userId, 7200000, "Spam gallery melebihi batas");
        return false;
      }
    } else if (type === "reaction") {
      activity.reactions = activity.reactions.filter(t => now - t < 86400000);
      activity.reactions.push(now);
      if (activity.reactions.length > 30) {
        this.addToBlacklist(userId, 7200000, "Spam reaction melebihi batas");
        return false;
      }
    }
    return true;
  }
};

// ================= HADIAH SYSTEM =================
const REWARDS = {
  "Tunai Rp5.000": { cost: 8000, type: "cash", value: "Rp5.000", emoji: "💰" },
  "Tunai Rp10.000": { cost: 16000, type: "cash", value: "Rp10.000", emoji: "💰" },
  "Tunai Rp20.000": { cost: 32000, type: "cash", value: "Rp20.000", emoji: "💰" },
  "Tunai Rp50.000": { cost: 76000, type: "cash", value: "Rp50.000", emoji: "💰" },
  "Tunai Rp100.000": { cost: 150000, type: "cash", value: "Rp100.000", emoji: "💰" }
};

// ================= POTIONS =================
const potions = {
  "Potion Luck 10%": { luck: 1.1, duration: 30, price: 500, emoji: "🧪" },
  "Potion Luck 25%": { luck: 1.25, duration: 30, price: 1000, emoji: "🧪" },
  "Potion Luck 50%": { luck: 1.5, duration: 30, price: 2000, emoji: "🧪" },
  "Elixir Luck 100%": { luck: 2.0, duration: 60, price: 5000, emoji: "✨" },
  "Potion Cooldown 15%": { cooldownReduce: 0.15, duration: 30, price: 10000, emoji: "⏰" },
  "Potion Cooldown 25%": { cooldownReduce: 0.25, duration: 30, price: 20000, emoji: "⌛" }
};

// ================= ITEM DEFINITIONS =================
const rods = {
  "Basic Rod": { luck: 1, price: 0, type: "rod", emoji: "🎣" },
  "Iron Rod": { luck: 1.2, price: 200, type: "rod", emoji: "⚙️" },
  "Silver Rod": { luck: 1.4, price: 400, type: "rod", emoji: "🥈" },
  "Golden Rod": { luck: 1.7, price: 800, type: "rod", emoji: "👑" },
  "Dragon Rod": { luck: 2, price: 1500, type: "rod", emoji: "🐉" },
  "Mythic Rod": { luck: 2.5, price: 3000, type: "rod", emoji: "🏆" },
  "God Rod": { luck: 3, price: 5000, type: "rod", emoji: "⚡" },
  "Legendary Rod": { luck: 3.5, price: 10000, type: "rod", emoji: "🌟" },
  "Celestial Rod": { luck: 4.0, price: 30000, type: "rod", emoji: "🌙" },
  "Divine Rod": { luck: 4.5, price: 90000, type: "rod", emoji: "✨" },
  "Ethereal Rod": { luck: 5.0, price: 270000, type: "rod", emoji: "🔮" },
  "Abyssal Rod": { luck: 5.5, price: 810000, type: "rod", emoji: "🌊" },
  "Primordial Rod": { luck: 6.0, price: 2430000, type: "rod", emoji: "🌀" }
};

const baits = {
  "Basic Bait": { luck: 1, price: 0, type: "bait", emoji: "🪱" },
  "Herbal Bait": { luck: 1.2, price: 100, type: "bait", emoji: "🌿" },
  "Magic Bait": { luck: 1.5, price: 300, type: "bait", emoji: "✨" },
  "Divine Bait": { luck: 1.8, price: 800, type: "bait", emoji: "💫" },
  "God Bait": { luck: 2.2, price: 1500, type: "bait", emoji: "⚡" },
  "Mythic Bait": { luck: 2.5, price: 3000, type: "bait", emoji: "🏆" },
  "Legendary Bait": { luck: 3.0, price: 9000, type: "bait", emoji: "🌟" },
  "Celestial Bait": { luck: 3.5, price: 27000, type: "bait", emoji: "🌙" },
  "Divine Bait+": { luck: 4.0, price: 81000, type: "bait", emoji: "✨" },
  "Ethereal Bait": { luck: 4.5, price: 243000, type: "bait", emoji: "🔮" },
  "Primordial Bait": { luck: 5.0, price: 729000, type: "bait", emoji: "🌀" }
};

// ================= DATABASE SCHEMA =================
mongoose.connect(process.env.MONGO_URI);

const inventoryItemSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ['rod', 'bait', 'potion'] },
  equipped: { type: Boolean, default: false }
});

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

const User = mongoose.model("User", userSchema);
const Season = mongoose.model("Season", new mongoose.Schema({
  seasonId: { type: String, unique: true },
  startDate: Date,
  endDate: Date,
  isActive: { type: Boolean, default: false },
  topPlayers: { type: Array, default: [] }
}));

// ================= DATABASE HELPER FUNCTIONS =================
async function addFishToInventory(userId, fishName, quantity = 1) {
  const result = await User.updateOne(
    { userId: userId },
    { $inc: { [`fishInventory.${fishName}`]: quantity, totalFishCaught: quantity } }
  );
  return result;
}

async function removeFishFromInventory(userId, fishName, quantity = 1) {
  const user = await User.findOne({ userId: userId });
  const currentQty = user.fishInventory?.get(fishName) || 0;
  
  if (currentQty < quantity) {
    return false;
  }
  
  if (currentQty === quantity) {
    await User.updateOne(
      { userId: userId },
      { $unset: { [`fishInventory.${fishName}`]: "" } }
    );
  } else {
    await User.updateOne(
      { userId: userId },
      { $inc: { [`fishInventory.${fishName}`]: -quantity } }
    );
  }
  return true;
}

async function addItemToInventory(userId, itemName, quantity = 1) {
  await User.updateOne(
    { userId: userId },
    { $inc: { [`items.${itemName}`]: quantity } }
  );
}

async function removeItemFromInventory(userId, itemName, quantity = 1) {
  const user = await User.findOne({ userId: userId });
  const currentQty = user.items?.get(itemName) || 0;
  
  if (currentQty < quantity) {
    return false;
  }
  
  if (currentQty === quantity) {
    await User.updateOne(
      { userId: userId },
      { $unset: { [`items.${itemName}`]: "" } }
    );
  } else {
    await User.updateOne(
      { userId: userId },
      { $inc: { [`items.${itemName}`]: -quantity } }
    );
  }
  return true;
}

async function getUser(id) {
  let u = await User.findOne({ userId: id });
  if (!u) {
    u = await User.create({ userId: id });
    await addItemToInventory(id, "Basic Rod", 1);
    await addItemToInventory(id, "Basic Bait", 1);
  }
  return u;
}

// ================= RARITY =================
const rarityChances = {
  Common: 1 / 75,
  Uncommon: 1 / 500,
  Rare: 1 / 2000,
  Epic: 1 / 15000,
  Legendary: 1 / 100000
};

// ================= MUTASI =================
function getMutation() {
  const r = Math.random();
  if (r < 0.005) return "🧚 Fairy";
  if (r < 0.01) return "👻 Ghost";
  if (r < 0.015) return "🪨 Stone";
  if (r < 0.02) return "🏜️ Sand";
  if (r < 0.025) return "☢️ Radioaktif";
  if (r < 0.03) return "❄️ Ice";
  if (r < 0.035) return "⭐ Gold";
  if (r < 0.045) return "✨ Shiny";
  if (r < 0.055) return "🔥 Inferno";
  if (r < 0.065) return "💀 Dark";
  return "";
}

function getMutationBonus(mutation) {
  const bonuses = {
    "🧚 Fairy": 500, "👻 Ghost": 300, "🪨 Stone": 100,
    "🏜️ Sand": 80, "☢️ Radioaktif": 400, "❄️ Ice": 150,
    "⭐ Gold": 200, "✨ Shiny": 250, "🔥 Inferno": 350, "💀 Dark": 180
  };
  return bonuses[mutation] || 0;
}

// ================= ZONE IKAN =================
const fishingZones = {
  "1492058905499402271": [
    { name: "Lele Lumpur", rarity: "Common", value: 5 }, { name: "Gabus", rarity: "Common", value: 6 },
    { name: "Mujaer", rarity: "Common", value: 4 }, { name: "Nila Merah", rarity: "Common", value: 5 },
    { name: "Tawes", rarity: "Common", value: 4 }, { name: "Wader", rarity: "Common", value: 3 },
    { name: "Betutu", rarity: "Uncommon", value: 15 }, { name: "Belut Sawah", rarity: "Uncommon", value: 12 },
    { name: "Bawal Air Tawar", rarity: "Uncommon", value: 18 }, { name: "Patin", rarity: "Uncommon", value: 14 },
    { name: "Gurame", rarity: "Rare", value: 50 }, { name: "Arwana", rarity: "Rare", value: 70 },
    { name: "Salmon Desa", rarity: "Rare", value: 60 }, { name: "Piranha", rarity: "Epic", value: 150 },
    { name: "Arapaima", rarity: "Epic", value: 200 }, { name: "Megalodon", rarity: "Legendary", value: 600 },
    { name: "Kraken", rarity: "Legendary", value: 800 }, { name: "Naga Sungai", rarity: "Mythic", value: 2000 },
    { name: "Spirit Ikan Mas", rarity: "Mythic", value: 2500 }, { name: "Dewa Lele", rarity: "Secret", value: 10000 }
  ],
  "1492077755322470530": [
    { name: "Ikan Komet", rarity: "Common", value: 6 }, { name: "Platy", rarity: "Common", value: 5 },
    { name: "Molly", rarity: "Common", value: 5 }, { name: "Swordtail", rarity: "Common", value: 7 },
    { name: "Corydoras", rarity: "Common", value: 6 }, { name: "Botia", rarity: "Uncommon", value: 15 },
    { name: "Lohan", rarity: "Uncommon", value: 20 }, { name: "Oscar", rarity: "Uncommon", value: 18 },
    { name: "Flowerhorn", rarity: "Rare", value: 80 }, { name: "Red Arowana", rarity: "Rare", value: 100 },
    { name: "Silver Arowana", rarity: "Rare", value: 90 }, { name: "Jardini", rarity: "Epic", value: 180 },
    { name: "Black Ghost", rarity: "Epic", value: 220 }, { name: "Elephant Nose", rarity: "Epic", value: 200 },
    { name: "Discus", rarity: "Legendary", value: 700 }, { name: "Altum Angelfish", rarity: "Legendary", value: 750 },
    { name: "King Kong Parrot", rarity: "Mythic", value: 2200 }, { name: "Super Red", rarity: "Mythic", value: 2800 },
    { name: "Asian Arowana", rarity: "Secret", value: 12000 }, { name: "Mahseer", rarity: "Legendary", value: 900 }
  ],
  "1492077857042862161": [
    { name: "Baronang", rarity: "Common", value: 8 }, { name: "Kerapu", rarity: "Common", value: 10 },
    { name: "Kakap Merah", rarity: "Common", value: 9 }, { name: "Cumi", rarity: "Common", value: 7 },
    { name: "Gurita", rarity: "Uncommon", value: 20 }, { name: "Lobster", rarity: "Uncommon", value: 30 },
    { name: "Rajungan", rarity: "Uncommon", value: 25 }, { name: "Tuna", rarity: "Rare", value: 80 },
    { name: "Cakalang", rarity: "Rare", value: 75 }, { name: "Marlin", rarity: "Epic", value: 200 },
    { name: "Hiu Putih", rarity: "Epic", value: 250 }, { name: "Paus Biru", rarity: "Legendary", value: 800 },
    { name: "Orca", rarity: "Legendary", value: 900 }, { name: "Squid Raksasa", rarity: "Legendary", value: 1000 },
    { name: "Naga Laut", rarity: "Mythic", value: 3000 }, { name: "Leviathan", rarity: "Mythic", value: 3500 },
    { name: "Kraken Laut Dalam", rarity: "Secret", value: 15000 }, { name: "Poseidon", rarity: "Legendary", value: 1200 },
    { name: "Cthulhu", rarity: "Secret", value: 20000 }, { name: "Neptunus", rarity: "Legendary", value: 1100 }
  ],
  "1492077877301084351": [
    { name: "Ikan Es", rarity: "Common", value: 10 }, { name: "Salmon Arktik", rarity: "Common", value: 12 },
    { name: "Trout Es", rarity: "Uncommon", value: 25 }, { name: "Char", rarity: "Uncommon", value: 28 },
    { name: "Grayling", rarity: "Rare", value: 90 }, { name: "Whitefish", rarity: "Rare", value: 85 },
    { name: "Pike Es", rarity: "Epic", value: 220 }, { name: "Musky", rarity: "Epic", value: 250 },
    { name: "Sturgeon Es", rarity: "Legendary", value: 950 }, { name: "Beluga", rarity: "Legendary", value: 1000 },
    { name: "Narwhal", rarity: "Legendary", value: 1100 }, { name: "Walrus", rarity: "Mythic", value: 3200 },
    { name: "Leopard Seal", rarity: "Mythic", value: 3400 }, { name: "Orca Es", rarity: "Secret", value: 18000 },
    { name: "Paus Pembunuh", rarity: "Legendary", value: 1200 }, { name: "Yeti Fish", rarity: "Secret", value: 22000 },
    { name: "Frost Dragon", rarity: "Legendary", value: 1500 }, { name: "Aurora Fish", rarity: "Legendary", value: 1300 },
    { name: "Glacier King", rarity: "Legendary", value: 1400 }, { name: "Snow Kraken", rarity: "Legendary", value: 1600 }
  ],
  "1492077899870765166": [
    { name: "Void Minnow", rarity: "Common", value: 15 }, { name: "Dark Carp", rarity: "Common", value: 18 },
    { name: "Abyss Guppy", rarity: "Uncommon", value: 35 }, { name: "Shadow Eel", rarity: "Uncommon", value: 40 },
    { name: "Night Angler", rarity: "Rare", value: 120 }, { name: "Darkness Ray", rarity: "Rare", value: 130 },
    { name: "Void Pike", rarity: "Epic", value: 280 }, { name: "Abyssal Cod", rarity: "Epic", value: 300 },
    { name: "Nether Salmon", rarity: "Legendary", value: 2400 }, { name: "Obsidian Tuna", rarity: "Legendary", value: 2600 },
    { name: "Void Kraken", rarity: "Mythic", value: 8000 }, { name: "Abyss Leviathan", rarity: "Mythic", value: 9000 },
    { name: "Darkness Dragon", rarity: "Secret", value: 60000 }, { name: "Cthulhu Void", rarity: "Secret", value: 100000 },
    { name: "Void God", rarity: "Legendary", value: 4000 }, { name: "Eater of Worlds", rarity: "Legendary", value: 5000 },
    { name: "Cosmic Fish", rarity: "Legendary", value: 3600 }, { name: "Singularity", rarity: "Legendary", value: 4400 },
    { name: "Black Hole", rarity: "Legendary", value: 6000 }, { name: "Void Leviathan", rarity: "Legendary", value: 5600 }
  ]
};

// ================= LOGIC FISHING =================
function rollRarity(luck, channelId) {
  const r = Math.random();
  const isVoid = channelId === "1492077899870765166";
  let modifier = isVoid ? 0.5 : 1;
  
  if (r < rarityChances.Legendary * luck * modifier) return "Legendary";
  if (r < rarityChances.Epic * luck * modifier) return "Epic";
  if (r < rarityChances.Rare * luck * modifier) return "Rare";
  if (r < rarityChances.Uncommon * luck * modifier) return "Uncommon";
  return "Common";
}

function getFish(channelId, luck) {
  if (activeBoss && activeBoss.channel === channelId && Math.random() < 0.01) {
    const b = { ...activeBoss };
    activeBoss = null;
    bossSpawnTime = null;
    return b;
  }
  
  const zone = fishingZones[channelId];
  const rarity = rollRarity(luck, channelId);
  let pool = zone.filter(f => f.rarity === rarity);
  if (pool.length === 0) pool = zone;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getZoneName(channelId) {
  const zoneNames = {
    [FISHING_CHANNELS[0]]: "🏞️ ZONA DESA",
    [FISHING_CHANNELS[1]]: "🌊 ZONA SUNGAI",
    [FISHING_CHANNELS[2]]: "🐠 ZONA LAUT",
    [FISHING_CHANNELS[3]]: "❄️ ZONA ES",
    [FISHING_CHANNELS[4]]: "🌑 ZONA VOID"
  };
  return zoneNames[channelId] || "ZONA UNKNOWN";
}

// ================= BOSS =================
function spawnBoss() {
  const channel = FISHING_CHANNELS[Math.floor(Math.random() * FISHING_CHANNELS.length)];
  const randomBoss = bossList[Math.floor(Math.random() * bossList.length)];
  
  activeBoss = {
    name: randomBoss.name,
    rarity: randomBoss.rarity,
    value: randomBoss.value,
    emoji: randomBoss.emoji,
    channel: channel,
    spawnTime: Date.now()
  };
  
  bossSpawnTime = Date.now();
  
  client.channels.fetch(channel).then(ch => {
    ch.send(`🎣 **BOSS SPOTTED!** 🎣\n${activeBoss.emoji} **${activeBoss.name}** (${activeBoss.rarity}) muncul di channel ini!\n💰 Hadiah: **${activeBoss.value.toLocaleString()} credits**\n✨ Peluang menangkap: **1%** (Sangat Langka!)`);
  });
}
setInterval(spawnBoss, 3 * 60 * 60 * 1000);

// ================= LEADERBOARD =================
let leaderboardMessageId = null;
let leaderboardUpdateInterval = null;

async function generateLeaderboardEmbed() {
  const topUsers = await User.find({ userId: { $ne: OWNER_ID } })
    .sort({ totalFishingCredits: -1 })
    .limit(50);
  
  const leaderboardData = [];
  for (const u of topUsers) {
    let name = "Unknown";
    try {
      const d = await client.users.fetch(u.userId);
      name = d.username;
    } catch {}
    leaderboardData.push({ 
      username: name, 
      fishingCredits: u.totalFishingCredits || 0,
      fishCaught: u.totalFishCaught || 0
    });
  }

  const podium = [];
  const medals = ["🥇", "🥈", "🥉"];
  for (let i = 0; i < Math.min(3, leaderboardData.length); i++) {
    const p = leaderboardData[i];
    podium.push(`${medals[i]} **${p.username}**\n   \`💰 ${p.fishingCredits.toLocaleString()} credits\` • \`🎣 ${p.fishCaught} ikan\``);
  }

  let top10List = "";
  for (let i = 0; i < Math.min(10, leaderboardData.length); i++) {
    const u = leaderboardData[i];
    const medal = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`;
    const rankIcon = i === 0 ? "🌟" : i === 1 ? "⭐" : i === 2 ? "✨" : "▫️";
    top10List += `${rankIcon} **${medal}** \`${u.username}\` • \`💰 ${u.fishingCredits.toLocaleString()} credits\` • 🎣 ${u.fishCaught}\n`;
  }

  const nextUpdate = new Date(Date.now() + 86400000);
  const formattedNextUpdate = nextUpdate.toLocaleString('id-ID', { 
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
  });

  const embed = new EmbedBuilder()
    .setTitle("🏆 **FISHING LEADERBOARD** 🏆")
    .setDescription(`**Top Anglers - Total Credits dari Mancing**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🎯 **PODIUM** 🎯\n${podium.join("\n\n")}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 **TOP 10 PLAYERS**\n${top10List}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    .setColor(0xfacc15)
    .setThumbnail("https://cdn.discordapp.com/emojis/1025605498691330108.png")
    .setFooter({ text: `🏆 Auto-update setiap 24 jam • Update berikutnya: ${formattedNextUpdate}` })
    .setTimestamp();

  return embed;
}

async function updateLeaderboard() {
  try {
    console.log(`📊 [${new Date().toLocaleString()}] Memperbarui fishing leaderboard...`);
    
    const embed = await generateLeaderboardEmbed();
    const channel = await client.channels.fetch(ANNOUNCE_CHANNEL);
    if (!channel) {
      console.log("❌ Channel pengumuman tidak ditemukan!");
      return;
    }

    if (leaderboardMessageId) {
      try {
        const msg = await channel.messages.fetch(leaderboardMessageId);
        await msg.edit({ embeds: [embed] });
        console.log("✅ Fishing leaderboard berhasil diupdate!");
      } catch (error) {
        const msg = await channel.send({ embeds: [embed] });
        leaderboardMessageId = msg.id;
        console.log("✅ Fishing leaderboard berhasil dibuat baru!");
      }
    } else {
      const msg = await channel.send({ embeds: [embed] });
      leaderboardMessageId = msg.id;
      console.log("✅ Fishing leaderboard berhasil dibuat!");
    }
  } catch (error) {
    console.error("❌ Gagal update fishing leaderboard:", error);
  }
}

// ================= ACTIVITY LEADERBOARD =================
let activityLeaderboardMessageId = null;
let cachedActivityLeaderboard = null;

async function generateActivityLeaderboardEmbed() {
  const topUsers = await User.find({ userId: { $ne: OWNER_ID }, activityPoints: { $gt: 0 } })
    .sort({ activityPoints: -1 })
    .limit(20);
    
  const leaderboardData = [];
  for (const u of topUsers) {
    let name = "Unknown";
    try {
      const d = await client.users.fetch(u.userId);
      name = d.username;
    } catch {}
    leaderboardData.push({ 
      username: name, 
      activityPoints: u.activityPoints,
      voiceMinutes: u.totalVoiceMinutes || 0
    });
  }

  let topList = "";
  for (let i = 0; i < Math.min(15, leaderboardData.length); i++) {
    const u = leaderboardData[i];
    const medal = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`;
    const rankIcon = i === 0 ? "🌟" : i === 1 ? "⭐" : i === 2 ? "✨" : "▫️";
    topList += `${rankIcon} **${medal}** \`${u.username}\` • \`${u.activityPoints.toLocaleString()} pts\` • 🎙️ ${Math.floor(u.voiceMinutes / 60)} jam\n`;
  }

  if (topList === "") {
    topList = "Belum ada member yang aktif. Ajak teman-temanmu untuk mulai beraktivitas! 🎉";
  }

  const now = new Date();
  const nextUpdate = new Date(now.getTime() + 86400000);
  const formattedNextUpdate = nextUpdate.toLocaleString('id-ID', { 
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' 
  });

  const embed = new EmbedBuilder()
    .setTitle("📊 **ACTIVITY POINTS LEADERBOARD** 📊")
    .setDescription(`**Peringkat Member Paling Aktif**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🏆 **TOP 15 PLAYERS** 🏆\n${topList}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n**💡 Cara Mendapat Activity Points:**\n• 💬 Chat aktif: +1 point/pesan\n• 📸 Post Gallery: +5 points\n• 💬 Komentar Gallery: +2 points\n• 🎯 Reaction Announcement: +3 points\n• 🎙️ Voice (min 2 orang): +1 point/2 menit`)
    .setColor(0x00ff88)
    .setThumbnail("https://cdn.discordapp.com/emojis/1025605498691330108.png")
    .setFooter({ text: `🔄 Update publik setiap 24 jam • Update berikutnya: ${formattedNextUpdate}` })
    .setTimestamp();

  return embed;
}

async function updateActivityLeaderboardCache() {
  try {
    console.log(`📊 [${new Date().toLocaleString()}] Memperbarui cache activity leaderboard...`);
    cachedActivityLeaderboard = await generateActivityLeaderboardEmbed();
    console.log("✅ Cache activity leaderboard berhasil diupdate!");
  } catch (error) {
    console.error("❌ Gagal update cache activity leaderboard:", error);
  }
}

async function publishActivityLeaderboard() {
  try {
    console.log(`📊 [${new Date().toLocaleString()}] Mempublikasikan activity leaderboard...`);
    
    if (!cachedActivityLeaderboard) {
      await updateActivityLeaderboardCache();
    }
    
    const channel = await client.channels.fetch(ACTIVITY_LEADERBOARD_CHANNEL);
    if (!channel) {
      console.log("❌ Channel activity leaderboard tidak ditemukan!");
      return;
    }

    if (activityLeaderboardMessageId) {
      try {
        const msg = await channel.messages.fetch(activityLeaderboardMessageId);
        await msg.edit({ embeds: [cachedActivityLeaderboard] });
        console.log("✅ Activity leaderboard berhasil dipublikasikan!");
      } catch (error) {
        const msg = await channel.send({ embeds: [cachedActivityLeaderboard] });
        activityLeaderboardMessageId = msg.id;
        console.log("✅ Activity leaderboard berhasil dibuat baru!");
      }
    } else {
      const msg = await channel.send({ embeds: [cachedActivityLeaderboard] });
      activityLeaderboardMessageId = msg.id;
      console.log("✅ Activity leaderboard berhasil dibuat!");
    }
  } catch (error) {
    console.error("❌ Gagal publish activity leaderboard:", error);
  }
}

// ================= ACTIVITY POINTS =================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot || antiExploit.isBlacklisted(msg.author.id)) return;
  if (msg.author.id === OWNER_ID) return;

  if (POINTS_CONFIG.chatChannels.includes(msg.channel.id)) {
    if (!antiExploit.recordActivity(msg.author.id, "chat")) return;

    const user = await getUser(msg.author.id);
    const now = Date.now();
    const lastTime = user.lastChatTimes?.get(msg.channel.id) || 0;
    
    if (now - lastTime >= POINTS_CONFIG.chatCooldown) {
      await User.updateOne(
        { userId: msg.author.id },
        { 
          $inc: { points: POINTS_CONFIG.chatPointsPerMessage, seasonPoints: POINTS_CONFIG.chatPointsPerMessage, activityPoints: POINTS_CONFIG.chatPointsPerMessage },
          $set: { [`lastChatTimes.${msg.channel.id}`]: now }
        }
      );
    }
  }
  
  if (POINTS_CONFIG.galleryChannels.includes(msg.channel.id)) {
    if (!antiExploit.recordActivity(msg.author.id, "gallery")) return;

    const user = await getUser(msg.author.id);
    const now = Date.now();
    const lastTime = user.lastGalleryTimes?.get(msg.channel.id) || 0;
    
    if (now - lastTime >= POINTS_CONFIG.galleryCooldown) {
      let points = msg.reference ? POINTS_CONFIG.galleryCommentPoints : POINTS_CONFIG.galleryPostPoints;
      await User.updateOne(
        { userId: msg.author.id },
        { 
          $inc: { points: points, seasonPoints: points, activityPoints: points },
          $set: { [`lastGalleryTimes.${msg.channel.id}`]: now }
        }
      );
    }
  }
});

client.on("messageReactionAdd", async (reaction, user) => {
  if (user.bot || antiExploit.isBlacklisted(user.id)) return;
  if (user.id === OWNER_ID) return;
  if (reaction.message.channel.id !== POINTS_CONFIG.announcementChannel) return;
  if (!antiExploit.recordActivity(user.id, "reaction")) return;

  const targetUser = await getUser(user.id);
  const now = Date.now();
  
  if (now - (targetUser.lastReactionTime || 0) >= POINTS_CONFIG.reactionCooldown) {
    await User.updateOne(
      { userId: user.id },
      { 
        $inc: { points: POINTS_CONFIG.reactionPoints, seasonPoints: POINTS_CONFIG.reactionPoints, activityPoints: POINTS_CONFIG.reactionPoints },
        $set: { lastReactionTime: now }
      }
    );
  }
});

// ================= VOICE POINTS =================
setInterval(async () => {
  const guild = client.guilds.cache.first();
  if (!guild) return;
  
  const voiceStates = guild.voiceStates.cache;
  const channelMembers = new Map();
  
  for (const [_, state] of voiceStates) {
    if (!state.channelId) continue;
    if (!channelMembers.has(state.channelId)) channelMembers.set(state.channelId, []);
    channelMembers.get(state.channelId).push({
      userId: state.id, mute: state.mute, selfMute: state.selfMute
    });
  }
  
  for (const [channelId, members] of channelMembers) {
    const realMembers = members.filter(m => {
      const member = guild.members.cache.get(m.userId);
      return member && !member.user.bot && !m.mute && !m.selfMute && member.user.id !== OWNER_ID;
    });
    if (realMembers.length < POINTS_CONFIG.minMembers) continue;
    
    for (const member of realMembers) {
      const user = await getUser(member.userId);
      const now = Date.now();
      if (now - (user.lastVoiceTime || 0) >= POINTS_CONFIG.voiceCheckInterval) {
        await User.updateOne(
          { userId: member.userId },
          { 
            $inc: { points: POINTS_CONFIG.voicePointsPerMinute, seasonPoints: POINTS_CONFIG.voicePointsPerMinute, activityPoints: POINTS_CONFIG.voicePointsPerMinute, totalVoiceMinutes: 1 },
            $set: { lastVoiceTime: now }
          }
        );
      }
    }
  }
}, POINTS_CONFIG.voiceCheckInterval);

// ================= MENU =================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;

  if (msg.content === "!game") {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("menu_fish").setLabel("🎣 Fishing").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("menu_profile").setLabel("👤 Profile").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("menu_index").setLabel("📖 Index").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("menu_transfer").setLabel("💸 Transfer").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("menu_shop").setLabel("🛒 Shop").setStyle(ButtonStyle.Success)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("menu_inventory").setLabel("🎒 Inventory").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("menu_sell").setLabel("💰 Sell Fish").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("menu_redeem").setLabel("🎁 Hadiah").setStyle(ButtonStyle.Primary)
    );

    const row3 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("menu_activity").setLabel("📊 Aktivitas").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("menu_leaderboard").setLabel("🏆 Fishing LB").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("menu_activity_leaderboard").setLabel("📊 Activity LB").setStyle(ButtonStyle.Success)
    );

    const adminRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("admin_panel").setLabel("👑 Admin Panel").setStyle(ButtonStyle.Secondary)
    );

    return msg.reply({
      content: "🎮 **MAIN MENU**",
      components: ADMIN_IDS.includes(msg.author.id) ? [row1, row2, row3, adminRow] : [row1, row2, row3]
    });
  }
});

// ================= INVENTORY DROPDOWN & USE ITEM SYSTEM =================

// Fungsi untuk generate inventory dropdown
async function generateInventoryDropdown(userId) {
  const user = await getUser(userId);
  const inventoryItems = Array.from(user.items?.entries() || []);
  
  if (inventoryItems.length === 0) {
    return null;
  }
  
  const options = [];
  
  for (const [itemName, quantity] of inventoryItems) {
    let description = "";
    let emoji = "📦";
    
    if (rods[itemName]) {
      description = `Rod • Luck: ${rods[itemName].luck}x • Qty: ${quantity}`;
      emoji = rods[itemName].emoji;
    } else if (baits[itemName]) {
      description = `Bait • Luck: ${baits[itemName].luck}x • Qty: ${quantity}`;
      emoji = baits[itemName].emoji;
    } else if (potions[itemName]) {
      if (potions[itemName].luck) {
        description = `Potion • Luck: ${potions[itemName].luck}x • ${potions[itemName].duration} menit • Qty: ${quantity}`;
      } else {
        description = `Potion • Cooldown: -${potions[itemName].cooldownReduce * 100}% • ${potions[itemName].duration} menit • Qty: ${quantity}`;
      }
      emoji = potions[itemName].emoji;
    }
    
    options.push({
      label: itemName.length > 50 ? itemName.substring(0, 47) + "..." : itemName,
      description: description,
      value: itemName,
      emoji: emoji
    });
  }
  
  return options.slice(0, 25); // Max 25 options per select menu
}

// Fungsi untuk menggunakan item
async function useItem(userId, itemName) {
  const user = await getUser(userId);
  const quantity = user.items?.get(itemName) || 0;
  
  if (quantity === 0) {
    return { success: false, message: "❌ Kamu tidak memiliki item ini!" };
  }
  
  // Rod
  if (rods[itemName]) {
    if (user.equippedRod === itemName) {
      return { success: false, message: `❌ **${itemName}** sudah ter-equip sebagai rod!` };
    }
    await User.updateOne({ userId: userId }, { $set: { equippedRod: itemName } });
    return { success: true, message: `✅ Meng-equip **${itemName}** sebagai rod!`, type: "rod" };
  }
  
  // Bait
  if (baits[itemName]) {
    if (user.equippedBait === itemName) {
      return { success: false, message: `❌ **${itemName}** sudah ter-equip sebagai bait!` };
    }
    await User.updateOne({ userId: userId }, { $set: { equippedBait: itemName } });
    return { success: true, message: `✅ Meng-equip **${itemName}** sebagai bait!`, type: "bait" };
  }
  
  // Potion
  if (potions[itemName]) {
    const potion = potions[itemName];
    
    if (potion.luck && user.activePotion) {
      return { success: false, message: "❌ Masih ada luck potion aktif! Tunggu sampai habis." };
    }
    if (potion.cooldownReduce && user.activeCooldownPotion) {
      return { success: false, message: "❌ Masih ada cooldown potion aktif! Tunggu sampai habis." };
    }
    
    // Kurangi quantity potion
    const removed = await removeItemFromInventory(userId, itemName, 1);
    if (!removed) {
      return { success: false, message: "❌ Gagal menggunakan potion!" };
    }
    
    if (potion.luck) {
      await User.updateOne(
        { userId: userId },
        { $set: { activePotion: { name: itemName, luck: potion.luck, duration: potion.duration, remain: potion.duration, expiresAt: Date.now() + (potion.duration * 60 * 1000) } } }
      );
    } else if (potion.cooldownReduce) {
      await User.updateOne(
        { userId: userId },
        { $set: { activeCooldownPotion: { name: itemName, cooldownReduce: potion.cooldownReduce, duration: potion.duration, remain: potion.duration, expiresAt: Date.now() + (potion.duration * 60 * 1000) } } }
      );
    }
    
    // Set timeout untuk menghapus potion effect
    setTimeout(async () => {
      const currentUser = await getUser(userId);
      if (potion.luck && currentUser.activePotion?.name === itemName) {
        await User.updateOne({ userId: userId }, { $set: { activePotion: null } });
      }
      if (potion.cooldownReduce && currentUser.activeCooldownPotion?.name === itemName) {
        await User.updateOne({ userId: userId }, { $set: { activeCooldownPotion: null } });
      }
    }, potion.duration * 60 * 1000);
    
    const bonus = potion.luck ? `+${((potion.luck - 1) * 100)}% luck` : `-${potion.cooldownReduce * 100}% cooldown`;
    return { success: true, message: `✅ **${itemName}** digunakan! ${bonus} selama ${potion.duration} menit.`, type: "potion" };
  }
  
  return { success: false, message: "❌ Item tidak dapat digunakan!" };
}

// ================= INTERACTION HANDLER =================
client.on("interactionCreate", async (i) => {
  if (!i.isButton() && !i.isStringSelectMenu()) return;
  
  // ANTI SPAM - Cek cooldown
  if (hasCooldown(i.user.id, i.customId, 2000)) {
    return i.reply({ content: "⏳ Tombol sedang diproses, jangan spam!", flags: 64 }).catch(() => {});
  }
  
  try {
    const user = await getUser(i.user.id);
    
    // ===== INVENTORY MENU DENGAN DROPDOWN =====
    if (i.customId === "menu_inventory") {
      await i.deferReply({ flags: 64 });
      
      const dropdownOptions = await generateInventoryDropdown(i.user.id);
      const freshUser = await getUser(i.user.id);
      
      let potionStatus = "";
      if (freshUser.activePotion) {
        potionStatus += `\n🧪 Luck: ${freshUser.activePotion.name} (${freshUser.activePotion.remain} menit)`;
      }
      if (freshUser.activeCooldownPotion) {
        potionStatus += `\n⏰ Cooldown: ${freshUser.activeCooldownPotion.name} (${freshUser.activeCooldownPotion.remain} menit)`;
      }
      
      const totalFish = freshUser.totalFishCaught || 0;
      const favoriteCount = freshUser.favoriteFish?.length || 0;
      const inventoryCount = Array.from(freshUser.items?.entries() || []).length;
      
      const embed = new EmbedBuilder()
        .setTitle("🎒 **INVENTORY**")
        .setColor(0x00ae86)
        .setDescription(`📌 **Rod:** ${freshUser.equippedRod}\n🪱 **Bait:** ${freshUser.equippedBait}${potionStatus}\n\n🐟 **Total Ikan:** ${totalFish} ekor\n⭐ **Ikan Favorit:** ${favoriteCount} jenis\n📦 **Item Unik:** ${inventoryCount} item`)
        .setFooter({ text: "Pilih item dari dropdown untuk menggunakannya" });
      
      const components = [];
      
      if (dropdownOptions && dropdownOptions.length > 0) {
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("inventory_select")
          .setPlaceholder("📦 Pilih item untuk digunakan")
          .addOptions(dropdownOptions);
        
        components.push(new ActionRowBuilder().addComponents(selectMenu));
      }
      
      const actionRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("menu_potion").setLabel("🧪 Potion Menu").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("menu_favorite").setLabel("⭐ Favorite Fish").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("back_to_menu").setLabel("🔙 Back to Menu").setStyle(ButtonStyle.Secondary)
      );
      components.push(actionRow);
      
      return i.editReply({ embeds: [embed], components: components });
    }
    
    // ===== INVENTORY SELECT (USE ITEM) =====
    if (i.customId === "inventory_select") {
      const lockKey = await acquireLock(i.user.id, "use_item", 10000);
      if (!lockKey) {
        return i.reply({ content: "⏳ Sedang memproses item, tunggu sebentar!", flags: 64 });
      }
      
      try {
        const itemName = i.values[0];
        
        // Disable select menu sementara untuk anti double click
        const disabledSelect = new StringSelectMenuBuilder()
          .setCustomId("inventory_select")
          .setPlaceholder("⏳ Memproses...")
          .setDisabled(true)
          .addOptions([{ label: "Processing...", value: "disabled" }]);
        
        await i.update({ components: [new ActionRowBuilder().addComponents(disabledSelect)] });
        
        const result = await useItem(i.user.id, itemName);
        
        // Refresh inventory display
        const freshUser = await getUser(i.user.id);
        const dropdownOptions = await generateInventoryDropdown(i.user.id);
        
        let potionStatus = "";
        if (freshUser.activePotion) {
          potionStatus += `\n🧪 Luck: ${freshUser.activePotion.name} (${freshUser.activePotion.remain} menit)`;
        }
        if (freshUser.activeCooldownPotion) {
          potionStatus += `\n⏰ Cooldown: ${freshUser.activeCooldownPotion.name} (${freshUser.activeCooldownPotion.remain} menit)`;
        }
        
        const totalFish = freshUser.totalFishCaught || 0;
        const favoriteCount = freshUser.favoriteFish?.length || 0;
        const inventoryCount = Array.from(freshUser.items?.entries() || []).length;
        
        const embed = new EmbedBuilder()
          .setTitle("🎒 **INVENTORY**")
          .setColor(0x00ae86)
          .setDescription(`📌 **Rod:** ${freshUser.equippedRod}\n🪱 **Bait:** ${freshUser.equippedBait}${potionStatus}\n\n🐟 **Total Ikan:** ${totalFish} ekor\n⭐ **Ikan Favorit:** ${favoriteCount} jenis\n📦 **Item Unik:** ${inventoryCount} item\n\n${result.message}`)
          .setFooter({ text: "Pilih item dari dropdown untuk menggunakannya" });
        
        const components = [];
        
        if (dropdownOptions && dropdownOptions.length > 0) {
          const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("inventory_select")
            .setPlaceholder("📦 Pilih item untuk digunakan")
            .addOptions(dropdownOptions);
          
          components.push(new ActionRowBuilder().addComponents(selectMenu));
        } else {
          const emptySelect = new StringSelectMenuBuilder()
            .setCustomId("inventory_select")
            .setPlaceholder("📦 Inventory kosong")
            .setDisabled(true)
            .addOptions([{ label: "Tidak ada item", value: "empty" }]);
          
          components.push(new ActionRowBuilder().addComponents(emptySelect));
        }
        
        const actionRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("menu_potion").setLabel("🧪 Potion Menu").setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId("menu_favorite").setLabel("⭐ Favorite Fish").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("back_to_menu").setLabel("🔙 Back to Menu").setStyle(ButtonStyle.Secondary)
        );
        components.push(actionRow);
        
        return i.editReply({ embeds: [embed], components: components });
      } finally {
        releaseLock(lockKey);
      }
    }
    
    // ===== INDEX MENU =====
    if (i.customId === "menu_index") {
      const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("index_map")
          .setPlaceholder("📖 Pilih Zona Mancing")
          .addOptions([
            { label: "🏞️ Desa", value: FISHING_CHANNELS[0], description: "Ikan air tawar desa", emoji: "🏞️" },
            { label: "🌊 Sungai", value: FISHING_CHANNELS[1], description: "Ikan sungai deras", emoji: "🌊" },
            { label: "🐠 Laut", value: FISHING_CHANNELS[2], description: "Ikan laut dalam", emoji: "🐠" },
            { label: "❄️ Es", value: FISHING_CHANNELS[3], description: "Ikan kutub utara", emoji: "❄️" },
            { label: "🌑 Void", value: FISHING_CHANNELS[4], description: "Ikan misterius", emoji: "🌑" }
          ])
      );
      
      const backBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("back_to_menu").setLabel("🔙 Kembali").setStyle(ButtonStyle.Secondary)
      );
      
      return i.reply({
        content: "📖 **PILIH ZONA MANCING**\n\nPilih zona untuk melihat daftar ikannya:",
        components: [select, backBtn],
        flags: 64
      });
    }
    
    // ===== INDEX MAP =====
    if (i.customId === "index_map") {
      const channelId = i.values[0];
      const zone = fishingZones[channelId];
      if (!zone) return i.reply({ content: "❌ Zona tidak ditemukan!", flags: 64 });
      
      let text = `📖 **DAFTAR IKAN - ${getZoneName(channelId)}**\n\n`;
      text += `┌─────────────────────────────┐\n`;
      
      const rarityOrder = ["Secret", "Mythic", "Legendary", "Epic", "Rare", "Uncommon", "Common"];
      const sortedZone = [...zone].sort((a, b) => {
        return rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
      });
      
      for (const fish of sortedZone) {
        const rarityEmoji = {
          "Secret": "🔮", "Mythic": "🏆", "Legendary": "🌟",
          "Epic": "💜", "Rare": "💙", "Uncommon": "💚", "Common": "🤍"
        };
        text += `${rarityEmoji[fish.rarity] || "🐟"} **${fish.name}** (${fish.rarity}) - ${fish.value}💰\n`;
      }
      
      text += `└─────────────────────────────┘\n\n✨ Total: ${zone.length} jenis ikan`;
      
      const backBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("menu_index").setLabel("🔙 Kembali ke Pilih Zona").setStyle(ButtonStyle.Secondary)
      );
      
      return i.update({ content: text, components: [backBtn] });
    }
    
    // ===== BACK TO MENU =====
    if (i.customId === "back_to_menu") {
      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("menu_fish").setLabel("🎣 Fishing").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("menu_profile").setLabel("👤 Profile").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("menu_index").setLabel("📖 Index").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("menu_transfer").setLabel("💸 Transfer").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("menu_shop").setLabel("🛒 Shop").setStyle(ButtonStyle.Success)
      );
      
      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("menu_inventory").setLabel("🎒 Inventory").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("menu_sell").setLabel("💰 Sell Fish").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("menu_redeem").setLabel("🎁 Hadiah").setStyle(ButtonStyle.Primary)
      );
      
      const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("menu_activity").setLabel("📊 Aktivitas").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("menu_leaderboard").setLabel("🏆 Fishing LB").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("menu_activity_leaderboard").setLabel("📊 Activity LB").setStyle(ButtonStyle.Success)
      );
      
      const components = [row1, row2, row3];
      if (ADMIN_IDS.includes(i.user.id)) {
        const adminRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("admin_panel").setLabel("👑 Admin Panel").setStyle(ButtonStyle.Secondary)
        );
        components.push(adminRow);
      }
      
      return i.update({
        content: "🎮 **MAIN MENU**",
        components: components
      });
    }
    
    // ===== TRANSFER MENU =====
    if (i.customId === "menu_transfer") {
      return i.reply({
        content: "💸 **TRANSFER CREDITS**\n\nGunakan command:\n`!transfer @user jumlah`\n\nContoh: `!transfer @Kame 1000`\n\n⚠️ Minimal transfer 100 credits",
        flags: 64
      });
    }
    
    // ===== SELL FISH MENU =====
    if (i.customId === "menu_sell") {
      await i.deferReply({ flags: 64 });
      
      const freshUser = await getUser(i.user.id);
      const fishEntries = Array.from(freshUser.fishInventory?.entries() || []);
      const nonFavoriteFish = fishEntries.filter(([fishName]) => !freshUser.favoriteFish?.includes(fishName));
      
      if (nonFavoriteFish.length === 0) {
        return i.editReply({ content: "❌ Tidak ada ikan yang bisa dijual (semua ikan difavoritkan atau tidak ada ikan)!" });
      }
      
      let totalValue = 0;
      let totalFish = 0;
      for (const [fishName, amount] of nonFavoriteFish) {
        totalFish += amount;
        let fishValue = 0;
        for (const zone of Object.values(fishingZones)) {
          const found = zone.find(f => fishName.includes(f.name));
          if (found) {
            fishValue = found.value;
            break;
          }
        }
        totalValue += fishValue * amount;
      }
      
      const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("sell_select")
          .setPlaceholder("🐟 Pilih ikan yang ingin dijual")
          .addOptions(nonFavoriteFish.slice(0, 24).map(([fish, amount]) => {
            let fishValue = 0;
            for (const zone of Object.values(fishingZones)) {
              const found = zone.find(f => fish.includes(f.name));
              if (found) {
                fishValue = found.value;
                break;
              }
            }
            const shortName = fish.length > 30 ? fish.substring(0, 27) + "..." : fish;
            return {
              label: shortName,
              value: fish,
              description: `${amount} ekor | ${fishValue}💰/ekor | Total: ${fishValue * amount}💰`
            };
          }))
      );
      
      const sellAllBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("sell_all").setLabel(`💸 Jual Semua (Non-Favorite) (${totalFish} ekor - ${totalValue.toLocaleString()}💰)`).setStyle(ButtonStyle.Danger)
      );
      
      const backBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("back_to_menu").setLabel("🔙 Kembali").setStyle(ButtonStyle.Secondary)
      );
      
      return i.editReply({
        content: `🐟 **PENJUALAN IKAN**\n\n📊 Total ikan non-favorite: **${totalFish} ekor**\n💰 Total nilai: **${totalValue.toLocaleString()}💰**\n\nPilih ikan yang ingin dijual:`,
        components: [select, sellAllBtn, backBtn]
      });
    }
    
    // ===== SELL SELECT =====
    if (i.customId === "sell_select") {
      const lockKey = await acquireLock(i.user.id, "sell", 10000);
      if (!lockKey) {
        return i.reply({ content: "⏳ Proses penjualan sedang berjalan, tunggu sebentar!", flags: 64 });
      }
      
      try {
        const fishName = i.values[0];
        const freshUser = await getUser(i.user.id);
        const amount = freshUser.fishInventory?.get(fishName) || 0;
        
        if (amount === 0) {
          return i.reply({ content: "❌ Kamu tidak memiliki ikan ini!", flags: 64 });
        }
        
        if (freshUser.favoriteFish?.includes(fishName)) {
          return i.reply({ content: "❌ Ikan ini difavoritkan! Unfavorite dulu sebelum menjual.", flags: 64 });
        }
        
        let fishValue = 0;
        for (const zone of Object.values(fishingZones)) {
          const found = zone.find(f => fishName.includes(f.name));
          if (found) {
            fishValue = found.value;
            break;
          }
        }
        
        const totalPrice = fishValue * amount;
        
        const removeResult = await removeFishFromInventory(i.user.id, fishName, amount);
        if (!removeResult) {
          return i.reply({ content: "❌ Gagal menjual ikan, silakan coba lagi!", flags: 64 });
        }
        
        await User.updateOne(
          { userId: i.user.id },
          { $inc: { credits: totalPrice, totalFishingCredits: totalPrice } }
        );
        
        const updatedUser = await getUser(i.user.id);
        
        await i.update({
          content: `✅ **Berhasil menjual ${amount} ekor ${fishName}**\n💰 Harga total: **${totalPrice.toLocaleString()}💰**\n💳 Saldo sekarang: **${updatedUser.credits.toLocaleString()}💰**`,
          components: []
        });
      } finally {
        releaseLock(lockKey);
      }
    }
    
    // ===== SELL ALL =====
    if (i.customId === "sell_all") {
      const lockKey = await acquireLock(i.user.id, "sell_all", 15000);
      if (!lockKey) {
        return i.reply({ content: "⏳ Proses penjualan sedang berjalan, tunggu sebentar!", flags: 64 });
      }
      
      try {
        const freshUser = await getUser(i.user.id);
        let totalPrice = 0;
        let totalFish = 0;
        const fishToRemove = [];
        
        for (const [fishName, amount] of freshUser.fishInventory?.entries() || []) {
          if (!freshUser.favoriteFish?.includes(fishName)) {
            let fishValue = 0;
            for (const zone of Object.values(fishingZones)) {
              const found = zone.find(f => fishName.includes(f.name));
              if (found) {
                fishValue = found.value;
                break;
              }
            }
            totalPrice += fishValue * amount;
            totalFish += amount;
            fishToRemove.push({ fishName, amount });
          }
        }
        
        if (totalFish === 0) {
          return i.reply({ content: "❌ Tidak ada ikan non-favorite untuk dijual!", flags: 64 });
        }
        
        for (const { fishName, amount } of fishToRemove) {
          await removeFishFromInventory(i.user.id, fishName, amount);
        }
        
        await User.updateOne(
          { userId: i.user.id },
          { $inc: { credits: totalPrice, totalFishingCredits: totalPrice } }
        );
        
        const updatedUser = await getUser(i.user.id);
        
        await i.update({
          content: `✅ **Berhasil menjual SEMUA ikan non-favorite!**\n🐟 Total ikan: **${totalFish} ekor**\n💰 Total harga: **${totalPrice.toLocaleString()}💰**\n💳 Saldo sekarang: **${updatedUser.credits.toLocaleString()}💰**`,
          components: []
        });
      } finally {
        releaseLock(lockKey);
      }
    }
    
    // ===== FAVORITE SYSTEM =====
    if (i.customId === "menu_favorite") {
      await i.deferReply({ flags: 64 });
      
      const freshUser = await getUser(i.user.id);
      const fishList = Array.from(freshUser.fishInventory?.keys() || []);
      if (fishList.length === 0) {
        return i.editReply({ content: "❌ Kamu tidak memiliki ikan apapun!" });
      }
      
      const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("favorite_select")
          .setPlaceholder("⭐ Pilih ikan untuk difavoritkan/unfavorite")
          .addOptions(fishList.slice(0, 24).map(fish => {
            const isFavorite = freshUser.favoriteFish?.includes(fish);
            const amount = freshUser.fishInventory?.get(fish) || 0;
            return {
              label: fish.length > 30 ? fish.substring(0, 27) + "..." : fish,
              value: fish,
              description: `${amount} ekor | ${isFavorite ? "⭐ Favorit" : "☆ Belum favorit"}`
            };
          }))
      );
      
      const backBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("menu_inventory").setLabel("🔙 Kembali").setStyle(ButtonStyle.Secondary)
      );
      
      return i.editReply({
        content: "⭐ **FAVORITE FISH**\n\nPilih ikan untuk menambah/menghapus dari favorit.\nIkan favorit TIDAK akan terjual saat menggunakan fitur jual ikan!",
        components: [select, backBtn]
      });
    }
    
    if (i.customId === "favorite_select") {
      const fishName = i.values[0];
      const freshUser = await getUser(i.user.id);
      
      if (!freshUser.favoriteFish) {
        await User.updateOne({ userId: i.user.id }, { $set: { favoriteFish: [] } });
      }
      
      const isFavorite = freshUser.favoriteFish?.includes(fishName);
      
      if (isFavorite) {
        await User.updateOne(
          { userId: i.user.id },
          { $pull: { favoriteFish: fishName } }
        );
        await i.update({ content: `✅ **${fishName}** dihapus dari favorit!`, components: [] });
      } else {
        await User.updateOne(
          { userId: i.user.id },
          { $push: { favoriteFish: fishName } }
        );
        await i.update({ content: `⭐ **${fishName}** ditambahkan ke favorit! Ikan ini tidak akan terjual.`, components: [] });
      }
    }
    
    // ===== ACTIVITY MENU =====
    if (i.customId === "menu_activity") {
      const freshUser = await getUser(i.user.id);
      return i.reply({
        embeds: [{
          title: "📊 Activity Points System",
          description: `Dapatkan points dari aktivitas!\n\n💬 Chat: +1 points/pesan\n📸 Gallery: +5 post, +2 komentar\n🎯 Reaction: +3 points\n🎙️ Voice: +1 points/2 menit (min 2 orang)\n\n⭐ Points: ${freshUser.points}\n🏆 Season: ${freshUser.seasonPoints}\n📈 Activity Points: ${freshUser.activityPoints}`,
          color: 0x00ff88
        }], flags: 64
      });
    }
    
    // ===== FISHING LEADERBOARD BUTTON =====
    if (i.customId === "menu_leaderboard") {
      await i.deferReply({ flags: 64 });
      const embed = await generateLeaderboardEmbed();
      return i.editReply({ embeds: [embed] });
    }
    
    // ===== ACTIVITY LEADERBOARD BUTTON =====
    if (i.customId === "menu_activity_leaderboard") {
      await i.deferReply({ flags: 64 });
      if (!cachedActivityLeaderboard) {
        await updateActivityLeaderboardCache();
      }
      return i.editReply({ embeds: [cachedActivityLeaderboard] });
    }
    
    // ===== PROFILE =====
    if (i.customId === "menu_profile") {
      await i.deferReply({ flags: 64 });
      
      const freshUser = await getUser(i.user.id);
      let totalFish = freshUser.totalFishCaught || 0;
      const totalJenis = freshUser.fishInventory?.size || 0;
      
      const rodLuck = rods[freshUser.equippedRod]?.luck || 1;
      const baitLuck = baits[freshUser.equippedBait]?.luck || 1;
      const channelLuck = channelBoost[i.channel?.id] || 1;
      const potionLuck = freshUser.activePotion ? freshUser.activePotion.luck : 1;
      const totalLuck = rodLuck * baitLuck * globalLuckBoost * channelLuck * potionLuck;
      
      const formattedRod = rodLuck.toFixed(2);
      const formattedBait = baitLuck.toFixed(2);
      const formattedGlobal = globalLuckBoost.toFixed(2);
      const formattedChannel = channelLuck.toFixed(2);
      const formattedPotion = potionLuck.toFixed(2);
      const formattedTotal = totalLuck.toFixed(2);
      
      const luckPercentage = Math.min(100, (totalLuck / 10) * 100);
      const barLength = Math.floor(luckPercentage / 10);
      const luckBar = "█".repeat(barLength) + "░".repeat(10 - barLength);
      
      let potionStatus = "Tidak aktif";
      if (freshUser.activePotion) {
        potionStatus = `${freshUser.activePotion.name}\n⏰ ${freshUser.activePotion.remain} menit`;
      }
      if (freshUser.activeCooldownPotion) {
        potionStatus += `\n⏰ Cooldown: ${freshUser.activeCooldownPotion.name} (${freshUser.activeCooldownPotion.remain} menit)`;
      }
      
      const profileEmbed = {
        embeds: [{
          title: `🎣 ${i.user.username}'s Fishing Profile`,
          color: 0x00ae86,
          thumbnail: { url: i.user.displayAvatarURL() },
          fields: [
            { name: "💰 **Credits**", value: `${freshUser.credits.toLocaleString()} credits`, inline: true },
            { name: "⭐ **Points**", value: `${freshUser.points.toLocaleString()} points`, inline: true },
            { name: "📈 **Activity Points**", value: `${freshUser.activityPoints.toLocaleString()} pts`, inline: true },
            { name: "🏆 **Total Fishing Credits**", value: `${freshUser.totalFishingCredits.toLocaleString()} credits`, inline: true },
            { name: "🐟 **Total Ikan**", value: `${totalFish} ekor`, inline: true },
            { name: "📋 **Jenis Ikan**", value: `${totalJenis} jenis`, inline: true },
            { name: "🎣 **Rod**", value: `${freshUser.equippedRod}\n\`${formattedRod}x luck\``, inline: true },
            { name: "🪱 **Bait**", value: `${freshUser.equippedBait}\n\`${formattedBait}x luck\``, inline: true },
            { name: "🧪 **Potion**", value: potionStatus, inline: true },
            { name: "✨ **Total Luck**", value: `\`${formattedTotal}x\`\n${luckBar}`, inline: false },
            { name: "📊 **Luck Breakdown**", value: `┌ 🎣 Rod: **${formattedRod}x**\n├ 🪱 Bait: **${formattedBait}x**\n├ 🧪 Potion: **${formattedPotion}x**\n├ 🌍 Global: **${formattedGlobal}x**\n└ 📡 Channel: **${formattedChannel}x**`, inline: false }
          ],
          footer: { text: "Semakin tinggi luck, semakin langka ikan yang didapat!" },
          timestamp: new Date()
        }]
      };
      
      return i.editReply(profileEmbed);
    }
    
    // ===== SHOP =====
    if (i.customId === "menu_shop") {
      const freshUser = await getUser(i.user.id);
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("shop_category")
          .setPlaceholder("🛒 Pilih Kategori")
          .addOptions([
            { label: "🎣 Rods", value: "rods" }, { label: "🪱 Baits", value: "baits" }, 
            { label: "🧪 Luck Potions", value: "luckpotions" }, { label: "⏰ Cooldown Potions", value: "cooldownpotions" }
          ])
      );
      return i.reply({ content: `💰 Credits: ${freshUser.credits}`, components: [row], flags: 64 });
    }
    
    if (i.customId === "shop_category") {
      const freshUser = await getUser(i.user.id);
      const category = i.values[0];
      let items = {};
      let title = "";
      
      if (category === "rods") {
        items = rods;
        title = "🎣 RODS SHOP";
      } else if (category === "baits") {
        items = baits;
        title = "🪱 BAITS SHOP";
      } else if (category === "luckpotions") {
        items = Object.fromEntries(Object.entries(potions).filter(([_, data]) => data.luck));
        title = "🧪 LUCK POTIONS SHOP";
      } else {
        items = Object.fromEntries(Object.entries(potions).filter(([_, data]) => data.cooldownReduce));
        title = "⏰ COOLDOWN POTIONS SHOP";
      }
      
      const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`shop_buy_${category}`)
          .setPlaceholder(`Pilih ${category}`)
          .addOptions(Object.entries(items).map(([name, data]) => ({
            label: name, value: name,
            description: data.luck ? `Luck: ${data.luck}x | ${data.duration} menit - ${data.price}💰` :
                        data.cooldownReduce ? `Cooldown: -${data.cooldownReduce*100}% | ${data.duration} menit - ${data.price}💰` :
                        `💰 ${data.price || 0}`
          })))
      );
      const backBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("menu_shop").setLabel("🔙 Back").setStyle(ButtonStyle.Secondary));
      return i.update({ content: `${title}\n\n💰 Credits: ${freshUser.credits}`, components: [select, backBtn] });
    }
    
    if (i.customId.startsWith("shop_buy_")) {
      const lockKey = await acquireLock(i.user.id, "shop", 5000);
      if (!lockKey) {
        return i.reply({ content: "⏳ Proses pembelian sedang berjalan, tunggu sebentar!", flags: 64 });
      }
      
      try {
        const freshUser = await getUser(i.user.id);
        const category = i.customId.replace("shop_buy_", "");
        const itemName = i.values[0];
        let itemData, price;
        
        if (category === "rods") {
          itemData = rods[itemName];
          price = itemData.price;
        } else if (category === "baits") {
          itemData = baits[itemName];
          price = itemData.price;
        } else {
          itemData = potions[itemName];
          price = itemData.price;
        }
        
        if (!itemData) return i.reply({ content: "❌ Item tidak ditemukan!", flags: 64 });
        
        const currentQty = freshUser.items?.get(itemName) || 0;
        if ((category === "rods" || category === "baits") && currentQty > 0) {
          return i.reply({ content: `❌ Kamu sudah memiliki **${itemName}**!`, flags: 64 });
        }
        
        if (freshUser.credits < price) {
          return i.reply({ content: `❌ Credit kurang! Butuh ${price}💰`, flags: 64 });
        }
        
        await User.updateOne(
          { userId: i.user.id, credits: { $gte: price } },
          { $inc: { credits: -price, [`items.${itemName}`]: 1 } }
        );
        
        const updatedUser = await getUser(i.user.id);
        
        const backBtn = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("menu_shop").setLabel("🔙 Kembali ke Shop").setStyle(ButtonStyle.Primary)
        );
        
        let message = `✅ **${itemName} berhasil dibeli!**\n💸 Credits terpakai: ${price}💰\n💰 Sisa credits: ${updatedUser.credits.toLocaleString()}💰`;
        if (category === "rods") message += `\n🎣 Gunakan Inventory untuk equip rod baru!`;
        else if (category === "baits") message += `\n🪱 Gunakan Inventory untuk equip bait baru!`;
        else message += `\n🧪 Gunakan menu Potion untuk mengaktifkan!`;
        
        return i.update({ content: message, components: [backBtn] });
      } finally {
        releaseLock(lockKey);
      }
    }
    
    // ===== POTION MENU (Legacy) =====
    if (i.customId === "menu_potion") {
      await i.deferReply({ flags: 64 });
      
      const freshUser = await getUser(i.user.id);
      const userPotions = Array.from(freshUser.items?.entries() || [])
        .filter(([name]) => potions[name]);
      
      if (userPotions.length === 0) {
        const shopBtn = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("menu_shop").setLabel("🛒 Beli Potion").setStyle(ButtonStyle.Primary)
        );
        return i.editReply({ content: "🧪 Tidak ada potion! Beli di Shop.", components: [shopBtn] });
      }
      
      const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("use_potion")
          .setPlaceholder("🧪 Pilih potion")
          .addOptions(userPotions.map(([p, qty]) => ({
            label: `${p} ${qty > 1 ? `(x${qty})` : ''}`,
            value: p,
            description: potions[p].luck ? `Luck: ${potions[p].luck}x | ${potions[p].duration} menit` :
                        `Cooldown: -${potions[p].cooldownReduce*100}% | ${potions[p].duration} menit`
          })))
      );
      const backBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("menu_inventory").setLabel("🔙 Kembali").setStyle(ButtonStyle.Secondary));
      return i.editReply({ content: "🧪 Pilih potion:", components: [select, backBtn] });
    }
    
    if (i.customId === "use_potion") {
      const lockKey = await acquireLock(i.user.id, "potion", 5000);
      if (!lockKey) {
        return i.reply({ content: "⏳ Proses sedang berjalan, tunggu sebentar!", flags: 64 });
      }
      
      try {
        const potionName = i.values[0];
        const potion = potions[potionName];
        const freshUser = await getUser(i.user.id);
        
        if (potion.luck && freshUser.activePotion) {
          return i.reply({ content: "❌ Masih ada luck potion aktif!", flags: 64 });
        }
        if (potion.cooldownReduce && freshUser.activeCooldownPotion) {
          return i.reply({ content: "❌ Masih ada cooldown potion aktif!", flags: 64 });
        }
        
        const currentQty = freshUser.items?.get(potionName) || 0;
        if (currentQty === 0) {
          return i.reply({ content: "❌ Potion tidak ditemukan!", flags: 64 });
        }
        
        await removeItemFromInventory(i.user.id, potionName, 1);
        
        if (potion.luck) {
          await User.updateOne(
            { userId: i.user.id },
            { $set: { activePotion: { name: potionName, luck: potion.luck, duration: potion.duration, remain: potion.duration, expiresAt: Date.now() + (potion.duration * 60 * 1000) } } }
          );
        } else if (potion.cooldownReduce) {
          await User.updateOne(
            { userId: i.user.id },
            { $set: { activeCooldownPotion: { name: potionName, cooldownReduce: potion.cooldownReduce, duration: potion.duration, remain: potion.duration, expiresAt: Date.now() + (potion.duration * 60 * 1000) } } }
          );
        }
        
        setTimeout(async () => {
          const currentUser = await getUser(i.user.id);
          if (potion.luck && currentUser.activePotion?.name === potionName) {
            await User.updateOne({ userId: i.user.id }, { $set: { activePotion: null } });
          }
          if (potion.cooldownReduce && currentUser.activeCooldownPotion?.name === potionName) {
            await User.updateOne({ userId: i.user.id }, { $set: { activeCooldownPotion: null } });
          }
        }, potion.duration * 60 * 1000);
        
        const bonus = potion.luck ? `+${((potion.luck-1)*100)}% luck` : `-${potion.cooldownReduce*100}% cooldown`;
        return i.update({ content: `✅ ${potionName} aktif! ${bonus} selama ${potion.duration} menit`, components: [] });
      } finally {
        releaseLock(lockKey);
      }
    }
    
    // ===== REDEEM =====
    if (i.customId === "menu_redeem") {
      const freshUser = await getUser(i.user.id);
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("reward_category")
          .setPlaceholder("🎁 Kategori Hadiah")
          .addOptions([{ label: "💰 Tunai", value: "cash" }])
      );
      return i.reply({ content: `🎁 REWARD CENTER\n⭐ Points: ${freshUser.points}`, components: [row], flags: 64 });
    }
    
    if (i.customId === "reward_category") {
      const category = i.values[0];
      const categoryRewards = Object.entries(REWARDS).filter(([_, data]) => data.type === category);
      const select = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("reward_select")
          .setPlaceholder("Pilih hadiah")
          .addOptions(categoryRewards.map(([name, data]) => ({ label: name, value: name, description: `${data.cost} pts` })))
      );
      return i.update({ content: `🎁 Pilih hadiah:`, components: [select] });
    }
    
    if (i.customId === "reward_select") {
      const lockKey = await acquireLock(i.user.id, "redeem", 5000);
      if (!lockKey) {
        return i.reply({ content: "⏳ Proses sedang berjalan, tunggu sebentar!", flags: 64 });
      }
      
      try {
        const rewardName = i.values[0];
        const reward = REWARDS[rewardName];
        const freshUser = await getUser(i.user.id);
        
        if (freshUser.redeemedRewards?.includes(rewardName)) {
          return i.reply({ content: `❌ Hadiah **${rewardName}** sudah pernah ditukar!`, flags: 64 });
        }
        
        if (freshUser.points < reward.cost) {
          return i.reply({ content: `❌ Points kurang! Butuh ${reward.cost}`, flags: 64 });
        }
        
        await User.updateOne(
          { userId: i.user.id, points: { $gte: reward.cost } },
          { $inc: { points: -reward.cost }, $push: { redeemedRewards: rewardName } }
        );
        
        const owner = await client.users.fetch(OWNER_ID);
        const embed = new EmbedBuilder()
          .setTitle("🎁 PENUKARAN HADIAH")
          .setDescription(`Ada yang menukar hadiah!`)
          .setColor(0x00ff00)
          .addFields(
            { name: "👤 User", value: `<@${i.user.id}>`, inline: true },
            { name: "🎁 Hadiah", value: `${reward.emoji} ${rewardName}`, inline: true },
            { name: "💰 Biaya", value: `${reward.cost.toLocaleString()} points`, inline: true },
            { name: "📦 Nilai", value: reward.value, inline: true }
          )
          .setTimestamp();
        
        await owner.send({ embeds: [embed] }).catch(() => {});
        
        const updatedUser = await getUser(i.user.id);
        return i.update({ content: `✅ ${reward.emoji} **${rewardName}** berhasil ditukar!\n📦 Nilai: ${reward.value}\n💰 Sisa points: ${updatedUser.points.toLocaleString()}\n\n📌 Admin akan segera memproses!`, components: [] });
      } finally {
        releaseLock(lockKey);
      }
    }
    
    // ===== FISH =====
    if (i.customId === "menu_fish") {
      const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("fish").setLabel("🎣 Mancing").setStyle(ButtonStyle.Primary));
      return i.reply({ content: "Klik tombol di bawah!", components: [row], flags: 64 });
    }
    
    if (i.customId === "fish") {
      if (!FISHING_CHANNELS.includes(i.channel.id)) {
        return i.reply({ content: "❌ Bukan channel mancing!", flags: 64 });
      }
      
      const lockKey = await acquireLock(i.user.id, "fish", 15000);
      if (!lockKey) {
        return i.reply({ content: "⏳ Sedang memancing, tunggu sebentar!", flags: 64 });
      }
      
      try {
        const freshUser = await getUser(i.user.id);
        
        let cooldownTime = 10000;
        if (freshUser.activeCooldownPotion) {
          cooldownTime = 10000 * (1 - freshUser.activeCooldownPotion.cooldownReduce);
        }
        
        const now = Date.now();
        if (freshUser.lastFishTime && now - freshUser.lastFishTime < cooldownTime) {
          const remaining = Math.ceil((cooldownTime - (now - freshUser.lastFishTime)) / 1000);
          releaseLock(lockKey);
          return i.reply({ content: `⏳ Cooldown ${remaining} detik lagi!`, flags: 64 });
        }
        
        await User.updateOne({ userId: i.user.id }, { $set: { lastFishTime: now } });
        
        const channelLuck = channelBoost[i.channel.id] || 1;
        const rodLuck = rods[freshUser.equippedRod]?.luck || 1;
        const baitLuck = baits[freshUser.equippedBait]?.luck || 1;
        const potionLuck = freshUser.activePotion ? freshUser.activePotion.luck : 1;
        const luck = rodLuck * baitLuck * globalLuckBoost * channelLuck * potionLuck;
        
        const fish = getFish(i.channel.id, luck);
        const mutation = getMutation();
        const mutationBonus = getMutationBonus(mutation);
        const finalName = mutation ? `${mutation} ${fish.name}` : fish.name;
        const totalValue = fish.value + mutationBonus;
        
        await addFishToInventory(i.user.id, finalName, 1);
        await User.updateOne(
          { userId: i.user.id },
          { $inc: { credits: totalValue, totalFishingCredits: totalValue, seasonFishCaught: 1 } }
        );
        
        let replyMsg = `🎣 ${finalName} (${fish.rarity}) +${totalValue}💰`;
        if (mutation) replyMsg += `\n✨ Mutasi ${mutation} +${mutationBonus}💰`;
        
        await i.reply({ content: replyMsg, flags: 64 });
      } finally {
        releaseLock(lockKey);
      }
    }
    
    // ===== ADMIN PANEL =====
    if (i.customId === "admin_panel") {
      if (!ADMIN_IDS.includes(i.user.id)) return i.reply({ content: "❌ Bukan admin!", flags: 64 });
      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("admin_select")
          .setPlaceholder("Admin Menu")
          .addOptions([
            { label: "Add Credit", value: "addcredit" }, { label: "Remove Credit", value: "removecredit" },
            { label: "Add Points", value: "addpoints" }, { label: "Check Profile", value: "checkprofile" },
            { label: "Global Luck", value: "globalluck" }, { label: "Channel Luck", value: "setluck" },
            { label: "Anti-Exploit Logs", value: "antiexploit" }
          ])
      );
      return i.reply({ content: "👑 ADMIN PANEL", components: [row], flags: 64 });
    }
    
    if (i.customId === "admin_select") {
      const action = i.values[0];
      const cmds = {
        addcredit: "!addcredit @user jumlah", removecredit: "!removecredit @user jumlah",
        addpoints: "!addpoints @user jumlah", checkprofile: "!checkprofile @user",
        globalluck: "!globalluck nilai", setluck: "!setluck channelId nilai",
        antiexploit: "⚠️ Logs ada di console"
      };
      return i.update({ content: cmds[action] || "Command not found", components: [] });
    }
    
  } catch (error) {
    console.error("❌ Error dalam interaction:", error);
    try {
      if (!i.replied && !i.deferred) {
        await i.reply({ content: "❌ Terjadi kesalahan, silakan coba lagi!", flags: 64 });
      } else {
        await i.editReply({ content: "❌ Terjadi kesalahan, silakan coba lagi!" });
      }
    } catch (e) {
      console.error("Gagal mengirim error response:", e);
    }
  }
});

// ================= COMMANDS =================
client.on("messageCreate", async (msg) => {
  if (msg.author.bot) return;
  
  if (msg.content.startsWith("!transfer")) {
    const target = msg.mentions.users.first();
    const amount = parseInt(msg.content.split(" ")[2]);
    if (!target || isNaN(amount) || amount < 100) return msg.reply("❌ !transfer @user jumlah (minimal 100)");
    
    const lockKey = await acquireLock(msg.author.id, "transfer", 5000);
    if (!lockKey) {
      return msg.reply("⏳ Proses transfer sedang berjalan, tunggu sebentar!");
    }
    
    try {
      const sender = await getUser(msg.author.id);
      const receiver = await getUser(target.id);
      
      if (sender.credits < amount) return msg.reply("❌ Credit tidak cukup");
      
      await User.updateOne({ userId: msg.author.id }, { $inc: { credits: -amount } });
      await User.updateOne({ userId: target.id }, { $inc: { credits: amount } });
      
      return msg.reply(`✅ Transfer ${amount} credits ke ${target.username}`);
    } finally {
      releaseLock(lockKey);
    }
  }
  
  if (msg.content.startsWith("!convert")) {
    const amount = parseInt(msg.content.split(" ")[1]);
    if (isNaN(amount) || amount <= 0) return msg.reply("❌ !convert jumlah (1 point = 100 credits)");
    
    const lockKey = await acquireLock(msg.author.id, "convert", 5000);
    if (!lockKey) {
      return msg.reply("⏳ Proses convert sedang berjalan, tunggu sebentar!");
    }
    
    try {
      const user = await getUser(msg.author.id);
      const creditsNeeded = amount * 100;
      if (user.credits < creditsNeeded) return msg.reply(`❌ Butuh ${creditsNeeded} credits`);
      
      await User.updateOne(
        { userId: msg.author.id, credits: { $gte: creditsNeeded } },
        { $inc: { credits: -creditsNeeded, points: amount, seasonPoints: amount, activityPoints: amount } }
      );
      
      const updatedUser = await getUser(msg.author.id);
      return msg.reply(`✅ Convert ${amount} points! Sisa credits: ${updatedUser.credits}`);
    } finally {
      releaseLock(lockKey);
    }
  }
  
  if (msg.content === "!points") {
    const user = await getUser(msg.author.id);
    return msg.reply(`⭐ Points: ${user.points} | 🏆 Season: ${user.seasonPoints} | 📈 Activity: ${user.activityPoints} | 💰 Total Fishing: ${user.totalFishingCredits.toLocaleString()}`);
  }
  
  if (!ADMIN_IDS.includes(msg.author.id)) return;
  
  if (msg.content.startsWith("!addcredit")) {
    const target = msg.mentions.users.first();
    const amount = parseInt(msg.content.split(" ")[2]);
    if (!target || isNaN(amount)) return;
    await User.updateOne({ userId: target.id }, { $inc: { credits: amount } });
    return msg.reply(`✅ +${amount} credits ke ${target.username}`);
  }
  
  if (msg.content.startsWith("!removecredit")) {
    const target = msg.mentions.users.first();
    const amount = parseInt(msg.content.split(" ")[2]);
    if (!target || isNaN(amount)) return;
    await User.updateOne({ userId: target.id, credits: { $gte: amount } }, { $inc: { credits: -amount } });
    return msg.reply(`❌ -${amount} credits dari ${target.username}`);
  }
  
  if (msg.content.startsWith("!addpoints")) {
    const target = msg.mentions.users.first();
    const amount = parseInt(msg.content.split(" ")[2]);
    if (!target || isNaN(amount)) return;
    await User.updateOne({ userId: target.id }, { $inc: { points: amount, seasonPoints: amount, activityPoints: amount } });
    return msg.reply(`✅ +${amount} points ke ${target.username}`);
  }
  
  if (msg.content.startsWith("!checkprofile")) {
    const target = msg.mentions.users.first();
    if (!target) return;
    const u = await getUser(target.id);
    return msg.reply(`👤 ${target.username}\n⭐ Points: ${u.points}\n💰 Credits: ${u.credits}\n🏆 Season: ${u.seasonPoints}\n📈 Activity: ${u.activityPoints}\n💰 Total Fishing: ${u.totalFishingCredits.toLocaleString()}\n🐟 Total Ikan: ${u.totalFishCaught || 0}\n🎣 Season Fish: ${u.seasonFishCaught}`);
  }
  
  if (msg.content.startsWith("!globalluck")) {
    const val = parseFloat(msg.content.split(" ")[1]);
    if (isNaN(val)) return;
    globalLuckBoost = val;
    return msg.reply(`🌍 Global luck: x${globalLuckBoost}`);
  }
  
  if (msg.content.startsWith("!setluck")) {
    const args = msg.content.split(" ");
    if (!args[1] || !args[2]) return;
    channelBoost[args[1]] = parseFloat(args[2]);
    return msg.reply(`✅ Channel luck set ke x${channelBoost[args[1]]}`);
  }
});

// ================= UPDATE POTION =================
setInterval(async () => {
  const now = Date.now();
  await User.updateMany(
    { "activePotion.expiresAt": { $lt: now } },
    { $set: { activePotion: null } }
  );
  await User.updateMany(
    { "activeCooldownPotion.expiresAt": { $lt: now } },
    { $set: { activeCooldownPotion: null } }
  );
}, 60000);

// ================= READY =================
client.once("ready", async () => {
  console.log("🔥 SUPER BOT FISHING BY KAME READY!");
  console.log("📋 All systems online!");
  console.log("🔒 Anti-exploit, anti-double-click, dan race condition protection AKTIF!");
  console.log("✅ Inventory system menggunakan dropdown menu!");
  console.log("✅ Use item system (Rod/Bait/Potion) berfungsi!");
  console.log("✅ Sistem jual ikan dengan quantity validation AKTIF!");
  console.log("🏆 Fishing Leaderboard update setiap 24 jam!");
  console.log("📊 Activity Leaderboard cache update setiap 5 menit, publikasi setiap 24 jam!");
  console.log("👑 Owner tidak ikut leaderboard!");
  console.log("🎣 13 Rod & 11 Bait tersedia!");
  console.log("💰 Hadiah Tunai dengan harga 2x lipat!");
  console.log("🌑 Zona Void peluang ikan langka lebih kecil!");
  console.log("⭐ Sistem Favorite Fish Aktif!");
  console.log("⏰ Cooldown Potions Aktif (15% & 25%)!");
  console.log("🐙 4 Boss Baru dengan peluang 1%!");
  
  if (leaderboardUpdateInterval) clearInterval(leaderboardUpdateInterval);
  setTimeout(() => updateLeaderboard(), 5000);
  leaderboardUpdateInterval = setInterval(() => updateLeaderboard(), 86400000);
  
  setTimeout(() => updateActivityLeaderboardCache(), 3000);
  setInterval(() => updateActivityLeaderboardCache(), 300000);
  
  setTimeout(() => publishActivityLeaderboard(), 10000);
  setInterval(() => publishActivityLeaderboard(), 86400000);
  
  spawnBoss();
});

client.login(process.env.TOKEN);