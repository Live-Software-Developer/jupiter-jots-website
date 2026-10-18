// pm2 process for the Jupiter Jots website on a VPS. A proxy (Caddy or nginx) forwards the
// public domain (jj.livesoftwaredeveloper.com) to :3010 on localhost. `current` is a symlink to the active release, made by
// deploy/activate.sh. Runtime env (SITE_URL) lives in shared/.env, never in the repo.
// PLACEHOLDER paths and port: change APP_DIR / PORT here and in activate.sh to match the server.
module.exports = {
  apps: [
    {
      name: "jupiter_jots_website",
      cwd: "/home/jupiter_jots_website/current",
      script: "server.js",
      node_args: "--env-file-if-exists=/home/jupiter_jots_website/shared/.env",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "384M",
      env: {
        NODE_ENV: "production",
        PORT: "3010",
        HOSTNAME: "127.0.0.1",
      },
    },
  ],
}
