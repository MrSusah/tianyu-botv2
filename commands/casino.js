const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'casino',
    description: 'Menu utama casino',
    
    async executePrefix(message, args, client) {
        const embed = new EmbedBuilder()
            .setColor('#ffd700')
            .setTitle('🎰 CASINO ROYALE 🎰')
            .setDescription('Gunakan command di bawah ini:')
            .addFields(
                { name: '🪙 Coin Flip', value: '`!cf kepala 100` atau `!cf ekor 100`', inline: false },
                { name: '✊ RPS', value: '`!rps rock 100` / `!rps paper 100` / `!rps scissors 100`', inline: false },
                { name: '🎰 Slots', value: '`!slots 100`', inline: false },
                { name: '🎡 Roulette', value: '`!roulette 100 red` / `!roulette 100 black` / `!roulette 100 7`', inline: false },
                { name: '🎲 Dice', value: '`!dadu high 100` atau `!dadu low 100`', inline: false }
            )
            .setFooter({ text: 'Semua game menggunakan credits' });
        
        await message.reply({ embeds: [embed] });
    }
};