import {notFound} from 'next/navigation';
import {LocaleProvider} from 'games-localize/react';
import {locales} from '../../src/dictionary/runtime.ts';
import '../../web/style.css';
import '../../web/instrument.css';

export const metadata={title:'Vending Bench'};
export const dynamicParams=false;
export function generateStaticParams(){
  return locales.map(locale=>({locale}));
}
export default async function Layout({params,children}){
  const {locale}=await params;
  if(!locales.includes(locale))notFound();
  return <html lang={locale}><body><LocaleProvider locale={locale}>{children}</LocaleProvider></body></html>;
}
