import { CATEGORIES, DISTRICTS, KEYS, MEASURES, SYNERGIES, WEIGHTS, type DistrictId, type Indicator, type Metrics } from './data';
export interface Decision { measureId:string; districtId?:DistrictId }
export type IssueCode = 'count'|'duplicate'|'unknown'|'target'|'budget'|'category'|'transport-conflict'|'land-conflict'|'utility-conflict'|'dead-end';
export interface Issue { code:IssueCode; detail?:string }
export interface Result { metrics:Record<DistrictId,Metrics>; districtScores:Record<DistrictId,number>; average:number; weakest:DistrictId; critical:{districtId:DistrictId;indicator:Indicator;value:number}[]; score:number; cost:number; synergies:typeof SYNERGIES[number][] }
export function validate(decisions:readonly Decision[], complete=true):Issue[] {
 const issues:Issue[]=[]; const ids=new Set<string>(); const counts:Record<string,number>={}; let cost=0;
 if(complete ? decisions.length!==5 : decisions.length>5) issues.push({code:'count'});
 for(const d of decisions){
  if(!d || typeof d!=='object'){issues.push({code:'unknown'});continue;}
  const m=MEASURES.find(m=>m.id===d.measureId);
  if(!m){issues.push({code:'unknown'});continue;}
  if(ids.has(m.id)) issues.push({code:'duplicate',detail:m.id});
  ids.add(m.id); cost+=m.cost; counts[m.category]=(counts[m.category]??0)+1;
  if(m.scope==='district' ? !DISTRICTS.some(x=>x.id===d.districtId) : d.districtId!==undefined) issues.push({code:'target',detail:m.id});
 }
 if(cost>100)issues.push({code:'budget'});
 for(const cat of Object.keys(CATEGORIES))if(counts[cat]>2)issues.push({code:'category',detail:cat});
 if(ids.has('M1')&&ids.has('M3'))issues.push({code:'transport-conflict'});
 for(const [a,b,code] of [['M4','M7','land-conflict'],['M5','M13','utility-conflict']] as const){
  const first=decisions.find(d=>d?.measureId===a),second=decisions.find(d=>d?.measureId===b);
  if(first&&second&&first.districtId===second.districtId)issues.push({code});
 }
 return issues;
}
export const clip=(v:number)=>Math.max(0,Math.min(100,v));
export function simulate(decisions:readonly Decision[]):Result {
 const issues=validate(decisions,false);if(issues.length)throw new Error(issues.map(i=>i.code).join(', '));
 const metrics=Object.fromEntries(DISTRICTS.map(d=>[d.id,{...d.metrics}])) as Record<DistrictId,Metrics>;
 let cost=0;
 // Canonical ordering guarantees identical floating-point accumulation for every permutation.
 for(const d of [...decisions].sort((a,b)=>a.measureId.localeCompare(b.measureId))){
  const m=MEASURES.find(m=>m.id===d.measureId)!;cost+=m.cost;
  const targets=m.scope==='city'?DISTRICTS.map(d=>d.id):[d.districtId!];
  for(const id of targets)for(const [k,v] of Object.entries(m.effects))metrics[id][k as Indicator]+=v*(8-m.lag)/8;
 }
 const synergies=SYNERGIES.filter(s=>s.pair.every(id=>decisions.some(d=>d.measureId===id)));
 for(const s of synergies){const target=decisions.find(d=>d.measureId===s.pair[0])!.districtId!;metrics[target][s.indicator]+=s.bonus;}
 const districtScores={} as Record<DistrictId,number>;const critical:Result['critical']=[];let average=0;
 for(const d of DISTRICTS){let score=0;for(const k of KEYS){metrics[d.id][k]=clip(metrics[d.id][k]);score+=metrics[d.id][k]*WEIGHTS[k];if(metrics[d.id][k]<40)critical.push({districtId:d.id,indicator:k,value:metrics[d.id][k]});}districtScores[d.id]=score;average+=d.pop*score;}
 const weakest=DISTRICTS.reduce((a,b)=>districtScores[a.id]<=districtScores[b.id]?a:b).id;
 return {metrics,districtScores,average,weakest,critical,score:.7*average+.3*districtScores[weakest]-critical.length,cost,synergies};
}
export function finalResult(decisions:readonly Decision[]):{issues:Issue[];result:Result|null}{const issues=validate(decisions);return {issues,result:issues.length?null:simulate(decisions)};}
export const BASELINE=simulate([]);
export function candidates(decisions:readonly Decision[]):Decision[]{
 return MEASURES.filter(m=>!decisions.some(d=>d.measureId===m.id)).flatMap(m=>m.scope==='city'?[{measureId:m.id}]:DISTRICTS.map(d=>({measureId:m.id,districtId:d.id}))).filter(d=>!validate([...decisions,d],false).length);
}
// Existence search only; guards a beginner from spending themselves into an impossible fifth turn.
export function canComplete(decisions:readonly Decision[]):boolean {
 if(validate(decisions,false).length)return false;
 if(decisions.length===5)return true;
 const remaining=MEASURES.filter(m=>!decisions.some(d=>d.measureId===m.id)).sort((a,b)=>a.cost-b.cost);
 const used=decisions.reduce((v,d)=>v+MEASURES.find(m=>m.id===d.measureId)!.cost,0);
 if(used+remaining.slice(0,5-decisions.length).reduce((v,m)=>v+m.cost,0)>100)return false;
 for(const m of remaining)for(const target of m.scope==='city'?[undefined]:DISTRICTS.map(d=>d.id)){
  if(canComplete([...decisions,{measureId:m.id,...(target?{districtId:target}:{})}]))return true;
 }
 return false;
}
export function moveIssues(decisions:readonly Decision[],next:Decision):Issue[]{const issues=validate([...decisions,next],false);return issues.length?issues:canComplete([...decisions,next])?[]:[{code:'dead-end'}];}
export function recommend(decisions:readonly Decision[]):{decision:Decision;gain:number}|null{
 const base=simulate(decisions).score;
 const ranked=candidates(decisions).map(decision=>({decision,gain:simulate([...decisions,decision]).score-base})).sort((a,b)=>b.gain-a.gain);
 return ranked.find(r=>canComplete([...decisions,r.decision]))??null;
}
export function contributions(decisions:readonly Decision[]){const total=simulate(decisions).score;return decisions.map(d=>({decision:d,gain:total-simulate(decisions.filter(x=>x!==d)).score}));}
