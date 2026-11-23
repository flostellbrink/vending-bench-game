import Game from '../../web/Game.jsx';

export default async function Page({params}: PageProps<'/[locale]'>){
  const {locale}=await params;
  return <Game lang={locale}/>;
}
