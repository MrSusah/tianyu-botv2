const { EmbedBuilder } = require('discord.js');
const economy = require('../utils/economy');
const channelValidator = require('../utils/channelValidator');

const symbols = {
    '🍒': { name: 'CHERRY', value: 3, emoji: '🍒', color: '#ff4444' },
    '🍋': { name: 'LEMON', value: 3, emoji: '🍋', color: '#ffff44' },
    '🍊': { name: 'ORANGE', value: 3, emoji: '🍊', color: '#ffaa44' },
    '🍉': { name: 'WATERMELON', value: 4, emoji: '🍉', color: '#44ff44' },
    '🎰': { name: 'JACKPOT', value: 15, emoji: '🎰', color: '#ff44ff' },
    '💎': { name: 'DIAMOND', value: 10, emoji: '💎', color: '#44ffff' },
    '🍇': { name: 'GRAPE', value: 3, emoji: '🍇', color: '#aa44ff' },
    '🔔': { name: 'BELL', value: 5, emoji: '🔔', color: '#ffaa00' },
    '⭐': { name: 'STAR', value: 8, emoji: '⭐', color: '#ffff00' },
    '👑': { name: 'CROWN', value: 20, emoji: '👑', color: '#ffd700' }
};

const symbolList = ['🍒', '🍋', '🍊', '🍉', '🎰', '💎', '🍇', '🔔', '⭐', '👑'];

function getSymbolInfo(symbol) {
    return symbols[symbol] || { name: 'UNKNOWN', value: 3, emoji: symbol, color: '#ffffff' };
}

function getSlotDisplay(s1, s2, s3) {
    const frames = [
        `┌─────┬─────┬─────┐`,
        `│ ${s1}  │ ${s2}  │ ${s3} │`,
        `└─────┴─────┴─────┘`
    ];
    return frames.join('\n');
}

function getWinAnimation(multiplier, winAmount) {
    if (multiplier >= 15) {
        return `🎉🎊 **MEGA JACKPOT!** 🎊🎉\n✨ Selamat! Kamu mendapatkan **${multiplier}x** lipat! ✨`;
    } else if (multiplier >= 8) {
        return `🌟 **AMAZING!** 🌟\n🎰 Jackpot ${multiplier}x! Luar biasa! 🎰`;
    } else if (multiplier >= 5) {
        return `🎯 **GREAT WIN!** 🎯\n💰 +${winAmount.toLocaleString()} credits! 💰`;
    } else if (multiplier >= 3) {
        return `✨ **NICE WIN!** ✨\n🎉 Selamat! +${winAmount.toLocaleString()} credits! 🎉`;
    } else if (multiplier >= 1.5) {
        return `🍀 **LUCKY!** 🍀\n👍 +${winAmount.toLocaleString()} credits! 👍`;
    }
    return `😢 **BETTER LUCK NEXT TIME!** 😢\n💔 -${winAmount.toLocaleString()} credits 💔`;
}

module.exports = {
    name: 'slots',
    description: 'Slot machine - Jackpot hingga 20x!',
    
    async executePrefix(message, args, client) {
        if (!channelValidator.validateCasinoChannel(message.channelId)) {
            return message.reply(`❌ Game Slots hanya bisa dimainkan di channel <#${channelValidator.CASINO_CHANNEL_ID}>!`);
        }
        
        if (args.length < 1) {
            const helpEmbed = new EmbedBuilder()
                .setTitle('🎰 SLOT MACHINE 🎰')
                .setDescription('**Cara Bermain:**\n`!slots <amount>`\n\nContoh: `!slots 100`')
                .setColor(0xffd700)
                .addFields(
                    { name: '🎯 Jackpot Symbol', value: '👑 CROWN = 20x', inline: true },
                    { name: '🎰 Special Symbol', value: '🎰 JACKPOT = 15x', inline: true },
                    { name: '💎 Rare Symbol', value: '💎 DIAMOND = 10x', inline: true },
                    { name: '⭐ Bonus Symbol', value: '⭐ STAR = 8x', inline: true },
                    { name: '🔔 Common Symbol', value: '🔔 BELL = 5x', inline: true },
                    { name: '🍎 Fruit Symbols', value: '🍒🍋🍊🍉🍇 = 3x', inline: true }
                )
                .setFooter({ text: '3x same symbol = Jackpot | 2x same symbol = 1.5x' });
            
            return message.reply({ embeds: [helpEmbed] });
        }
        
        const bet = parseInt(args[0]);
        if (isNaN(bet) || bet <= 0) {
            return message.reply('❌ Taruhan harus angka positif!\nContoh: `!slots 100`');
        }
        
        if (bet < 10) {
            return message.reply('❌ Minimal taruhan adalah **10 credits**!');
        }
        
        const maxBet = 10000;
        if (bet > maxBet) {
            return message.reply(`❌ Maksimal taruhan adalah **${maxBet.toLocaleString()} credits**!`);
        }
        
        const balance = await economy.getBalance(message.author.id);
        if (balance < bet) {
            return message.reply(`❌ Saldo tidak cukup! Punya ${balance.toLocaleString()} credits, butuh ${bet.toLocaleString()} credits`);
        }
        
        // Animasi efek slot (kirim pesan rolling dulu)
        const rollingMsg = await message.reply('🎰 **SLOT MACHINE** 🎰\n\n`Memutar slot...` 🎲🎲🎲');
        
        // Simulasi efek rolling (delay 1 detik)
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Generate hasil
        const slot1 = symbolList[Math.floor(Math.random() * symbolList.length)];
        const slot2 = symbolList[Math.floor(Math.random() * symbolList.length)];
        const slot3 = symbolList[Math.floor(Math.random() * symbolList.length)];
        
        const info1 = getSymbolInfo(slot1);
        const info2 = getSymbolInfo(slot2);
        const info3 = getSymbolInfo(slot3);
        
        let multiplier = 0;
        let winType = '';
        
        if (slot1 === slot2 && slot2 === slot3) {
            multiplier = info1.value;
            winType = `🎰 **JACKPOT!** 🎰\n✨ ${info1.name} x3 = ${multiplier}x ✨`;
        } else if (slot1 === slot2 || slot2 === slot3 || slot1 === slot3) {
            multiplier = 1.5;
            let pairSymbol = slot1 === slot2 ? slot1 : (slot2 === slot3 ? slot2 : slot1);
            let pairInfo = getSymbolInfo(pairSymbol);
            winType = `🍀 **PAIR!** 🍀\n${pairInfo.emoji} ${pairInfo.name} pair = 1.5x`;
        } else {
            multiplier = 0;
            winType = '😢 **NO MATCH** 😢\nCoba lagi lain kali!';
        }
        
        const winAmount = Math.floor(bet * multiplier);
        
        // Proses transaksi
        if (winAmount > 0) {
            await economy.addCredits(message.author.id, winAmount);
        } else {
            await economy.removeCredits(message.author.id, bet);
        }
        
        const newBalance = await economy.getBalance(message.author.id);
        const profit = winAmount - bet;
        const profitColor = profit > 0 ? '#00ff00' : profit < 0 ? '#ff0000' : '#ffff00';
        
        // Buat embed hasil
        const resultEmbed = new EmbedBuilder()
            .setTitle('🎰 **SLOT MACHINE** 🎰')
            .setDescription(`\`\`\`\n${getSlotDisplay(slot1, slot2, slot3)}\n\`\`\``)
            .setColor(winAmount > 0 ? 0x00ff00 : 0xff0000)
            .addFields(
                { 
                    name: '━━━━━━━━━━━━━━━━━━━━', 
                    value: winType,
                    inline: false 
                },
                { 
                    name: '📊 **STATISTIK**', 
                    value: `┌─────────────────────────┐\n│ 💰 Taruhan      │ ${bet.toLocaleString()} credits\n│ 🎯 Multiplier    │ ${multiplier > 0 ? `${multiplier}x` : '0x'}\n│ 💎 Kemenangan   │ ${winAmount > 0 ? `+${winAmount.toLocaleString()}` : `-${bet.toLocaleString()}`} credits\n│ 💵 Profit       │ ${profit > 0 ? `+${profit.toLocaleString()}` : profit < 0 ? `${profit.toLocaleString()}` : '0'} credits\n│ 💳 Saldo Akhir  │ ${newBalance.toLocaleString()} credits\n└─────────────────────────┘`,
                    inline: false 
                }
            )
            .setFooter({ text: `${message.author.username} • Gunakan !slots <amount> untuk bermain lagi`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();
        
        // Tambahkan efek khusus untuk Jackpot
        if (multiplier >= 10) {
            resultEmbed.setTitle('🎉🎊 **MEGA JACKPOT!** 🎊🎉')
                .setColor(0xff44ff)
                .setImage('https://media.tenor.com/0AVbKGYzPe0AAAAi/jackpot-win.gif');
        } else if (multiplier >= 5) {
            resultEmbed.setThumbnail('https://cdn.discordapp.com/emojis/1025605498691330108.png');
        }
        
        // Hapus pesan rolling dan kirim hasil
        await rollingMsg.delete();
        await message.reply({ embeds: [resultEmbed] });
        
        // Log hasil ke console
        console.log(`[SLOTS] ${message.author.username} | Bet: ${bet} | Result: ${slot1}${slot2}${slot3} | Multiplier: ${multiplier}x | Win: ${winAmount} | New Balance: ${newBalance}`);
    }
};