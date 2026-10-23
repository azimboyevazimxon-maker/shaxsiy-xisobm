module.exports = {
  apps: [
    {
      name: 'server-panel-bot',
      script: 'src/index.js',
      cwd: __dirname,
      autorestart: true,
      max_restarts: 20,
      min_uptime: '20s',
      restart_delay: 5000,
    },
  ],
};
