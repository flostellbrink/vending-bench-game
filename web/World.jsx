import {useEffect, useRef, useState} from 'react';
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
export function World({value,state,line,t}) {
  const phase=(value%1440)/1440;
  const day=new Date(Date.parse((state?.startDate || '2026-01-05')+'T00:00Z')+Math.floor(value/1440)*86400000);
  const season=Math.cos(2*Math.PI*(day.getUTCMonth()+day.getUTCDate()/31)/12);
  const light=Math.max(0,Math.cos((phase*24-12)*Math.PI/(12-3*season)));
  const focus=state?.machines.find(id=>line.toLowerCase().includes(address(id)));
  return <div className="world" style={{'--light':0.39+light*.66,'--sun':(phase*160-30)+'%'}}>
    <img src="/campus.png" alt="" draggable="false"/>
    {sites.map(([label,site,x,y])=><div key={site} className="site-label"
      style={{left:x+'%',top:(y+14)+'%'}}>{label}</div>)}
    <div className="site-label depot">{t('depot')}</div>
    {focus && sites.map(([,site,x,y])=>address(focus).startsWith(site+'.') &&
      <div key={site} className="target" style={{left:(x+(focus.endsWith('DRINKS')?3.8:0))+'%',top:y+'%'}}/>)}
  </div>;
}
