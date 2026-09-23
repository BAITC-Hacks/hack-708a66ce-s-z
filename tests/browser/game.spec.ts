import { test, expect, type Page } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
async function english(page:Page){await page.getByRole('button',{name:'EN',exact:true}).click();}
async function adopt(page:Page,id:string,district='Nura'){
 await page.getByTestId(`policy-${id}`).click();
 if(await page.locator('.target-picker').count())await page.locator('.target-picker').getByRole('button',{name:district,exact:true}).click();
 await expect(page.getByTestId('commit-policy')).toBeEnabled();
 await page.getByTestId('commit-policy').click();
}
test('real five-turn play, official result, persistence, archive, export, reset and screenshots',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await english(page);await expect(page.getByTestId('score')).toContainText('52.56');
 await expect(page.locator('.city-map canvas')).toBeVisible();
 await page.screenshot({path:'docs/screenshots/city-en.png',fullPage:false});
 await page.getByRole('button',{name:'ҚАЗ',exact:true}).click();await page.screenshot({path:'docs/screenshots/city-kk.png'});await page.getByRole('button',{name:'RU',exact:true}).click();await page.screenshot({path:'docs/screenshots/city-ru.png',fullPage:false});await english(page);
 await page.getByTestId('policy-M7').click();await page.screenshot({path:'docs/screenshots/policy-preview.png'});await page.getByRole('button',{name:'Close',exact:true}).click();
 await adopt(page,'M7');await expect(page.getByTestId('budget')).toContainText('76');
 await page.reload();await expect(page.getByTestId('budget')).toContainText('76');
 await adopt(page,'M8');await adopt(page,'M10');await adopt(page,'M12');await adopt(page,'M5','Saryarka');
 await expect(page.locator('.big-score')).toContainText('56.54');await expect(page.getByTestId('budget')).toContainText('5 / 100');await expect(page.getByText('Connected safety · B1 +2')).toBeVisible();
 await page.screenshot({path:'docs/screenshots/report-en.png',fullPage:true});
 await page.getByRole('button',{name:'Save scenario',exact:true}).click();
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export JSON',exact:true}).click();expect((await download).suggestedFilename()).toBe('qala-scenario.json');
 await page.getByRole('button',{name:'Scenarios',exact:true}).click();await expect(page.locator('.run-grid')).toContainText('56.54');
 await page.getByRole('button',{name:'Start again',exact:true}).click();await page.getByRole('button',{name:'New game',exact:true}).click();await expect(page.getByTestId('budget')).toContainText('100');await expect(page.getByTestId('score')).toContainText('52.56');
 expect(errors).toEqual([]);
});
test('conflicts, district retargeting and undo remain understandable',async({page})=>{
 await page.goto('/');await english(page);await adopt(page,'M1');await page.getByTestId('policy-M3').click();await expect(page.getByRole('alert')).toContainText('Bus lanes and light rail');await expect(page.getByTestId('commit-policy')).toBeDisabled();await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.getByRole('button',{name:'Undo last decision'}).click();await expect(page.getByTestId('budget')).toContainText('100');
 await adopt(page,'M4');await page.getByTestId('policy-M7').click();await expect(page.getByRole('alert')).toContainText('same site');await page.locator('.target-picker').getByRole('button',{name:'Esil',exact:true}).click();await expect(page.getByTestId('commit-policy')).toBeEnabled();
});
test('overspending and no-completion choices cannot be committed',async({page})=>{
 await page.goto('/');await english(page);await adopt(page,'M3');await adopt(page,'M13','Esil');await page.getByTestId('policy-M5').click();await page.locator('.target-picker').getByRole('button',{name:'Saryarka',exact:true}).click();await expect(page.getByRole('alert')).toContainText('no legal way');await expect(page.getByTestId('commit-policy')).toBeDisabled();
});
test('file:// starts offline without any HTTP requests and supports a complete game',async({browser})=>{
 const context=await browser.newContext({offline:true,viewport:{width:1440,height:1080}});const page=await context.newPage();const requests:string[]=[];page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
 await page.goto(pathToFileURL(resolve('dist/index.html')).href);await english(page);await expect(page.getByTestId('score')).toContainText('52.56');
 await adopt(page,'M7');await adopt(page,'M8');await adopt(page,'M10');await adopt(page,'M12');await adopt(page,'M5','Saryarka');await expect(page.locator('.big-score')).toContainText('56.54');expect(requests).toEqual([]);await context.close();
});
test('mobile layout, Kazakh language, help and keyboard modal dismiss',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'ҚАЗ',exact:true}).click();await expect(page.locator('h1')).toHaveText('Бір қала. Бес шешім.');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'docs/screenshots/mobile-kk.png',fullPage:true});
 await english(page);await page.getByRole('button',{name:'How to play',exact:true}).click();await expect(page.locator('.help-dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.help-dialog')).not.toBeVisible();
 await adopt(page,'M7');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('corrupt persisted state recovers to a new game',async({page})=>{
 await page.addInitScript(()=>{localStorage.setItem('qala-session-v1','[null]');localStorage.setItem('qala-runs-v1','{"bad":true}');});await page.goto('/');await expect(page.getByTestId('score')).toContainText('52.56');
});
test('WebGL failure keeps playable fallback and district selection',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,...args:any[]){if(String(args[0]).startsWith('webgl'))return null;return original.apply(this,args as any); } as any;});
 await page.goto('/');await english(page);await expect(page.locator('.fallback-art')).toBeVisible();await adopt(page,'M7');await expect(page.getByTestId('budget')).toContainText('76');
});
