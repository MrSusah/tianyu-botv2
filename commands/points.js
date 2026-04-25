const { EmbedBuilder } = require('discord.js');
const { User } = require('../database/mongo');

module.exports = {
    name: 'points',
    description: 'Cek total points',
    aliases: ['pts', 'point'],
    
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
        
        const embed = new EmbedBuilder()
            .setTitle(`⭐ ${targetUser.username}'s Points`)
            .setColor(0xffd700)
            .addFields(
                { name: 'Total Points', value: `${user.points.toLocaleString()}`, inline: true },
                { name: 'Season Points', value: `${user.seasonPoints?.toLocaleString() || 0}`, inline: true },
                { name: 'Activity Points', value: `${user.activityPoints?.toLocaleString() || 0}`, inline: true },
                { name: 'Credits', value: `${user.credits.toLocaleString()}`, inline: true }
            )
            .setFooter({ text: '100 credits = 1 point | 1 point = 100 credits' })
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
};