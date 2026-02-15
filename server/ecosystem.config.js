module.exports = {
  apps: [
    {
      name: 'gyeol-openclaw',
      cwd: './openclaw-server',
      script: '.venv/bin/uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8000',
      interpreter: 'none',
      env: {
        PATH: `${process.cwd()}/openclaw-server/.venv/bin:${process.env.PATH}`,
      },
      max_memory_restart: '256M',
      restart_delay: 5000,
      max_restarts: 10,
      autorestart: true,
      watch: false,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/openclaw-error.log',
      out_file: './logs/openclaw-out.log',
      merge_logs: true,
    },
  ],
};
