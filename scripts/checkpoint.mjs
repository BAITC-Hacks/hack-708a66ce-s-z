import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const run = (cmd, args, inherit = false) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: inherit ? 'inherit' : 'pipe' });
const remote = run('git', ['remote', 'get-url', 'origin']).trim();
if (
  ![
    'https://github.com/BAITC-Hacks/hack-708a66ce-s-z.git',
    'https://github.com/BAITC-Hacks/hack-708a66ce-s-z',
    'git@github.com:BAITC-Hacks/hack-708a66ce-s-z.git',
  ].includes(remote)
)
  throw new Error('Unexpected remote; review before publishing.');
if (run('git', ['diff', '--name-only', '--diff-filter=U']).trim())
  throw new Error('Resolve merge conflicts first.');
const changed = run('git', ['status', '--porcelain']);
if (changed) {
  run('npm', ['run', 'check'], true);
  run('node', ['scripts/package.mjs'], true);
  const paths = [
    '.gitattributes',
    '.prettierignore',
    '.prettierrc.json',
    '.gitignore',
    '.env.example',
    '.github',
    'AGENTS.md',
    'README.md',
    'README.ru.md',
    'README.kk.md',
    'THIRD-PARTY-NOTICES.md',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
    'playwright.config.ts',
    'index.html',
    'src',
    'server',
    'schemas',
    'tests',
    'scripts',
    'docs',
    'play',
  ];
  run('git', ['add', '--', ...paths]);
  const files = run('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'])
    .split('\0')
    .filter(Boolean);
  for (const file of files) {
    if (/(^|\/)\.env($|\.)/.test(file) && file !== '.env.example')
      throw new Error('Credential file staged; review and unstage before proceeding.');
    if (/\.(pem|key)$/.test(file)) throw new Error('Possible private key staged.');
    if (/\.(png|jpg|webp)$/.test(file)) continue;
    const content = readFileSync(file, 'utf8');
    if (
      /sk-(?:proj-)?[A-Za-z0-9_-]{25,}/.test(content) ||
      /gh[pousr]_[A-Za-z0-9]{30,}/.test(content)
    )
      throw new Error('Possible secret detected; review staged files.');
  }
  if (run('git', ['diff', '--cached', '--name-only']).trim())
    run(
      'git',
      ['commit', '-m', process.argv[2] || 'chore: verified HackAlem progress checkpoint'],
      true,
    );
}
const branch = run('git', ['branch', '--show-current']).trim();
if (!branch) throw new Error('Cannot push detached HEAD.');
run('git', ['push', 'origin', branch], true);
