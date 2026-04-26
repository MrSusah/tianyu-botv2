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
        const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        
        // LOGIKA YANG BENAR
        let isWin = false;
        let category = '';
        
        if (choice === 'high') {
            // HIGH menang jika dadu 4, 5, atau 6
            if (dice === 4 || dice === 5 || dice === 6) {
                isWin = true;
                category = 'HIGH ✅';
            } else {
                isWin = false;
                category = 'LOW ❌';
            }
        } else if (choice === 'low') {
            // LOW menang jika dadu 1, 2, atau 3
            if (dice === 1 || dice === 2 || dice === 3) {
                isWin = true;
                category = 'LOW ✅';
            } else {
                isWin = false;
                category = 'HIGH ❌';
            }
        }
        
        // Proses transaksi
        if (isWin) {
            await economy.addCredits(message.author.id, amount * 2);
        } else {
            await economy.removeCredits(message.author.id, amount);
        }
        
        const newBalance = await economy.getBalance(message.author.id);
        
        // Buat embed
        const embed = new EmbedBuilder()
            .setTitle('🎲 **DICE HIGH/LOW** 🎲')
            .setColor(isWin ? 0x00ff00 : 0xff0000)
            .addFields(
                { name: '🎯 Pilihan Kamu', value: choice === 'high' ? 'HIGH (4-6)' : 'LOW (1-3)', inline: true },
                { name: '🎲 Hasil Dadu', value: `${diceEmojis[dice-1]} **${dice}**`, inline: true },
                { name: '📊 Kategori', value: category, inline: true },
                { name: '━━━━━━━━━━', value: '━━━━━━━━━━━━━━━━━━', inline: false },
                { name: '📊 Status', value: isWin ? '✅ MENANG!' : '❌ KALAH!', inline: true },
                { name: '💰 Taruhan', value: `${amount.toLocaleString()} credits`, inline: true },
                { name: '💎 Hasil Akhir', value: isWin ? `+${(amount * 2).toLocaleString()}` : `-${amount.toLocaleString()}`, inline: true },
                { name: '💳 Saldo Akhir', value: `${newBalance.toLocaleString()} credits`, inline: true }
            )
            .setFooter({ text: `${message.author.username} • Peluang menang: 50%` });
        
        await message.reply({ embeds: [embed] });
        
        // Log ke console untuk debugging
        console.log(`[DADU] ${message.author.username} | Pilihan: ${choice} | Dadu: ${dice} | Hasil: ${isWin ? 'MENANG' : 'KALAH'} | ${isWin ? `+${amount*2}` : `-${amount}`}`);
    }
};