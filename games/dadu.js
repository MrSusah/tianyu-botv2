const { EmbedBuilder } = require('discord.js');
const economy = require('../utils/economy');
const channelValidator = require('../utils/channelValidator');

module.exports = {
    name: 'dadu',
    description: 'Dice High/Low game - 35% win chance',
    
    async executePrefix(message, args, client) {
        if (!channelValidator.validateCasinoChannel(message.channelId)) {
            return message.reply(`❌ Game Dadu hanya bisa dimainkan di channel <#${channelValidator.CASINO_CHANNEL_ID}>!`);
        }
        
        if (args.length < 2) {
            return message.reply('❌ Usage: !dadu <high/low> <amount>\nContoh: !dadu high 100');
        }
        
        const choice = args[0].toLowerCase();
        if (choice !== 'high' && choice !== 'low') {
            return message.reply('❌ Pilihan harus "high" atau "low"!');
        }
        
        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Taruhan harus angka positif!');
        }
        
        if (amount > 3000) {
            return message.reply('❌ Maksimal taruhan 3000 credits!');
        }
        
        const balance = await economy.getBalance(message.author.id);
        if (balance < amount) {
            return message.reply(`❌ Saldo tidak cukup! Punya ${balance} credits`);
        }
        
        // Dadu tetap diroll untuk tampilan (1-6)
        const dice = Math.floor(Math.random() * 6) + 1;
        const isHigh = dice >= 4;
        
        // PELUANG MENANG 35% (tidak tergantung hasil dadu)
        const isWin = Math.random() < 0.35;
        
        // Tampilkan hasil dadu (hanya untuk estetika)
        const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        
        if (isWin) {
            await economy.addCredits(message.author.id, amount * 2);
        } else {
            await economy.removeCredits(message.author.id, amount);
        }
        
        const newBalance = await economy.getBalance(message.author.id);
        
        const embed = new EmbedBuilder()
            .setTitle('🎲 DICE HIGH/LOW')
            .setColor(isWin ? 0x00ff00 : 0xff0000)
            .addFields(
                { name: '🎯 Pilihan', value: choice.toUpperCase(), inline: true },
                { name: '🎲 Dadu', value: `${diceEmojis[dice-1]} ${dice}`, inline: true },
                { name: '📊 Kategori', value: dice >= 4 ? 'HIGH' : 'LOW', inline: true },
                { name: '🎲 Result', value: isWin ? '✅ MENANG!' : '❌ KALAH!', inline: true },
                { name: '💰 Hasil', value: isWin ? `+${amount * 2}` : `-${amount}`, inline: true },
                { name: '💳 Saldo', value: `${newBalance} credits`, inline: true }
            )
            .setFooter({ text: `${message.author.username} • Win chance: 35%` });
        
        await message.reply({ embeds: [embed] });
    }
};