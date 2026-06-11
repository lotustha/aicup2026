// pm2 process config for the World Cup 2026 backend.
// Web server on port 3003. The optional poller (API-Football sync) is defined
// but NOT auto-started — start it explicitly with:
//   pm2 start ecosystem.config.cjs --only aicup2026-poller
module.exports = {
  apps: [
    {
      name: "aicup2026",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3003",
      cwd: "/www/wwwroot/aicup2026",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M",
      env: { NODE_ENV: "production", PORT: "3003" },
    },
    {
      name: "aicup2026-poller",
      script: "node_modules/tsx/dist/cli.mjs",
      args: "scripts/poll.ts",
      cwd: "/www/wwwroot/aicup2026",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "300M",
      env: { NODE_ENV: "production", ENABLE_POLLER: "true" },
    },
  ],
};
