const { EmbedBuilder } = require('discord.js');
const economy = require('../utils/economy');
const channelValidator = require('../utils/channelValidator');

module.exports = {
    name: 'dadu',
    description: 'Dice High/Low game - Tebak High (4-6) atau Low (1-3)',
    
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
        
        // Roll dadu 1-6
        const dice = Math.floor(Math.random() * 6) + 1;
        const isHigh = dice >= 4;
        const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        
        // LOGIKA YANG BENAR: Menang jika pilihan sesuai hasil dadu
        // HIGH menang jika dadu 4,5,6
        // LOW menang jika dadu 1,2,3
        const isWin = (choice === 'high' && isHigh) || (choice === 'low' && !isHigh);
        
        // Proses transaksi
        if (isWin) {
            await economy.addCredits(message.author.id, amount * 2);
        } else {
            await economy.removeCredits(message.author.id, amount);
        }
        
        const newBalance = await economy.getBalance(message.author.id);
        
        // Tentukan teks hasil
        let resultText = isWin ? '✅ MENANG!' : '❌ KALAH!';
        let resultColor = isWin ? 0x00ff00 : 0xff0000;
        
        // Tentukan apakah pilihan sesuai
        let isChoiceCorrect = false;
        if (choice === 'high' && isHigh) isChoiceCorrect = true;
        if (choice === 'low' && !isHigh) isChoiceCorrect = true;
        
        const embed = new EmbedBuilder()
            .setTitle('🎲 **DICE HIGH/LOW** 🎲')
            .setColor(resultColor)
            .addFields(
                { name: '🎯 Pilihan Kamu', value: choice === 'high' ? 'HIGH (4-6)' : 'LOW (1-3)', inline: true },
                { name: '🎲 Hasil Dadu', value: `${diceEmojis[dice-1]} **${dice}**`, inline: true },
                { name: '📊 Kategori', value: isHigh ? 'HIGH' : 'LOW', inline: true },
                { name: '📊 Kecocokan', value: isChoiceCorrect ? '✅ SESUAI' : '❌ TIDAK SESUAI', inline: true },
                { name: '📊 Status', value: resultText, inline: true },
                { name: '💰 Taruhan', value: `${amount.toLocaleString()} credits`, inline: true },
                { name: '💎 Hasil', value: isWin ? `+${(amount * 2).toLocaleString()}` : `-${amount.toLocaleString()}`, inline: true },
                { name: '💳 Saldo Akhir', value: `${newBalance.toLocaleString()} credits`, inline: true }
            )
            .setFooter({ text: `${message.author.username} • Peluang menang: 50% (3 dari 6 kemungkinan)` });
        
        await message.reply({ embeds: [embed] });
    }
};