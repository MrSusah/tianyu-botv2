const { EmbedBuilder } = require('discord.js');
const economy = require('../utils/economy');
const channelValidator = require('../utils/channelValidator');

module.exports = {
    name: 'dadu',
    description: 'Dice High/Low game - 30% win chance',
    
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
        
        // Roll dadu 1-6 (hanya untuk tampilan)
        const dice = Math.floor(Math.random() * 6) + 1;
        const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
        
        // PELUANG MENANG 30% (tidak tergantung hasil dadu)
        const isWin = Math.random() < 0.30;
        
        // Tentukan kategori untuk tampilan
        const isHigh = dice >= 4;
        const category = isHigh ? 'HIGH' : 'LOW';
        
        // Proses transaksi
        if (isWin) {
            await economy.addCredits(message.author.id, amount * 2);
        } else {
            await economy.removeCredits(message.author.id, amount);
        }
        
        const newBalance = await economy.getBalance(message.author.id);
        
        // Tentukan apakah pilihan sesuai dengan dadu (hanya untuk info)
        const isChoiceMatch = (choice === 'high' && isHigh) || (choice === 'low' && !isHigh);
        const matchText = isChoiceMatch ? '✅ (Sesuai)' : '❌ (Tidak Sesuai)';
        
        // Buat embed
        const embed = new EmbedBuilder()
            .setTitle('🎲 **DICE HIGH/LOW** 🎲')
            .setColor(isWin ? 0x00ff00 : 0xff0000)
            .addFields(
                { name: '🎯 Pilihan Kamu', value: choice === 'high' ? 'HIGH (4-6)' : 'LOW (1-3)', inline: true },
                { name: '🎲 Hasil Dadu', value: `${diceEmojis[dice-1]} **${dice}**`, inline: true },
                { name: '📊 Kategori', value: `${category} ${matchText}`, inline: true },
                { name: '━━━━━━━━━━', value: '━━━━━━━━━━━━━━━━━━', inline: false },
                { name: '🎲 Result', value: isWin ? '✅ MENANG!' : '❌ KALAH!', inline: true },
                { name: '💰 Taruhan', value: `${amount.toLocaleString()} credits`, inline: true },
                { name: '💎 Hasil', value: isWin ? `+${(amount * 2).toLocaleString()}` : `-${amount.toLocaleString()}`, inline: true },
                { name: '💳 Saldo Akhir', value: `${newBalance.toLocaleString()} credits`, inline: true }
            )
            .setFooter({ text: `${message.author.username} • Win chance: 30%` });
        
        await message.reply({ embeds: [embed] });
        
        // Log ke console untuk debugging
        console.log(`[DADU] ${message.author.username} | Pilihan: ${choice} | Dadu: ${dice} | Win: ${isWin ? 'YES' : 'NO'} | ${isWin ? `+${amount*2}` : `-${amount}`}`);
    }
};