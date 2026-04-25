const { EmbedBuilder } = require("discord.js");
const { User } = require("../database/mongo");

module.exports = {
    name: 'activitylb',
    description: 'Leaderboard aktivitas dan points',
    aliases: ['al', 'activelb', 'leaderboard'],
    
    async executePrefix(message, args, client) {
        await message.channel.sendTyping();
        
        const topPoints = await User.find().sort({ points: -1 }).limit(10);
        const topActivity = await User.find().sort({ activityPoints: -1 }).limit(10);
        const topSeason = await User.find().sort({ seasonPoints: -1 }).limit(10);
        const topFishing = await User.find().sort({ totalFishingCredits: -1 }).limit(10);
        
        let pointsText = "";
        for (let i = 0; i < topPoints.length; i++) {
            const u = topPoints[i];
            let name = "Unknown";
            try {
                const d = await client.users.fetch(u.userId);
                name = d.username;
            } catch {}
            const medal = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`;
            pointsText += `${medal} **${name}** - ${u.points.toLocaleString()} pts\n`;
        }
        
        let activityText = "";
        for (let i = 0; i < topActivity.length; i++) {
            const u = topActivity[i];
            let name = "Unknown";
            try {
                const d = await client.users.fetch(u.userId);
                name = d.username;
            } catch {}
            const medal = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`;
            activityText += `${medal} **${name}** - ${u.activityPoints.toLocaleString()} pts\n`;
        }
        
        let seasonText = "";
        for (let i = 0; i < topSeason.length; i++) {
            const u = topSeason[i];
            let name = "Unknown";
            try {
                const d = await client.users.fetch(u.userId);
                name = d.username;
            } catch {}
            const medal = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`;
            seasonText += `${medal} **${name}** - ${u.seasonPoints.toLocaleString()} pts\n`;
        }
        
        let fishingText = "";
        for (let i = 0; i < topFishing.length; i++) {
            const u = topFishing[i];
            let name = "Unknown";
            try {
                const d = await client.users.fetch(u.userId);
                name = d.username;
            } catch {}
            const medal = i === 0 ? "👑" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i+1}.`;
            fishingText += `${medal} **${name}** - ${(u.totalFishingCredits || 0).toLocaleString()} credits\n`;
        }
        
        const embed = new EmbedBuilder()
            .setTitle("📊 **ACTIVITY LEADERBOARD** 📊")
            .setDescription("Top player berdasarkan berbagai kategori!")
            .setColor(0x00ff88)
            .addFields(
                { name: "⭐ **TOP POINTS**", value: pointsText || "Tidak ada data", inline: true },
                { name: "📈 **TOP ACTIVITY**", value: activityText || "Tidak ada data", inline: true },
                { name: "🏆 **TOP SEASON**", value: seasonText || "Tidak ada data", inline: true },
                { name: "💰 **TOP FISHING**", value: fishingText || "Tidak ada data", inline: true }
            )
            .setFooter({ text: "Update setiap saat | Gunakan !points untuk cek points sendiri" })
            .setTimestamp();
        
        return message.reply({ embeds: [embed] });
    }
};