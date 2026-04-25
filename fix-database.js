const mongoose = require('mongoose');
require('dotenv/config');

async function fixDatabase() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');
        
        const { User } = require('./database/mongo');
        
        // Cari semua user
        const users = await User.find({});
        console.log(`📊 Found ${users.length} users`);
        
        let fixedCount = 0;
        
        for (const user of users) {
            let modified = false;
            
            // Perbaiki redeemedRewards jika ada data corrupt
            if (user.redeemedRewards && Array.isArray(user.redeemedRewards)) {
                const cleaned = [];
                for (const item of user.redeemedRewards) {
                    // Jika item adalah string, langsung tambahkan
                    if (typeof item === 'string') {
                        cleaned.push(item);
                    } 
                    // Jika item adalah object, ambil name atau konversi ke string
                    else if (typeof item === 'object' && item !== null) {
                        if (item.name) {
                            cleaned.push(item.name);
                        } else {
                            cleaned.push(JSON.stringify(item));
                        }
                        modified = true;
                    }
                }
                
                if (modified) {
                    user.redeemedRewards = cleaned;
                    await user.save();
                    fixedCount++;
                    console.log(`✅ Fixed user: ${user.userId}`);
                }
            }
        }
        
        console.log(`✅ Fixed ${fixedCount} users`);
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

fixDatabase();