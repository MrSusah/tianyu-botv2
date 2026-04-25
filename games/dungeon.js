const { EmbedBuilder } = require('discord.js');
const economy = require('../utils/economy');
const cooldown = require('../utils/cooldown');
const channelValidator = require('../utils/channelValidator');

const monsters = ['goblin', 'orc', 'troll', 'skeleton', 'zombie', 'vampire', 'werewolf', 'demon', 'dragon'];

module.exports = {
    name: 'dungeon',
    description: 'Jelajahi dungeon lawan monster',
    
    async executePrefix(message, args, client) {
        // Cek apakah ini dari button interaction
        const isFromButton = message.reply && typeof message.reply === 'function';
        
        // Dapatkan channelId dari berbagai sumber
        const channelId = message.channelId || message.channel?.id;
        
        // Validasi channel
        if (!channelValidator.validateHuntChannel(channelId)) {
            const errorMsg = `❌ Game dungeon hanya bisa dimainkan di channel <#${channelValidator.HUNT_CHANNEL_ID}>!`;
            if (isFromButton) {
                await message.reply({ content: errorMsg, flags: 64 });
            } else {
                await message.reply(errorMsg);
            }
            return;
        }
        
        const cd = await cooldown.checkCooldown(message.author.id, 'dungeon', 7200000);
        if (!cd.allowed) {
            const errorMsg = `⏰ Cooldown! Coba lagi ${cd.timeLeft}.`;
            if (isFromButton) {
                await message.reply({ content: errorMsg, flags: 64 });
            } else {
                await message.reply(errorMsg);
            }
            return;
        }
        
        const monster = monsters[Math.floor(Math.random() * monsters.length)];
        const isWin = Math.random() < 0.4;
        const reward = isWin ? Math.floor(Math.random() * 801) + 200 : 0;
        
        if (isWin) {
            await economy.addCredits(message.author.id, reward);
        }
        await cooldown.setCooldown(message.author.id, 'dungeon');
        
        const embed = new EmbedBuilder()
            .setColor(isWin ? '#9b59b6' : '#ff0000')
            .setTitle(isWin ? '⚔️ KEMENANGAN EPIC!' : '💀 KEGAGALAN FATAL')
            .setDescription(`Kamu bertemu **${monster}** di dungeon...\n\n${isWin ? `✨ BERHASIL MENGALAHKAN! +${reward} credits` : '💀 KAMU DIKALAHKAN! +0 credits'}`)
            .setFooter({ text: message.author.username });
        
        if (isFromButton) {
            await message.reply({ embeds: [embed], flags: 64 });
        } else {
            await message.reply({ embeds: [embed] });
        }
    }
};