const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'game',
    description: 'Menu utama game',
    aliases: ['menu', 'utama'],
    
    async executePrefix(message, args, client) {
        // Embed utama
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🎮 **KameBot** 🎮')
            .setDescription('Selamat datang di Mini Game**KameBot**! Pilih kategori di bawah ini untuk mulai bermain.')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '━━━━━━━━ 🎯 **GAME** ━━━━━━━━', value: ' ', inline: false },
                { name: '🎣 **Fishing**', value: 'Mancing ikan di berbagai zona\n`!fishing`', inline: true },
                { name: '🏹 **Hunt**', value: 'Berburu hewan di hutan\n`!hunt`', inline: true },
                { name: '🏰 **Dungeon**', value: 'Jelajahi dungeon lawan monster\n`!dungeon`', inline: true },
                { name: '━━━━━━━━ 🎰 **CASINO** ━━━━━━━━', value: ' ', inline: false },
                { name: '🪙 **Coin Flip**', value: 'Tebak kepala/ekor\n`!cf kepala 100`', inline: true },
                { name: '✊ **RPS**', value: 'Rock Paper Scissors\n`!rps rock 100`', inline: true },
                { name: '🎰 **Slots**', value: 'Slot machine jackpot\n`!slots 100`', inline: true },
                { name: '🎡 **Roulette**', value: 'Tebak warna/nomor\n`!roulette 100 red`', inline: true },
                { name: '🎲 **Dice**', value: 'Tebak High/Low\n`!dadu high 100`', inline: true },
                { name: '━━━━━━━━ 👤 **AKUN** ━━━━━━━━', value: ' ', inline: false },
                { name: '👤 **Profile**', value: 'Lihat profil & points\n`!profile`', inline: true },
                { name: '💰 **Points**', value: 'Cek total points\n`!points`', inline: true },
                { name: '🎁 **Reward**', value: 'Klaim reward harian\n`!reward`', inline: true },
                { name: '🎁 **Redeem**', value: 'Tukar points dengan hadiah\n`!redeem`', inline: true },
                { name: '💸 **Transfer**', value: 'Transfer credits\n`!transfer @user 100`', inline: true },
                { name: '🔄 **Convert**', value: 'Credits → Points\n`!convert 1000`', inline: true }
            )
            .setFooter({ text: `Request by ${message.author.username} • Prefix: !`, iconURL: message.author.displayAvatarURL() })
            .setTimestamp();
        
        // Row 1 - Game Utama
        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('game_fishing')
                    .setLabel('Fishing')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎣'),
                new ButtonBuilder()
                    .setCustomId('game_hunt')
                    .setLabel('Hunt')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏹'),
                new ButtonBuilder()
                    .setCustomId('game_dungeon')
                    .setLabel('Dungeon')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏰')
            );
        
        // Row 2 - Casino Games
        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('game_cf')
                    .setLabel('Coin Flip')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🪙'),
                new ButtonBuilder()
                    .setCustomId('game_rps')
                    .setLabel('RPS')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('✊'),
                new ButtonBuilder()
                    .setCustomId('game_slots')
                    .setLabel('Slots')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎰'),
                new ButtonBuilder()
                    .setCustomId('game_roulette')
                    .setLabel('Roulette')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎡'),
                new ButtonBuilder()
                    .setCustomId('game_dice')
                    .setLabel('Dice')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎲')
            );
        
        // Row 3 - Akun & Lainnya
        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('game_profile')
                    .setLabel('Profile')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('👤'),
                new ButtonBuilder()
                    .setCustomId('game_reward')
                    .setLabel('Reward')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🎁'),
                new ButtonBuilder()
                    .setCustomId('game_redeem')
                    .setLabel('Redeem')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎁'),
                new ButtonBuilder()
                    .setCustomId('game_transfer')
                    .setLabel('Transfer')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('💸'),
                new ButtonBuilder()
                    .setCustomId('game_convert')
                    .setLabel('Convert')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄')
            );
        
        await message.reply({
            embeds: [embed],
            components: [row1, row2, row3]
        });
    }
};