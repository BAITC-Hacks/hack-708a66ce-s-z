import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Minus, Plus, RotateCcw, Maximize2 } from 'lucide-react';
import { DISTRICTS, MEASURES, type DistrictId, type Lang } from '../game/data';
import { type Decision, type Result } from '../game/engine';
import keyArt from '../assets/astana-key-art.png';

interface Props { selected:DistrictId; onSelect:(id:DistrictId)=>void; result:Result; decisions:Decision[]; lang:Lang; layer:'city'|'score'; }
export function CityMap({selected,onSelect,result,decisions,lang,layer}:Props){
 const host=useRef<HTMLDivElement>(null),labels=useRef<(HTMLButtonElement|null)[]>([]);
 const api=useRef<{scene:THREE.Scene;camera:THREE.OrthographicCamera;controls:OrbitControls;tiles:THREE.Mesh[];policyGroup:THREE.Group;render:()=>void}|null>(null);
 const current=useRef({onSelect});current.current={onSelect};
 const [fallback,setFallback]=useState(false);
 useEffect(()=>{
  const element=host.current!; let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}catch{setFallback(true);return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.7));renderer.setClearColor('#eeeede',0);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;
  element.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive miniature city of Astana');
  const scene=new THREE.Scene();const camera=new THREE.OrthographicCamera(-8,8,6,-6,.1,100);camera.position.set(12,14,16);camera.lookAt(0,0,0);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minPolarAngle=.35;controls.maxPolarAngle=1.15;controls.minZoom=.7;controls.maxZoom=2;controls.target.set(0,0,0);
  scene.add(new THREE.HemisphereLight(0xfff9ec,0x819287,2));const sun=new THREE.DirectionalLight(0xfff0d5,2.5);sun.position.set(-5,12,7);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9});sun.shadow.normalBias=.03;scene.add(sun);
  const mat=(color:THREE.ColorRepresentation)=>new THREE.MeshStandardMaterial({color,roughness:.8});
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,color:THREE.ColorRepresentation,parent:THREE.Object3D=scene)=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;};
  const cylinder=(r1:number,r2:number,h:number,x:number,y:number,z:number,color:THREE.ColorRepresentation,parent:THREE.Object3D=scene)=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,12),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;};
  const sphere=(r:number,x:number,y:number,z:number,color:THREE.ColorRepresentation,parent:THREE.Object3D=scene)=>{const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),mat(color));mesh.position.set(x,y,z);mesh.castShadow=true;parent.add(mesh);return mesh;};
  const tree=(x:number,z:number,s=1)=>{cylinder(.035,.045,.25*s,x,.25,z,'#a18864');sphere(.19*s,x,.48*s,z,'#719680');};
  // One contiguous tabletop city, with an illustrative river rather than claimed GIS boundaries.
  box(12.2,.28,9.8,0,-.22,0,'#d4c4a0');box(12.1,.08,9.7,0,-.04,0,'#e0e2cc');
  const river=new THREE.Shape();river.moveTo(-6.1,-1.0);river.bezierCurveTo(-2,-2,0,1.8,6.1,.0);river.lineTo(6.1,1.05);river.bezierCurveTo(0,2.9,-2,-.9,-6.1,.05);river.closePath();
  const water=new THREE.Mesh(new THREE.ShapeGeometry(river,40),mat('#8dc7c5'));water.rotation.x=-Math.PI/2;water.position.y=.035;scene.add(water);
  const tiles:THREE.Mesh[]=[];
  const buildingColors=['#eee9db','#d8ded4','#c4d2c6','#ded5c2','#b9cccc'];
  DISTRICTS.forEach((d,index)=>{
   const [cx,cz]=d.position;const tile=box(index===3?2.2:2.85,.055,2.7,cx,.02,cz,'#d2d9bf');tile.userData.district=d.id;tiles.push(tile);
   box(2.9,.04,.14,cx,.075,cz+.94,'#b9b7a7');box(.13,.04,2.8,cx+.77,.075,cz,'#b9b7a7');
   for(let i=0;i<12;i++){
    const x=cx-1.03+(i%4)*.57,z=cz-.92+Math.floor(i/4)*.65;const n=((i*17+index*31)%13)/13;
    if((i+index)%5===0){tree(x,z,1.15);tree(x+.24,z+.12,.75);continue;}
    const h=.25+n*(index===0?1.35:.7),w=.29+n*.08;box(w,h,.36,x,h/2+.1,z,buildingColors[(i+index)%5]);
    box(w+.035,.045,.4,x,h+.12,z,'#f6f0df');
    for(let floor=.25;floor<h;floor+=.22)box(w+.006,.045,.364,x,floor,z,'#93b4b5');
   }
   for(let i=0;i<8;i++)tree(cx-1.25+i*.32,cz+1.16,.75+((i+index)%3)*.15);
  });
  // Baiterek: golden sphere, white structural crown, promenade.
  cylinder(.72,.8,.07,1.0,.12,1.05,'#eee6d2');cylinder(.18,.34,1.62,1,.95,1.05,'#f4efdf');
  for(let i=0;i<8;i++){const angle=i*Math.PI/4;const leg=cylinder(.025,.035,1.2,1+Math.cos(angle)*.25,1.12,1.05+Math.sin(angle)*.25,'#f5efdf');leg.rotation.z=Math.cos(angle)*.19;leg.rotation.x=Math.sin(angle)*.19;}
  sphere(.43,1,1.97,1.05,'#d5a94f');cylinder(.48,.22,.42,1,1.63,1.05,'#eee8cf');sphere(.37,1,2.02,1.05,'#dcb853');
  // Khan Shatyr inspired tent and a civic dome.
  const tent=new THREE.Mesh(new THREE.ConeGeometry(.65,1.35,4),mat('#e9e5d7'));tent.position.set(-.75,.76,2.65);tent.rotation.y=.6;tent.castShadow=true;scene.add(tent);
  box(.95,.28,.7,4.65,.25,1.65,'#e7e7d9');sphere(.36,4.65,.51,1.65,'#75a7af');
  // Roads, bridges, tiny buses and warm park paths.
  for(const x of [-1.5,2.1]){box(.42,.16,2.3,x,.16,.15,'#e6e0cc');for(const side of [-.23,.23])box(.035,.16,2.3,x+side,.31,.15,'#fcf7e9');}
  for(let i=0;i<16;i++){const x=-5.5+i*.7;tree(x,4.3,.7);if(i%2===0)box(.2,.11,.1,x,.15,-1.4,'#e3b261');}
  box(10.8,.035,.1,0,.06,3.95,'#f2ead5');
  const policyGroup=new THREE.Group();scene.add(policyGroup);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let start={x:0,y:0};
  const down=(e:PointerEvent)=>{start={x:e.clientX,y:e.clientY};};
  const up=(e:PointerEvent)=>{if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>5)return;const rect=element.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(tiles)[0];if(hit)current.current.onSelect(hit.object.userData.district);};
  renderer.domElement.addEventListener('pointerdown',down);renderer.domElement.addEventListener('pointerup',up);
  const resize=()=>{const w=element.clientWidth,h=element.clientHeight;renderer.setSize(w,h);const aspect=w/h,halfHeight=Math.max(4.1,7.8/aspect);camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();};
  const observer=new ResizeObserver(resize);observer.observe(element);resize();
  let frame=0;const render=()=>{controls.update();renderer.render(scene,camera);DISTRICTS.forEach((d,i)=>{const p=new THREE.Vector3(d.position[0],.2,d.position[1]+1.6).project(camera);const el=labels.current[i];if(el)el.style.transform=`translate(-50%,-50%) translate(${(p.x*.5+.5)*element.clientWidth}px,${(-p.y*.5+.5)*element.clientHeight}px)`;});};
  const animate=()=>{frame=requestAnimationFrame(animate);render();};animate();api.current={scene,camera,controls,tiles,policyGroup,render};
  const lost=(event:Event)=>{event.preventDefault();setFallback(true);};renderer.domElement.addEventListener('webglcontextlost',lost);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.dispose();scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});renderer.domElement.remove();api.current=null;};
 },[]);
 useEffect(()=>{const a=api.current;if(!a)return;a.tiles.forEach((tile,i)=>{const d=DISTRICTS[i];(tile.material as THREE.MeshStandardMaterial).color.set(layer==='score'?(result.districtScores[d.id]<52?'#dca77e':'#8cba96'):d.id===selected?'#aac7b2':'#d2d9bf');});},[selected,result,layer]);
 useEffect(()=>{
  const group=api.current?.policyGroup;if(!group)return;
  for(const child of [...group.children]){group.remove(child);child.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});}
  decisions.forEach((d,i)=>{const m=MEASURES.find(m=>m.id===d.measureId)!;const targets=d.districtId?DISTRICTS.filter(x=>x.id===d.districtId):DISTRICTS;
   targets.forEach(target=>{const [cx,cz]=target.position;const color={transport:'#659ac0',ecology:'#6aab70',social:'#e8b46e',safety:'#af98d0',services:'#62afb3'}[m.category];
    const marker=new THREE.Mesh(m.category==='ecology'?new THREE.IcosahedronGeometry(.22,1):new THREE.BoxGeometry(.3,.35,.3),new THREE.MeshStandardMaterial({color}));marker.position.set(cx-1+i*.43,.35,cz+.63);marker.castShadow=true;group.add(marker);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.26,.3,24),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.set(marker.position.x,.13,marker.position.z);group.add(ring);
   });
  });
 },[decisions]);
 const zoom=(amount:number)=>{if(api.current){api.current.camera.zoom=Math.min(2,Math.max(.7,api.current.camera.zoom+amount));api.current.camera.updateProjectionMatrix();}};
 return <div className={`city-map ${fallback?'map-fallback':''}`} ref={host}>
  {fallback&&<img className="fallback-art" src={keyArt} alt="Astana city illustration"/>}
  <div className="map-labels">{DISTRICTS.map((d,i)=><button key={d.id} ref={el=>{labels.current[i]=el;}} className={`map-label ${d.id===selected?'active':''}`} onClick={()=>onSelect(d.id)} style={fallback?{left:`${18+i*15}%`,top:`${i%2?35:65}%`}:undefined}><span className={`status-dot ${result.districtScores[d.id]<52?'amber':''}`}/>{d.name[lang]}<b>{result.districtScores[d.id].toFixed(1)}</b></button>)}</div>
  <div className="map-caption"><span className="north">N ↑</span><span>{lang==='ru'?'Схематичная карта • синтетические данные':lang==='kk'?'Сызбалық карта • синтетикалық деректер':'Illustrative map • synthetic data'}</span></div>
  <div className="map-controls"><button aria-label="Zoom in" onClick={()=>zoom(.15)}><Plus size={16}/></button><button aria-label="Zoom out" onClick={()=>zoom(-.15)}><Minus size={16}/></button><button aria-label="Reset map" onClick={()=>api.current?.controls.reset()}><RotateCcw size={14}/></button><Maximize2 size={13}/></div>
 </div>;
}
