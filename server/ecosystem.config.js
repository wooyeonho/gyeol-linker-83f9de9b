module.exports = {
  apps: [
    {
      name: 'gyeol-server',
      cwd: './openclaw-server',
      script: 'poetry',
      args: 'run uvicorn app.main:app --host 0.0.0.0 --port 8000',
      interpreter: 'none',
      max_memory_restart: '256M',
      restart_delay: 5000,
      max_restarts: 10,
      autorestart: true,
      watch: false,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: './logs/gyeol-error.log',
      out_file: './logs/gyeol-out.log',
      merge_logs: true,
    },
  ],
};
