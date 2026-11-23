import {useEffect, useMemo, useRef, useState} from 'react';
import {address} from './commands.js';

export const clock = minutes => [Math.floor(minutes/60)%24, Math.floor(minutes)%60]
  .map(n=>String(n).padStart(2,'0')).join(':');

export function useClock(state) {
  const target = state ? (state.day-1)*1440+state.minute : 540;
  const shown = useRef(null);
  const [value,setValue] = useState(target);
  useEffect(()=>{
    const from = shown.current;
    if(from===null || from>target || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      shown.current=target; setValue(target); return;
    }
    let frame;
    const duration=Math.min(3200,400+65*Math.sqrt(target-from)), start=performance.now();
    function tick(now) {
      const p=Math.min(1,(now-start)/duration);
      shown.current=from+(target-from)*p*p*(3-2*p);
      setValue(shown.current);
      if(p<1) frame=requestAnimationFrame(tick);
    }
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[target]);
  return value;
}

const sites = [
  ['AI Lounge','lounge',26,22],['AI House','house',86,24],
  ['Main Lounge','main-lounge',66,74]
];
// Source coordinates outline the four buildings. Each has its own projection and shadow.
const buildings = [
  {site:'lounge',box:[47,40,588,500],outline:[[2,26],[43,0],[99,28],[99,65],[52,99],[0,70]],place:[1,6,37]},
  {site:'house',box:[867,16,635,513],outline:[[0,26],[42,0],[99,41],[99,72],[63,99],[0,61]],place:[61,3,38]},
  {site:'main-lounge',box:[258,605,970,394],outline:[[4,31],[24,4],[52,14],[79,0],[99,29],[99,63],[78,84],[57,99],[21,99],[0,83],[0,64]],place:[22,57,57]},
  {site:'depot',box:[608,309,328,323],outline:[[0,30],[48,0],[98,26],[98,68],[56,99],[0,75]],place:[40,25,20]}
];
export function World({value,state,line,t,reports}) {
  const phase=(value%1440)/1440;
  const day=new Date(Date.parse((state?.startDate || '2026-01-05')+'T00:00Z')+Math.floor(value/1440)*86400000);
  const season=Math.cos(2*Math.PI*(day.getUTCMonth()+day.getUTCDate()/31)/12);
  const light=Math.max(0,Math.cos((phase*24-12)*Math.PI/(12-3*season)));
  const observed=useMemo(()=>{
    const known={};
    for(const report of reports) for(const [slot,item] of Object.entries(report.slots)){
      known[slot]={...item,day:report.day,minute:report.minute};
    }
    return known;
  },[reports]);
  const last=reports.at(-1);
  const destination=last?.args.slot?.split(':').slice(0,2).join(':') || last?.args.machine_id;
  const focus=state?.machines.find(id=>line.toLowerCase().includes(address(id))) || destination;
  const start=last?(last.day-1)*1440+last.minute:0;
  const end=last?(last.endDay-1)*1440+last.endMinute:0;
  const travel=destination && last?.tool==='restock_machine' && end>start && value>=start && value<end;
  const progress=travel?(value-start)/(end-start):1;
  const positions={};
  const layers=buildings.map(({site,box,outline,place})=>{
    const [sx,sy,w,h]=box,[left,top,width]=place;
    const label=sites.find(s=>s[1]===site);
    const machines=(state?.machines||[]).filter(id=>address(id).startsWith(site+'.'));
    return <div key={site} className="building" style={{left:left+'%',top:top+'%',width:width+'%',aspectRatio:w+'/'+h}}>
      <div className="building-art" style={{clipPath:'polygon('+outline.map(([x,y])=>x+'% '+y+'%').join(',')+')',
        backgroundSize:(1536/w*100)+'% '+(1024/h*100)+'%',backgroundPosition:(sx/(1536-w)*100)+'% '+(sy/(1024-h)*100)+'%'}}/>
      <span className="site-label">{label?.[0]||t('depot')}</span>
      {machines.map(id=>{
      const x=((label[2]+(id.endsWith('DRINKS')?3.8:0))*15.36-sx)/w*100;
      const y=(label[3]*10.24-sy)/h*100;
      positions[id]=[left+width*x/100,top+width*h/w*y/100*2];
      const slots=state.slots.filter(s=>s.startsWith(id+':'));
      const active=focus===id;
      return <div key={id} className={'cabinet-node'+(active?' addressed':'')} style={{left:x+'%',top:y+'%',width:40/w*100+'%',height:87/h*100+'%'}} aria-label={address(id)}>
        {slots.map(slot=><i key={slot} data-level={!observed[slot]?'unknown':observed[slot].qty===0?'empty':'stocked'} title={slot}/>)}
        {active&&<span className="address-tag">{address(id)}</span>}
      </div>;
    })}</div>;
  });
  const dest=positions[destination];
  return <div className="world survey" style={{'--light':0.39+light*.66,'--sun':(phase*160-30)+'%',
    '--shade-x':(-Math.sin(phase*2*Math.PI)*12)+'px','--daylight':light}}>
    {layers}
    {travel&&dest&&<i className="shipment" style={{left:(50+(dest[0]-50)*progress)+'%',top:(46+(dest[1]-46)*progress)+'%'}}/>}
  </div>;
}
