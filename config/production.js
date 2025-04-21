module.exports = {
    cors: {
        origin: process.env.FRONTEND_URL || 'https://buildmart.com',
        credentials: true
    },
    morgan: {
        format: 'combined'
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    },
    security: {
        bcryptSaltRounds: 12
    }
};