import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { explanationInput, ADVISOR_INSTRUCTIONS } from '../src/game/explanation';
import { validate } from '../src/game/engine';
import { checkSupportRequest, provideDecisionSupport } from './decisionSupport';
import {
  SessionCredentials,
  CREDENTIAL_BODY_LIMIT,
  isLocalRequest,
  parseCredentialUpdate,
} from './sessionCredentials';

export async function generateAdvice(
  input: ReturnType<typeof explanationInput>,
  options: { apiKey: string; model?: string; fetcher?: typeof fetch },
) {
  const response = await (options.fetcher ?? fetch)('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${options.apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      model: options.model ?? 'gpt-4.1-mini',
      instructions: ADVISOR_INSTRUCTIONS,
      input: JSON.stringify(input),
      max_output_tokens: 900,
      store: false,
    }),
  });
  if (!response.ok) throw new Error('AI provider unavailable');
  const data = (await response.json()) as {
    output?: { type: string; content?: { type: string; text?: string }[] }[];
  };
  const text = (data.output ?? [])
    .flatMap((item) => (item.type === 'message' ? (item.content ?? []) : []))
    .filter((item) => item.type === 'output_text')
    .map((item) => item.text ?? '')
    .join('\n');
  if (!text.trim()) throw new Error('Empty AI response');
  return text;
}
const send = (res: ServerResponse, code: number, data: object) => {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
  res.end(JSON.stringify(data));
};
export function createAdvisorServer() {
  let lastRequest = 0;
  let inFlight = false;
  const credentials = new SessionCredentials();
  // Claim synchronously after validation: reading a streamed body yields to other requests.
  const claimAdviceRequest = (res: ServerResponse): boolean => {
    if (inFlight || Date.now() - lastRequest < 5000) {
      send(res, 429, { error: 'Please wait before requesting another explanation' });
      return false;
    }
    inFlight = true;
    lastRequest = Date.now();
    return true;
  };
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const localRequest = {
      host: req.headers.host,
      origin: req.headers.origin,
      fetchSite: req.headers['sec-fetch-site'] as string | undefined,
      remoteAddress: req.socket.remoteAddress,
    };
    // The public game document must open from an offline file, another port, or an external link.
    // Only the shell relaxes Origin/Fetch-Site; every API route below keeps the strict guard.
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
      if (!isLocalRequest({ host: localRequest.host, remoteAddress: localRequest.remoteAddress })) {
        send(res, 403, { error: 'Local access only' });
        return;
      }
      try {
        const html = await readFile(new URL('../dist/index.html', import.meta.url));
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Content-Security-Policy': "frame-ancestors 'none'",
        });
        res.end(html);
      } catch {
        send(res, 503, { error: 'Build the game first: npm run build' });
      }
      return;
    }
    if (!isLocalRequest(localRequest)) {
      send(res, 403, { error: 'Same-origin local access only' });
      return;
    }
    if (req.url === '/api/session-credentials') {
      if (req.method === 'GET') {
        send(res, 200, credentials.handshake());
        return;
      }
      if (req.method !== 'POST') {
        send(res, 405, { error: 'Method not allowed' });
        return;
      }
      if (
        !isLocalRequest(localRequest, true) ||
        !credentials.acceptsToken(req.headers['x-qala-session-token'])
      ) {
        send(res, 403, { error: 'Session verification required' });
        return;
      }
      if (req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
        send(res, 415, { error: 'JSON required' });
        return;
      }
      if (Number(req.headers['content-length'] ?? 0) > CREDENTIAL_BODY_LIMIT) {
        send(res, 413, { error: 'Payload too large' });
        return;
      }
      let body = '';
      try {
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > CREDENTIAL_BODY_LIMIT) {
            body = '';
            send(res, 413, { error: 'Payload too large' });
            return;
          }
        }
        const update = parseCredentialUpdate(JSON.parse(body));
        body = '';
        if (!update) {
          send(res, 400, { error: 'Use a valid provider key between 20 and 512 characters' });
          return;
        }
        send(res, 200, credentials.apply(update));
      } catch {
        send(res, 400, { error: 'Invalid credential request' });
      }
      return;
    }
    if (req.url === '/api/status' && req.method === 'GET') {
      send(res, 200, {
        openai: credentials.status().openai.configured,
        jev: credentials.status().jev.configured,
        models: {
          explanation: process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
          selection: process.env.TYPESAFE_MODEL ?? 'jev-1.13.0',
        },
      });
      return;
    }
    const structured = req.url === '/api/decision-support';
    if ((!structured && req.url !== '/api/advice') || req.method !== 'POST') {
      send(res, 404, { error: 'Not found' });
      return;
    }
    const effectiveKeys = credentials.effective();
    if (!structured && !effectiveKeys.openaiKey) {
      send(res, 503, {
        error: 'Optional LLM is not configured. Local explanations remain available.',
      });
      return;
    }
    if (inFlight || Date.now() - lastRequest < 5000) {
      send(res, 429, { error: 'Please wait before requesting another explanation' });
      return;
    }
    let body = '';
    try {
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 10000) {
          send(res, 413, { error: 'Payload too large' });
          return;
        }
      }
      const payload = JSON.parse(body);
      if (structured) {
        if (!checkSupportRequest(payload)) {
          send(res, 400, { error: 'Invalid decision-support request' });
          return;
        }
        if (!claimAdviceRequest(res)) return;
        try {
          const advice = await provideDecisionSupport(payload, {
            openaiKey: effectiveKeys.openaiKey,
            typesafeKey: effectiveKeys.typesafeKey,
            openaiModel: process.env.OPENAI_MODEL,
            jevModel: process.env.TYPESAFE_MODEL,
          });
          send(res, 200, advice);
        } catch {
          send(res, 502, { error: 'Decision support is temporarily unavailable' });
        } finally {
          inFlight = false;
        }
        return;
      }

      if (
        !payload ||
        !Array.isArray(payload.decisions) ||
        payload.decisions.length > 5 ||
        validate(payload.decisions, false).length ||
        !['ru', 'en', 'kk'].includes(payload.lang)
      ) {
        send(res, 400, { error: 'Invalid scenario' });
        return;
      }
      // Ignore all caller-supplied scores. Recompute trusted input here.
      const input = explanationInput(payload.decisions, payload.lang);
      if (!claimAdviceRequest(res)) return;
      try {
        const text = await generateAdvice(input, {
          apiKey: effectiveKeys.openaiKey!,
          model: process.env.OPENAI_MODEL,
        });
        send(res, 200, { mode: 'llm', text });
      } catch {
        send(res, 502, { error: 'AI is temporarily unavailable. Use the local explanation.' });
      } finally {
        inFlight = false;
      }
    } catch {
      send(res, 400, { error: 'Invalid request body' });
    }
  });
  server.on('close', () => credentials.disconnect());
  return server;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.ADVISOR_PORT ?? 8789);
  createAdvisorServer().listen(port, '127.0.0.1', () =>
    console.log(`QALA + optional AI advisor: http://localhost:${port}`),
  );
}
