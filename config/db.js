const mongoose = require('mongoose');
const logger = require('../utils/logger');

async function createIndexes() {
    try {
        // User indexes
        await mongoose.model('User').createIndexes([
            { email: 1 },
            { role: 1 },
            { createdAt: -1 }
        ]);

        // Product indexes
        await mongoose.model('Product').createIndexes([
            { category: 1 },
            { price: 1 },
            { stock: 1 },
            { createdAt: -1 }
        ]);

        // Order indexes
        await mongoose.model('Order').createIndexes([
            { customerId: 1 },
            { status: 1 },
            { createdAt: -1 }
        ]);

        // Contact indexes
        await mongoose.model('Contact').createIndexes([
            { status: 1 },
            { createdAt: -1 }
        ]);

        // Activity indexes
        await mongoose.model('Activity').createIndexes([
            { type: 1 },
            { timestamp: -1 }
        ]);

        logger.info('Database indexes created successfully');
    } catch (error) {
        logger.error('Error creating database indexes:', error);
    }
}

module.exports = { createIndexes };