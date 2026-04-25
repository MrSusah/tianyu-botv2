const { EmbedBuilder } = require('discord.js');
const economy = require('../utils/economy');
const cooldown = require('../utils/cooldown');
const channelValidator = require('../utils/channelValidator');

const animals = ['rusa', 'harimau', 'kelinci', 'beruang', 'serigala', 'babi hutan', 'kancil', 'buaya', 'ular', 'elang'];

module.exports = {
    name: 'hunt',
    description: 'Berburu hewan di hutan',
    
    async executePrefix(message, args, client) {
        // Cek apakah ini dari button interaction
        const isFromButton = message.reply && typeof message.reply === 'function';
        
        // Dapatkan channelId dari berbagai sumber
        const channelId = message.channelId || message.channel?.id;
        
        // Validasi channel
        if (!channelValidator.validateHuntChannel(channelId)) {
            const errorMsg = `❌ Game hunt hanya bisa dimainkan di channel <#${channelValidator.HUNT_CHANNEL_ID}>!`;
            if (isFromButton) {
                await message.reply({ content: errorMsg, flags: 64 });
            } else {
                await message.reply(errorMsg);
            }
            return;
        }
        
        const cd = await cooldown.checkCooldown(message.author.id, 'hunt', 3600000);
        if (!cd.allowed) {
            const errorMsg = `⏰ Cooldown! Coba lagi ${cd.timeLeft}.`;
            if (isFromButton) {
                await message.reply({ content: errorMsg, flags: 64 });
            } else {
                await message.reply(errorMsg);
            }
            return;
        }
        
        const animal = animals[Math.floor(Math.random() * animals.length)];
        const isWin = Math.random() < 0.6;
        const reward = isWin ? Math.floor(Math.random() * 151) + 50 : 0;
        
        if (isWin) {
            await economy.addCredits(message.author.id, reward);
        }
        await cooldown.setCooldown(message.author.id, 'hunt');
        
        const embed = new EmbedBuilder()
            .setColor(isWin ? '#00ff00' : '#ff0000')
            .setTitle(isWin ? '🏹 PERBURUAN BERHASIL!' : '😔 PERBURUAN GAGAL')
            .setDescription(`Kamu berburu **${animal}**...\n\n${isWin ? `✨ BERHASIL! +${reward} credits` : '💔 GAGAL! +0 credits'}`)
            .setFooter({ text: message.author.username });
        
        if (isFromButton) {
            await message.reply({ embeds: [embed], flags: 64 });
        } else {
            await message.reply({ embeds: [embed] });
        }
    }
};