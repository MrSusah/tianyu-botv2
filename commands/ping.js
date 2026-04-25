module.exports = {
    name: 'ping',
    description: 'Test command',
    
    async executePrefix(message, args, client) {
        await message.reply('🏓 Pong! Bot berjalan dengan baik!');
    }
};