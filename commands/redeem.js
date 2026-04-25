const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { User } = require('../database/mongo');

const REWARDS = {
    "Tunai Rp5.000": { cost: 8000, type: "cash", value: "Rp5.000", emoji: "💰" },
    "Tunai Rp10.000": { cost: 16000, type: "cash", value: "Rp10.000", emoji: "💰" },
    "Tunai Rp20.000": { cost: 32000, type: "cash", value: "Rp20.000", emoji: "💰" },
    "Tunai Rp50.000": { cost: 76000, type: "cash", value: "Rp50.000", emoji: "💰" },
    "Tunai Rp100.000": { cost: 150000, type: "cash", value: "Rp100.000", emoji: "💰" }
};

const OWNER_ID = "756609192277835858";

module.exports = {
    name: 'redeem',
    description: 'Tukarkan points dengan hadiah tunai',
    aliases: ['hadiah', 'tukar'],
    
    async executePrefix(message, args, client) {
        const user = await User.findOne({ userId: message.author.id });
        if (!user) {
            return message.reply("❌ Kamu belum memiliki akun! Ketik `!profile` untuk membuat akun.");
        }
        
        const embed = new EmbedBuilder()
            .setTitle("🎁 **REDEEM HADIAH** 🎁")
            .setDescription("Tukarkan points kamu dengan hadiah tunai!")
            .setColor(0xffaa00)
            .addFields(
                { name: "💰 Tunai Rp5.000", value: "8,000 points", inline: true },
                { name: "💰 Tunai Rp10.000", value: "16,000 points", inline: true },
                { name: "💰 Tunai Rp20.000", value: "32,000 points", inline: true },
                { name: "💰 Tunai Rp50.000", value: "76,000 points", inline: true },
                { name: "💰 Tunai Rp100.000", value: "150,000 points", inline: true },
                { name: "━━━━━━━━━━", value: `⭐⭐ **${user.points.toLocaleString()} points** ⭐⭐`, inline: false }
            )
            .setFooter({ text: "Pilih hadiah dari dropdown di bawah!" })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId("redeem_select")
                .setPlaceholder("🎁 Pilih hadiah yang ingin ditukar")
                .addOptions([
                    { label: "💰 Tunai Rp5.000", value: "Tunai Rp5.000", description: "Butuh 8,000 points", emoji: "💰" },
                    { label: "💰 Tunai Rp10.000", value: "Tunai Rp10.000", description: "Butuh 16,000 points", emoji: "💰" },
                    { label: "💰 Tunai Rp20.000", value: "Tunai Rp20.000", description: "Butuh 32,000 points", emoji: "💰" },
                    { label: "💰 Tunai Rp50.000", value: "Tunai Rp50.000", description: "Butuh 76,000 points", emoji: "💰" },
                    { label: "💰 Tunai Rp100.000", value: "Tunai Rp100.000", description: "Butuh 150,000 points", emoji: "💰" }
                ])
        );

        await message.reply({ embeds: [embed], components: [row] });
    },
    
    async handleRedeem(interaction, client) {
        const rewardName = interaction.values[0];
        const reward = REWARDS[rewardName];
        const user = await User.findOne({ userId: interaction.user.id });
        
        if (!user) {
            return interaction.reply({ content: "❌ Kamu belum memiliki akun!", flags: 64 });
        }
        
        if (user.redeemedRewards?.includes(rewardName)) {
            return interaction.reply({ content: `❌ Hadiah **${rewardName}** sudah pernah ditukar!`, flags: 64 });
        }
        
        if (user.points < reward.cost) {
            return interaction.reply({ content: `❌ Points kurang! Butuh ${reward.cost.toLocaleString()} pts, kamu punya ${user.points.toLocaleString()} pts`, flags: 64 });
        }
        
        await User.updateOne(
            { userId: interaction.user.id, points: { $gte: reward.cost } },
            { $inc: { points: -reward.cost }, $push: { redeemedRewards: rewardName } }
        );
        
        const owner = await client.users.fetch(OWNER_ID);
        const embed = new EmbedBuilder()
            .setTitle("🎁 PENUKARAN HADIAH")
            .setDescription(`Ada yang menukar hadiah!`)
            .setColor(0x00ff00)
            .addFields(
                { name: "👤 User", value: `<@${interaction.user.id}>`, inline: true },
                { name: "🎁 Hadiah", value: `${reward.emoji} ${rewardName}`, inline: true },
                { name: "💰 Biaya", value: `${reward.cost.toLocaleString()} points`, inline: true },
                { name: "📦 Nilai", value: reward.value, inline: true }
            )
            .setTimestamp();
        
        await owner.send({ embeds: [embed] }).catch(() => {});
        
        const updatedUser = await User.findOne({ userId: interaction.user.id });
        
        await interaction.update({ 
            content: `✅ ${reward.emoji} **${rewardName}** berhasil ditukar!\n📦 Nilai: ${reward.value}\n💰 Sisa points: ${updatedUser.points.toLocaleString()}\n\n📌 Admin akan segera memproses pembayaran!`, 
            components: [] 
        });
    }
};