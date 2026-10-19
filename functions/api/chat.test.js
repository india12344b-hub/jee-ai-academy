import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequestPost } from './chat.js';

function requestContext(body, apiKey = 'test-groq-key') {
  return {
    request: new Request('https://example.test/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    env: { GROQ_API_KEY: apiKey },
  };
}

test('chat endpoint rejects malformed messages and oversized context', async () => {
  for (const body of [
    null,
    [],
    { messages: [] },
    { messages: [{ role: 'system', content: 'no' }] },
    { messages: [{ role: 'user', content: '   ' }] },
    { messages: [{ role: 'user', content: 'valid' }], context: 'x'.repeat(14001) },
  ]) {
    const response = await onRequestPost(requestContext(body));
    assert.equal(response.status, 400);
  }
});

test('chat endpoint uses the server secret without including it in its response', async (context) => {
  const originalFetch = globalThis.fetch;
  let authorizationHeader = '';
  globalThis.fetch = async (_url, options) => {
    authorizationHeader = options.headers.Authorization;
    return new Response(JSON.stringify({
      choices: [{ message: { content: 'A teaching answer.' } }],
    }));
  };

  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await onRequestPost(
    requestContext({ messages: [{ role: 'user', content: 'Explain a limit.' }] }),
  );
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(result.answer, 'A teaching answer.');
  assert.equal(authorizationHeader, 'Bearer test-groq-key');
  assert.equal(JSON.stringify(result).includes('test-groq-key'), false);
});

test('chat endpoint strips client-only message fields before forwarding to Groq', async (context) => {
  const originalFetch = globalThis.fetch;
  let forwardedMessages;
  globalThis.fetch = async (_url, options) => {
    forwardedMessages = JSON.parse(options.body).messages;
    return new Response(JSON.stringify({
      choices: [{ message: { content: 'A teaching answer.' } }],
    }));
  };

  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await onRequestPost(requestContext({
    messages: [
      { id: 'user-id', role: 'user', content: 'Explain a limit.' },
      { id: 'assistant-id', role: 'assistant', content: 'Previous answer.', question: 'A limit?' },
      { id: 'new-user-id', role: 'user', content: 'Why does it work?', privateMetadata: 'not for Groq' },
    ],
  }));

  assert.equal(response.status, 200);
  assert.deepEqual(forwardedMessages, [
    { role: 'system', content: 'You are a helpful JEE tutor.\n\nTextbook context:\n' },
    { role: 'user', content: 'Explain a limit.' },
    { role: 'assistant', content: 'Previous answer.' },
    { role: 'user', content: 'Why does it work?' },
  ]);
});

test('chat endpoint bounds forwarded message content to 5000 characters', async (context) => {
  const originalFetch = globalThis.fetch;
  let forwardedMessages;
  globalThis.fetch = async (_url, options) => {
    forwardedMessages = JSON.parse(options.body).messages;
    return new Response(JSON.stringify({
      choices: [{ message: { content: 'A teaching answer.' } }],
    }));
  };

  context.after(() => {
    globalThis.fetch = originalFetch;
  });

  const response = await onRequestPost(requestContext({
    messages: [{ role: 'user', content: 'x'.repeat(5001) }],
  }));

  assert.equal(response.status, 200);
  assert.equal(forwardedMessages[1].content.length, 5000);
});
