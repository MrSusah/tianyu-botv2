const { User } = require('../database/mongo');

class EconomyManager {
    static async getBalance(userId) {
        try {
            let user = await User.findOne({ userId });
            if (!user) {
                user = new User({ userId, credits: 1000, points: 0 });
                await user.save();
                console.log(`✅ Created new user: ${userId}`);
                return 1000;
            }
            return user.credits || 0;
        } catch (error) {
            console.error('Error getting balance:', error);
            return 1000;
        }
    }
    
    static async getPoints(userId) {
        try {
            let user = await User.findOne({ userId });
            if (!user) return 0;
            return user.points || 0;
        } catch (error) {
            return 0;
        }
    }
    
    static async addCredits(userId, amount) {
        if (amount <= 0) return false;
        try {
            let user = await User.findOne({ userId });
            if (!user) {
                user = new User({ userId, credits: 1000, points: 0 });
                await user.save();
            }
            user.credits = (user.credits || 0) + amount;
            await user.save();
            console.log(`✅ Added ${amount} credits to ${userId}. New: ${user.credits}`);
            return true;
        } catch (error) {
            console.error('Error adding credits:', error);
            return false;
        }
    }
    
    static async removeCredits(userId, amount) {
        if (amount <= 0) return false;
        try {
            let user = await User.findOne({ userId });
            if (!user) {
                user = new User({ userId, credits: 1000, points: 0 });
                await user.save();
            }
            if (user.credits < amount) {
                console.log(`❌ Insufficient credits for ${userId}. Balance: ${user.credits}, Required: ${amount}`);
                return false;
            }
            user.credits -= amount;
            await user.save();
            console.log(`✅ Removed ${amount} credits from ${userId}. New: ${user.credits}`);
            return true;
        } catch (error) {
            console.error('Error removing credits:', error);
            return false;
        }
    }
}

module.exports = EconomyManager;