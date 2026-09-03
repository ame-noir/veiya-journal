export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/entries') {
      if (request.method === 'GET') {
        try {
          const { results } = await env.DB.prepare(
            `SELECT id, title, content, entry_date, created_at 
             FROM entries 
             ORDER BY entry_date DESC, id DESC`
          ).all();
          return Response.json(results || []);
        } catch (err) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      }

      if (request.method === 'POST') {
        try {
          const formData = await request.formData();
          const password = formData.get('password');
          const title = formData.get('title');
          const content = formData.get('content') || '';
          const entry_date = formData.get('entry_date');

          if (!password || password !== env.ADMIN_PASSWORD) {
            return Response.json({ error: '密码错误' }, { status: 401 });
          }

          if (!title || !entry_date) {
            return Response.json({ error: '标题和日期不能为空' }, { status: 400 });
          }

          await env.DB.prepare(
            `INSERT INTO entries (title, content, entry_date) VALUES (?, ?, ?)`
          ).bind(title, content, entry_date).run();

          return Response.json({ success: true });
        } catch (err) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      }
    }

    return env.ASSETS.fetch(request);
  }
};
