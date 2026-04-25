const { EmbedBuilder } = require('discord.js');
const economy = require('../utils/economy');
const channelValidator = require('../utils/channelValidator');

const RED = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const BLACK = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

function getColor(num) {
    if (num === 0) return 'green';
    if (RED.includes(num)) return 'red';
    return 'black';
}

module.exports = {
    name: 'roulette',
    description: 'Roulette game',
    
    async executePrefix(message, args, client) {
        if (!channelValidator.validateCasinoChannel(message.channelId)) {
            return message.reply(`❌ Game Roulette hanya bisa dimainkan di channel <#${channelValidator.CASINO_CHANNEL_ID}>!`);
        }
        
        if (args.length < 2) {
            return message.reply('❌ Usage: !roulette <amount> <red/black/green/odd/even/number>\nContoh: !roulette 100 red');
        }
        
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount <= 0) {
            return message.reply('❌ Taruhan harus angka positif!');
        }
        
        const betOn = args[1].toLowerCase();
        
        const balance = await economy.getBalance(message.author.id);
        if (balance < amount) {
            return message.reply(`❌ Saldo tidak cukup! Punya ${balance} credits`);
        }
        
        const result = Math.floor(Math.random() * 37);
        const color = getColor(result);
        const isEven = result > 0 && result % 2 === 0;
        const isOdd = result > 0 && result % 2 === 1;
        
        let multiplier = 0;
        if (betOn === 'red' && color === 'red') multiplier = 2;
        else if (betOn === 'black' && color === 'black') multiplier = 2;
        else if (betOn === 'green' && result === 0) multiplier = 17;
        else if (betOn === 'odd' && isOdd) multiplier = 2;
        else if (betOn === 'even' && isEven) multiplier = 2;
        else if (!isNaN(parseInt(betOn)) && parseInt(betOn) === result) multiplier = 36;
        
        const winAmount = amount * multiplier;
        
        if (winAmount > 0) {
            await economy.addCredits(message.author.id, winAmount);
        } else {
            await economy.removeCredits(message.author.id, amount);
        }
        
        const newBalance = await economy.getBalance(message.author.id);
        
        const embed = new EmbedBuilder()
            .setTitle('🎡 ROULETTE')
            .setColor(winAmount > 0 ? 0x00ff00 : 0xff0000)
            .addFields(
                { name: 'Taruhan', value: betOn.toUpperCase(), inline: true },
                { name: 'Hasil', value: result.toString(), inline: true },
                { name: 'Warna', value: color.toUpperCase(), inline: true },
                { name: 'Hasil', value: winAmount > 0 ? `✅ MENANG! +${winAmount}` : `❌ KALAH! -${amount}`, inline: true },
                { name: 'Saldo', value: `${newBalance} credits`, inline: true }
            )
            .setFooter({ text: message.author.username });
        
        await message.reply({ embeds: [embed] });
    }
};