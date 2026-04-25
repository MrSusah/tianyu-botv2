const { EmbedBuilder } = require("discord.js");
const { User } = require("../database/mongo");

async function sendFishingLeaderboard(client) {
    try {
        const channel = await client.channels.fetch("1492368085410254978");
        if (!channel) return;
        
        const topUsers = await User.find().sort({ totalFishingCredits: -1 }).limit(10);
        
        let leaderboardText = "";
        
        for (let i = 0; i < topUsers.length; i++) {
            const u = topUsers[i];
            let name = "Unknown";
            try {
                const d = await client.users.fetch(u.userId);
                name = d.username;
            } catch {}
            
            const medal = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`;
            leaderboardText += `${medal} **${name}**\n`;
            leaderboardText += `   💰 ${(u.totalFishingCredits || 0).toLocaleString()} credits\n`;
            leaderboardText += `   🎣 ${u.totalFishCaught || 0} ikan\n\n`;
        }
        
        const embed = new EmbedBuilder()
            .setTitle("🏆 FISHING LEADERBOARD (Harian)")
            .setDescription(leaderboardText || "Belum ada data")
            .setColor(0xfacc15)
            .setTimestamp();
        
        await channel.send({ embeds: [embed] });
        console.log("✅ Fishing leaderboard sent");
    } catch (error) {
        console.error("Error sending fishing leaderboard:", error);
    }
}

async function sendActivityLeaderboard(client) {
    try {
        const channel = await client.channels.fetch("1493595313376592013");
        if (!channel) return;
        
        const topPoints = await User.find().sort({ points: -1 }).limit(10);
        
        let pointsText = "⭐ **TOP POINTS**\n\n";
        for (let i = 0; i < topPoints.length; i++) {
            const u = topPoints[i];
            let name = "Unknown";
            try {
                const d = await client.users.fetch(u.userId);
                name = d.username;
            } catch {}
            pointsText += `${i+1}. ${name} - ${u.points.toLocaleString()} pts\n`;
        }
        
        const embed = new EmbedBuilder()
            .setTitle("📊 ACTIVITY POINTS LEADERBOARD (Harian)")
            .setDescription(pointsText)
            .setColor(0x00ff88)
            .setTimestamp();
        
        await channel.send({ embeds: [embed] });
        console.log("✅ Activity leaderboard sent");
    } catch (error) {
        console.error("Error sending activity leaderboard:", error);
    }
}

function startLeaderboardScheduler(client) {
    const scheduleDaily = () => {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const msUntilMidnight = tomorrow - now;
        
        setTimeout(async () => {
            await sendFishingLeaderboard(client);
            await sendActivityLeaderboard(client);
            scheduleDaily();
        }, msUntilMidnight);
    };
    
    scheduleDaily();
    console.log("📅 Leaderboard scheduler started (daily at midnight)");
}

module.exports = {
    startLeaderboardScheduler,
    sendFishingLeaderboard,
    sendActivityLeaderboard
};