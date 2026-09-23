import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { explanationInput, ADVISOR_INSTRUCTIONS } from '../src/game/explanation';
import { validate } from '../src/game/engine';

export async function generateAdvice(input:ReturnType<typeof explanationInput>,options:{apiKey:string;model?:string;fetcher?:typeof fetch}){
 const response=await (options.fetcher??fetch)('https://api.openai.com/v1/responses',{
  method:'POST',headers:{Authorization:`Bearer ${options.apiKey}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),
  body:JSON.stringify({model:options.model??'gpt-4.1-mini',instructions:ADVISOR_INSTRUCTIONS,input:JSON.stringify(input),max_output_tokens:900,store:false})
 });
 if(!response.ok)throw new Error('AI provider unavailable');
 const data=await response.json() as {output?:{type:string;content?:{type:string;text?:string}[]}[]};
 const text=(data.output??[]).flatMap(item=>item.type==='message'?(item.content??[]):[]).filter(item=>item.type==='output_text').map(item=>item.text??'').join('\n');
 if(!text.trim())throw new Error('Empty AI response');
 return text;
}
const send=(res:ServerResponse,code:number,data:object)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
export function createAdvisorServer(){
 let lastRequest=0;let inFlight=false;
 return createServer(async(req:IncomingMessage,res:ServerResponse)=>{
  if(req.method==='GET'&&(req.url==='/'||req.url==='/index.html')){try{const html=await readFile(new URL('../dist/index.html',import.meta.url));res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(html);}catch{send(res,503,{error:'Build the game first: npm run build'});}return;}
  if(req.url!=='/api/advice'||req.method!=='POST'){send(res,404,{error:'Not found'});return;}
  // Local demo server: no arbitrary origins, remote binding, or exposed credentials.
  const origin=req.headers.origin;
  if(origin){try{const u=new URL(origin);if(!['localhost','127.0.0.1','[::1]'].includes(u.hostname)){send(res,403,{error:'Local access only'});return;}}catch{send(res,403,{error:'Invalid origin'});return;}}
  if(!process.env.OPENAI_API_KEY){send(res,503,{error:'Optional LLM is not configured. Local explanations remain available.'});return;}
  if(inFlight||Date.now()-lastRequest<5000){send(res,429,{error:'Please wait before requesting another explanation'});return;}
  let body='';try{
   for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>10000){send(res,413,{error:'Payload too large'});return;}}
   const payload=JSON.parse(body);
   if(!payload||!Array.isArray(payload.decisions)||payload.decisions.length>5||validate(payload.decisions,false).length||!['ru','en','kk'].includes(payload.lang)){send(res,400,{error:'Invalid scenario'});return;}
   // Ignore all caller-supplied scores. Recompute trusted input here.
   const input=explanationInput(payload.decisions,payload.lang);
   inFlight=true;lastRequest=Date.now();
   try{const text=await generateAdvice(input,{apiKey:process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL});send(res,200,{mode:'llm',text});}
   catch{send(res,502,{error:'AI is temporarily unavailable. Use the local explanation.'});}
   finally{inFlight=false;}
  }catch{send(res,400,{error:'Invalid request body'});}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.ADVISOR_PORT??8787);
 createAdvisorServer().listen(port,'127.0.0.1',()=>console.log(`QALA + optional AI advisor: http://localhost:${port}`));
}
