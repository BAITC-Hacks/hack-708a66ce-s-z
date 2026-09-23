import { validate, type Decision } from './engine';
export const SAVE_KEY='qala-session-v1';
export interface SavedRun {id:string;date:string;decisions:Decision[]}
export function readDecisions():Decision[]{try{const data=JSON.parse(localStorage.getItem(SAVE_KEY)??'[]');return Array.isArray(data)&&validate(data,false).length===0?data:[];}catch{return [];}}
export function readRuns():SavedRun[]{try{const data=JSON.parse(localStorage.getItem('qala-runs-v1')??'[]');return Array.isArray(data)?data.filter((d:any)=>d&&typeof d.id==='string'&&typeof d.date==='string'&&Array.isArray(d.decisions)&&!validate(d.decisions).length).slice(0,10):[];}catch{return [];}}
export function save(key:string,value:unknown):boolean{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}}
