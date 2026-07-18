// // packages/config/app.config.js
// // Centralized application configuration
// // All values read from environment variables
// const appConfig = {
//   app: {
//     name: process.env.APP_NAME || 'ROOSTAY',
//     env: process.env.NODE_ENV || 'production',
//     debug: process.env.NODE_ENV !== 'production',
//   },
//   database: {
//     url: process.env.DATABASE_URL,
//     maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10', 10),
//   },
//   auth: {
//     jwtSecret: process.env.JWT_SECRET || 'roostay-prod-secret-change-me',
//     jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'roostay-refresh-secret-change-me',
//     jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30m',
//     jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
//     bcryptSaltRounds: 12,
//     tokenType: 'Bearer',
//     passwordMinLength: 8,
//     maxLoginAttempts: 5,
//     lockoutDurationMinutes: 30,
//     cookies: {
//       accessName: 'roostay_access_token',
//       refreshName: 'roostay_refresh_token',
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'lax',
//       maxAgeAccess: 30 * 60 * 1000,
//       maxAgeRefresh: 7 * 24 * 60 * 60 * 1000,
//     },
//   },
//   features: {
//     registrationEnabled: true,
//     listingApprovalRequired: false,
//     paginationDefaultLimit: 12,
//     paginationMaxLimit: 50,
//     paymentTimeoutMinutes: parseInt(process.env.PAYMENT_TIMEOUT_MINUTES || '30', 10),
//     requireTransactionNumber: process.env.REQUIRE_TRANSACTION_NUMBER !== 'false',
//     preventDuplicateTransactions: process.env.PREVENT_DUPLICATE_TRANSACTIONS !== 'false',
//   },
//   payment: {
//     serviceFeePercent: 5,
//     serviceFeeMin: 100,
//     serviceFeeMax: 5000,
//   },
//   upload: {
//     maxFileSizeBytes: 5 * 1024 * 1024,
//     allowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'avif'],
//     rootFolder: 'roostay',
//   },
// };

// module.exports = appConfig;