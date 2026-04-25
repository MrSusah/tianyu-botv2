const { EmbedBuilder } = require('discord.js');
const { User } = require('../database/mongo');

module.exports = {
    name: 'activity',
    description: 'Lihat aktivitas dan points',
    
    async executePrefix(message, args, client) {
        let user = await User.findOne({ userId: message.author.id });
        if (!user) {
            user = new User({ userId: message.author.id, credits: 1000, points: 0 });
            await user.save();
        }
        
        const embed = new EmbedBuilder()
            .setTitle('📊 ACTIVITY POINTS SYSTEM')
            .setDescription('Dapatkan points dari aktivitas!')
            .setColor(0x00ff88)
            .addFields(
                { name: '💬 Chat', value: '+1 points/pesan', inline: true },
                { name: '🎯 Reaction', value: '+3 points', inline: true },
                { name: '🎙️ Voice', value: '+1 points/2 menit', inline: true },
                { name: '━━━━━━━━━━', value: '━━━━━━━━━━', inline: false },
                { name: '⭐ Points Kamu', value: `${user.points.toLocaleString()}`, inline: true },
                { name: '🏆 Season Points', value: `${user.seasonPoints?.toLocaleString() || 0}`, inline: true },
                { name: '📈 Activity Points', value: `${user.activityPoints?.toLocaleString() || 0}`, inline: true }
            )
            .setFooter({ text: 'Gunakan !convert 1000 untuk convert credits ke points' })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
};