const { EmbedBuilder } = require('discord.js');
const { User } = require('../database/mongo');

module.exports = {
    name: 'transfer',
    description: 'Transfer credits ke user lain',
    
    async executePrefix(message, args, client) {
        const target = message.mentions.users.first();
        const amount = parseInt(args[0]);
        
        if (!target) {
            return message.reply('❌ Usage: `!transfer @user jumlah`\nContoh: `!transfer @user 1000`');
        }
        
        if (isNaN(amount) || amount < 100) {
            return message.reply('❌ Minimal transfer 100 credits!');
        }
        
        if (target.id === message.author.id) {
            return message.reply('❌ Tidak bisa transfer ke diri sendiri!');
        }
        
        let sender = await User.findOne({ userId: message.author.id });
        if (!sender || sender.credits < amount) {
            return message.reply(`❌ Credit tidak cukup! Saldo: ${sender?.credits || 0} credits`);
        }
        
        await User.updateOne({ userId: message.author.id }, { $inc: { credits: -amount } });
        await User.updateOne({ userId: target.id }, { $inc: { credits: amount } }, { upsert: true });
        
        const embed = new EmbedBuilder()
            .setTitle('💸 TRANSFER BERHASIL')
            .setColor(0x00ff00)
            .addFields(
                { name: 'Pengirim', value: message.author.username, inline: true },
                { name: 'Penerima', value: target.username, inline: true },
                { name: 'Jumlah', value: `${amount.toLocaleString()} credits`, inline: true }
            )
            .setTimestamp();
        
        await message.reply({ embeds: [embed] });
    }
};