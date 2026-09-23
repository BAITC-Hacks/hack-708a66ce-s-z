import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ArrowUpRight, Check, ChevronDown, KeyRound, LoaderCircle, Unplug } from 'lucide-react';
import type { Lang } from '../game/data';
import '../advisor-connection.css';

type ProviderState = { configured: boolean; source: 'session' | 'environment' | 'none' };
type Status = { openai: ProviderState; jev: ProviderState };
function readStatus(input: unknown): Status | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>;
  const provider = (item: unknown): item is ProviderState => {
    if (!item || typeof item !== 'object') return false;
    const state = item as Record<string, unknown>;
    return (
      typeof state.configured === 'boolean' &&
      ['session', 'environment', 'none'].includes(String(state.source))
    );
  };
  return provider(value.openai) && provider(value.jev)
    ? { openai: value.openai, jev: value.jev }
    : null;
}

/** Keys exist in these inputs only until submit/collapse; they are never persisted or exported. */
export function AdvisorConnection({ lang }: { lang: Lang }) {
  const t = (ru: string, en: string, kk: string) => ({ ru, en, kk })[lang];
  const id = useId();
  const localServer =
    ['http:', 'https:'].includes(location.protocol) &&
    ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const [expanded, setExpanded] = useState(() => localServer && location.hash === '#ai'),
    [status, setStatus] = useState<Status | null>(null),
    [openaiKey, setOpenaiKey] = useState(''),
    [typesafeKey, setTypesafeKey] = useState(''),
    [phase, setPhase] = useState<'idle' | 'checking' | 'ready' | 'saving' | 'unavailable'>('idle'),
    [message, setMessage] = useState<'connected' | 'disconnected' | 'failed' | null>(null);
  const token = useRef<string | null>(null),
    request = useRef<AbortController | null>(null);
  const busy = phase === 'checking' || phase === 'saving';
  const hasSession = status?.openai.source === 'session' || status?.jev.source === 'session';
  const configured = status?.openai.configured || status?.jev.configured;
  const endpoint = '/api/session-credentials';

  useEffect(
    () => () => {
      request.current?.abort();
    },
    [],
  );
  useEffect(() => {
    if (expanded) void refresh();
  }, [expanded]);
  async function refresh() {
    if (!localServer) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    setPhase('checking');
    setMessage(null);
    try {
      const response = await fetch(endpoint, {
        cache: 'no-store',
        credentials: 'omit',
        mode: 'same-origin',
        redirect: 'error',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Unavailable');
      const body: unknown = await response.json();
      const next = readStatus(body);
      const csrf = (body as { csrfToken?: unknown }).csrfToken;
      if (!next || typeof csrf !== 'string' || csrf.length < 32 || csrf.length > 128)
        throw new Error('Invalid status');
      token.current = csrf;
      setStatus(next);
      setPhase('ready');
    } catch {
      if (request.current === controller) {
        token.current = null;
        setStatus(null);
        setPhase('unavailable');
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }
  async function update(action: 'connect' | 'disconnect', event?: FormEvent) {
    event?.preventDefault();
    if (!localServer || !token.current || busy) return;
    const keys = {
      ...(openaiKey.trim() ? { openaiKey: openaiKey.trim() } : {}),
      ...(typesafeKey.trim() ? { typesafeKey: typesafeKey.trim() } : {}),
    };
    // Remove credentials from the form immediately, including on network failure.
    setOpenaiKey('');
    setTypesafeKey('');
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 7000);
    setPhase('saving');
    setMessage(null);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        cache: 'no-store',
        credentials: 'omit',
        mode: 'same-origin',
        redirect: 'error',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-Qala-Session-Token': token.current },
        body: JSON.stringify(action === 'disconnect' ? { action } : { action, ...keys }),
      });
      if (!response.ok) {
        if (response.status === 403) token.current = null;
        throw new Error('Connection rejected');
      }
      const next = readStatus(await response.json());
      if (!next) throw new Error('Invalid status');
      setStatus(next);
      setPhase('ready');
      setMessage(action === 'connect' ? 'connected' : 'disconnected');
      window.dispatchEvent(new CustomEvent('qala-advisor-connection', { detail: next }));
    } catch {
      if (request.current === controller) {
        setPhase(token.current ? 'ready' : 'unavailable');
        setMessage('failed');
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }
  return (
    <details
      className="advisor-connection"
      data-testid="advisor-connection"
      open={expanded}
      onToggle={(event) => {
        const open = event.currentTarget.open;
        setExpanded(open);
        if (!open) {
          setOpenaiKey('');
          setTypesafeKey('');
        }
      }}
    >
      <summary>
        <KeyRound size={15} aria-hidden="true" />
        <span>
          {configured
            ? t('AI подключён', 'AI connection ready', 'AI қосылымы дайын')
            : t('Подключить AI-советника', 'Connect AI summaries', 'AI кеңесшісін қосу')}
        </span>
        <small>{t('Необязательно', 'Optional', 'Міндетті емес')}</small>
        <ChevronDown size={14} aria-hidden="true" />
      </summary>
      <div className="advisor-connection-body">
        <p>
          {t(
            'Добавьте ключ для пояснений Айды. Без него вся игра и локальные советы работают.',
            'Add a key for Aida’s AI explanations. The full game and local advice work without one.',
            'Айданың AI түсіндірмелері үшін кілт қосыңыз. Онсыз да ойын мен жергілікті кеңестер жұмыс істейді.',
          )}
        </p>
        {!localServer || phase === 'unavailable' ? (
          <div className="advisor-connection-offline" role="status">
            <strong>
              {t(
                'AI-советник — в локальной версии',
                'AI advice is in the local app',
                'AI кеңесі жергілікті нұсқада',
              )}
            </strong>
            <p>
              {t(
                'Если сервер уже работает, просто откройте AI-версию. Команды повторно запускать не нужно.',
                'If the server is already running, just open the AI version. No commands need to be run again.',
                'Сервер іске қосылған болса, AI нұсқасын ашыңыз. Командаларды қайта орындау қажет емес.',
              )}
            </p>
            <a
              className="advisor-open-ai"
              data-testid="open-ai-version"
              href="http://localhost:8789/#ai"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('Открыть AI-версию', 'Open AI version', 'AI нұсқасын ашу')}
              <ArrowUpRight size={16} />
            </a>
            <p className="advisor-separate-save">
              {t(
                'В локальной версии отдельное сохранение браузера. Партия из офлайн-файла автоматически не переносится.',
                'The local app has a separate browser save. Your offline-file game is not transferred automatically.',
                'Жергілікті нұсқада браузердің бөлек сақталымы бар. Офлайн файлдағы ойын автоматты түрде көшірілмейді.',
              )}
            </p>
            <details className="advisor-first-launch">
              <summary>
                {t(
                  'Первый запуск или ошибка запуска',
                  'First launch or a startup error',
                  'Алғашқы іске қосу немесе іске қосу қатесі',
                )}
              </summary>
              <p>
                {t(
                  'В папке актуальной версии проекта выполните:',
                  'From the current project version’s folder, run:',
                  'Жобаның қазіргі нұсқасының қалтасында орындаңыз:',
                )}
              </p>
              <pre>
                <code>{'npm ci\nnpm run demo'}</code>
              </pre>
              <p>
                {t(
                  'Missing script: "demo" — открыта старая или другая папка проекта. Используйте актуальную версию репозитория.',
                  'Missing script: "demo" means you are in an old or different project folder. Use the current repository version.',
                  'Missing script: "demo" — ескі немесе басқа жоба қалтасы ашылған. Репозиторийдің қазіргі нұсқасын қолданыңыз.',
                )}
              </p>
              <p>
                {t(
                  'EADDRINUSE или «порт занят» — сервер уже использует этот адрес. Откройте существующую AI-версию по кнопке выше.',
                  'EADDRINUSE or “port in use” means a server already uses this address. Open the existing AI version using the button above.',
                  'EADDRINUSE немесе «порт бос емес» — сервер бұл мекенжайды пайдаланып тұр. Жоғарыдағы батырмамен AI нұсқасын ашыңыз.',
                )}
              </p>
            </details>
            {localServer && (
              <button type="button" onClick={() => void refresh()}>
                {t('Проверить ещё раз', 'Check again', 'Қайта тексеру')}
              </button>
            )}
          </div>
        ) : phase === 'checking' || phase === 'idle' ? (
          <p className="advisor-connection-loading" role="status">
            <LoaderCircle size={14} />
            {t(
              'Проверяем локальный сервер…',
              'Checking the local server…',
              'Жергілікті сервер тексерілуде…',
            )}
          </p>
        ) : (
          <>
            {configured && (
              <div className="advisor-connection-status" data-testid="advisor-key-status">
                <Check size={14} aria-hidden="true" />
                <span>
                  {[
                    status?.openai.configured
                      ? `OpenAI · ${status.openai.source === 'environment' ? t('из .env', 'from .env', '.env файлынан') : t('до остановки сервера', 'this server session', 'осы сервер сеансы')}`
                      : '',
                    status?.jev.configured
                      ? `Jev · ${status.jev.source === 'environment' ? t('из .env', 'from .env', '.env файлынан') : t('до остановки сервера', 'this server session', 'осы сервер сеансы')}`
                      : '',
                  ]
                    .filter(Boolean)
                    .join(' / ')}
                </span>
              </div>
            )}
            <form onSubmit={(event) => void update('connect', event)} autoComplete="off">
              <label htmlFor={`${id}-openai`}>OpenAI API key</label>
              <input
                id={`${id}-openai`}
                data-testid="advisor-openai-key"
                type="password"
                value={openaiKey}
                onChange={(event) => setOpenaiKey(event.target.value)}
                placeholder={
                  status?.openai.configured
                    ? t(
                        'Другой ключ (необязательно)',
                        'Replace key (optional)',
                        'Кілтті ауыстыру (міндетті емес)',
                      )
                    : 'sk-…'
                }
                minLength={20}
                maxLength={512}
                autoComplete="off"
                spellCheck={false}
                autoCapitalize="none"
                disabled={busy}
              />
              <details className="advisor-connection-advanced">
                <summary>
                  {t(
                    'Jev: выбор среди допустимых мер',
                    'Jev: selection among legal policies',
                    'Jev: рұқсат етілген шаралардан таңдау',
                  )}
                </summary>
                <label htmlFor={`${id}-jev`}>
                  {t(
                    'Typesafe API key · необязательно',
                    'Typesafe API key · optional',
                    'Typesafe API key · міндетті емес',
                  )}
                </label>
                <input
                  id={`${id}-jev`}
                  data-testid="advisor-jev-key"
                  type="password"
                  value={typesafeKey}
                  onChange={(event) => setTypesafeKey(event.target.value)}
                  minLength={20}
                  maxLength={512}
                  autoComplete="off"
                  spellCheck={false}
                  autoCapitalize="none"
                  disabled={busy}
                />
              </details>
              <div className="advisor-connection-actions">
                <button
                  type="submit"
                  aria-busy={busy}
                  disabled={busy || (!openaiKey.trim() && !typesafeKey.trim())}
                >
                  {busy ? <LoaderCircle size={14} /> : <KeyRound size={14} />}
                  {t('Подключить на этот сеанс', 'Connect for this session', 'Осы сеансқа қосу')}
                </button>
                {hasSession && (
                  <button
                    type="button"
                    className="advisor-disconnect"
                    disabled={busy}
                    onClick={() => void update('disconnect')}
                  >
                    <Unplug size={13} />
                    {t('Отключить', 'Disconnect', 'Ажырату')}
                  </button>
                )}
              </div>
            </form>
            <p
              className={`advisor-connection-message ${message === 'failed' ? 'is-error' : ''}`}
              role="status"
              aria-live="polite"
            >
              {message === 'connected'
                ? t(
                    'Ключ принят локальным сервером. Проверка у провайдера произойдёт при запросе совета.',
                    'Key stored by your local server. The provider will be contacted only when you request advice.',
                    'Кілт жергілікті серверде қабылданды. Провайдерге тек кеңес сұрағанда өтінім жіберіледі.',
                  )
                : message === 'disconnected'
                  ? t(
                      'Ключи сеанса удалены. Настройки .env остаются активными.',
                      'Session keys cleared. Any .env configuration remains active.',
                      'Сеанс кілттері жойылды. .env параметрлері белсенді қалады.',
                    )
                  : message === 'failed'
                    ? t(
                        'Не удалось подключить. Ключ должен содержать 20–512 символов. Проверьте сервер и попробуйте снова.',
                        'Could not connect. Keys must contain 20–512 characters. Check the server and try again.',
                        'Қосылу мүмкін болмады. Кілт 20–512 таңбадан тұруы керек. Серверді тексеріп, қайталаңыз.',
                      )
                    : ''}
            </p>
            <p className="advisor-connection-note">
              {t(
                'Ключ хранится только в памяти локального сервера до отключения или перезапуска — не в браузере или сохранении игры. Подключение бесплатно; запросы совета могут тарифицироваться провайдером.',
                'The key stays only in local-server memory until disconnect or restart, never in browser storage or game saves. Connecting makes no paid request; asking for advice may incur provider charges.',
                'Кілт ажыратылғанша не қайта іске қосқанша тек жергілікті сервер жадында сақталады. Браузер қоймасына не ойын сақталымына жазылмайды. Қосылу ақылы сұрау жібермейді; кеңес сұрауын провайдер тарификациялауы мүмкін.',
              )}
            </p>
          </>
        )}
      </div>
    </details>
  );
}
