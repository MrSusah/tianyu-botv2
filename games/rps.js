const { EmbedBuilder } = require('discord.js');
const economy = require('../utils/economy');
const channelValidator = require('../utils/channelValidator');

const choices = ['rock', 'paper', 'scissors'];
const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
const names = { rock: 'BATU', paper: 'KERTAS', scissors: 'GUNTING' };

module.exports = {
    name: 'rps',
    description: 'Rock Paper Scissors - 30% win chance',
    
    async executePrefix(message, args, client) {
        if (!channelValidator.validateCasinoChannel(message.channelId)) {
            return message.reply(`❌ Game RPS hanya bisa dimainkan di channel <#${channelValidator.CASINO_CHANNEL_ID}>!`);
        }
        
        if (args.length < 2) {
            return message.reply('❌ Usage: !rps <rock/paper/scissors> <amount>\nContoh: !rps rock 100');
        }
        
        const playerChoice = args[0].toLowerCase();
        if (!choices.includes(playerChoice)) {
            return message.reply('❌ Pilihan: rock, paper, atau scissors!');
        }
        
        const bet = parseInt(args[1]);
        if (isNaN(bet) || bet <= 0) {
            return message.reply('❌ Taruhan harus angka positif!');
        }
        
        const balance = await economy.getBalance(message.author.id);
        if (balance < bet) {
            return message.reply(`❌ Saldo tidak cukup! Punya ${balance} credits`);
        }
        
        const botChoice = choices[Math.floor(Math.random() * 3)];
        const isDraw = playerChoice === botChoice;
        
        // PELUANG MENANG 30% (tidak tergantung aturan RPS)
        const isWin = !isDraw && Math.random() < 0.3;
        
        if (isWin) {
            await economy.addCredits(message.author.id, bet);
        } else if (!isDraw) {
            await economy.removeCredits(message.author.id, bet);
        }
        
        const newBalance = await economy.getBalance(message.author.id);
        
        // Tentukan teks hasil untuk tampilan
        let resultText = '';
        let resultColor = '#ff0000';
        
        if (isWin) {
            resultText = '✅ MENANG!';
            resultColor = '#00ff00';
        } else if (isDraw) {
            resultText = '🤝 SERI!';
            resultColor = '#ffff00';
        } else {
            resultText = '❌ KALAH!';
            resultColor = '#ff0000';
        }
        
        const embed = new EmbedBuilder()
            .setColor(resultColor)
            .setTitle('✊ ROCK PAPER SCISSORS')
            .addFields(
                { name: '👤 Kamu', value: `${emojis[playerChoice]} ${names[playerChoice]}`, inline: true },
                { name: '🤖 Bot', value: `${emojis[botChoice]} ${names[botChoice]}`, inline: true },
                { name: '📊 Hasil', value: resultText, inline: true },
                { name: '💰 Taruhan', value: `${bet} credits`, inline: true },
                { name: '💎 Hasil Akhir', value: isWin ? `+${bet} credits` : isDraw ? '0 credits' : `-${bet} credits`, inline: true },
                { name: '💳 Saldo Akhir', value: `${newBalance} credits`, inline: true }
            )
            .setFooter({ text: `${message.author.username} • Win chance: 30%` });
        
        await message.reply({ embeds: [embed] });
    }
};