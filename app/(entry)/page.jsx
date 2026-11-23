'use client';

import {useEffect} from 'react';
import {locales,baseLocale} from '../../src/dictionary/runtime.ts';

export default function Entry(){
  useEffect(()=>{
    const preferred=[localStorage.language,...navigator.languages].filter(Boolean)
      .map(l=>l.split('-')[0].toLowerCase()).find(l=>locales.includes(l));
    window.location.replace('/'+(preferred||baseLocale)+'/'+location.search+location.hash);
  },[]);
  return <nav aria-label="Language">{locales.map(l=><a key={l} href={'/'+l+'/'}>{l.toUpperCase()} </a>)}</nav>;
}
