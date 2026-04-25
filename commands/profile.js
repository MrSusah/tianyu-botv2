const { EmbedBuilder } = require('discord.js');
const { User } = require('../database/mongo');

module.exports = {
    name: 'profile',
    description: 'Lihat profil user (credits, points, aktivitas, dll)',
    aliases: ['profil', 'p', 'points', 'pts', 'point'],
    
    async executePrefix(message, args, client) {
        let targetUser = message.author;
        
        if (message.mentions && message.mentions.users) {
            if (message.mentions.users.first()) {
                targetUser = message.mentions.users.first();
            }
        }
        
        let user = await User.findOne({ userId: targetUser.id });
        if (!user) {
            user = new User({ userId: targetUser.id, credits: 1000, points: 0 });
            await user.save();
        }
        
        // Hitung total konversi
        const convertToPoints = Math.floor(user.credits / 100);
        const convertToCredits = user.points * 100;
        
        const embed = new EmbedBuilder()
            .setTitle(`👤 ${targetUser.username}'s Profile`)
            .setColor(0x00ae86)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: '━━━━━━━━ 📊 **STATISTIK** ━━━━━━━━', value: ' ', inline: false },
                { name: '💰 **Credits**', value: `${user.credits.toLocaleString()}`, inline: true },
                { name: '⭐ **Total Points**', value: `${user.points.toLocaleString()}`, inline: true },
                { name: '📈 **Activity Points**', value: `${user.activityPoints?.toLocaleString() || 0}`, inline: true },
                { name: '🏆 **Season Points**', value: `${user.seasonPoints?.toLocaleString() || 0}`, inline: true },
                { name: '🎣 **Fishing Credits**', value: `${user.totalFishingCredits?.toLocaleString() || 0}`, inline: true },
                { name: '🐟 **Total Ikan**', value: `${user.totalFishCaught?.toLocaleString() || 0}`, inline: true },
                { name: '━━━━━━━━ 🔄 **KONVERSI** ━━━━━━━━', value: ' ', inline: false },
                { name: '💱 Credits → Points', value: `${convertToPoints.toLocaleString()} points`, inline: true },
                { name: '💱 Points → Credits', value: `${convertToCredits.toLocaleString()} credits`, inline: true },
                { name: '━━━━━━━━ 📋 **COMMAND** ━━━━━━━━', value: ' ', inline: false },
                { name: '🔄 Convert', value: '`!convert <credits>`', inline: true },
                { name: '🔄 Convert Point', value: '`!convertpoint <points>`', inline: true },
                { name: '💸 Transfer', value: '`!transfer @user <amount>`', inline: true },
                { name: '🎮 Game', value: '`!game` atau `!casino`', inline: true }
            )
            .setFooter({ text: '100 credits = 1 point | 1 point = 100 credits', iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
};