import { copyFile, mkdir, stat } from 'node:fs/promises';
await mkdir('play',{recursive:true});
await copyFile('dist/index.html','play/QALA.html');
console.log(`Offline game: play/QALA.html (${((await stat('play/QALA.html')).size/1024/1024).toFixed(2)} MB). Open it directly in a browser.`);
