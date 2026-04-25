const { EmbedBuilder } = require('discord.js');
const { User, Cooldown } = require('../database/mongo');

module.exports = {
    name: 'reward',
    description: 'Klaim reward harian, mingguan, atau bulanan',
    aliases: ['claim', 'hadiah'],
    
    async executePrefix(message, args, client) {
        const subCommand = args[0]?.toLowerCase();
        
        // Jika tidak ada argumen, tampilkan menu
        if (!subCommand || (subCommand !== 'daily' && subCommand !== 'weekly' && subCommand !== 'monthly')) {
            const embed = new EmbedBuilder()
                .setTitle('🎁 **REWARD SYSTEM** 🎁')
                .setDescription('Pilih jenis reward yang ingin diklaim:')
                .setColor(0xffaa00)
                .addFields(
                    { name: '📅 **Daily Reward**', value: '`!reward daily`\n50-100 credits\n⏰ Cooldown: 24 jam', inline: true },
                    { name: '📆 **Weekly Reward**', value: '`!reward weekly`\n300-500 credits\n⏰ Cooldown: 7 hari', inline: true },
                    { name: '🌙 **Monthly Reward**', value: '`!reward monthly`\n1000-2000 credits\n⏰ Cooldown: 30 hari', inline: true }
                )
                .setFooter({ text: 'Gunakan !reward <daily/weekly/monthly> untuk klaim!' })
                .setTimestamp();
            
            return message.reply({ embeds: [embed] });
        }
        
        const userId = message.author.id;
        let cooldownTime, rewardMin, rewardMax, rewardName, emoji;
        
        switch (subCommand) {
            case 'daily':
                cooldownTime = 86400000; // 24 jam
                rewardMin = 50;
                rewardMax = 100;
                rewardName = 'Daily';
                emoji = '📅';
                break;
            case 'weekly':
                cooldownTime = 604800000; // 7 hari
                rewardMin = 300;
                rewardMax = 500;
                rewardName = 'Weekly';
                emoji = '📆';
                break;
            case 'monthly':
                cooldownTime = 2592000000; // 30 hari
                rewardMin = 1000;
                rewardMax = 2000;
                rewardName = 'Monthly';
                emoji = '🌙';
                break;
            default:
                return message.reply('❌ Pilihan tidak valid! Gunakan: `daily`, `weekly`, atau `monthly`');
        }
        
        // Cek cooldown
        const cooldown = await Cooldown.findOne({ userId, command: subCommand });
        
        if (cooldown) {
            const timeLeft = cooldownTime - (Date.now() - new Date(cooldown.lastUsed).getTime());
            if (timeLeft > 0) {
                const days = Math.floor(timeLeft / 86400000);
                const hours = Math.floor((timeLeft % 86400000) / 3600000);
                const minutes = Math.floor((timeLeft % 3600000) / 60000);
                
                let timeText = '';
                if (days > 0) timeText += `${days} hari `;
                if (hours > 0) timeText += `${hours} jam `;
                if (minutes > 0 && days === 0) timeText += `${minutes} menit`;
                
                return message.reply(`⏰ **Cooldown!**\nKamu bisa klaim **${rewardName} Reward** lagi ${timeText} lagi.`);
            }
        }
        
        // Hitung reward
        const reward = Math.floor(Math.random() * (rewardMax - rewardMin + 1)) + rewardMin;
        
        // Update database
        const user = await User.findOneAndUpdate(
            { userId },
            { $inc: { credits: reward } },
            { upsert: true, new: true }
        );
        
        // Set cooldown
        await Cooldown.findOneAndUpdate(
            { userId, command: subCommand },
            { lastUsed: new Date() },
            { upsert: true }
        );
        
        // Hitung streak (opsional)
        let streakField = {};
        if (subCommand === 'daily') {
            const today = new Date().toDateString();
            const lastDaily = user.lastDailyDate;
            
            if (lastDaily === today) {
                // Sudah klaim hari ini
            } else if (lastDaily === new Date(Date.now() - 86400000).toDateString()) {
                // Klaim berturut-turut
                const newStreak = (user.dailyStreak || 0) + 1;
                await User.updateOne({ userId }, { $inc: { dailyStreak: 1 }, $set: { lastDailyDate: today } });
                streakField = { name: '🔥 **Streak**', value: `${newStreak} hari berturut-turut!`, inline: true };
            } else {
                // Reset streak
                await User.updateOne({ userId }, { $set: { dailyStreak: 1, lastDailyDate: today } });
                streakField = { name: '🔥 **Streak**', value: '1 hari (mulai baru!)', inline: true };
            }
        }
        
        // Buat embed
        const embed = new EmbedBuilder()
            .setTitle(`${emoji} **${rewardName} REWARD CLAIMED!** ${emoji}`)
            .setDescription(`Kamu mendapat **${reward.toLocaleString()} credits**!`)
            .setColor(0x00ff00)
            .addFields(
                { name: '💰 **Reward**', value: `${reward.toLocaleString()} credits`, inline: true },
                { name: '📅 **Type**', value: rewardName, inline: true },
                { name: '💎 **Total Credits**', value: `${(user?.credits || 0).toLocaleString()} credits`, inline: true }
            )
            .setFooter({ text: `Kembali lagi ${subCommand === 'daily' ? 'besok' : subCommand === 'weekly' ? 'minggu depan' : 'bulan depan'} untuk reward berikutnya!` })
            .setTimestamp();
        
        // Tambahkan streak field jika ada
        if (streakField.name) {
            embed.addFields(streakField);
        }
        
        // Tambahan informasi cooldown
        const nextClaim = new Date(Date.now() + cooldownTime);
        embed.addFields({ 
            name: '⏰ **Next Claim**', 
            value: `<t:${Math.floor(nextClaim.getTime() / 1000)}:R>`, 
            inline: true 
        });
        
        await message.reply({ embeds: [embed] });
    }
};