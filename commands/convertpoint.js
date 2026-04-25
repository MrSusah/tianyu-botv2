const { EmbedBuilder } = require('discord.js');
const { User } = require('../database/mongo');

module.exports = {
    name: 'convertpoint',
    description: 'Convert points ke credits (1 point = 100 credits)',
    aliases: ['cp'],
    
    async executePrefix(message, args, client) {
        const amount = parseInt(args[0]);
        
        if (isNaN(amount) || amount < 1) {
            return message.reply('❌ Usage: `!convertpoint 10` (1 point = 100 credits)');
        }
        
        const creditsAmount = amount * 100;
        
        let user = await User.findOne({ userId: message.author.id });
        if (!user || user.points < amount) {
            return message.reply(`❌ Point tidak cukup! Punya ${user?.points || 0} points.`);
        }
        
        await User.updateOne(
            { userId: message.author.id },
            { $inc: { credits: creditsAmount, points: -amount } }
        );
        
        const embed = new EmbedBuilder()
            .setTitle('🔄 CONVERT POINT BERHASIL')
            .setColor(0x00ff88)
            .addFields(
                { name: 'Points digunakan', value: `${amount}`, inline: true },
                { name: 'Credits didapat', value: `${creditsAmount.toLocaleString()}`, inline: true }
            )
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
};