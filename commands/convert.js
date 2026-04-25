const { EmbedBuilder } = require('discord.js');
const { User } = require('../database/mongo');

module.exports = {
    name: 'convert',
    description: 'Convert credits ke points (100 credits = 1 point)',
    
    async executePrefix(message, args, client) {
        const amount = parseInt(args[0]);
        
        if (isNaN(amount) || amount < 100) {
            return message.reply('❌ Usage: `!convert 1000` (minimal 100 credits = 1 point)');
        }
        
        const pointsAmount = Math.floor(amount / 100);
        const creditsNeeded = pointsAmount * 100;
        
        let user = await User.findOne({ userId: message.author.id });
        if (!user || user.credits < creditsNeeded) {
            return message.reply(`❌ Credit tidak cukup! Butuh ${creditsNeeded} credits.`);
        }
        
        await User.updateOne(
            { userId: message.author.id },
            { $inc: { credits: -creditsNeeded, points: pointsAmount, seasonPoints: pointsAmount, activityPoints: pointsAmount } }
        );
        
        const embed = new EmbedBuilder()
            .setTitle('🔄 CONVERT BERHASIL')
            .setColor(0x00ff88)
            .addFields(
                { name: 'Credits digunakan', value: `${creditsNeeded.toLocaleString()}`, inline: true },
                { name: 'Points didapat', value: `${pointsAmount}`, inline: true }
            )
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
};