interface Env {
  GYEOL_API_URL: string;
  CRON_SECRET: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env): Promise<void> {
    const url = `${env.GYEOL_API_URL.replace(/\/$/, '')}/api/heartbeat`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${env.CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      console.error(`Heartbeat failed: ${res.status} ${await res.text()}`);
    } else {
      const data = await res.json() as Record<string, unknown>;
      console.log('Heartbeat OK:', JSON.stringify(data));
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'POST') {
      const url = `${env.GYEOL_API_URL.replace(/\/$/, '')}/api/heartbeat`;
      const body = await request.text();
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.CRON_SECRET}`,
          'Content-Type': 'application/json',
        },
        body,
      });
      const data = await res.text();
      return new Response(data, {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ status: 'ok', worker: 'gyeol-heartbeat' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
