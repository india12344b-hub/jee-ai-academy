export async function onRequestPost(context) {
  const reply = (data, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  const apiKey = context.env?.GROQ_API_KEY;
  const hasApiKey = typeof apiKey === 'string' && apiKey.length > 0;

  console.info(`[api/chat] GROQ_API_KEY configured: ${hasApiKey}`);

  if (!hasApiKey) {
    return reply(
      {
        error:
          'GROQ_API_KEY is unavailable to this Pages Function. Verify it is configured as a Production runtime secret, then redeploy.',
      },
      503,
    );
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return reply({ error: 'Request body must be valid JSON.' }, 400);
  }

  if (
    !body ||
    typeof body !== 'object' ||
    !Array.isArray(body.messages) ||
    body.messages.length > 20
  ) {
    return reply({ error: 'Invalid messages.' }, 400);
  }

  const messages = body.messages
    .filter(
      (message) =>
        message &&
        typeof message === 'object' &&
        ['user', 'assistant'].includes(message.role) &&
        typeof message.content === 'string',
    )
    .slice(-14)
    .map((message) => ({
      role: message.role,
      content: message.content.slice(0, 5000),
    }));

  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return reply({ error: 'Question missing.' }, 400);
  }

  const system = String(body.system || 'You are a helpful JEE tutor.').slice(
    0,
    5000,
  );
  const textbookContext = String(body.context || '').slice(0, 14000);
  let upstream;

  try {
    upstream = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            {
              role: 'system',
              content: `${system}\n\nTextbook context:\n${textbookContext}`,
            },
            ...messages,
          ],
          temperature: 0.35,
          max_completion_tokens: 2200,
        }),
      },
    );
  } catch (error) {
    console.error(
      '[api/chat] Groq request failed:',
      error instanceof Error ? error.name : 'UnknownError',
    );
    return reply(
      { error: 'Could not reach the AI service. Please try again shortly.' },
      502,
    );
  }

  let data;
  try {
    data = await upstream.json();
  } catch {
    data = null;
  }

  if (!upstream.ok) {
    if (upstream.status === 401 || upstream.status === 403) {
      return reply(
        {
          error:
            'Groq rejected the configured API key. Check that GROQ_API_KEY is a valid Groq key in the Pages Production runtime secrets.',
        },
        502,
      );
    }

    if (upstream.status === 429) {
      return reply(
        {
          error:
            'Groq rate limit or quota reached. Check the Groq account and try again later.',
        },
        429,
      );
    }

    console.error(`[api/chat] Groq returned HTTP ${upstream.status}.`);
    return reply(
      {
        error: `The AI service rejected the request (HTTP ${upstream.status}). Please try again later.`,
      },
      502,
    );
  }

  const answer = data?.choices?.[0]?.message?.content;
  if (typeof answer !== 'string' || !answer) {
    console.error('[api/chat] Groq response did not contain an answer.');
    return reply(
      { error: 'The AI service returned an unexpected response.' },
      502,
    );
  }

  return reply({ answer });
}
