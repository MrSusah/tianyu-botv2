const { User } = require("../database/mongo");

/**
 * Activity Handler - Mengelola points dari aktivitas user
 * 
 * Cara mendapat points:
 * - 💬 Chat: +1 points/pesan (cooldown 10 detik per channel)
 * - 📸 Gallery: +5 points/post, +2 points/komentar
 * - 🎯 Reaction: +3 points (cooldown 30 detik)
 * - 🎙️ Voice: +1 points/2 menit (minimal 2 orang di voice)
 */

// Cooldown untuk mencegah spam
const chatCooldown = new Map();      // { `${userId}:${channelId}`: timestamp }
const reactionCooldown = new Map();  // { userId: timestamp }
const voiceTracking = new Map();      // { userId: { lastUpdate, channelId, lastPointsTime } }

// Konfigurasi
const CHAT_COOLDOWN_MS = 10000;      // 10 detik
const REACTION_COOLDOWN_MS = 30000;  // 30 detik
const VOICE_POINTS_INTERVAL = 120000; // 2 menit
const VOICE_MIN_MEMBERS = 2;          // Minimal 2 orang di voice channel

// Channel ID untuk gallery (sesuaikan dengan server kamu)
const GALLERY_CHANNELS = [
    "1492058905499402271",  // Ganti dengan channel gallery kamu
    "1492077755322470530"   // Ganti dengan channel gallery kamu
];

// ==================== CHAT ACTIVITY ====================
async function handleChatActivity(message) {
    // Abaikan bot
    if (message.author.bot) return false;
    
    const userId = message.author.id;
    const channelId = message.channel.id;
    const cooldownKey = `${userId}:${channelId}`;
    
    // Cek cooldown
    const lastChat = chatCooldown.get(cooldownKey);
    if (lastChat && Date.now() - lastChat < CHAT_COOLDOWN_MS) {
        return false;
    }
    
    // Update cooldown
    chatCooldown.set(cooldownKey, Date.now());
    
    // Hapus cooldown lama (lebih dari 1 jam)
    setTimeout(() => {
        if (chatCooldown.get(cooldownKey) === Date.now() - CHAT_COOLDOWN_MS) {
            chatCooldown.delete(cooldownKey);
        }
    }, CHAT_COOLDOWN_MS + 1000);
    
    // Tambah points
    try {
        const result = await User.findOneAndUpdate(
            { userId },
            { 
                $inc: { 
                    points: 1, 
                    activityPoints: 1,
                    seasonPoints: 1 
                } 
            },
            { upsert: true, new: true }
        );
        
        console.log(`💬 Chat activity: ${message.author.username} +1 point (Total: ${result?.points || 0})`);
        return true;
    } catch (error) {
        console.error("Error handling chat activity:", error);
        return false;
    }
}

// ==================== REACTION ACTIVITY ====================
async function handleReactionActivity(reaction, user) {
    // Abaikan bot
    if (user.bot) return false;
    
    const userId = user.id;
    
    // Cek cooldown
    const lastReaction = reactionCooldown.get(userId);
    if (lastReaction && Date.now() - lastReaction < REACTION_COOLDOWN_MS) {
        return false;
    }
    
    // Update cooldown
    reactionCooldown.set(userId, Date.now());
    
    // Hapus cooldown setelah 30 detik
    setTimeout(() => {
        if (reactionCooldown.get(userId) === Date.now() - REACTION_COOLDOWN_MS) {
            reactionCooldown.delete(userId);
        }
    }, REACTION_COOLDOWN_MS + 1000);
    
    // Tambah points
    try {
        const result = await User.findOneAndUpdate(
            { userId },
            { 
                $inc: { 
                    points: 3, 
                    activityPoints: 3,
                    seasonPoints: 3 
                } 
            },
            { upsert: true, new: true }
        );
        
        console.log(`🎯 Reaction activity: ${user.username} +3 points (Total: ${result?.points || 0})`);
        return true;
    } catch (error) {
        console.error("Error handling reaction activity:", error);
        return false;
    }
}

// ==================== GALLERY ACTIVITY ====================
async function handleGalleryActivity(message) {
    // Cek apakah di channel gallery
    if (!GALLERY_CHANNELS.includes(message.channel.id)) return false;
    
    // Abaikan bot
    if (message.author.bot) return false;
    
    const userId = message.author.id;
    const channelId = message.channel.id;
    const cooldownKey = `${userId}:gallery:${channelId}`;
    
    // Cek apakah ini post baru atau komentar
    const isNewPost = message.attachments.size > 0 || message.content.includes("http");
    const pointsToAdd = isNewPost ? 5 : 2; // Post = 5 points, Comment = 2 points
    
    // Cek cooldown (30 detik untuk gallery)
    const lastGallery = chatCooldown.get(cooldownKey);
    if (lastGallery && Date.now() - lastGallery < 30000) {
        return false;
    }
    
    // Update cooldown
    chatCooldown.set(cooldownKey, Date.now());
    
    try {
        const result = await User.findOneAndUpdate(
            { userId },
            { 
                $inc: { 
                    points: pointsToAdd, 
                    activityPoints: pointsToAdd,
                    seasonPoints: pointsToAdd 
                } 
            },
            { upsert: true, new: true }
        );
        
        const activityType = isNewPost ? "📸 Gallery Post" : "💬 Gallery Comment";
        console.log(`${activityType}: ${message.author.username} +${pointsToAdd} points (Total: ${result?.points || 0})`);
        return true;
    } catch (error) {
        console.error("Error handling gallery activity:", error);
        return false;
    }
}

// ==================== VOICE ACTIVITY ====================
async function handleVoiceJoin(oldState, newState) {
    const userId = newState.member?.id;
    if (!userId || newState.member?.user?.bot) return;
    
    const channelId = newState.channelId;
    const oldChannelId = oldState.channelId;
    
    // User join voice channel
    if (channelId && !oldChannelId) {
        voiceTracking.set(userId, {
            lastUpdate: Date.now(),
            channelId: channelId,
            lastPointsTime: Date.now(),
            username: newState.member?.user?.username
        });
        console.log(`🎙️ ${newState.member?.user?.username} joined voice channel`);
    }
    
    // User leave voice channel
    if (!channelId && oldChannelId) {
        const tracking = voiceTracking.get(userId);
        if (tracking) {
            // Hitung total menit sebelum dihapus
            const totalMinutes = Math.floor((Date.now() - tracking.lastUpdate) / 60000);
            if (totalMinutes > 0) {
                await updateVoicePoints(userId, totalMinutes, tracking.username);
            }
            voiceTracking.delete(userId);
        }
        console.log(`🎙️ ${newState.member?.user?.username} left voice channel`);
    }
    
    // User pindah channel
    if (channelId && oldChannelId && channelId !== oldChannelId) {
        const tracking = voiceTracking.get(userId);
        if (tracking) {
            tracking.channelId = channelId;
            tracking.lastUpdate = Date.now();
            voiceTracking.set(userId, tracking);
        }
    }
}

async function updateVoicePoints(userId, minutes, username) {
    if (minutes <= 0) return;
    
    try {
        // Cek berapa banyak user di voice channel (minimal 2 orang untuk dapet points)
        // Points dihitung per 2 menit
        const pointsEarned = Math.floor(minutes / 2);
        
        if (pointsEarned > 0) {
            const result = await User.findOneAndUpdate(
                { userId },
                { 
                    $inc: { 
                        points: pointsEarned, 
                        activityPoints: pointsEarned,
                        seasonPoints: pointsEarned,
                        totalVoiceMinutes: minutes 
                    } 
                },
                { upsert: true, new: true }
            );
            
            console.log(`🎙️ Voice activity: ${username} +${pointsEarned} points (${minutes} menit) - Total: ${result?.points || 0}`);
        }
    } catch (error) {
        console.error("Error updating voice points:", error);
    }
}

// Periodic check untuk voice activity (setiap 2 menit)
async function startVoicePointsChecker(client) {
    setInterval(async () => {
        const now = Date.now();
        
        for (const [userId, tracking] of voiceTracking) {
            const timeSinceLastPoints = now - tracking.lastPointsTime;
            
            if (timeSinceLastPoints >= VOICE_POINTS_INTERVAL) {
                // Cek jumlah member di voice channel
                let memberCount = 0;
                try {
                    const guild = client.guilds.cache.first(); // Ambil guild pertama
                    if (guild) {
                        const channel = guild.channels.cache.get(tracking.channelId);
                        if (channel && channel.members) {
                            // Hitung member non-bot
                            memberCount = channel.members.filter(m => !m.user.bot).size;
                        }
                    }
                } catch (error) {
                    console.error("Error getting voice member count:", error);
                }
                
                // Hanya beri points jika minimal 2 orang (termasuk user)
                if (memberCount >= VOICE_MIN_MEMBERS) {
                    await updateVoicePoints(userId, 2, tracking.username);
                }
                
                // Update last points time
                tracking.lastPointsTime = now;
                voiceTracking.set(userId, tracking);
            }
        }
    }, VOICE_POINTS_INTERVAL);
}

// ==================== PRESENCE ACTIVITY ====================
// Optional: Track status online (online/dnd/idle)
async function handlePresenceUpdate(oldPresence, newPresence) {
    // Abaikan bot
    if (newPresence.user?.bot) return;
    
    const userId = newPresence.userId;
    const oldStatus = oldPresence?.status;
    const newStatus = newPresence?.status;
    
    // Jika status berubah ke online dari offline/away
    if (newStatus === "online" && (oldStatus === "offline" || oldStatus === "idle")) {
        try {
            await User.findOneAndUpdate(
                { userId },
                { $inc: { activityPoints: 1, seasonPoints: 1 } },
                { upsert: true }
            );
            console.log(`🟢 Presence: ${newPresence.user?.username} +1 point (online)`);
        } catch (error) {
            console.error("Error handling presence update:", error);
        }
    }
}

// ==================== COMMAND ACTIVITY ====================
// Track penggunaan command
async function handleCommandActivity(userId, commandName) {
    try {
        await User.findOneAndUpdate(
            { userId },
            { $inc: { activityPoints: 1, seasonPoints: 1 } },
            { upsert: true }
        );
        console.log(`📟 Command activity: ${commandName} used by ${userId}`);
        return true;
    } catch (error) {
        console.error("Error handling command activity:", error);
        return false;
    }
}

// ==================== RESET SEASON ====================
async function resetSeasonPoints() {
    try {
        const result = await User.updateMany(
            {},
            { $set: { seasonPoints: 0, seasonFishCaught: 0 } }
        );
        console.log(`🔄 Season reset! ${result.modifiedCount} users affected`);
        return true;
    } catch (error) {
        console.error("Error resetting season points:", error);
        return false;
    }
}

// ==================== GET ACTIVITY STATS ====================
async function getActivityStats(userId) {
    try {
        const user = await User.findOne({ userId });
        if (!user) return null;
        
        return {
            points: user.points || 0,
            activityPoints: user.activityPoints || 0,
            seasonPoints: user.seasonPoints || 0,
            totalVoiceMinutes: user.totalVoiceMinutes || 0,
            totalFishCaught: user.totalFishCaught || 0,
            lastActive: user.updatedAt
        };
    } catch (error) {
        console.error("Error getting activity stats:", error);
        return null;
    }
}

// ==================== CLEANUP COOLDOWNS ====================
// Hapus cooldown yang sudah kadaluarsa setiap 1 jam
setInterval(() => {
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    
    // Clean chat cooldowns
    for (const [key, timestamp] of chatCooldown) {
        if (timestamp < oneHourAgo) {
            chatCooldown.delete(key);
        }
    }
    
    // Clean reaction cooldowns
    for (const [key, timestamp] of reactionCooldown) {
        if (timestamp < oneHourAgo) {
            reactionCooldown.delete(key);
        }
    }
    
    // Clean voice tracking yang sudah tidak aktif (lebih dari 1 jam)
    for (const [userId, tracking] of voiceTracking) {
        if (now - tracking.lastUpdate > 3600000) {
            voiceTracking.delete(userId);
        }
    }
    
    console.log("🧹 Cleaned up old cooldowns");
}, 3600000);

// ==================== EXPORTS ====================
module.exports = {
    // Main handlers
    handleChatActivity,
    handleReactionActivity,
    handleGalleryActivity,
    handleVoiceJoin,
    handlePresenceUpdate,
    handleCommandActivity,
    
    // Utility functions
    startVoicePointsChecker,
    resetSeasonPoints,
    getActivityStats,
    
    // Config
    CHAT_COOLDOWN_MS,
    REACTION_COOLDOWN_MS,
    VOICE_POINTS_INTERVAL,
    VOICE_MIN_MEMBERS,
    GALLERY_CHANNELS
};