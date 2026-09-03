export async function onRequestGet(context) {
  const { env } = context;

  try {
    const { results } = await env.DB.prepare(
      `SELECT id, title, content, entry_date, media_keys, created_at 
       FROM entries 
       ORDER BY entry_date DESC, id DESC`
    ).all();

    return Response.json(results || []);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const password = formData.get('password');
    const title = formData.get('title');
    const content = formData.get('content') || '';
    const entry_date = formData.get('entry_date');

    // 验证密码
    if (!password || password !== env.ADMIN_PASSWORD) {
      return Response.json({ error: '密码错误' }, { status: 401 });
    }

    if (!title || !entry_date) {
      return Response.json({ error: '标题和日期不能为空' }, { status: 400 });
    }

    // 处理上传的文件
    const mediaKeys = [];
    const files = formData.getAll('files');

    for (const file of files) {
      if (file && file.size > 0) {
        const ext = file.name.split('.').pop() || 'bin';
        const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        
        await env.MEDIA.put(key, file.stream(), {
          httpMetadata: {
            contentType: file.type || 'application/octet-stream'
          }
        });
        
        mediaKeys.push(key);
      }
    }

    // 写入数据库
    await env.DB.prepare(
      `INSERT INTO entries (title, content, entry_date, media_keys) 
       VALUES (?, ?, ?, ?)`
    ).bind(
      title,
      content,
      entry_date,
      mediaKeys.length > 0 ? JSON.stringify(mediaKeys) : null
    ).run();

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
