'use client';

import {useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {locales} from '../src/dictionary/runtime.ts';
import {stationMessages as msg} from './station-messages.ts';
import {commandGroups,completions,local,parse,syntax,toolFor} from './commands.js';
import {observation} from '../web/reports.js';
import {World,clock,useClock} from './World.jsx';
import releases from '../releases.json';
import archive from '../public/archive.json';

const money=(n,lang)=>new Intl.NumberFormat(lang,{style:'currency',currency:'EUR'}).format(n);
const translate=(fn,lang)=>fn({}, {locale:lang});

function Report({report,lang,t}) {
  const [sort,setSort]=useState(null);
  const rows=useMemo(()=>{
    const result=report.rows.slice();
    if(sort) result.sort((a,b)=>String(a[sort.index]).localeCompare(String(b[sort.index]),lang,{numeric:true})*sort.dir);
    return result;
  },[report,lang,sort]);
  return <section className="report">
    <h2>{report.line}</h2><small>{t('seen')} · {t('day')} {report.day} / {clock(report.minute)}</small>
    {report.terms?.minimum!=null&&<p className="terms">{t('minimum')}: {money(report.terms.minimum,lang)} · {t('day')} ≤ {report.terms.until} · ×{report.terms.quantity}</p>}
    {report.terms?.order&&<p className="terms">{report.terms.order} · −{money(report.terms.paid,lang)} · ETA {t('day')} {report.terms.eta}</p>}
    {rows.length>0 && <table><thead><tr>{report.columns.map((c,i)=><th key={c}>
      <button onClick={()=>setSort({index:i,dir:sort?.index===i?-sort.dir:1})}>{msg.fields[c]?translate(msg.fields[c],lang):t(c)} {sort?.index===i?(sort.dir===1?'↑':'↓'):'↕'}</button>
    </th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table>}
    {rows.length ? <details><summary>{t('original')}</summary><pre>{report.output}</pre></details>:<pre>{report.output}</pre>}
  </section>;
}

function Graph({history,rivals,best,release,lang,t}) {
  const [cursor,setCursor]=useState(null);
  const d=Math.min(cursor??Math.max(0,history.length-1),release.days);
  const series=[{name:translate(msg.fields.player,lang),color:'#235d46',values:history},
    ...(best?[{name:t('best'),color:'#324655',values:best.values,dashed:true}]:[]),
    ...rivals.map(r=>({name:r.kind==='script'?translate(msg.fields.bot,lang):r.name,color:'#65706c',values:r.values,dashed:true}))];
  const all=series.flatMap(s=>s.values),lo=Math.min(0,...all),hi=Math.max(1,...all);
  return <section className="scope"><header><b>{t('bank')} / EUR</b><small>{t('day')} {d} / {release.days}</small></header>
    <div className="plot" aria-hidden="true">{series.flatMap(s=>s.values.slice(1).map((v,i)=>{
      const height=(v-lo)/(hi-lo)*100,prev=(s.values[i]-lo)/(hi-lo)*100;
      return <i key={s.name+i} style={{left:(i*100/release.days)+'%',width:100/release.days+'%',bottom:Math.min(prev,height)+'%',
        height:'max(2px,'+Math.abs(height-prev)+'%)',color:s.color,borderTop:height<prev?'2px '+(s.dashed?'dashed':'solid'):'none',borderBottom:height>=prev?'2px '+(s.dashed?'dashed':'solid'):'none'}}/>;
    }))}</div>
    <input aria-label={t('day')} type="range" min="0" max={release.days} value={d} onChange={e=>setCursor(+e.target.value)}/>
    <div className="legend">{series.map(s=><span key={s.name} style={{'--ink':s.color}}>{s.name} <b>{s.values[d]==null?'—':money(s.values[d],lang)}</b></span>)}</div>
  </section>;
}

function Scorecard({state,rivals,best,lang,t,screen}) {
  const score=state?.over?(state.failed?0:Math.max(0,state.cash)):null;
  return <section className="sheet scorecard">
    <h2>{state?.over?(state.failed?t('bankrupt'):screen('complete')):t('standings')}</h2>
    {score===null?<p>{t('unfinished')}</p>:<strong className="final-score">{money(score,lang)}</strong>}
    <table><thead><tr><th>{t('standings')}</th><th>{t('score')}</th><th>{t('difference')}</th></tr></thead>
      <tbody>{[...(best?[{name:t('best'),score:best.score}]:[]),...rivals.map(r=>({
        name:r.kind==='script'?translate(msg.fields.bot,lang):r.name,score:r.values.at(-1)
      }))].map(row=><tr key={row.name}><td>{row.name}</td><td>{money(row.score,lang)}</td>
        <td>{score===null?'—':money(score-row.score,lang)}</td></tr>)}</tbody></table>
    <details><summary>{screen('archive')}</summary><p>{screen('note')}</p>
      {archive.scores.map(([name,value])=><div className="manual" key={name}>{name}<b>{money(value,lang)}</b></div>)}
      <a href={archive.source}>Prosus Vending Bench v{archive.version}</a>
    </details>
  </section>;
}

function CommandIndex({actions,lang,t}) {
  return <section className="sheet"><h2>{t('help')}</h2><p>{t('notation')}</p>
    {Object.entries(commandGroups).map(([group,names])=><section key={group}>
      <h3>{t(group)}</h3>{names.filter(v=>toolFor(v) in actions).map(v=><div className="manual" key={v}>
        <code>{syntax(v)}</code><span>{translate(msg.commands[toolFor(v)],lang)}</span>
      </div>)}</section>)}
    <h3>{t('local')}</h3><p>{local.map(syntax).join(' · ')}</p>
  </section>;
}

function OfficeDisplay({state,release,lang,line,reports,t}){
  const time=useClock(state);
  const day=Math.floor(time/1440);
  const date=state?.startDate && new Intl.DateTimeFormat(lang,{day:'numeric',month:'short',timeZone:'UTC'})
    .format(Date.parse(state.startDate+'T00:00Z')+day*86400000);
  return <>
    <div className="surface"><World value={time} state={state} line={line} t={t} reports={reports}/></div>
    <div className="transport"><b>{t('day')} {Math.min(release.days,day+1)} / {release.days}</b><span>{date}</span><strong>{clock(time)}</strong></div>
  </>;
}

function Station({release,lang,changeLang,changeRelease}) {
  const t=k=>msg.operator[k]?translate(msg.operator[k],lang):k;
  const screen=k=>translate(msg.screen[k],lang);
  const [state,setState]=useState(null),[actions,setActions]=useState({});
  const [reports,setReports]=useState([]),[lines,setLines]=useState([]),[tab,setTab]=useState('world');
  const [line,setLine]=useState(''),[pick,setPick]=useState(0),[recall,setRecall]=useState(-1);
  const [history,setHistory]=useState([]),[rivals,setRivals]=useState([]);
  const [best,setBest]=useState(null);
  const [busy,setBusy]=useState(true),[error,setError]=useState(''),[epoch,reset]=useState(0);
  const [boot,setBoot]=useState(null),[crt,setCrt]=useState(true);
  const [browse,setBrowse]=useState(false),[caret,setCaret]=useState(0);
  const worker=useRef(null),pending=useRef(null),journal=useRef([]),prompt=useRef(null),log=useRef(null),follow=useRef(true);
  const key='vending:'+release.revision+':'+release.seed;
  const recordKey=key+':'+release.days+':record';
  useEffect(()=>{
    let live=true;
    let balances=[];
    setBest(JSON.parse(localStorage.getItem(recordKey)||'null'));
    const first=!localStorage.getItem('vendix.booted');
    setBoot(first?[]:null);
    setCrt(localStorage.getItem('vendix.crt')!=='off');
    const w=new Worker('/worker.js'); worker.current=w;
    pending.current=null;setBusy(true);setState(null);setReports([]);setLines([]);setTab('world');setLine('');setError('');setHistory([]);setRivals([]);
    const fail=err=>{if(live){setError(String(err));setBusy(false);}};
    w.onerror=e=>fail(e.message);
    function receive({data}) {
      if(!live)return;
      if(data.boot){if(first)setBoot(old=>[...(old||[]),data.boot]);return;}
      if(data.error){pending.current=null;fail(data.error);return;}
      const run=pending.current;
      const entries=run?[run]:journal.current;
      const offset=run?journal.current.length:0;
      const results=data.receipts.map((r,i)=>({...observation(r,entries[i].move,offset+i+1),line:entries[i].line}));
      balances=run?[...balances,...data.history.slice(1)]:data.history;
      setHistory(balances);
      if(run) {
        journal.current.push(run);
        try{localStorage.setItem(key,JSON.stringify(journal.current));}catch{setError('Storage unavailable');}
        setReports(old=>[...old,...results]);
        setLines(old=>[...old,...results]);
        const r=results[0];
        setTab(r.id);
      } else {
        setReports(results);setLines(results);
        if(first){setBoot(old=>[...(old||[]),'ready']);localStorage.setItem('vendix.booted','1');}
      }
      if(data.state.over) {
        setTab('scores');
        if(!data.state.failed && balances.length===release.days+1) {
          const previous=JSON.parse(localStorage.getItem(recordKey)||'null');
          const score=Math.max(0,data.state.cash);
          if(!previous || score>previous.score){
            const record={score,values:balances};
            try{localStorage.setItem(recordKey,JSON.stringify(record));setBest(record);}
            catch{setError('Storage unavailable');}
          }
        }
      }
      pending.current=null;setState(data.state);setActions(data.actions);setBusy(false);
    }
    w.onmessage=receive;
    try {
      journal.current=JSON.parse(localStorage.getItem(key)||'[]').map(entry=>Array.isArray(entry)?{move:entry,line:entry[0]}:entry);
      w.postMessage({release,moves:journal.current.map(e=>e.move)});
    } catch(e){fail(e.message);}
    Promise.all(release.rivals.map(async r=>({...r,values:await(await fetch('/'+r.balances)).json()}))).then(rs=>{if(live)setRivals(rs);}).catch(e=>fail(e.message));
    return ()=>{live=false;w.terminate();};
  },[release,key,recordKey,epoch]);
  useEffect(()=>{if(follow.current && log.current)log.current.scrollTop=log.current.scrollHeight;},[lines]);
  useLayoutEffect(()=>{
    const input=prompt.current;
    if(!input)return;
    const fit=()=>{
      input.style.height='auto';
      input.style.height=input.scrollHeight+'px';
    };
    fit();
    if(document.activeElement===input && (line || browse)){
      const surface=log.current;
      if(surface && input.getBoundingClientRect().bottom>surface.getBoundingClientRect().bottom)
        surface.scrollTop=surface.scrollHeight;
    }
    window.addEventListener('resize',fit);
    return ()=>window.removeEventListener('resize',fit);
  },[line,browse]);
  const verb=line.trim().split(/\s+/)[0],tool=toolFor(verb);
  const cost=state?.costs?.[tool]??state?.defaultCost;
  const tomorrow=verb==='close'||state?.minute+cost>=state?.closes;
  const estimate=state&&tool?(verb==='close'?t('next'):cost+' min')+
    ' · '+clock(state.minute)+' → '+clock(tomorrow?state.opens:state.minute+cost):'';
  const prefix=line.slice(0,caret);
  const choices=state?completions(prefix,state,actions,reports):[];
  const observations=useMemo(()=>Object.assign({},...reports.map(r=>
    Object.fromEntries(Object.entries(r.slots).map(([k,v])=>[k.toLowerCase().replace(/^ai-/,'').replaceAll(':','.'),{...v,day:r.day,minute:r.minute}])))),[reports]);
  const selected=reports.find(r=>r.id===tab);
  const recent=reports.slice(-3);
  function edit(s,pos=s.length){setLine(s);setCaret(pos);setBrowse(Boolean(s));setPick(0);setRecall(-1);setError('');}
  function complete(value){
    if(!value)return;
    const left=prefix.replace(/\S*$/,value+' ');
    edit(left+line.slice(caret).replace(/^\S*\s*/,''),left.length);
    prompt.current?.focus();
    requestAnimationFrame(()=>prompt.current?.setSelectionRange(left.length,left.length));
  }
  function execute(e){
    e?.preventDefault();
    const raw=line.trim();
    if(!raw||!state||pending.current)return;
    if(local.includes(verb)){
      if(verb==='help'){
        const topic=raw.split(/\s+/)[1];
        if(topic && !toolFor(topic) && !local.includes(topic)){setError('help [command]');return;}
        const text=topic
          ?syntax(topic)+(msg.commands[toolFor(topic)]?' — '+translate(msg.commands[toolFor(topic)],lang):'')
          :[...Object.entries(commandGroups).map(([group,vs])=>t(group)+': '+vs.filter(v=>toolFor(v) in actions).join('  ')),t('local')+': '+local.join('  '),'help [command]'].join('\n');
        setLines(old=>[...old,{id:'help-'+old.length,line:raw,day:state.day,minute:state.minute,localText:text}]);
        edit('');return;
      }
      const id=Number(raw.split(/\s+/)[1]);
      if(verb==='view' && !reports.some(r=>r.id===id)){setError('view <1…'+reports.length+'>');return;}
      setTab(verb==='view'?id:verb==='balance'?'world':verb);edit('');return;
    }
    if(state.over){setError(screen('complete'));return;}
    try{
      const move=parse(raw,state,actions);pending.current={move,line:raw};setBusy(true);
      worker.current.postMessage({moves:[move]});edit('');
    }catch(err){setError(err.message);}
  }
  function keys(e){
    if(e.nativeEvent.isComposing)return;
    if(e.key==='Enter' && !e.shiftKey){e.preventDefault();execute();return;}
    if(e.key==='Tab' && choices.length && !e.shiftKey){e.preventDefault();if(browse)complete(choices[pick]);else setBrowse(true);}
    if(['ArrowDown','ArrowUp'].includes(e.key)){
      if(!browse && line.includes('\n')){
        const before=line.slice(0,e.currentTarget.selectionStart),after=line.slice(e.currentTarget.selectionEnd);
        if((e.key==='ArrowUp' && before.includes('\n')) || (e.key==='ArrowDown' && after.includes('\n')))return;
      }
      const delta=e.key==='ArrowUp'?-1:1;e.preventDefault();
      if(browse && choices.length && recall<0){setPick((pick+delta+choices.length)%choices.length);return;}
      const i=Math.max(-1,Math.min(journal.current.length-1,recall-delta));
      setRecall(i);setLine(i<0?'':journal.current.at(-i-1).line);setPick(0);
    }
    if(e.key==='Escape'){setBrowse(false);setPick(0);}
  }
  const resultButton=(id,label)=><button key={id} className={tab===id?'selected':''} onClick={()=>{setTab(id);prompt.current?.focus();}}>{label}</button>;
  return <div className={'display-glass'+(crt?' enabled':'')}>
    <svg className="optics" aria-hidden="true" focusable="false" width="0" height="0">
      <defs><filter id="tube-optics" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feImage href="/glass-map.png" x="0%" y="0%" width="100%" height="100%" preserveAspectRatio="none" result="lens"/>
        <feDisplacementMap in="SourceGraphic" in2="lens" scale="11" xChannelSelector="R" yChannelSelector="G"/>
      </filter></defs>
    </svg>
    <main className={'station'+(crt?' crt':'')}><header className="mast">
    <h1><i className="brand-mark" aria-hidden="true"/>Vending Bench</h1><span className="operator">{t('operator')}</span><i className="vent" aria-hidden="true"/>
    <select aria-label="Benchmark" value={release.id} onChange={e=>changeRelease(e.target.value)}>{releases.map(r=><option key={r.id}>{r.id}</option>)}</select>
    <select aria-label="Language / Idioma / Sprache" value={lang} disabled={busy} onChange={e=>changeLang(e.target.value)}>{locales.map(l=><option key={l} value={l}>{l.toUpperCase()}</option>)}</select>
    <strong>{state?money(state.cash,lang):'—'}</strong>
  </header><div className="desk"><aside className="shell">
    <header><b>{t('terminal')}</b><span className={'lamp'+(busy?' working':'')}>TTY / 01</span></header>
    <div className="scrollback" ref={log} onClick={e=>{
      if(!e.target.closest('button,textarea,select,a')&&!window.getSelection()?.toString())prompt.current?.focus();
    }} onScroll={e=>{const n=e.currentTarget;follow.current=n.scrollHeight-n.clientHeight-n.scrollTop<24;}}>
      {boot && <div className="boot"><pre aria-label="VENDIX/OS">{` .-------.    VENDIX/OS
 | o o o |    Unattended Retail Systems
 | o o o |
 | [___] |
 '-------'`}</pre><div role="status">{boot.map(stage=><div key={stage}>{t(stage)}</div>)}</div></div>}
      {!lines.length&&<p>{t('hint')}</p>}
      {lines.map(r=><div className="receipt" key={r.id}><small>{t('day')} {r.day} · {clock(r.minute)}</small><div><b className="prompt-char">$</b> {r.line}</div>
        {r.localText?<pre className="shell-reply">{r.localText}</pre>:<button onClick={()=>setTab(r.id)}>#{r.id} {r.rows.length?r.rows.length+' '+t('results'):r.output.split('\n')[0].slice(0,110)}</button>}</div>)}
    </div><div className="input-zone">
      {browse && choices.length>0 && <div className="completion">{choices.slice(Math.floor(pick/5)*5,Math.floor(pick/5)*5+5).map(s=><button key={s} className={choices[pick]===s?'active':''} onClick={()=>complete(s)}>{s}<small>{observations[s]?observations[s].qty+'/'+observations[s].capacity+' · '+t('day')+' '+observations[s].day+' '+clock(observations[s].minute):msg.commands[toolFor(s)]?translate(msg.commands[toolFor(s)],lang):''}</small></button>)}</div>}
      {tool&&<small>{syntax(verb)} · {estimate}</small>}
      {error&&<p role="alert">{error}</p>}
      <div className="command-line"><span aria-hidden="true">›</span><textarea autoFocus rows={1} id="prompt" ref={prompt} value={line} aria-label={t('query')} enterKeyHint="send" autoComplete="off" spellCheck="false" autoCapitalize="none" onChange={e=>edit(e.target.value,e.target.selectionStart)} onSelect={e=>setCaret(e.target.selectionStart)} onKeyDown={keys}/></div>
    </div><div className="terminal-keys"><small>{busy?screen('loading'):'Tab '+t('completeKey')+' · Enter '+t('execute')+' · ↑ '+t('history')}</small></div>
    </aside><section className="workspace">
      <OfficeDisplay {...{state,release,lang,line,reports,t}}/>
      <nav className="tabs">
        {resultButton('world',t('bank'))}{resultButton('tabs',t('results')+' '+reports.length)}
        {resultButton('help',t('help'))}{resultButton('scores',t('standings'))}
        {recent.map(r=>resultButton(r.id,'#'+r.id+' '+r.line.split(' ')[0]))}
      </nav>
      <div className="readout" key={tab}>
        {tab==='world'?<Graph key={epoch} history={history} rivals={rivals} best={best} release={release} t={t} lang={lang}/>
          :selected?<Report report={selected} t={t} lang={lang}/>
          :tab==='help'?<CommandIndex actions={actions} lang={lang} t={t}/>
          :tab==='scores'?<Scorecard state={state} rivals={rivals} best={best} lang={lang} t={t} screen={screen}/>
          :<section className="sheet"><h2>{t('results')}</h2>{!reports.length&&t('empty')}{reports.slice().reverse().map(r=><button className="catalog" key={r.id} onClick={()=>setTab(r.id)}>#{r.id} · {clock(r.minute)} · {r.line}</button>)}</section>}
      </div></section></div>
    <footer><span>{state?.over?t('score')+' · '+money(state.failed?0:Math.max(0,state.cash),lang):'Vending Bench / '+release.id+' · Seed '+release.seed}</span>
    <button className="crt-switch" aria-label="CRT" aria-pressed={crt} onClick={()=>{setCrt(!crt);localStorage.setItem('vendix.crt',crt?'off':'on');}}>CRT · {t(crt?'displayOn':'displayOff')}</button>
    <button onClick={()=>{if(confirm(screen('discard'))){localStorage.removeItem(key);reset(n=>n+1);}}}>{screen('reset')}</button></footer></main></div>;
}

export default function Game({lang}){
  const [id,setId]=useState(releases[0].id);
  return <Station key={id} release={releases.find(r=>r.id===id)} lang={lang} changeRelease={setId} changeLang={l=>{localStorage.language=l;window.location.assign('/'+l+'/'+location.search+location.hash);}}/>;
}
