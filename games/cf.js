const { EmbedBuilder } = require('discord.js');
const economy = require('../utils/economy');
const channelValidator = require('../utils/channelValidator');

module.exports = {
    name: 'cf',
    description: 'Coin Flip game',
    
    async executePrefix(message, args, client) {
        if (!channelValidator.validateCasinoChannel(message.channelId)) {
            return message.reply(`❌ Game CF hanya bisa dimainkan di channel <#${channelValidator.CASINO_CHANNEL_ID}>!`);
        }
        
        if (args.length < 2) {
            return message.reply('❌ Usage: !cf <kepala/ekor> <amount>\nContoh: !cf kepala 100');
        }
        
        const choice = args[0].toLowerCase();
        if (choice !== 'kepala' && choice !== 'ekor') {
            return message.reply('❌ Pilihan harus "kepala" atau "ekor"!');
        }
        
        const bet = parseInt(args[1]);
        if (isNaN(bet) || bet <= 0) {
            return message.reply('❌ Taruhan harus angka positif!');
        }
        
        const balance = await economy.getBalance(message.author.id);
        if (balance < bet) {
            return message.reply(`❌ Saldo tidak cukup! Punya ${balance} credits`);
        }
        
        const result = Math.random() < 0.5 ? 'kepala' : 'ekor';
        const isWin = choice === result && Math.random() < 0.3;
        const winAmount = isWin ? bet * 2 : 0;
        
        if (isWin) {
            await economy.addCredits(message.author.id, winAmount);
        } else {
            await economy.removeCredits(message.author.id, bet);
        }
        
        const newBalance = await economy.getBalance(message.author.id);
        
        const embed = new EmbedBuilder()
            .setColor(isWin ? '#00ff00' : '#ff0000')
            .setTitle('🪙 COIN FLIP')
            .addFields(
                { name: 'Pilihan', value: choice.toUpperCase(), inline: true },
                { name: 'Hasil', value: result.toUpperCase(), inline: true },
                { name: 'Status', value: isWin ? '✅ MENANG!' : '❌ KALAH!', inline: true },
                { name: 'Taruhan', value: `${bet} credits`, inline: true },
                { name: 'Hasil', value: isWin ? `+${winAmount}` : `-${bet}`, inline: true },
                { name: 'Saldo', value: `${newBalance} credits`, inline: true }
            )
            .setFooter({ text: message.author.username });
        
        await message.reply({ embeds: [embed] });
    }
};