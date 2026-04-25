const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv/config');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
    ]
});

client.prefixCommands = new Collection();
client.games = new Collection();
const PREFIX = '!';

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.name && command.executePrefix) {
        client.prefixCommands.set(command.name, command);
        console.log(`✅ Loaded command: ${command.name}`);
    }
}

// Load games (cf, rps, slots, roulette, dadu, hunt, dungeon, fishing)
const gamesPath = path.join(__dirname, 'games');
if (fs.existsSync(gamesPath)) {
    const gameFiles = fs.readdirSync(gamesPath).filter(file => file.endsWith('.js'));
    for (const file of gameFiles) {
        const game = require(`./games/${file}`);
        if (game.name) {
            client.games.set(game.name, game);
            // Juga daftarkan sebagai prefix command agar bisa dipanggil via !command
            if (game.executePrefix) {
                client.prefixCommands.set(game.name, game);
            }
            console.log(`🎮 Loaded game: ${game.name}`);
            
            if (game.init && typeof game.init === 'function') {
                game.init(client);
            }
        }
    }
}

// ==================== BUTTON & SELECT MENU HANDLER ====================
client.on('interactionCreate', async interaction => {
    // Handle Button
    if (interaction.isButton()) {
        const customId = interaction.customId;
        console.log(`🔘 Button clicked: ${customId} by ${interaction.user.username}`);
        
        // ========== FISHING SYSTEM BUTTONS ==========
        const fishingButtons = [
            'menu_fish', 'fish', 'menu_index', 'menu_inventory', 'inventory_select',
            'menu_sell', 'sell_select', 'sell_all', 'menu_redeem', 'redeem_select',
            'back_to_menu', 'menu_potion', 'use_potion', 'menu_favorite', 'favorite_select',
            'admin_panel', 'admin_select', 'menu_shop', 'shop_category', 'menu_convert',
            'menu_activity', 'menu_leaderboard', 'menu_points_leaderboard', 'menu_profile'
        ];
        
        if (fishingButtons.includes(customId)) {
            const fishingModule = client.games.get('fishing');
            if (fishingModule && fishingModule.handleButton) {
                await fishingModule.handleButton(interaction, client);
            } else {
                await interaction.reply({ content: "❌ Modul fishing tidak tersedia!", flags: 64 });
            }
            return;
        }
        
        // ========== GAME MENU BUTTONS ==========
        if (customId === 'game_fishing') {
            const fishingModule = client.games.get('fishing');
            if (fishingModule && fishingModule.showFishingMenu) {
                await fishingModule.showFishingMenu(interaction);
            } else {
                await interaction.reply({ content: "❌ Modul fishing tidak tersedia!", flags: 64 });
            }
            return;
        }
        
        if (customId === 'game_hunt') {
            const huntModule = client.games.get('hunt');
            if (huntModule && huntModule.executePrefix) {
                const fakeMessage = {
                    author: interaction.user,
                    channel: interaction.channel,
                    channelId: interaction.channel.id,
                    guild: interaction.guild,
                    member: interaction.member,
                    reply: async (options) => {
                        if (!options.content && !options.embeds) {
                            options = { content: "🏹 **HUNT**\n\nGunakan command: `!hunt`", flags: 64 };
                        }
                        await interaction.reply(options);
                    }
                };
                await huntModule.executePrefix(fakeMessage, [], client);
            } else {
                await interaction.reply({ 
                    content: '🏹 **HUNT**\n\nGunakan command:\n`!hunt`\n\n💰 Reward: 50-200 credits\n🎯 Win Chance: 60%\n⏰ Cooldown: 1 jam\n📍 Channel khusus: <#1495049686363410535>', 
                    flags: 64 
                });
            }
            return;
        }

        if (customId === 'game_dungeon') {
            const dungeonModule = client.games.get('dungeon');
            if (dungeonModule && dungeonModule.executePrefix) {
                const fakeMessage = {
                    author: interaction.user,
                    channel: interaction.channel,
                    channelId: interaction.channel.id,
                    guild: interaction.guild,
                    member: interaction.member,
                    reply: async (options) => {
                        if (!options.content && !options.embeds) {
                            options = { content: "🏰 **DUNGEON**\n\nGunakan command: `!dungeon`", flags: 64 };
                        }
                        await interaction.reply(options);
                    }
                };
                await dungeonModule.executePrefix(fakeMessage, [], client);
            } else {
                await interaction.reply({ 
                    content: '🏰 **DUNGEON**\n\nGunakan command:\n`!dungeon`\n\n💰 Reward: 200-1000 credits\n🎯 Win Chance: 40%\n⏰ Cooldown: 2 jam\n📍 Channel khusus: <#1495049686363410535>', 
                    flags: 64 
                });
            }
            return;
        }

        // ========== CASINO BUTTONS ==========
        if (customId === 'game_cf') {
            const cfModule = client.games.get('cf');
            if (cfModule && cfModule.executePrefix) {
                const fakeMessage = {
                    author: interaction.user,
                    channel: interaction.channel,
                    reply: async (options) => {
                        if (options.embeds) {
                            await interaction.reply({ embeds: options.embeds, flags: 64 });
                        } else if (options.content) {
                            await interaction.reply({ content: options.content, flags: 64 });
                        } else {
                            await interaction.reply({ content: "Gunakan command: `!cf kepala 100` atau `!cf ekor 100`", flags: 64 });
                        }
                    }
                };
                await cfModule.executePrefix(fakeMessage, [], client);
            } else {
                await interaction.reply({ 
                    content: '🪙 **COIN FLIP**\n\nGunakan command:\n`!cf kepala 100` atau `!cf ekor 100`\n\n🎯 Win Chance: 30%\n💰 Payout: x2\n📍 Channel khusus: <#1495050723522641970>', 
                    flags: 64 
                });
            }
            return;
        }
        
        if (customId === 'game_rps') {
            const rpsModule = client.games.get('rps');
            if (rpsModule && rpsModule.executePrefix) {
                const fakeMessage = {
                    author: interaction.user,
                    channel: interaction.channel,
                    reply: async (options) => {
                        if (options.embeds) {
                            await interaction.reply({ embeds: options.embeds, flags: 64 });
                        } else if (options.content) {
                            await interaction.reply({ content: options.content, flags: 64 });
                        } else {
                            await interaction.reply({ content: "Gunakan command: `!rps rock 100`, `!rps paper 100`, atau `!rps scissors 100`", flags: 64 });
                        }
                    }
                };
                await rpsModule.executePrefix(fakeMessage, [], client);
            } else {
                await interaction.reply({ 
                    content: '✊ **ROCK PAPER SCISSORS**\n\nGunakan command:\n`!rps rock 100`\n`!rps paper 100`\n`!rps scissors 100`\n\n💰 Payout: x2\n📍 Channel khusus: <#1495050723522641970>', 
                    flags: 64 
                });
            }
            return;
        }
        
        if (customId === 'game_slots') {
            const slotsModule = client.games.get('slots');
            if (slotsModule && slotsModule.executePrefix) {
                const fakeMessage = {
                    author: interaction.user,
                    channel: interaction.channel,
                    reply: async (options) => {
                        if (options.embeds) {
                            await interaction.reply({ embeds: options.embeds, flags: 64 });
                        } else if (options.content) {
                            await interaction.reply({ content: options.content, flags: 64 });
                        } else {
                            await interaction.reply({ content: "Gunakan command: `!slots 100`", flags: 64 });
                        }
                    }
                };
                await slotsModule.executePrefix(fakeMessage, [], client);
            } else {
                await interaction.reply({ 
                    content: '🎰 **SLOT MACHINE**\n\nGunakan command:\n`!slots 100`\n\n🎰 Jackpot: x15-20\n🎰 Pair: x1.5\n📍 Channel khusus: <#1495050723522641970>', 
                    flags: 64 
                });
            }
            return;
        }
        
        if (customId === 'game_roulette') {
            const rouletteModule = client.games.get('roulette');
            if (rouletteModule && rouletteModule.executePrefix) {
                const fakeMessage = {
                    author: interaction.user,
                    channel: interaction.channel,
                    reply: async (options) => {
                        if (options.embeds) {
                            await interaction.reply({ embeds: options.embeds, flags: 64 });
                        } else if (options.content) {
                            await interaction.reply({ content: options.content, flags: 64 });
                        } else {
                            await interaction.reply({ content: "Gunakan command: `!roulette 100 red`, `!roulette 100 black`, atau `!roulette 100 7`", flags: 64 });
                        }
                    }
                };
                await rouletteModule.executePrefix(fakeMessage, [], client);
            } else {
                await interaction.reply({ 
                    content: '🎡 **ROULETTE**\n\nGunakan command:\n`!roulette 100 red`\n`!roulette 100 black`\n`!roulette 100 7`\n\n💰 Red/Black: x2\n💰 Nomor tepat: x36\n📍 Channel khusus: <#1495050723522641970>', 
                    flags: 64 
                });
            }
            return;
        }
        
        if (customId === 'game_dice') {
            const daduModule = client.games.get('dadu');
            if (daduModule && daduModule.executePrefix) {
                const fakeMessage = {
                    author: interaction.user,
                    channel: interaction.channel,
                    reply: async (options) => {
                        if (options.embeds) {
                            await interaction.reply({ embeds: options.embeds, flags: 64 });
                        } else if (options.content) {
                            await interaction.reply({ content: options.content, flags: 64 });
                        } else {
                            await interaction.reply({ content: "Gunakan command: `!dadu high 100` atau `!dadu low 100`", flags: 64 });
                        }
                    }
                };
                await daduModule.executePrefix(fakeMessage, [], client);
            } else {
                await interaction.reply({ 
                    content: '🎲 **DICE HIGH/LOW**\n\nGunakan command:\n`!dadu high 100`\n`!dadu low 100`\n\n🎯 High: 4-6\n🎯 Low: 1-3\n💰 Payout: x2\n📍 Channel khusus: <#1495050723522641970>', 
                    flags: 64 
                });
            }
            return;
        }
        
        // ========== AKUN BUTTONS ==========
        if (customId === 'game_profile') {
            const profileCmd = client.prefixCommands.get('profile');
            if (profileCmd) {
                const fakeMessage = {
                    author: interaction.user,
                    channel: interaction.channel,
                    reply: async (options) => {
                        await interaction.reply({ ...options, flags: 64 });
                    }
                };
                await profileCmd.executePrefix(fakeMessage, [], client);
            } else {
                await interaction.reply({ content: '❌ Command profile tidak ditemukan!', flags: 64 });
            }
            return;
        }
        
        if (customId === 'game_reward') {
            const rewardCmd = client.prefixCommands.get('reward');
            if (rewardCmd) {
                const fakeMessage = {
                    author: interaction.user,
                    channel: interaction.channel,
                    reply: async (options) => {
                        await interaction.reply({ ...options, flags: 64 });
                    }
                };
                await rewardCmd.executePrefix(fakeMessage, [], client);
            } else {
                await interaction.reply({ content: '❌ Command reward tidak ditemukan!', flags: 64 });
            }
            return;
        }
        
        if (customId === 'game_redeem') {
            const redeemCmd = client.prefixCommands.get('redeem');
            if (redeemCmd) {
                const fakeMessage = {
                    author: interaction.user,
                    channel: interaction.channel,
                    reply: async (options) => {
                        await interaction.reply({ ...options, flags: 64 });
                    }
                };
                await redeemCmd.executePrefix(fakeMessage, [], client);
            } else {
                await interaction.reply({ 
                    content: '🎁 **REDEEM HADIAH**\n\nGunakan command:\n`!redeem`\n\n💰 Tunai Rp5.000 = 8,000 points\n💰 Tunai Rp10.000 = 16,000 points\n💰 Tunai Rp20.000 = 32,000 points\n💰 Tunai Rp50.000 = 76,000 points\n💰 Tunai Rp100.000 = 150,000 points', 
                    flags: 64 
                });
            }
            return;
        }
        
        if (customId === 'game_transfer') {
            await interaction.reply({ 
                content: '💸 **TRANSFER CREDITS**\n\nGunakan command:\n`!transfer @user jumlah`\n\nContoh: `!transfer @Kame 1000`\n\n⚠️ Minimal transfer 100 credits\n⚠️ Tidak bisa transfer ke diri sendiri', 
                flags: 64 
            });
            return;
        }
        
        if (customId === 'game_convert') {
            await interaction.reply({ 
                content: '🔄 **CONVERT CREDITS ↔ POINTS**\n\nGunakan command:\n`!convert 1000` (Credits → Points)\n`!convertpoint 10` (Points → Credits)\n\n💡 100 credits = 1 point\n💡 1 point = 100 credits', 
                flags: 64 
            });
            return;
        }
        
        // ========== BACK TO MAIN MENU ==========
        if (customId === 'back_to_main_menu') {
            const gameCmd = client.prefixCommands.get('game');
            if (gameCmd) {
                const fakeMessage = {
                    channelId: interaction.channel.id,
                    author: interaction.user,
                    channel: interaction.channel,
                    reply: async (options) => {
                        await interaction.update(options);
                    }
                };
                await gameCmd.executePrefix(fakeMessage, [], client);
            } else {
                await interaction.reply({ content: "❌ Menu utama tidak tersedia!", flags: 64 });
            }
            return;
        }
        
        // ========== HELP BUTTON ==========
        if (customId === 'game_help') {
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('❓ **BANTUAN**')
                .setDescription('Berikut adalah command yang tersedia:')
                .addFields(
                    { name: '🎮 **Game**', value: '`!game` - Menu utama\n`!casino` - Menu casino', inline: true },
                    { name: '🎣 **Fishing**', value: '`!fishing` - Mancing ikan', inline: true },
                    { name: '🏹 **Hunt**', value: '`!hunt` - Berburu hewan', inline: true },
                    { name: '🏰 **Dungeon**', value: '`!dungeon` - Lawan monster', inline: true },
                    { name: '🎰 **Casino**', value: '`!cf`, `!rps`, `!slots`, `!roulette`, `!dadu`', inline: true },
                    { name: '👤 **Akun**', value: '`!profile`, `!points`, `!reward`, `!redeem`', inline: true },
                    { name: '💸 **Ekonomi**', value: '`!transfer`, `!convert`, `!convertpoint`', inline: true }
                )
                .setFooter({ text: 'Gunakan prefix ! untuk semua command' })
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], flags: 64 });
            return;
        }
        
        // ========== DEFAULT ==========
        console.log(`⚠️ Unhandled button: ${customId}`);
        await interaction.reply({ content: `❌ Tombol ${customId} belum terhubung!`, flags: 64 });
        return;
    }
    
    // ========== SELECT MENU HANDLER ==========
    if (interaction.isStringSelectMenu()) {
        const customId = interaction.customId;
        console.log(`📋 Select menu: ${customId} by ${interaction.user.username}`);
        
        const fishingSelects = ['index_map', 'inventory_select', 'sell_select', 'redeem_select', 'use_potion', 'favorite_select', 'admin_select', 'shop_category'];
        
        if (fishingSelects.includes(customId) || customId.startsWith('shop_buy_')) {
            const fishingModule = client.games.get('fishing');
            if (fishingModule && fishingModule.handleButton) {
                await fishingModule.handleButton(interaction, client);
            } else {
                await interaction.reply({ content: "❌ Modul fishing tidak tersedia!", flags: 64 });
            }
            return;
        }
        
        console.log(`⚠️ Unhandled select menu: ${customId}`);
        await interaction.reply({ content: `❌ Menu ${customId} belum terhubung!`, flags: 64 });
        return;
    }
    
    // ==================== MODAL HANDLER ====================
    if (interaction.isModalSubmit()) {
        const customId = interaction.customId;
        const { User } = require('./database/mongo');
        
        // Admin Add Credit
        if (customId === "admin_addcredit") {
            const userId = interaction.fields.getTextInputValue("user");
            const amount = parseInt(interaction.fields.getTextInputValue("amount"));
            
            let targetId = userId;
            const mentionMatch = userId.match(/<@!?(\d+)>/);
            if (mentionMatch) targetId = mentionMatch[1];
            
            await User.updateOne(
                { userId: targetId },
                { $inc: { credits: amount } },
                { upsert: true }
            );
            
            await interaction.reply({ 
                content: `✅ Berhasil menambahkan **${amount.toLocaleString()} credits** ke <@${targetId}>!`, 
                flags: 64 
            });
            return;
        }
        
        // Admin Remove Credit
        if (customId === "admin_removecredit") {
            const userId = interaction.fields.getTextInputValue("user");
            const amount = parseInt(interaction.fields.getTextInputValue("amount"));
            
            let targetId = userId;
            const mentionMatch = userId.match(/<@!?(\d+)>/);
            if (mentionMatch) targetId = mentionMatch[1];
            
            const user = await User.findOne({ userId: targetId });
            if (!user || user.credits < amount) {
                await interaction.reply({ content: "❌ Gagal! User tidak memiliki cukup credits atau tidak ditemukan!", flags: 64 });
                return;
            }
            
            await User.updateOne({ userId: targetId }, { $inc: { credits: -amount } });
            await interaction.reply({ 
                content: `✅ Berhasil mengurangi **${amount.toLocaleString()} credits** dari <@${targetId}>!`, 
                flags: 64 
            });
            return;
        }
        
        // Admin Add Points
        if (customId === "admin_addpoints") {
            const userId = interaction.fields.getTextInputValue("user");
            const amount = parseInt(interaction.fields.getTextInputValue("amount"));
            
            let targetId = userId;
            const mentionMatch = userId.match(/<@!?(\d+)>/);
            if (mentionMatch) targetId = mentionMatch[1];
            
            await User.updateOne(
                { userId: targetId },
                { $inc: { points: amount, seasonPoints: amount, activityPoints: amount } },
                { upsert: true }
            );
            
            await interaction.reply({ 
                content: `✅ Berhasil menambahkan **${amount.toLocaleString()} points** ke <@${targetId}>!`, 
                flags: 64 
            });
            return;
        }
        
        // Admin Check Profile
        if (customId === "admin_checkprofile") {
            const userId = interaction.fields.getTextInputValue("user");
            
            let targetId = userId;
            const mentionMatch = userId.match(/<@!?(\d+)>/);
            if (mentionMatch) targetId = mentionMatch[1];
            
            const user = await User.findOne({ userId: targetId });
            if (!user) {
                await interaction.reply({ content: `❌ User tidak ditemukan!`, flags: 64 });
                return;
            }
            
            const embed = new EmbedBuilder()
                .setTitle(`👤 Profile User`)
                .setColor(0x00ae86)
                .addFields(
                    { name: "💰 Credits", value: `${user.credits?.toLocaleString() || 0}`, inline: true },
                    { name: "⭐ Points", value: `${user.points?.toLocaleString() || 0}`, inline: true },
                    { name: "📈 Activity Points", value: `${user.activityPoints?.toLocaleString() || 0}`, inline: true },
                    { name: "🏆 Season Points", value: `${user.seasonPoints?.toLocaleString() || 0}`, inline: true },
                    { name: "🎣 Total Fishing Credits", value: `${user.totalFishingCredits?.toLocaleString() || 0}`, inline: true },
                    { name: "🐟 Total Ikan", value: `${user.totalFishCaught?.toLocaleString() || 0}`, inline: true }
                )
                .setTimestamp();
            
            await interaction.reply({ embeds: [embed], flags: 64 });
            return;
        }
        
        // Admin Global Luck
        if (customId === "admin_globalluck") {
            const value = parseFloat(interaction.fields.getTextInputValue("value"));
            if (isNaN(value)) {
                await interaction.reply({ content: "❌ Nilai tidak valid!", flags: 64 });
                return;
            }
            
            // Update global luck
            global.globalLuckBoost = value;
            
            await interaction.reply({ 
                content: `🌍 Global luck telah diubah menjadi **${value}x**!`, 
                flags: 64 
            });
            return;
        }
        
        // Admin Set Channel Luck
        if (customId === "admin_setluck") {
            const channelId = interaction.fields.getTextInputValue("channel");
            const value = parseFloat(interaction.fields.getTextInputValue("value"));
            
            if (isNaN(value)) {
                await interaction.reply({ content: "❌ Nilai tidak valid!", flags: 64 });
                return;
            }
            
            // Update channel luck
            global.channelBoost = global.channelBoost || {};
            global.channelBoost[channelId] = value;
            
            await interaction.reply({ 
                content: `📡 Channel <#${channelId}> luck telah diubah menjadi **${value}x**!`, 
                flags: 64 
            });
            return;
        }
        
        // Default untuk modal yang tidak dikenal
        console.log(`⚠️ Unhandled modal: ${customId}`);
        await interaction.reply({ content: `❌ Modal ${customId} tidak dikenali!`, flags: 64 });
        return;
    }
});

// ==================== MESSAGE HANDLER ====================
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;
    
    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const command = client.prefixCommands.get(commandName);
    if (!command) return;
    
    try {
        await command.executePrefix(message, args, client);
    } catch (error) {
        console.error(`Error executing ${commandName}:`, error);
        await message.reply('❌ Terjadi kesalahan!');
    }
});

// ==================== READY EVENT ====================
client.once('ready', () => {
    console.log(`✅ Bot online as ${client.user.tag}`);
    console.log(`📊 Bot sedang berjalan di ${client.guilds.cache.size} server`);
    console.log(`🎮 Prefix command: ${PREFIX}`);
    console.log(`💡 Ketik ${PREFIX}game untuk memulai!`);
    console.log(`🎮 Casino games: cf, rps, slots, roulette, dadu`);
    
    client.user.setPresence({
        activities: [{ name: `${PREFIX}game | ${PREFIX}casino`, type: 3 }],
        status: 'online'
    });
});

// ==================== CONNECT TO MONGODB AND LOGIN ====================
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        client.login(process.env.TOKEN);
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        client.login(process.env.TOKEN);
    });