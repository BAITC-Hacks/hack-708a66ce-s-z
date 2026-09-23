import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import { once } from 'node:events';
import { inspect } from 'node:util';
import {
  SessionCredentials,
  isLocalRequest,
  parseCredentialUpdate,
  CREDENTIAL_BODY_LIMIT,
} from '../server/sessionCredentials';
import { createAdvisorServer } from '../server/advisor';

const OPENAI = 'openai-session-fixture-not-a-real-key-12345';
const JEV = 'jev-session-fixture-not-a-real-key-12345';

test('session credentials are private, status-only, disposable, and preserve environment fallback', () => {
  const env = { OPENAI_API_KEY: 'openai-environment-fixture-not-a-real-key' };
  const store = new SessionCredentials(() => env);
  assert.deepEqual(store.status(), {
    openai: { configured: true, source: 'environment' },
    jev: { configured: false, source: 'none' },
  });
  assert.equal(store.effective().openaiKey, env.OPENAI_API_KEY);
  const response = store.apply({ action: 'connect', openaiKey: OPENAI, typesafeKey: JEV });
  assert.deepEqual(response, {
    openai: { configured: true, source: 'session' },
    jev: { configured: true, source: 'session' },
  });
  assert.deepEqual(store.effective(), { openaiKey: OPENAI, typesafeKey: JEV });
  for (const exposed of [
    JSON.stringify(store),
    JSON.stringify(store.handshake()),
    JSON.stringify(store.status()),
    inspect(store),
  ]) {
    assert.ok(!exposed.includes(OPENAI));
    assert.ok(!exposed.includes(JEV));
    assert.ok(!exposed.includes(env.OPENAI_API_KEY));
  }
  assert.equal(JSON.stringify(store), '{}');
  store.apply({ action: 'disconnect' });
  assert.deepEqual(store.effective(), { openaiKey: env.OPENAI_API_KEY, typesafeKey: undefined });
  assert.equal(store.status().openai.source, 'environment');
  assert.equal(new SessionCredentials(() => ({})).status().openai.configured, false);
});

test('credential update validation rejects empty, malformed, excessive, and unknown fields', () => {
  assert.deepEqual(parseCredentialUpdate({ action: 'connect', openaiKey: OPENAI }), {
    action: 'connect',
    openaiKey: OPENAI,
  });
  assert.deepEqual(parseCredentialUpdate({ action: 'connect', typesafeKey: JEV }), {
    action: 'connect',
    typesafeKey: JEV,
  });
  assert.deepEqual(parseCredentialUpdate({ action: 'disconnect' }), { action: 'disconnect' });
  const invalid = [
    null,
    [],
    { action: 'connect' },
    { action: 'connect', openaiKey: '' },
    { action: 'connect', openaiKey: 'short' },
    { action: 'connect', openaiKey: 123 },
    { action: 'connect', openaiKey: 'a'.repeat(513) },
    { action: 'connect', openaiKey: `${OPENAI}\n` },
    { action: 'connect', openaiKey: `${OPENAI} x` },
    { action: 'connect', openaiKey: OPENAI, saveToDisk: true },
    { action: 'disconnect', openaiKey: OPENAI },
  ];
  for (const value of invalid) assert.equal(parseCredentialUpdate(value), null);
});

test('localhost guard rejects DNS rebinding, other origins, null origin, remote clients and browser cross-site reads', () => {
  const good = {
    host: 'localhost:8789',
    origin: 'http://localhost:8789',
    remoteAddress: '127.0.0.1',
    fetchSite: 'same-origin',
  };
  assert.equal(isLocalRequest(good, true), true);
  assert.equal(
    isLocalRequest({ host: '[::1]:8789', origin: 'http://[::1]:8789', remoteAddress: '::1' }, true),
    true,
  );
  assert.equal(
    isLocalRequest(
      {
        host: '127.0.0.1:5175',
        origin: 'http://127.0.0.1:5175',
        remoteAddress: '::ffff:127.0.0.1',
      },
      true,
    ),
    true,
  );
  assert.equal(isLocalRequest({ host: 'localhost:8789' }), true);
  assert.equal(isLocalRequest({ host: 'localhost:8789' }, true), false);
  for (const altered of [
    { host: 'attacker.example:8789' },
    { host: 'localhost.attacker.example' },
    { host: 'user@localhost:8789' },
    { host: 'localhost:99999' },
    { origin: 'https://attacker.example' },
    { origin: 'http://localhost:5175' },
    { origin: 'http://127.0.0.1:8789' },
    { origin: 'null' },
    { origin: 'http://localhost:8789/path' },
    { remoteAddress: '192.168.1.4' },
    { fetchSite: 'cross-site' },
    { fetchSite: 'same-site' },
  ])
    assert.equal(isLocalRequest({ ...good, ...altered }, true), false);
});

test('CSRF tokens are unguessable per server session and never validate malformed alternatives', () => {
  const first = new SessionCredentials(() => ({})),
    second = new SessionCredentials(() => ({}));
  const { csrfToken } = first.handshake();
  assert.ok(csrfToken.length >= 32);
  assert.equal(first.acceptsToken(csrfToken), true);
  assert.equal(second.acceptsToken(csrfToken), false);
  for (const invalid of [
    '',
    undefined,
    null,
    123,
    'x'.repeat(csrfToken.length),
    'é'.repeat(csrfToken.length),
    [csrfToken],
  ])
    assert.equal(first.acceptsToken(invalid), false);
});

function localRequest(
  port: number,
  path: string,
  options: { method?: string; body?: string; headers?: Record<string, string> } = {},
) {
  return new Promise<{ code: number; text: string; headers: Record<string, unknown> }>(
    (resolve, reject) => {
      const req = httpRequest(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method: options.method ?? 'GET',
          headers: options.headers,
        },
        (res) => {
          let text = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            text += chunk;
          });
          res.on('end', () => resolve({ code: res.statusCode!, text, headers: res.headers }));
        },
      );
      req.on('error', reject);
      req.end(options.body);
    },
  );
}

test('HTTP handshake, connect, redaction, disconnect and restart work without any provider request', async () => {
  const server = createAdvisorServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  try {
    const handshake = await localRequest(port, '/api/session-credentials');
    assert.equal(handshake.code, 200);
    assert.equal(handshake.headers['cache-control'], 'no-store');
    assert.equal(handshake.headers['access-control-allow-origin'], undefined);
    const baseline = JSON.parse(handshake.text);
    const headers = {
      Origin: `http://127.0.0.1:${port}`,
      'Content-Type': 'application/json',
      'X-Qala-Session-Token': baseline.csrfToken,
    };
    const connected = await localRequest(port, '/api/session-credentials', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'connect', openaiKey: OPENAI, typesafeKey: JEV }),
    });
    assert.equal(connected.code, 200);
    assert.equal(JSON.parse(connected.text).openai.source, 'session');
    assert.ok(!connected.text.includes(OPENAI));
    assert.ok(!connected.text.includes(JEV));
    const status = await localRequest(port, '/api/status');
    assert.equal(JSON.parse(status.text).openai, true);
    assert.ok(!status.text.includes(OPENAI));
    const nextHandshake = await localRequest(port, '/api/session-credentials');
    assert.ok(!nextHandshake.text.includes(OPENAI));
    const disconnected = await localRequest(port, '/api/session-credentials', {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'disconnect' }),
    });
    assert.equal(disconnected.code, 200);
    const cleared = JSON.parse(disconnected.text);
    assert.deepEqual(cleared.openai, baseline.openai);
    assert.deepEqual(cleared.jev, baseline.jev);
    // Existing advice API still serves the local fallback after removal when no env key exists.
    if (!baseline.openai.configured && !baseline.jev.configured) {
      const advice = await localRequest(port, '/api/decision-support', {
        method: 'POST',
        headers: { Origin: `http://127.0.0.1:${port}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ decisions: [], lang: 'en', goal: 'balanced', question: '' }),
      });
      assert.equal(advice.code, 200);
      assert.equal(JSON.parse(advice.text).mode, 'local');
    }
  } finally {
    server.close();
    await once(server, 'close');
  }
  const restarted = createAdvisorServer();
  restarted.listen(0, '127.0.0.1');
  await once(restarted, 'listening');
  try {
    const handshake = JSON.parse(
      (await localRequest((restarted.address() as AddressInfo).port, '/api/session-credentials'))
        .text,
    );
    assert.notEqual(handshake.openai.source, 'session');
    assert.notEqual(handshake.jev.source, 'session');
  } finally {
    restarted.close();
    await once(restarted, 'close');
  }
});

test('HTTP credential endpoint rejects cross-origin token reads, CSRF, unknown fields and oversized bodies without echoing secrets', async () => {
  const server = createAdvisorServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  try {
    const handshake = JSON.parse((await localRequest(port, '/api/session-credentials')).text);
    const origin = `http://127.0.0.1:${port}`;
    const headers = {
      Origin: origin,
      'Content-Type': 'application/json',
      'X-Qala-Session-Token': handshake.csrfToken,
    };
    const connect = JSON.stringify({ action: 'connect', openaiKey: OPENAI });
    const cases: {
      expected: number;
      options: { method?: string; body?: string; headers?: Record<string, string> };
    }[] = [
      { expected: 403, options: { headers: { Origin: 'https://attacker.example' } } },
      { expected: 403, options: { headers: { Host: 'attacker.example' } } },
      { expected: 403, options: { headers: { 'Sec-Fetch-Site': 'cross-site' } } },
      {
        expected: 403,
        options: {
          method: 'POST',
          headers: { ...headers, Origin: 'http://localhost:9999' },
          body: connect,
        },
      },
      {
        expected: 403,
        options: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Qala-Session-Token': handshake.csrfToken,
          },
          body: connect,
        },
      },
      {
        expected: 403,
        options: {
          method: 'POST',
          headers: { Origin: origin, 'Content-Type': 'application/json' },
          body: connect,
        },
      },
      {
        expected: 403,
        options: {
          method: 'POST',
          headers: { ...headers, 'X-Qala-Session-Token': 'wrong' },
          body: connect,
        },
      },
      {
        expected: 415,
        options: {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'text/plain' },
          body: connect,
        },
      },
      {
        expected: 400,
        options: {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'connect', openaiKey: OPENAI, persist: true }),
        },
      },
      {
        expected: 400,
        options: {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'connect', openaiKey: `${OPENAI}\n` }),
        },
      },
      { expected: 400, options: { method: 'POST', headers, body: '{' } },
      {
        expected: 413,
        options: {
          method: 'POST',
          headers,
          body: JSON.stringify({
            action: 'connect',
            openaiKey: 'x'.repeat(CREDENTIAL_BODY_LIMIT + 1),
          }),
        },
      },
      { expected: 405, options: { method: 'PUT', headers, body: connect } },
    ];
    for (const { expected, options } of cases) {
      const response = await localRequest(port, '/api/session-credentials', options);
      assert.equal(response.code, expected);
      assert.ok(!response.text.includes(OPENAI));
      assert.ok(!response.text.includes(handshake.csrfToken));
    }
    const final = JSON.parse((await localRequest(port, '/api/session-credentials')).text);
    assert.notEqual(final.openai.source, 'session');
    assert.equal(
      (await localRequest(port, '/api/status', { headers: { Origin: 'https://attacker.example' } }))
        .code,
      403,
    );
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test(
  'overlapping streamed advice bodies cannot bypass the shared provider gate',
  { timeout: 5000 },
  async (t) => {
    const previousOpenAI = process.env.OPENAI_API_KEY;
    const previousTypesafe = process.env.TYPESAFE_API_KEY;
    const originalFetch = globalThis.fetch;
    delete process.env.OPENAI_API_KEY;
    delete process.env.TYPESAFE_API_KEY;
    let providerCalls = 0;
    // Even the legacy-provider branch is entirely local: no real key or network fetch is used.
    globalThis.fetch = async () => {
      providerCalls++;
      return new Response(
        JSON.stringify({
          output: [
            { type: 'message', content: [{ type: 'output_text', text: 'Fixture explanation.' }] },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    };
    try {
      for (const path of ['/api/decision-support', '/api/advice']) {
        await t.test(path, async () => {
          const server = createAdvisorServer();
          server.listen(0, '127.0.0.1');
          await once(server, 'listening');
          const port = (server.address() as AddressInfo).port;
          const origin = `http://127.0.0.1:${port}`;
          const callsBefore = providerCalls;
          try {
            if (path === '/api/advice') {
              const handshake = JSON.parse(
                (await localRequest(port, '/api/session-credentials')).text,
              );
              const connected = await localRequest(port, '/api/session-credentials', {
                method: 'POST',
                headers: {
                  Origin: origin,
                  'Content-Type': 'application/json',
                  'X-Qala-Session-Token': handshake.csrfToken,
                },
                body: JSON.stringify({ action: 'connect', openaiKey: OPENAI }),
              });
              assert.equal(connected.code, 200);
            }
            let arrived = 0;
            let ready!: () => void;
            const bothBodiesStarted = new Promise<void>((resolve) => {
              ready = resolve;
            });
            // The app's earlier request listener has reached its body await before this runs.
            server.on('request', (request) => {
              if (request.url === path && ++arrived === 2) ready();
            });
            const body = JSON.stringify(
              path === '/api/advice'
                ? { decisions: [], lang: 'en' }
                : { decisions: [], lang: 'en', goal: 'balanced', question: '' },
            );
            const split = Math.floor(body.length / 2);
            function beginStream() {
              let finish!: () => void;
              const result = new Promise<number>((resolve, reject) => {
                const request = httpRequest(
                  {
                    hostname: '127.0.0.1',
                    port,
                    path,
                    method: 'POST',
                    headers: {
                      Origin: origin,
                      'Content-Type': 'application/json',
                      'Sec-Fetch-Site': 'same-origin',
                    },
                  },
                  (response) => {
                    response.resume();
                    response.on('end', () => resolve(response.statusCode!));
                  },
                );
                request.on('error', reject);
                request.write(body.slice(0, split));
                finish = () => request.end(body.slice(split));
              });
              return { finish, result };
            }
            const first = beginStream();
            const second = beginStream();
            await bothBodiesStarted;
            first.finish();
            second.finish();
            const codes = await Promise.all([first.result, second.result]);
            assert.deepEqual(codes.sort(), [200, 429]);
            assert.equal(providerCalls - callsBefore, path === '/api/advice' ? 1 : 0);
          } finally {
            const closed = once(server, 'close');
            server.close();
            server.closeAllConnections();
            await closed;
          }
        });
      }
    } finally {
      globalThis.fetch = originalFetch;
      if (previousOpenAI === undefined) delete process.env.OPENAI_API_KEY;
      else process.env.OPENAI_API_KEY = previousOpenAI;
      if (previousTypesafe === undefined) delete process.env.TYPESAFE_API_KEY;
      else process.env.TYPESAFE_API_KEY = previousTypesafe;
    }
  },
);
