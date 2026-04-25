const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    EmbedBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");

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

// ================= SECRET NOTIFICATION =================
async function sendSecretNotification(client, userId, fishName, fishValue, channelId, isBoss = false) {
    try {
        const channel = await client.channels.fetch(ANNOUNCE_CHANNEL);
        if (!channel) return;
        
        let username = "Unknown";
        try {
            const user = await client.users.fetch(userId);
            username = user.username;
        } catch {}
        
        const effects = [
            "💥 **LEDAKAN COSMIC!** 💥", "🌊 **LAUTAN BERGETAR!** 🌊", "⚡ **KILAT MISTERIUS!** ⚡",
            "🔥 **API LEGENDA!** 🔥", "✨ **KEMUNCULAN MAHLUK AGUNG!** ✨", "🎣 **REKOR DUNIA TERPECAHKAN!** 🎣",
            "👑 **RAJA LAUT TERSINGKAP!** 👑", "🌀 **PUSARAN DIMENSI LAIN!** 🌀", "🌟 **BERKAH DEWA LAUT!** 🌟",
            "🎉 **KEBERUNTUNGAN TINGKAT DEWA!** 🎉", "💎 **HARTA KARUN LAUTAN!** 💎"
        ];
        
        const randomEffect = effects[Math.floor(Math.random() * effects.length)];
        const celebrationEmojis = ["🎣", "🐟", "🎉", "✨", "💎", "👑", "🌟", "⚡", "🔥", "🌊", "🌀", "💫", "🏆", "🎊"];
        const randomEmojis = celebrationEmojis.sort(() => 0.5 - Math.random()).slice(0, 6).join(" ");
        
        const embed = new EmbedBuilder()
            .setTitle(`${randomEmojis} **${randomEffect}** ${randomEmojis}`)
            .setDescription(
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `**🎣 ${username}** berhasil mendapatkan **LEGENDA ${isBoss ? 'BOSS' : 'SECRET'}**!\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `🐟 **Ikan:** ${fishName}\n` +
                `💰 **Hadiah:** +${fishValue.toLocaleString()} credits\n` +
                `📍 **Zona:** ${getZoneName(channelId)}\n` +
                `📊 **Rarity:** 🔮 **${isBoss ? 'BOSS SECRET' : 'SECRET'}** 🔮\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `✨ **Selamat kepada ${username}!** ✨\n` +
                `🎉 **Keberuntungan sejati telah datang!** 🎉`
            )
            .setColor(0xff44ff)
            .setThumbnail("https://cdn.discordapp.com/emojis/1025605498691330108.png")
            .setFooter({ text: `Peluang: 1 dari 5.000.000 • ${new Date().toLocaleString('id-ID')}` })
            .setTimestamp();
        
        await channel.send({ content: `@everyone ${randomEmojis} **✨ SECRET FISH CAUGHT! ✨** ${randomEmojis}`, embeds: [embed] });
        console.log(`🎉 SECRET FISH CAUGHT! ${username} got ${fishName} worth ${fishValue} credits!`);
    } catch (error) {
        console.error("Error sending secret notification:", error);
    }
}

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

// ================= COOLDOWN & ANTI-EXPLOIT =================
const cooldowns = new Map();
const processingLocks = new Map();

function acquireLock(userId, action, timeout = 5000) {
    const key = `${userId}:${action}`;
    if (processingLocks.has(key)) return false;
    processingLocks.set(key, Date.now());
    setTimeout(() => {
        if (processingLocks.get(key)) processingLocks.delete(key);
    }, timeout);
    return key;
}

function releaseLock(key) {
    if (key && processingLocks.has(key)) processingLocks.delete(key);
}

function hasCooldown(userId, action, cooldownMs = 2000) {
    const key = `${userId}:${action}`;
    const lastUsed = cooldowns.get(key);
    if (lastUsed && Date.now() - lastUsed < cooldownMs) return true;
    cooldowns.set(key, Date.now());
    return false;
}

// ================= LUCK SYSTEM =================
let globalLuckBoost = 1;
let channelBoost = {};
let activeBoss = null;
let bossSpawnTime = null;
let bossDespawnTimeout = null;
let bossSpawnInterval = null;

const bossList = [
    { name: "👑 Kraken Purba", rarity: "Secret", value: 55000, emoji: "🐙" },
    { name: "👑 Naga Laut", rarity: "Secret", value: 58000, emoji: "🐉" },
    { name: "👑 Leviathan Abyss", rarity: "Secret", value: 60000, emoji: "🌊" },
    { name: "👑 Poseidon Wrath", rarity: "Secret", value: 55000, emoji: "⚡" }
];

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

const potions = {
    "Potion Luck 10%": { luck: 1.1, duration: 30, price: 500, emoji: "🧪" },
    "Potion Luck 25%": { luck: 1.25, duration: 30, price: 1000, emoji: "🧪" },
    "Potion Luck 50%": { luck: 1.5, duration: 30, price: 2000, emoji: "🧪" },
    "Elixir Luck 100%": { luck: 2.0, duration: 60, price: 5000, emoji: "✨" },
    "Potion Cooldown 15%": { cooldownReduce: 0.15, duration: 30, price: 10000, emoji: "⏰" },
    "Potion Cooldown 25%": { cooldownReduce: 0.25, duration: 30, price: 20000, emoji: "⌛" }
};

const REWARDS = {
    "Tunai Rp5.000": { cost: 8000, type: "cash", value: "Rp5.000", emoji: "💰" },
    "Tunai Rp10.000": { cost: 16000, type: "cash", value: "Rp10.000", emoji: "💰" },
    "Tunai Rp20.000": { cost: 32000, type: "cash", value: "Rp20.000", emoji: "💰" },
    "Tunai Rp50.000": { cost: 76000, type: "cash", value: "Rp50.000", emoji: "💰" },
    "Tunai Rp100.000": { cost: 150000, type: "cash", value: "Rp100.000", emoji: "💰" }
};

// ================= RARITY =================
// Peluang Secret: 1 dari 5.000.000
const rarityChances = {
    Common: 1 / 75,
    Uncommon: 1 / 500,
    Rare: 1 / 2000,
    Epic: 1 / 15000,
    Legendary: 1 / 100000,
    Mythic: 1 / 500000,
    Secret: 1 / 5000000  // 1 dari 5.000.000
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
        { name: "Void Minnow", rarity: "Common", value: 15 },
        { name: "Dark Carp", rarity: "Common", value: 18 },
        { name: "Abyss Guppy", rarity: "Common", value: 12 },
        { name: "Shadow Tetra", rarity: "Common", value: 14 },
        { name: "Night Rasbora", rarity: "Common", value: 16 },
        { name: "Doom Molly", rarity: "Common", value: 13 },
        { name: "Dark Platy", rarity: "Common", value: 11 },
        { name: "Void Swordtail", rarity: "Common", value: 17 },
        { name: "Abyss Danio", rarity: "Common", value: 10 },
        { name: "Shadow Barb", rarity: "Common", value: 15 },
        { name: "Void Eel", rarity: "Uncommon", value: 35 },
        { name: "Dark Angler", rarity: "Uncommon", value: 40 },
        { name: "Abyss Catfish", rarity: "Uncommon", value: 38 },
        { name: "Shadow Pike", rarity: "Uncommon", value: 42 },
        { name: "Night Perch", rarity: "Uncommon", value: 36 },
        { name: "Doom Trout", rarity: "Uncommon", value: 39 },
        { name: "Void Bass", rarity: "Uncommon", value: 37 },
        { name: "Dark Salmon", rarity: "Uncommon", value: 41 },
        { name: "Abyss Char", rarity: "Uncommon", value: 34 },
        { name: "Shadow Gar", rarity: "Uncommon", value: 43 },
        { name: "Void Pike", rarity: "Epic", value: 280 },
        { name: "Abyssal Cod", rarity: "Epic", value: 300 },
        { name: "Nether Salmon", rarity: "Legendary", value: 2400 },
        { name: "Obsidian Tuna", rarity: "Legendary", value: 2600 },
        { name: "Void Kraken", rarity: "Mythic", value: 8000 },
        { name: "Abyss Leviathan", rarity: "Mythic", value: 9000 },
        { name: "Darkness Dragon", rarity: "Secret", value: 60000 },
        { name: "Cthulhu Void", rarity: "Secret", value: 100000 },
        { name: "Void God", rarity: "Legendary", value: 4000 },
        { name: "Eater of Worlds", rarity: "Legendary", value: 5000 },
        { name: "Cosmic Fish", rarity: "Legendary", value: 3600 },
        { name: "Singularity", rarity: "Legendary", value: 4400 },
        { name: "Black Hole", rarity: "Legendary", value: 6000 },
        { name: "Void Leviathan", rarity: "Legendary", value: 5600 }
    ]
};

// ================= LOGIC FISHING =================
function rollRarity(luck, channelId) {
    const r = Math.random();
    const isVoid = channelId === "1492077899870765166";
    let modifier = isVoid ? 0.5 : 1;

    if (r < rarityChances.Secret * luck * modifier) return "Secret";
    if (r < rarityChances.Mythic * luck * modifier) return "Mythic";
    if (r < rarityChances.Legendary * luck * modifier) return "Legendary";
    if (r < rarityChances.Epic * luck * modifier) return "Epic";
    if (r < rarityChances.Rare * luck * modifier) return "Rare";
    if (r < rarityChances.Uncommon * luck * modifier) return "Uncommon";
    return "Common";
}

function getFish(channelId, luck) {
    if (activeBoss && activeBoss.channel === channelId && Math.random() < 0.01) {
        const b = { ...activeBoss };
        clearBossDespawn();
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

// ================= BOSS SYSTEM WITH DESPAWN =================
function clearBossDespawn() {
    if (bossDespawnTimeout) {
        clearTimeout(bossDespawnTimeout);
        bossDespawnTimeout = null;
    }
}

function scheduleBossDespawn(client) {
    clearBossDespawn();
    
    bossDespawnTimeout = setTimeout(() => {
        if (activeBoss) {
            const bossChannel = activeBoss.channel;
            client.channels.fetch(bossChannel).then(ch => {
                ch.send(`🌑 **BOSS DESPAWN!** 🌑\n${activeBoss.emoji} **${activeBoss.name}** (${activeBoss.rarity}) telah menghilang karena tidak ada yang menangkapnya!\n⏰ Boss akan muncul kembali dalam 3 jam di zona yang berbeda.`);
            }).catch(() => {});
            
            console.log(`🌑 Boss ${activeBoss.name} despawned - no one caught it`);
            activeBoss = null;
            bossSpawnTime = null;
        }
    }, 3 * 60 * 60 * 1000);
}

function spawnBoss(client) {
    if (activeBoss) {
        console.log(`⚠️ Boss ${activeBoss.name} masih ada, tidak akan spawn boss baru`);
        return;
    }
    
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
    scheduleBossDespawn(client);

    client.channels.fetch(channel).then(ch => {
        ch.send(`🎣 **BOSS SPOTTED!** 🎣\n${activeBoss.emoji} **${activeBoss.name}** (${activeBoss.rarity}) muncul di channel ini!\n💰 Hadiah: **${activeBoss.value.toLocaleString()} credits**\n✨ Peluang menangkap: **1%** (Sangat Langka!)\n⏰ Boss akan menghilang dalam **3 jam** jika tidak ada yang menangkap!`);
    }).catch(() => {});
    
    console.log(`🎣 Boss ${activeBoss.name} spawned in channel ${channel}`);
}

function startBossScheduler(client) {
    if (bossSpawnInterval) {
        clearInterval(bossSpawnInterval);
    }
    
    setTimeout(() => {
        if (!activeBoss) {
            spawnBoss(client);
        }
    }, 5000);
    
    bossSpawnInterval = setInterval(() => {
        if (!activeBoss) {
            spawnBoss(client);
        } else {
            console.log(`⚠️ Boss masih aktif, skip spawn. Akan cek lagi 3 jam kemudian.`);
            setTimeout(() => {
                if (!activeBoss) {
                    spawnBoss(client);
                }
            }, 60 * 60 * 1000);
        }
    }, 3 * 60 * 60 * 1000);
}

// ================= LEADERBOARD =================
let leaderboardMessageId = null;
let leaderboardUpdateInterval = null;

async function generateLeaderboardEmbed(client, UserModel) {
    const topUsers = await UserModel.find({ userId: { $ne: OWNER_ID } })
        .sort({ totalFishingCredits: -1 })
        .limit(50);

    const leaderboardData = [];
    for (const u of topUsers) {
        let name = "Unknown";
        try {
            const d = await client.users.fetch(u.userId);
            name = d.username;
        } catch { }
        leaderboardData.push({
            username: name,
            fishingCredits: u.totalFishingCredits || 0,
            fishCaught: u.totalFishCaught || 0
        });
    }

    if (leaderboardData.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle("🏆 **FISHING LEADERBOARD** 🏆")
            .setDescription("Belum ada data pemain. Ajak teman-teman untuk mulai memancing! 🎣")
            .setColor(0xfacc15)
            .setThumbnail("https://cdn.discordapp.com/emojis/1025605498691330108.png")
            .setFooter({ text: `🏆 Owner tidak masuk leaderboard` })
            .setTimestamp();
        return embed;
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
        const medal = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        const rankIcon = i === 0 ? "🌟" : i === 1 ? "⭐" : i === 2 ? "✨" : "▫️";
        top10List += `${rankIcon} **${medal}** \`${u.username}\` • \`💰 ${u.fishingCredits.toLocaleString()} credits\` • 🎣 ${u.fishCaught}\n`;
    }

    const embed = new EmbedBuilder()
        .setTitle("🏆 **FISHING LEADERBOARD** 🏆")
        .setDescription(`**Top Anglers - Total Credits dari Mancing**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🎯 **PODIUM** 🎯\n${podium.join("\n\n")}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 **TOP 10 PLAYERS**\n${top10List}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n👑 Owner tidak masuk leaderboard`)
        .setColor(0xfacc15)
        .setThumbnail("https://cdn.discordapp.com/emojis/1025605498691330108.png")
        .setFooter({ text: `🏆 Auto-update setiap 24 jam` })
        .setTimestamp();

    return embed;
}

async function updateLeaderboard(client, UserModel) {
    try {
        const embed = await generateLeaderboardEmbed(client, UserModel);
        const channel = await client.channels.fetch(ANNOUNCE_CHANNEL);
        if (!channel) return;

        if (leaderboardMessageId) {
            try {
                const msg = await channel.messages.fetch(leaderboardMessageId);
                await msg.edit({ embeds: [embed] });
            } catch {
                const msg = await channel.send({ embeds: [embed] });
                leaderboardMessageId = msg.id;
            }
        } else {
            const msg = await channel.send({ embeds: [embed] });
            leaderboardMessageId = msg.id;
        }
    } catch (error) {
        console.error("Gagal update fishing leaderboard:", error);
    }
}

// ================= POINTS LEADERBOARD =================
let pointsLeaderboardMessageId = null;

async function generatePointsLeaderboardEmbed(client, UserModel) {
    const topUsers = await UserModel.find({ userId: { $ne: OWNER_ID } })
        .sort({ points: -1 })
        .limit(50);

    const leaderboardData = [];
    for (const u of topUsers) {
        let name = "Unknown";
        try {
            const d = await client.users.fetch(u.userId);
            name = d.username;
        } catch { }
        leaderboardData.push({
            username: name,
            points: u.points || 0
        });
    }

    if (leaderboardData.length === 0) {
        const embed = new EmbedBuilder()
            .setTitle("⭐ **POINTS LEADERBOARD** ⭐")
            .setDescription("Belum ada data pemain. Ajak teman-teman untuk mulai bermain! 🎮")
            .setColor(0xffd700)
            .setThumbnail("https://cdn.discordapp.com/emojis/1025605498691330108.png")
            .setFooter({ text: `⭐ Owner tidak masuk leaderboard • 1 point = 100 credits` })
            .setTimestamp();
        return embed;
    }

    const podium = [];
    const medals = ["🥇", "🥈", "🥉"];
    for (let i = 0; i < Math.min(3, leaderboardData.length); i++) {
        const p = leaderboardData[i];
        podium.push(`${medals[i]} **${p.username}**\n   \`⭐ ${p.points.toLocaleString()} points\``);
    }

    let top10List = "";
    for (let i = 0; i < Math.min(10, leaderboardData.length); i++) {
        const u = leaderboardData[i];
        const medal = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
        const rankIcon = i === 0 ? "🌟" : i === 1 ? "⭐" : i === 2 ? "✨" : "▫️";
        top10List += `${rankIcon} **${medal}** \`${u.username}\` • \`⭐ ${u.points.toLocaleString()} points\`\n`;
    }

    const embed = new EmbedBuilder()
        .setTitle("⭐ **POINTS LEADERBOARD** ⭐")
        .setDescription(`**Top Players by Points**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🎯 **PODIUM** 🎯\n${podium.join("\n\n")}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📊 **TOP 10 PLAYERS**\n${top10List}\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n👑 Owner tidak masuk leaderboard`)
        .setColor(0xffd700)
        .setThumbnail("https://cdn.discordapp.com/emojis/1025605498691330108.png")
        .setFooter({ text: `⭐ Auto-update setiap 24 jam • 1 point = 100 credits` })
        .setTimestamp();

    return embed;
}

async function updatePointsLeaderboard(client, UserModel) {
    try {
        const embed = await generatePointsLeaderboardEmbed(client, UserModel);
        const channel = await client.channels.fetch(ACTIVITY_LEADERBOARD_CHANNEL);
        if (!channel) return;

        if (pointsLeaderboardMessageId) {
            try {
                const msg = await channel.messages.fetch(pointsLeaderboardMessageId);
                await msg.edit({ embeds: [embed] });
            } catch {
                const msg = await channel.send({ embeds: [embed] });
                pointsLeaderboardMessageId = msg.id;
            }
        } else {
            const msg = await channel.send({ embeds: [embed] });
            pointsLeaderboardMessageId = msg.id;
        }
    } catch (error) {
        console.error("Gagal update points leaderboard:", error);
    }
}

// ================= DATABASE HELPER FUNCTIONS =================
async function addFishToInventory(UserModel, userId, fishName, quantity = 1) {
    await UserModel.updateOne(
        { userId: userId },
        { $inc: { [`fishInventory.${fishName}`]: quantity, totalFishCaught: quantity } }
    );
}

async function removeFishFromInventory(UserModel, userId, fishName, quantity = 1) {
    const user = await UserModel.findOne({ userId: userId });
    const currentQty = user.fishInventory?.get(fishName) || 0;

    if (currentQty < quantity) return false;

    if (currentQty === quantity) {
        await UserModel.updateOne(
            { userId: userId },
            { $unset: { [`fishInventory.${fishName}`]: "" } }
        );
    } else {
        await UserModel.updateOne(
            { userId: userId },
            { $inc: { [`fishInventory.${fishName}`]: -quantity } }
        );
    }
    return true;
}

async function addItemToInventory(UserModel, userId, itemName, quantity = 1) {
    await UserModel.updateOne(
        { userId: userId },
        { $inc: { [`items.${itemName}`]: quantity } }
    );
}

async function removeItemFromInventory(UserModel, userId, itemName, quantity = 1) {
    const user = await UserModel.findOne({ userId: userId });
    const currentQty = user.items?.get(itemName) || 0;

    if (currentQty < quantity) return false;

    if (currentQty === quantity) {
        await UserModel.updateOne(
            { userId: userId },
            { $unset: { [`items.${itemName}`]: "" } }
        );
    } else {
        await UserModel.updateOne(
            { userId: userId },
            { $inc: { [`items.${itemName}`]: -quantity } }
        );
    }
    return true;
}

async function getUser(UserModel, id) {
    let u = await UserModel.findOne({ userId: id });
    if (!u) {
        u = await UserModel.create({ userId: id });
        await addItemToInventory(UserModel, id, "Basic Rod", 1);
        await addItemToInventory(UserModel, id, "Basic Bait", 1);
    }
    return u;
}

// ================= INVENTORY DROPDOWN =================
async function generateInventoryDropdown(UserModel, userId) {
    const user = await getUser(UserModel, userId);
    const inventoryItems = Array.from(user.items?.entries() || []);

    if (inventoryItems.length === 0) return null;

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

    return options.slice(0, 25);
}

// ================= USE ITEM =================
async function useItem(UserModel, userId, itemName) {
    const user = await getUser(UserModel, userId);
    const quantity = user.items?.get(itemName) || 0;

    if (quantity === 0) {
        return { success: false, message: "❌ Kamu tidak memiliki item ini!" };
    }

    if (rods[itemName]) {
        if (user.equippedRod === itemName) {
            return { success: false, message: `❌ **${itemName}** sudah ter-equip sebagai rod!` };
        }
        await UserModel.updateOne({ userId: userId }, { $set: { equippedRod: itemName } });
        return { success: true, message: `✅ Meng-equip **${itemName}** sebagai rod!`, type: "rod" };
    }

    if (baits[itemName]) {
        if (user.equippedBait === itemName) {
            return { success: false, message: `❌ **${itemName}** sudah ter-equip sebagai bait!` };
        }
        await UserModel.updateOne({ userId: userId }, { $set: { equippedBait: itemName } });
        return { success: true, message: `✅ Meng-equip **${itemName}** sebagai bait!`, type: "bait" };
    }

    if (potions[itemName]) {
        const potion = potions[itemName];

        if (potion.luck && user.activePotion) {
            return { success: false, message: "❌ Masih ada luck potion aktif! Tunggu sampai habis." };
        }
        if (potion.cooldownReduce && user.activeCooldownPotion) {
            return { success: false, message: "❌ Masih ada cooldown potion aktif! Tunggu sampai habis." };
        }

        const removed = await removeItemFromInventory(UserModel, userId, itemName, 1);
        if (!removed) {
            return { success: false, message: "❌ Gagal menggunakan potion!" };
        }

        if (potion.luck) {
            await UserModel.updateOne(
                { userId: userId },
                { $set: { activePotion: { name: itemName, luck: potion.luck, duration: potion.duration, remain: potion.duration, expiresAt: Date.now() + (potion.duration * 60 * 1000) } } }
            );
        } else if (potion.cooldownReduce) {
            await UserModel.updateOne(
                { userId: userId },
                { $set: { activeCooldownPotion: { name: itemName, cooldownReduce: potion.cooldownReduce, duration: potion.duration, remain: potion.duration, expiresAt: Date.now() + (potion.duration * 60 * 1000) } } }
            );
        }

        setTimeout(async () => {
            const currentUser = await getUser(UserModel, userId);
            if (potion.luck && currentUser.activePotion?.name === itemName) {
                await UserModel.updateOne({ userId: userId }, { $set: { activePotion: null } });
            }
            if (potion.cooldownReduce && currentUser.activeCooldownPotion?.name === itemName) {
                await UserModel.updateOne({ userId: userId }, { $set: { activeCooldownPotion: null } });
            }
        }, potion.duration * 60 * 1000);

        const bonus = potion.luck ? `+${((potion.luck - 1) * 100)}% luck` : `-${potion.cooldownReduce * 100}% cooldown`;
        return { success: true, message: `✅ **${itemName}** digunakan! ${bonus} selama ${potion.duration} menit.`, type: "potion" };
    }

    return { success: false, message: "❌ Item tidak dapat digunakan!" };
}

// ================= REDEEM MENU =================
const REDEEM_ENABLED = false;

async function showRedeemMenu(interaction, UserModel) {
    if (!REDEEM_ENABLED) {
        const embed = new EmbedBuilder()
            .setTitle("🔧 **MAINTENANCE** 🔧")
            .setDescription("Sistem Redeem sedang dalam pemeliharaan!\nSilakan coba lagi nanti.")
            .setColor(0xff0000)
            .setTimestamp();
        
        if (interaction.deferred || interaction.replied) {
            return interaction.editReply({ embeds: [embed] });
        }
        return interaction.reply({ embeds: [embed], flags: 64 });
    }
    const freshUser = await getUser(UserModel, interaction.user.id);
    const embed = new EmbedBuilder()
        .setTitle("🎁 **REDEEM HADIAH** 🎁")
        .setDescription("Tukarkan points kamu dengan hadiah tunai!")
        .setColor(0xffaa00)
        .addFields(
            { name: "💰 Tunai Rp5.000", value: `8,000 points`, inline: true },
            { name: "💰 Tunai Rp10.000", value: `16,000 points`, inline: true },
            { name: "💰 Tunai Rp20.000", value: `32,000 points`, inline: true },
            { name: "💰 Tunai Rp50.000", value: `76,000 points`, inline: true },
            { name: "💰 Tunai Rp100.000", value: `150,000 points`, inline: true },
            { name: "━━━━━━━━━━", value: `⭐⭐ **${freshUser.points.toLocaleString()} points** ⭐⭐`, inline: false }
        )
        .setFooter({ text: "Pilih hadiah dari dropdown di bawah!" })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId("redeem_select")
            .setPlaceholder("🎁 Pilih hadiah yang ingin ditukar")
            .addOptions([
                { label: "💰 Tunai Rp5.000", value: "Tunai Rp5.000", description: "Butuh 8,000 points", emoji: "💰" },
                { label: "💰 Tunai Rp10.000", value: "Tunai Rp10.000", description: "Butuh 16,000 points", emoji: "💰" },
                { label: "💰 Tunai Rp20.000", value: "Tunai Rp20.000", description: "Butuh 32,000 points", emoji: "💰" },
                { label: "💰 Tunai Rp50.000", value: "Tunai Rp50.000", description: "Butuh 76,000 points", emoji: "💰" },
                { label: "💰 Tunai Rp100.000", value: "Tunai Rp100.000", description: "Butuh 150,000 points", emoji: "💰" }
            ])
    );

    const backBtn = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("back_to_menu").setLabel("🔙 Kembali").setStyle(ButtonStyle.Secondary)
    );

    if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ embeds: [embed], components: [row, backBtn] });
    }
    return interaction.reply({ embeds: [embed], components: [row, backBtn], flags: 64 });
}

function getFishValueFromName(fishName) {
    let fishValue = 0;
    let mutationBonus = 0;
    
    const mutations = ["🧚 Fairy", "👻 Ghost", "🪨 Stone", "🏜️ Sand", "☢️ Radioaktif", 
                      "❄️ Ice", "⭐ Gold", "✨ Shiny", "🔥 Inferno", "💀 Dark"];
    
    let cleanFishName = fishName;
    for (const mutation of mutations) {
        if (fishName.startsWith(mutation + " ")) {
            mutationBonus = getMutationBonus(mutation);
            cleanFishName = fishName.replace(mutation + " ", "");
            break;
        }
    }
    
    for (const boss of bossList) {
        if (cleanFishName.includes(boss.name)) {
            fishValue = boss.value;
            break;
        }
    }
    
    if (fishValue === 0) {
        for (const zone of Object.values(fishingZones)) {
            const found = zone.find(f => cleanFishName === f.name);
            if (found) {
                fishValue = found.value;
                break;
            }
        }
    }
    
    if (fishValue === 0) {
        for (const zone of Object.values(fishingZones)) {
            const found = zone.find(f => cleanFishName.includes(f.name));
            if (found) {
                fishValue = found.value;
                break;
            }
        }
    }
    
    return { fishValue, mutationBonus, totalValue: fishValue + mutationBonus };
}

// ================= MODULE EXPORTS =================
module.exports = {
    name: 'fishing',
    description: 'Sistem memancing ikan dengan berbagai zona',
    
    async executePrefix(message, args, client) {
        const { User } = require('../database/mongo');
        
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("menu_fish").setLabel("🎣 Fishing").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("menu_index").setLabel("📖 Index").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("menu_shop").setLabel("🛒 Shop").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("menu_inventory").setLabel("🎒 Inventory").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("menu_sell").setLabel("💰 Sell Fish").setStyle(ButtonStyle.Success)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("back_to_main_menu").setLabel("🔙 Kembali ke Menu Utama").setStyle(ButtonStyle.Secondary)
        );

        const components = [row1, row2];
        if (ADMIN_IDS.includes(message.author.id)) {
            const adminRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("admin_panel").setLabel("👑 Admin Panel").setStyle(ButtonStyle.Secondary)
            );
            components.push(adminRow);
        }

        await message.reply({
            content: "🎮 **FISHING SYSTEM**\n💡 100 credits = 1 point",
            components: components
        });
    },
    
    async handleButton(interaction, client) {
        const { User } = require('../database/mongo');
        
        if (hasCooldown(interaction.user.id, interaction.customId, 2000)) {
            return interaction.reply({ content: "⏳ Tombol sedang diproses, jangan spam!", flags: 64 }).catch(() => {});
        }
        
        try {
            // ==================== MENU FISHING ====================
            if (interaction.customId === "menu_fish") {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("fish").setLabel("🎣 Mancing").setStyle(ButtonStyle.Primary)
                );
                await interaction.reply({ content: "Klik tombol di bawah untuk memancing!", components: [row], flags: 64 });
                return true;
            }
            
            // ==================== FISHING ACTION ====================
            if (interaction.customId === "fish") {
                if (!FISHING_CHANNELS.includes(interaction.channel.id)) {
                    await interaction.reply({ content: "❌ Bukan channel mancing! Gunakan channel yang sudah ditentukan.", flags: 64 });
                    return true;
                }
                
                const lockKey = acquireLock(interaction.user.id, "fish", 15000);
                if (!lockKey) {
                    await interaction.reply({ content: "⏳ Sedang memancing, tunggu sebentar!", flags: 64 });
                    return true;
                }
                
                try {
                    const freshUser = await getUser(User, interaction.user.id);
                    
                    let cooldownTime = 10000;
                    if (freshUser.activeCooldownPotion) {
                        cooldownTime = 10000 * (1 - freshUser.activeCooldownPotion.cooldownReduce);
                    }
                    
                    const now = Date.now();
                    if (freshUser.lastFishTime && now - freshUser.lastFishTime < cooldownTime) {
                        const remaining = Math.ceil((cooldownTime - (now - freshUser.lastFishTime)) / 1000);
                        releaseLock(lockKey);
                        await interaction.reply({ content: `⏳ Cooldown ${remaining} detik lagi!`, flags: 64 });
                        return true;
                    }
                    
                    await User.updateOne({ userId: interaction.user.id }, { $set: { lastFishTime: now } });
                    
                    const channelLuck = channelBoost[interaction.channel.id] || 1;
                    const rodLuck = rods[freshUser.equippedRod]?.luck || 1;
                    const baitLuck = baits[freshUser.equippedBait]?.luck || 1;
                    const potionLuck = freshUser.activePotion ? freshUser.activePotion.luck : 1;
                    const luck = rodLuck * baitLuck * globalLuckBoost * channelLuck * potionLuck;
                    
                    const fish = getFish(interaction.channel.id, luck);
                    const mutation = getMutation();
                    const mutationBonus = getMutationBonus(mutation);
                    const finalName = mutation ? `${mutation} ${fish.name}` : fish.name;
                    const totalValue = fish.value + mutationBonus;
                    
                    await addFishToInventory(User, interaction.user.id, finalName, 1);
                    await User.updateOne(
                        { userId: interaction.user.id },
                        { $inc: { credits: totalValue, totalFishingCredits: totalValue, seasonFishCaught: 1 } }
                    );
                    
                    let replyMsg = `🎣 **${finalName}** (${fish.rarity}) +${totalValue}💰`;
                    if (mutation) replyMsg += `\n✨ Mutasi ${mutation} +${mutationBonus}💰`;
                    
                    // CEK APAKAH INI IKAN SECRET
                    const isSecret = fish.rarity === "Secret";
                    if (isSecret) {
                        replyMsg += `\n\n🎉✨ **SELAMAT! Kamu mendapatkan LEGENDA SECRET!** ✨🎉`;
                        await sendSecretNotification(client, interaction.user.id, finalName, totalValue, interaction.channel.id, false);
                    }
                    
                    await interaction.reply({ content: replyMsg, flags: 64 });
                } finally {
                    releaseLock(lockKey);
                }
                return true;
            }
            
            // ==================== INDEX MENU ====================
            if (interaction.customId === "menu_index") {
                const zoneOptions = [];
                for (const channelId of FISHING_CHANNELS) {
                    zoneOptions.push({
                        label: getZoneName(channelId),
                        description: `Lihat daftar ikan di zona ini`,
                        value: channelId,
                        emoji: "📖"
                    });
                }
                
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId("index_map")
                    .setPlaceholder("📖 Pilih zona fishing...")
                    .addOptions(zoneOptions);
                
                const row = new ActionRowBuilder().addComponents(selectMenu);
                const backBtn = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("back_to_menu").setLabel("🔙 Kembali").setStyle(ButtonStyle.Secondary)
                );
                
                await interaction.reply({
                    content: "📖 **PILIH ZONA FISHING**\n\nPilih zona untuk melihat daftar ikannya:",
                    components: [row, backBtn],
                    flags: 64
                });
                return true;
            }
            
            // ==================== INDEX MAP ====================
            if (interaction.customId === "index_map") {
                const channelId = interaction.values[0];
                const zone = fishingZones[channelId];
                if (!zone) {
                    await interaction.reply({ content: "❌ Zona tidak ditemukan!", flags: 64 });
                    return true;
                }
                
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
                    new ButtonBuilder().setCustomId("back_to_menu").setLabel("🔙 Kembali ke Menu").setStyle(ButtonStyle.Secondary)
                );
                
                await interaction.update({ content: text, components: [backBtn] });
                return true;
            }
            
            // ==================== INVENTORY MENU ====================
            if (interaction.customId === "menu_inventory") {
                await interaction.deferReply({ flags: 64 });
                
                const dropdownOptions = await generateInventoryDropdown(User, interaction.user.id);
                const freshUser = await getUser(User, interaction.user.id);
                
                const globalLuckBoostValue = globalLuckBoost || 1;
                const channelLuck = channelBoost[interaction.channel?.id] || 1;
                const rodLuck = rods[freshUser.equippedRod]?.luck || 1;
                const baitLuck = baits[freshUser.equippedBait]?.luck || 1;
                const potionLuck = freshUser.activePotion ? freshUser.activePotion.luck : 1;
                const totalLuck = rodLuck * baitLuck * globalLuckBoostValue * channelLuck * potionLuck;
                
                const formattedRod = rodLuck.toFixed(2);
                const formattedBait = baitLuck.toFixed(2);
                const formattedGlobal = globalLuckBoostValue.toFixed(2);
                const formattedChannel = channelLuck.toFixed(2);
                const formattedPotion = potionLuck.toFixed(2);
                const formattedTotal = totalLuck.toFixed(2);
                
                const luckPercentage = Math.min(100, (totalLuck / 10) * 100);
                const barLength = Math.floor(luckPercentage / 10);
                const luckBar = "█".repeat(barLength) + "░".repeat(10 - barLength);
                
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
                    .setDescription(`📌 **Rod:** ${freshUser.equippedRod}\n🪱 **Bait:** ${freshUser.equippedBait}${potionStatus}\n\n🐟 **Total Ikan:** ${totalFish} ekor\n⭐ **Ikan Favorit:** ${favoriteCount} jenis\n📦 **Item Unik:** ${inventoryCount} item\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n**✨ LUCK BREAKDOWN** ✨\n┌ 🎣 Rod: **${formattedRod}x**\n├ 🪱 Bait: **${formattedBait}x**\n├ 🧪 Potion: **${formattedPotion}x**\n├ 🌍 Global: **${formattedGlobal}x**\n└ 📡 Channel: **${formattedChannel}x**\n\n**📊 TOTAL LUCK:** \`${formattedTotal}x\`\n${luckBar}\n*Semakin tinggi luck, semakin langka ikan yang didapat!*`)
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
                
                await interaction.editReply({ embeds: [embed], components: components });
                return true;
            }
            
            // ==================== INVENTORY SELECT (USE ITEM) ====================
            if (interaction.customId === "inventory_select") {
                const lockKey = acquireLock(interaction.user.id, "use_item", 10000);
                if (!lockKey) {
                    return interaction.reply({ content: "⏳ Sedang memproses item, tunggu sebentar!", flags: 64 });
                }
                
                try {
                    const itemName = interaction.values[0];
                    
                    const disabledSelect = new StringSelectMenuBuilder()
                        .setCustomId("inventory_select")
                        .setPlaceholder("⏳ Memproses...")
                        .setDisabled(true)
                        .addOptions([{ label: "Processing...", value: "disabled" }]);
                    
                    await interaction.update({ components: [new ActionRowBuilder().addComponents(disabledSelect)] });
                    
                    const result = await useItem(User, interaction.user.id, itemName);
                    
                    const freshUser = await getUser(User, interaction.user.id);
                    const dropdownOptions = await generateInventoryDropdown(User, interaction.user.id);
                    
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
                    
                    await interaction.editReply({ embeds: [embed], components: components });
                } finally {
                    releaseLock(lockKey);
                }
                return true;
            }
            
            // ==================== SELL FISH MENU ====================
            if (interaction.customId === "menu_sell") {
                await interaction.deferReply({ flags: 64 });
                
                const freshUser = await getUser(User, interaction.user.id);
                const fishEntries = Array.from(freshUser.fishInventory?.entries() || []);
                const nonFavoriteFish = fishEntries.filter(([fishName]) => !freshUser.favoriteFish?.includes(fishName));
                
                if (nonFavoriteFish.length === 0) {
                    return interaction.editReply({ content: "❌ Tidak ada ikan yang bisa dijual (semua ikan difavoritkan atau tidak ada ikan)!" });
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
                                description: `${amount} ekor | ${fishValue}💰/ekor | Total: ${(fishValue * amount).toLocaleString()}💰`
                            };
                        }))
                );
                
                const sellAllBtn = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("sell_all").setLabel(`💸 Jual Semua (Non-Favorite) (${totalFish} ekor - ${totalValue.toLocaleString()}💰)`).setStyle(ButtonStyle.Danger)
                );
                
                const backBtn = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("back_to_menu").setLabel("🔙 Kembali").setStyle(ButtonStyle.Secondary)
                );
                
                await interaction.editReply({
                    content: `🐟 **PENJUALAN IKAN**\n\n📊 Total ikan non-favorite: **${totalFish} ekor**\n💰 Total nilai: **${totalValue.toLocaleString()}💰**\n\nPilih ikan yang ingin dijual:`,
                    components: [select, sellAllBtn, backBtn]
                });
                return true;
            }
            
            // ==================== SELL SELECT ====================
            if (interaction.customId === "sell_select") {
                const lockKey = acquireLock(interaction.user.id, "sell", 10000);
                if (!lockKey) {
                    return interaction.reply({ content: "⏳ Proses penjualan sedang berjalan, tunggu sebentar!", flags: 64 });
                }
                
                try {
                    const fishName = interaction.values[0];
                    const freshUser = await getUser(User, interaction.user.id);
                    const amount = freshUser.fishInventory?.get(fishName) || 0;
                    
                    if (amount === 0) {
                        return interaction.reply({ content: "❌ Kamu tidak memiliki ikan ini!", flags: 64 });
                    }
                    
                    if (freshUser.favoriteFish?.includes(fishName)) {
                        return interaction.reply({ content: "❌ Ikan ini difavoritkan! Unfavorite dulu sebelum menjual.", flags: 64 });
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
                    
                    const removeResult = await removeFishFromInventory(User, interaction.user.id, fishName, amount);
                    if (!removeResult) {
                        return interaction.reply({ content: "❌ Gagal menjual ikan, silakan coba lagi!", flags: 64 });
                    }
                    
                    await User.updateOne(
                        { userId: interaction.user.id },
                        { $inc: { credits: totalPrice, totalFishingCredits: totalPrice } }
                    );
                    
                    const updatedUser = await getUser(User, interaction.user.id);
                    
                    await interaction.update({
                        content: `✅ **Berhasil menjual ${amount} ekor ${fishName}**\n💰 Harga total: **${totalPrice.toLocaleString()}💰**\n💳 Saldo sekarang: **${updatedUser.credits.toLocaleString()}💰**`,
                        components: []
                    });
                } finally {
                    releaseLock(lockKey);
                }
                return true;
            }
            
            // ==================== SELL ALL ====================
            if (interaction.customId === "sell_all") {
                const lockKey = acquireLock(interaction.user.id, "sell_all", 15000);
                if (!lockKey) {
                    return interaction.reply({ content: "⏳ Proses penjualan sedang berjalan, tunggu sebentar!", flags: 64 });
                }
                
                try {
                    const freshUser = await getUser(User, interaction.user.id);
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
                        return interaction.reply({ content: "❌ Tidak ada ikan non-favorite untuk dijual!", flags: 64 });
                    }
                    
                    for (const { fishName, amount } of fishToRemove) {
                        await removeFishFromInventory(User, interaction.user.id, fishName, amount);
                    }
                    
                    await User.updateOne(
                        { userId: interaction.user.id },
                        { $inc: { credits: totalPrice, totalFishingCredits: totalPrice } }
                    );
                    
                    const updatedUser = await getUser(User, interaction.user.id);
                    
                    await interaction.update({
                        content: `✅ **Berhasil menjual SEMUA ikan non-favorite!**\n🐟 Total ikan: **${totalFish} ekor**\n💰 Total harga: **${totalPrice.toLocaleString()}💰**\n💳 Saldo sekarang: **${updatedUser.credits.toLocaleString()}💰**`,
                        components: []
                    });
                } finally {
                    releaseLock(lockKey);
                }
                return true;
            }
            
            // ==================== REDEEM MENU ====================
            if (interaction.customId === "menu_redeem") {
                await showRedeemMenu(interaction, User);
                return true;
            }
            
            // ==================== REDEEM SELECT ====================
            if (interaction.customId === "redeem_select") {
                if (!REDEEM_ENABLED) {
                    return interaction.reply({ 
                        content: "🔧 **Sistem Redeem sedang dalam pemeliharaan!**\nSilakan coba lagi nanti.", 
                        flags: 64 
                    });
                }
                const lockKey = acquireLock(interaction.user.id, "redeem", 5000);
                if (!lockKey) {
                    return interaction.reply({ content: "⏳ Proses sedang berjalan, tunggu sebentar!", flags: 64 });
                }
                
                try {
                    const rewardName = interaction.values[0];
                    const reward = REWARDS[rewardName];
                    const freshUser = await getUser(User, interaction.user.id);
                    
                    if (freshUser.redeemedRewards?.includes(rewardName)) {
                        return interaction.reply({ content: `❌ Hadiah **${rewardName}** sudah pernah ditukar!`, flags: 64 });
                    }
                    
                    if (freshUser.points < reward.cost) {
                        return interaction.reply({ content: `❌ Points kurang! Butuh ${reward.cost.toLocaleString()} pts, kamu punya ${freshUser.points.toLocaleString()} pts`, flags: 64 });
                    }
                    
                    await User.updateOne(
                        { userId: interaction.user.id, points: { $gte: reward.cost } },
                        { $inc: { points: -reward.cost }, $push: { redeemedRewards: rewardName } }
                    );
                    
                    const owner = await client.users.fetch(OWNER_ID);
                    const embed = new EmbedBuilder()
                        .setTitle("🎁 PENUKARAN HADIAH")
                        .setDescription(`Ada yang menukar hadiah!`)
                        .setColor(0x00ff00)
                        .addFields(
                            { name: "👤 User", value: `<@${interaction.user.id}>`, inline: true },
                            { name: "🎁 Hadiah", value: `${reward.emoji} ${rewardName}`, inline: true },
                            { name: "💰 Biaya", value: `${reward.cost.toLocaleString()} points`, inline: true },
                            { name: "📦 Nilai", value: reward.value, inline: true }
                        )
                        .setTimestamp();
                    
                    await owner.send({ embeds: [embed] }).catch(() => {});
                    
                    const updatedUser = await getUser(User, interaction.user.id);
                    
                    const backBtn = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("menu_redeem").setLabel("🎁 Kembali ke Redeem").setStyle(ButtonStyle.Primary)
                    );
                    
                    await interaction.update({ 
                        content: `✅ ${reward.emoji} **${rewardName}** berhasil ditukar!\n📦 Nilai: ${reward.value}\n💰 Sisa points: ${updatedUser.points.toLocaleString()}\n\n📌 Admin akan segera memproses pembayaran!`, 
                        components: [backBtn] 
                    });
                } finally {
                    releaseLock(lockKey);
                }
                return true;
            }
            
            // ==================== SHOP MENU ====================
            if (interaction.customId === "menu_shop") {
                const freshUser = await getUser(User, interaction.user.id);
                
                const embed = new EmbedBuilder()
                    .setTitle("🛒 **FISHING SHOP** 🛒")
                    .setDescription("Pilih kategori untuk membeli item!")
                    .setColor(0x00ff88)
                    .addFields(
                        { name: "🎣 **Rods**", value: "Meningkatkan luck saat memancing", inline: true },
                        { name: "🪱 **Baits**", value: "Meningkatkan luck saat memancing", inline: true },
                        { name: "🧪 **Luck Potions**", value: "Meningkatkan luck sementara", inline: true },
                        { name: "⏰ **Cooldown Potions**", value: "Mengurangi cooldown memancing", inline: true },
                        { name: "━━━━━━━━━━", value: `💰 Credits: **${freshUser.credits.toLocaleString()}**`, inline: false }
                    )
                    .setFooter({ text: "Pilih kategori dari dropdown di bawah!" })
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("shop_category")
                        .setPlaceholder("🛒 Pilih Kategori")
                        .addOptions([
                            { label: "🎣 Rods", value: "rods", description: "Beli rod untuk meningkatkan luck", emoji: "🎣" },
                            { label: "🪱 Baits", value: "baits", description: "Beli bait untuk meningkatkan luck", emoji: "🪱" },
                            { label: "🧪 Luck Potions", value: "luckpotions", description: "Potion luck sementara", emoji: "🧪" },
                            { label: "⏰ Cooldown Potions", value: "cooldownpotions", description: "Potion mengurangi cooldown", emoji: "⏰" }
                        ])
                );

                const backBtn = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("back_to_menu").setLabel("🔙 Kembali").setStyle(ButtonStyle.Secondary)
                );

                await interaction.reply({ embeds: [embed], components: [row, backBtn], flags: 64 });
                return true;
            }

            // ==================== SHOP CATEGORY ====================
            if (interaction.customId === "shop_category") {
                const freshUser = await getUser(User, interaction.user.id);
                const category = interaction.values[0];
                let items = {};
                let title = "";
                let description = "";
                
                if (category === "rods") {
                    items = rods;
                    title = "🎣 **RODS SHOP** 🎣";
                    description = "Beli rod untuk meningkatkan luck permanen!";
                } else if (category === "baits") {
                    items = baits;
                    title = "🪱 **BAITS SHOP** 🪱";
                    description = "Beli bait untuk meningkatkan luck permanen!";
                } else if (category === "luckpotions") {
                    items = Object.fromEntries(Object.entries(potions).filter(([_, data]) => data.luck));
                    title = "🧪 **LUCK POTIONS SHOP** 🧪";
                    description = "Potion luck meningkatkan peluang dapat ikan langka!";
                } else {
                    items = Object.fromEntries(Object.entries(potions).filter(([_, data]) => data.cooldownReduce));
                    title = "⏰ **COOLDOWN POTIONS SHOP** ⏰";
                    description = "Potion cooldown mengurangi waktu tunggu memancing!";
                }
                
                let itemList = "";
                for (const [name, data] of Object.entries(items)) {
                    const price = data.price || 0;
                    if (category === "rods" || category === "baits") {
                        itemList += `┌ **${name}**\n├ 🎯 Luck: ${data.luck}x\n└ 💰 Harga: ${price.toLocaleString()} credits\n\n`;
                    } else if (data.luck) {
                        itemList += `┌ **${name}**\n├ 🎯 Luck: ${data.luck}x\n├ ⏰ Durasi: ${data.duration} menit\n└ 💰 Harga: ${price.toLocaleString()} credits\n\n`;
                    } else if (data.cooldownReduce) {
                        itemList += `┌ **${name}**\n├ 🎯 Cooldown: -${data.cooldownReduce * 100}%\n├ ⏰ Durasi: ${data.duration} menit\n└ 💰 Harga: ${price.toLocaleString()} credits\n\n`;
                    }
                }
                
                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(description)
                    .setColor(0x00ff88)
                    .addFields(
                        { name: "📦 **Daftar Item**", value: itemList || "Tidak ada item", inline: false },
                        { name: "💰 **Credits Anda**", value: `${freshUser.credits.toLocaleString()} credits`, inline: true },
                        { name: "💡 **Tips**", value: "Pilih item dari dropdown untuk membeli!", inline: true }
                    )
                    .setFooter({ text: "Pilih item untuk membeli" })
                    .setTimestamp();

                const select = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`shop_buy_${category}`)
                        .setPlaceholder(`🛒 Pilih ${category === "rods" ? "Rod" : category === "baits" ? "Bait" : "Potion"} untuk dibeli`)
                        .addOptions(Object.entries(items).map(([name, data]) => ({
                            label: name.length > 50 ? name.substring(0, 47) + "..." : name,
                            value: name,
                            description: `💰 ${(data.price || 0).toLocaleString()} credits`,
                            emoji: category === "rods" ? "🎣" : category === "baits" ? "🪱" : "🧪"
                        })))
                );
                
                const backBtn = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("menu_shop").setLabel("🔙 Kembali ke Shop").setStyle(ButtonStyle.Secondary)
                );
                
                await interaction.update({ embeds: [embed], components: [select, backBtn] });
                return true;
            }

            // ==================== SHOP BUY (DIPERBAIKI) ====================
            if (interaction.customId.startsWith("shop_buy_")) {
                const lockKey = acquireLock(interaction.user.id, "shop", 5000);
                if (!lockKey) {
                    return interaction.reply({ content: "⏳ Proses pembelian sedang berjalan, tunggu sebentar!", flags: 64 });
                }
                
                try {
                    const freshUser = await getUser(User, interaction.user.id);
                    const category = interaction.customId.replace("shop_buy_", "");
                    const itemName = interaction.values[0];
                    let itemData, price;
                    
                    if (category === "rods") {
                        itemData = rods[itemName];
                        price = itemData.price;
                    } else if (category === "baits") {
                        itemData = baits[itemName];
                        price = itemData.price;
                    } else if (category === "luckpotions") {
                        itemData = potions[itemName];
                        price = itemData.price;
                    } else if (category === "cooldownpotions") {
                        itemData = potions[itemName];
                        price = itemData.price;
                    } else {
                        return interaction.reply({ content: "❌ Kategori tidak valid!", flags: 64 });
                    }
                    
                    if (!itemData) {
                        return interaction.reply({ content: "❌ Item tidak ditemukan!", flags: 64 });
                    }
                    
                    const currentQty = freshUser.items?.get(itemName) || 0;
                    if ((category === "rods" || category === "baits") && currentQty > 0) {
                        return interaction.reply({ content: `❌ Kamu sudah memiliki **${itemName}**! Tidak bisa membeli dua kali.`, flags: 64 });
                    }
                    
                    if (freshUser.credits < price) {
                        return interaction.reply({ content: `❌ Credit kurang! Butuh ${price.toLocaleString()}💰, kamu punya ${freshUser.credits.toLocaleString()}💰`, flags: 64 });
                    }
                    
                    // === PERBAIKAN: Kurangi credits dengan benar ===
                    await User.updateOne(
                        { userId: interaction.user.id },
                        { $inc: { credits: -price } }
                    );
                    
                    await User.updateOne(
                        { userId: interaction.user.id },
                        { $inc: { [`items.${itemName}`]: 1 } }
                    );
                    
                    const updatedUser = await getUser(User, interaction.user.id);
                    
                    const embed = new EmbedBuilder()
                        .setTitle("✅ **PEMBELIAN BERHASIL!**")
                        .setDescription(`Kamu berhasil membeli **${itemName}**!`)
                        .setColor(0x00ff00)
                        .addFields(
                            { name: "💰 Harga", value: `${price.toLocaleString()} credits`, inline: true },
                            { name: "💎 Sisa Credits", value: `${updatedUser.credits.toLocaleString()} credits`, inline: true },
                            { name: "📦 Item", value: itemName, inline: true }
                        )
                        .setTimestamp();
                    
                    if (category === "rods") {
                        embed.addFields({ name: "🎣 **Tips**", value: "Gunakan menu **Inventory** untuk equip rod baru!", inline: false });
                    } else if (category === "baits") {
                        embed.addFields({ name: "🪱 **Tips**", value: "Gunakan menu **Inventory** untuk equip bait baru!", inline: false });
                    } else {
                        embed.addFields({ name: "🧪 **Tips**", value: "Gunakan menu **Potion** atau **Inventory** untuk mengaktifkan potion!", inline: false });
                    }
                    
                    const backBtn = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("menu_shop").setLabel("🛒 Kembali ke Shop").setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId("back_to_menu").setLabel("🔙 Kembali ke Menu").setStyle(ButtonStyle.Secondary)
                    );
                    
                    await interaction.update({ embeds: [embed], components: [backBtn] });
                    
                } catch (error) {
                    console.error("Error in shop buy:", error);
                    await interaction.reply({ content: "❌ Terjadi kesalahan saat membeli item!", flags: 64 });
                } finally {
                    releaseLock(lockKey);
                }
                return true;
            }

            // ==================== BACK TO MENU ====================
            if (interaction.customId === "back_to_menu") {
                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("menu_fish").setLabel("🎣 Fishing").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("menu_index").setLabel("📖 Index").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId("menu_shop").setLabel("🛒 Shop").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("menu_inventory").setLabel("🎒 Inventory").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("menu_sell").setLabel("💰 Sell Fish").setStyle(ButtonStyle.Success)
                );

                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("back_to_main_menu").setLabel("🔙 Kembali ke Menu Utama").setStyle(ButtonStyle.Secondary)
                );

                const components = [row1, row2];
                if (ADMIN_IDS.includes(interaction.user.id)) {
                    const adminRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("admin_panel").setLabel("👑 Admin Panel").setStyle(ButtonStyle.Secondary)
                    );
                    components.push(adminRow);
                }
                
                await interaction.update({
                    content: "🎮 **FISHING SYSTEM**\n💡 100 credits = 1 point",
                    components: components
                });
                return true;
            }
            
            // ==================== BACK TO MAIN MENU (global) ====================
            if (interaction.customId === "back_to_main_menu") {
                const gameCmd = client.prefixCommands.get('game');
                if (gameCmd) {
                    const fakeMessage = {
                        channelId: interaction.channel.id,
                        author: interaction.user,
                        channel: interaction.channel,
                        reply: async (options) => {
                            await interaction.update(options);
                        }
                    };
                    await gameCmd.executePrefix(fakeMessage, [], client);
                }
                return true;
            }
            
            // ==================== POTION MENU ====================
            if (interaction.customId === "menu_potion") {
                await interaction.deferReply({ flags: 64 });
                
                const freshUser = await getUser(User, interaction.user.id);
                const userPotions = Array.from(freshUser.items?.entries() || [])
                    .filter(([name]) => potions[name]);
                
                if (userPotions.length === 0) {
                    const shopBtn = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId("menu_shop").setLabel("🛒 Beli Potion").setStyle(ButtonStyle.Primary)
                    );
                    return interaction.editReply({ content: "🧪 Tidak ada potion! Beli di Shop.", components: [shopBtn] });
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
                const backBtn = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("menu_inventory").setLabel("🔙 Kembali").setStyle(ButtonStyle.Secondary)
                );
                await interaction.editReply({ content: "🧪 Pilih potion:", components: [select, backBtn] });
                return true;
            }
            
            // ==================== USE POTION ====================
            if (interaction.customId === "use_potion") {
                const lockKey = acquireLock(interaction.user.id, "potion", 5000);
                if (!lockKey) {
                    return interaction.reply({ content: "⏳ Proses sedang berjalan, tunggu sebentar!", flags: 64 });
                }
                
                try {
                    const potionName = interaction.values[0];
                    const potion = potions[potionName];
                    const freshUser = await getUser(User, interaction.user.id);
                    
                    if (potion.luck && freshUser.activePotion) {
                        return interaction.reply({ content: "❌ Masih ada luck potion aktif!", flags: 64 });
                    }
                    if (potion.cooldownReduce && freshUser.activeCooldownPotion) {
                        return interaction.reply({ content: "❌ Masih ada cooldown potion aktif!", flags: 64 });
                    }
                    
                    const currentQty = freshUser.items?.get(potionName) || 0;
                    if (currentQty === 0) {
                        return interaction.reply({ content: "❌ Potion tidak ditemukan!", flags: 64 });
                    }
                    
                    await removeItemFromInventory(User, interaction.user.id, potionName, 1);
                    
                    if (potion.luck) {
                        await User.updateOne(
                            { userId: interaction.user.id },
                            { $set: { activePotion: { name: potionName, luck: potion.luck, duration: potion.duration, remain: potion.duration, expiresAt: Date.now() + (potion.duration * 60 * 1000) } } }
                        );
                    } else if (potion.cooldownReduce) {
                        await User.updateOne(
                            { userId: interaction.user.id },
                            { $set: { activeCooldownPotion: { name: potionName, cooldownReduce: potion.cooldownReduce, duration: potion.duration, remain: potion.duration, expiresAt: Date.now() + (potion.duration * 60 * 1000) } } }
                        );
                    }
                    
                    setTimeout(async () => {
                        const currentUser = await getUser(User, interaction.user.id);
                        if (potion.luck && currentUser.activePotion?.name === potionName) {
                            await User.updateOne({ userId: interaction.user.id }, { $set: { activePotion: null } });
                        }
                        if (potion.cooldownReduce && currentUser.activeCooldownPotion?.name === potionName) {
                            await User.updateOne({ userId: interaction.user.id }, { $set: { activeCooldownPotion: null } });
                        }
                    }, potion.duration * 60 * 1000);
                    
                    const bonus = potion.luck ? `+${((potion.luck-1)*100)}% luck` : `-${potion.cooldownReduce*100}% cooldown`;
                    await interaction.update({ content: `✅ ${potionName} aktif! ${bonus} selama ${potion.duration} menit`, components: [] });
                } finally {
                    releaseLock(lockKey);
                }
                return true;
            }
            
            // ==================== FAVORITE FISH MENU ====================
            if (interaction.customId === "menu_favorite") {
                await interaction.deferReply({ flags: 64 });
                
                const freshUser = await getUser(User, interaction.user.id);
                const fishList = Array.from(freshUser.fishInventory?.keys() || []);
                if (fishList.length === 0) {
                    return interaction.editReply({ content: "❌ Kamu tidak memiliki ikan apapun!" });
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
                
                await interaction.editReply({
                    content: "⭐ **FAVORITE FISH**\n\nPilih ikan untuk menambah/menghapus dari favorit.\nIkan favorit TIDAK akan terjual saat menggunakan fitur jual ikan!",
                    components: [select, backBtn]
                });
                return true;
            }
            
            // ==================== FAVORITE SELECT ====================
            if (interaction.customId === "favorite_select") {
                const fishName = interaction.values[0];
                const freshUser = await getUser(User, interaction.user.id);
                
                if (!freshUser.favoriteFish) {
                    await User.updateOne({ userId: interaction.user.id }, { $set: { favoriteFish: [] } });
                }
                
                const isFavorite = freshUser.favoriteFish?.includes(fishName);
                
                if (isFavorite) {
                    await User.updateOne(
                        { userId: interaction.user.id },
                        { $pull: { favoriteFish: fishName } }
                    );
                    await interaction.update({ content: `✅ **${fishName}** dihapus dari favorit!`, components: [] });
                } else {
                    await User.updateOne(
                        { userId: interaction.user.id },
                        { $push: { favoriteFish: fishName } }
                    );
                    await interaction.update({ content: `⭐ **${fishName}** ditambahkan ke favorit! Ikan ini tidak akan terjual.`, components: [] });
                }
                return true;
            }
            
            // ==================== ADMIN PANEL ====================
            if (interaction.customId === "admin_panel") {
                if (!ADMIN_IDS.includes(interaction.user.id)) {
                    return interaction.reply({ content: "❌ Bukan admin!", flags: 64 });
                }
                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("admin_select")
                        .setPlaceholder("👑 Admin Menu")
                        .addOptions([
                            { label: "Add Credit", value: "addcredit" },
                            { label: "Remove Credit", value: "removecredit" },
                            { label: "Add Points", value: "addpoints" },
                            { label: "Check Profile", value: "checkprofile" },
                            { label: "Global Luck", value: "globalluck" },
                            { label: "Channel Luck", value: "setluck" },
                            { label: "Anti-Exploit Logs", value: "antiexploit" }
                        ])
                );
                await interaction.reply({ content: "👑 **ADMIN PANEL**", components: [row], flags: 64 });
                return true;
            }
            
            // ==================== ADMIN SELECT ====================
            if (interaction.customId === "admin_select") {
                const action = interaction.values[0];
                
                if (action === "addcredit") {
                    const modal = new ModalBuilder()
                        .setCustomId("admin_addcredit")
                        .setTitle("➕ Add Credit");
                    
                    const userInput = new TextInputBuilder()
                        .setCustomId("user")
                        .setLabel("User ID atau Mention")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Contoh: @user atau 1234567890")
                        .setRequired(true);
                    
                    const amountInput = new TextInputBuilder()
                        .setCustomId("amount")
                        .setLabel("Jumlah Credit")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Contoh: 10000")
                        .setRequired(true);
                    
                    const row1 = new ActionRowBuilder().addComponents(userInput);
                    const row2 = new ActionRowBuilder().addComponents(amountInput);
                    modal.addComponents(row1, row2);
                    
                    await interaction.showModal(modal);
                    return true;
                }
                
                if (action === "removecredit") {
                    const modal = new ModalBuilder()
                        .setCustomId("admin_removecredit")
                        .setTitle("➖ Remove Credit");
                    
                    const userInput = new TextInputBuilder()
                        .setCustomId("user")
                        .setLabel("User ID atau Mention")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Contoh: @user atau 1234567890")
                        .setRequired(true);
                    
                    const amountInput = new TextInputBuilder()
                        .setCustomId("amount")
                        .setLabel("Jumlah Credit")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Contoh: 10000")
                        .setRequired(true);
                    
                    const row1 = new ActionRowBuilder().addComponents(userInput);
                    const row2 = new ActionRowBuilder().addComponents(amountInput);
                    modal.addComponents(row1, row2);
                    
                    await interaction.showModal(modal);
                    return true;
                }
                
                if (action === "addpoints") {
                    const modal = new ModalBuilder()
                        .setCustomId("admin_addpoints")
                        .setTitle("⭐ Add Points");
                    
                    const userInput = new TextInputBuilder()
                        .setCustomId("user")
                        .setLabel("User ID atau Mention")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Contoh: @user atau 1234567890")
                        .setRequired(true);
                    
                    const amountInput = new TextInputBuilder()
                        .setCustomId("amount")
                        .setLabel("Jumlah Points")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Contoh: 100")
                        .setRequired(true);
                    
                    const row1 = new ActionRowBuilder().addComponents(userInput);
                    const row2 = new ActionRowBuilder().addComponents(amountInput);
                    modal.addComponents(row1, row2);
                    
                    await interaction.showModal(modal);
                    return true;
                }
                
                if (action === "checkprofile") {
                    const modal = new ModalBuilder()
                        .setCustomId("admin_checkprofile")
                        .setTitle("🔍 Check Profile");
                    
                    const userInput = new TextInputBuilder()
                        .setCustomId("user")
                        .setLabel("User ID atau Mention")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Contoh: @user atau 1234567890")
                        .setRequired(true);
                    
                    const row1 = new ActionRowBuilder().addComponents(userInput);
                    modal.addComponents(row1);
                    
                    await interaction.showModal(modal);
                    return true;
                }
                
                if (action === "globalluck") {
                    const modal = new ModalBuilder()
                        .setCustomId("admin_globalluck")
                        .setTitle("🌍 Global Luck");
                    
                    const valueInput = new TextInputBuilder()
                        .setCustomId("value")
                        .setLabel("Global Luck Value")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Contoh: 1.5 (default 1)")
                        .setRequired(true);
                    
                    const row1 = new ActionRowBuilder().addComponents(valueInput);
                    modal.addComponents(row1);
                    
                    await interaction.showModal(modal);
                    return true;
                }
                
                if (action === "setluck") {
                    const modal = new ModalBuilder()
                        .setCustomId("admin_setluck")
                        .setTitle("📡 Channel Luck");
                    
                    const channelInput = new TextInputBuilder()
                        .setCustomId("channel")
                        .setLabel("Channel ID")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Contoh: 1492058905499402271")
                        .setRequired(true);
                    
                    const valueInput = new TextInputBuilder()
                        .setCustomId("value")
                        .setLabel("Luck Value")
                        .setStyle(TextInputStyle.Short)
                        .setPlaceholder("Contoh: 1.5")
                        .setRequired(true);
                    
                    const row1 = new ActionRowBuilder().addComponents(channelInput);
                    const row2 = new ActionRowBuilder().addComponents(valueInput);
                    modal.addComponents(row1, row2);
                    
                    await interaction.showModal(modal);
                    return true;
                }
                
                if (action === "antiexploit") {
                    const logText = antiExploit.exploitLogs.length > 0 
                        ? antiExploit.exploitLogs.slice(-10).map(log => 
                            `👤 ${log.userId}\n📋 ${log.reason}\n⏰ ${log.time}\n📆 Durasi: ${log.duration}\n`
                          ).join('\n━━━━━━━━━━━━━━━━━━\n')
                        : "Tidak ada log anti-exploit.";
                    
                    const embed = new EmbedBuilder()
                        .setTitle("🛡️ **ANTI-EXPLOIT LOGS**")
                        .setDescription(logText)
                        .setColor(0xff0000)
                        .setFooter({ text: "10 log terakhir" })
                        .setTimestamp();
                    
                    await interaction.update({ content: null, embeds: [embed], components: [] });
                    return true;
                }
                
                await interaction.update({ content: "❌ Command tidak dikenal!", components: [] });
                return true;
            }
            
            // ==================== SHOW FISHING MENU ====================
            async function showFishingMenu(interaction) {
                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("menu_fish").setLabel("🎣 Fishing").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("menu_index").setLabel("📖 Index").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId("menu_shop").setLabel("🛒 Shop").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("menu_inventory").setLabel("🎒 Inventory").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("menu_sell").setLabel("💰 Sell Fish").setStyle(ButtonStyle.Success)
                );

                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("back_to_main_menu").setLabel("🔙 Kembali").setStyle(ButtonStyle.Secondary)
                );

                const components = [row1, row2];
                
                if (interaction.deferred || interaction.replied) {
                    return interaction.editReply({
                        content: "🎮 **FISHING SYSTEM**\n💡 100 credits = 1 point",
                        components: components
                    });
                }
                return interaction.reply({
                    content: "🎮 **FISHING SYSTEM**\n💡 100 credits = 1 point",
                    components: components,
                    flags: 64
                });
            }
            
        } catch (error) {
            console.error("❌ Error dalam fishing handler:", error);
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({ content: "❌ Terjadi kesalahan, silakan coba lagi!", flags: 64 });
                } else {
                    await interaction.editReply({ content: "❌ Terjadi kesalahan, silakan coba lagi!" });
                }
            } catch (e) {
                console.error("Gagal mengirim error response:", e);
            }
        }
        
        return false;
    },
    
    showFishingMenu: async function(interaction) {
        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("menu_fish").setLabel("🎣 Fishing").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("menu_index").setLabel("📖 Index").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("menu_shop").setLabel("🛒 Shop").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("menu_inventory").setLabel("🎒 Inventory").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("menu_sell").setLabel("💰 Sell Fish").setStyle(ButtonStyle.Success)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("back_to_main_menu").setLabel("🔙 Kembali").setStyle(ButtonStyle.Secondary)
        );

        const components = [row1, row2];
        
        if (interaction.deferred || interaction.replied) {
            return interaction.editReply({
                content: "🎮 **FISHING SYSTEM**\n💡 100 credits = 1 point",
                components: components
            });
        }
        return interaction.reply({
            content: "🎮 **FISHING SYSTEM**\n💡 100 credits = 1 point",
            components: components,
            flags: 64
        });
    },
    
    // ==================== INIT FUNCTION ====================
    async init(client) {
        console.log("🎣 Fishing game initialized!");
        console.log("📊 Rarity chances:");
        console.log(`   Common: 1/${Math.round(1/rarityChances.Common)} (${(rarityChances.Common*100).toFixed(4)}%)`);
        console.log(`   Uncommon: 1/${Math.round(1/rarityChances.Uncommon)} (${(rarityChances.Uncommon*100).toFixed(4)}%)`);
        console.log(`   Rare: 1/${Math.round(1/rarityChances.Rare)} (${(rarityChances.Rare*100).toFixed(4)}%)`);
        console.log(`   Epic: 1/${Math.round(1/rarityChances.Epic)} (${(rarityChances.Epic*100).toFixed(4)}%)`);
        console.log(`   Legendary: 1/${Math.round(1/rarityChances.Legendary)} (${(rarityChances.Legendary*100).toFixed(4)}%)`);
        console.log(`   Mythic: 1/${Math.round(1/rarityChances.Mythic)} (${(rarityChances.Mythic*100).toFixed(4)}%)`);
        console.log(`   Secret: 1/${Math.round(1/rarityChances.Secret)} (${(rarityChances.Secret*100).toFixed(4)}%)`);
        
        startBossScheduler(client);
        
        const { User } = require('../database/mongo');
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
        
        const scheduleLeaderboardUpdate = () => {
            const now = new Date();
            const midnight = new Date(now);
            midnight.setHours(24, 0, 0, 0);
            const msUntilMidnight = midnight - now;
            
            setTimeout(async () => {
                await updateLeaderboard(client, User);
                await updatePointsLeaderboard(client, User);
                console.log("📊 Leaderboards updated at midnight!");
                
                setInterval(async () => {
                    await updateLeaderboard(client, User);
                    await updatePointsLeaderboard(client, User);
                    console.log("📊 Leaderboards updated!");
                }, 86400000);
            }, msUntilMidnight);
        };
        
        scheduleLeaderboardUpdate();
    }
};