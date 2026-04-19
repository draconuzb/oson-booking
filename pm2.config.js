module.exports = {
  apps: [
    {
      name: 'oson-booking-api',
      script: './backend/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
    },
  ],
};
