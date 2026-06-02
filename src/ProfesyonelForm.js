import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { mc, ulkeAdiCevir } from './i18n';
import { auth, db } from './firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './ProfesyonelForm.css';
import SurumRozeti from './SurumRozeti';

// CRA/webpack'te Leaflet varsayılan ikon yolları kırılıyor — sabit
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const ilkAyUcretsiz = true;

const ulkeTelListesi = [
  {iso:'tr',ad:'Türkiye',kd:'+90'},{iso:'de',ad:'Almanya',kd:'+49'},{iso:'ua',ad:'Ukrayna',kd:'+380'},
  {iso:'az',ad:'Azerbaycan',kd:'+994'},{iso:'ru',ad:'Rusya',kd:'+7'},{iso:'us',ad:'Amerika Birleşik Devletleri',kd:'+1'},
  {iso:'gb',ad:'İngiltere',kd:'+44'},{iso:'fr',ad:'Fransa',kd:'+33'},{iso:'it',ad:'İtalya',kd:'+39'},
  {iso:'es',ad:'İspanya',kd:'+34'},{iso:'nl',ad:'Hollanda',kd:'+31'},{iso:'be',ad:'Belçika',kd:'+32'},
  {iso:'at',ad:'Avusturya',kd:'+43'},{iso:'ch',ad:'İsviçre',kd:'+41'},{iso:'pl',ad:'Polonya',kd:'+48'},
  {iso:'cz',ad:'Çek Cumhuriyeti',kd:'+420'},{iso:'hu',ad:'Macaristan',kd:'+36'},{iso:'gr',ad:'Yunanistan',kd:'+30'},
  {iso:'bg',ad:'Bulgaristan',kd:'+359'},{iso:'ro',ad:'Romanya',kd:'+40'},{iso:'sa',ad:'Suudi Arabistan',kd:'+966'},
  {iso:'ae',ad:'Birleşik Arap Emirlikleri',kd:'+971'},{iso:'eg',ad:'Mısır',kd:'+20'},{iso:'ir',ad:'İran',kd:'+98'},
  {iso:'iq',ad:'Irak',kd:'+964'},{iso:'kw',ad:'Kuveyt',kd:'+965'},{iso:'qa',ad:'Katar',kd:'+974'},
  {iso:'bh',ad:'Bahreyn',kd:'+973'},{iso:'cn',ad:'Çin',kd:'+86'},{iso:'jp',ad:'Japonya',kd:'+81'},
  {iso:'in',ad:'Hindistan',kd:'+91'},{iso:'pk',ad:'Pakistan',kd:'+92'},{iso:'br',ad:'Brezilya',kd:'+55'},
  {iso:'ar',ad:'Arjantin',kd:'+54'},{iso:'mx',ad:'Meksika',kd:'+52'},{iso:'ca',ad:'Kanada',kd:'+1'},
  {iso:'au',ad:'Avustralya',kd:'+61'},{iso:'af',ad:'Afganistan',kd:'+93'},{iso:'al',ad:'Arnavutluk',kd:'+355'},
  {iso:'dz',ad:'Cezayir',kd:'+213'},{iso:'ad',ad:'Andorra',kd:'+376'},{iso:'ao',ad:'Angola',kd:'+244'},
  {iso:'ag',ad:'Antigua ve Barbuda',kd:'+1268'},{iso:'am',ad:'Ermenistan',kd:'+374'},{iso:'bs',ad:'Bahamalar',kd:'+1242'},
  {iso:'bd',ad:'Bangladeş',kd:'+880'},{iso:'bb',ad:'Barbados',kd:'+1246'},{iso:'by',ad:'Belarus',kd:'+375'},
  {iso:'bz',ad:'Belize',kd:'+501'},{iso:'bj',ad:'Benin',kd:'+229'},{iso:'bt',ad:'Butan',kd:'+975'},
  {iso:'bo',ad:'Bolivya',kd:'+591'},{iso:'ba',ad:'Bosna Hersek',kd:'+387'},{iso:'bw',ad:'Botsvana',kd:'+267'},
  {iso:'bn',ad:'Brunei',kd:'+673'},{iso:'bf',ad:'Burkina Faso',kd:'+226'},{iso:'bi',ad:'Burundi',kd:'+257'},
  {iso:'cv',ad:'Yeşil Burun Adaları',kd:'+238'},{iso:'kh',ad:'Kamboçya',kd:'+855'},{iso:'cm',ad:'Kamerun',kd:'+237'},
  {iso:'cf',ad:'Orta Afrika Cumhuriyeti',kd:'+236'},{iso:'td',ad:'Çad',kd:'+235'},{iso:'cl',ad:'Şili',kd:'+56'},
  {iso:'co',ad:'Kolombiya',kd:'+57'},{iso:'km',ad:'Komorlar',kd:'+269'},{iso:'cd',ad:'Demokratik Kongo Cumhuriyeti',kd:'+243'},
  {iso:'cg',ad:'Kongo Cumhuriyeti',kd:'+242'},{iso:'cr',ad:'Kosta Rika',kd:'+506'},{iso:'hr',ad:'Hırvatistan',kd:'+385'},
  {iso:'cu',ad:'Küba',kd:'+53'},{iso:'cy',ad:'Kıbrıs',kd:'+357'},{iso:'dk',ad:'Danimarka',kd:'+45'},
  {iso:'dj',ad:'Cibuti',kd:'+253'},{iso:'dm',ad:'Dominika',kd:'+1767'},{iso:'do',ad:'Dominik Cumhuriyeti',kd:'+1809'},
  {iso:'ec',ad:'Ekvador',kd:'+593'},{iso:'sv',ad:'El Salvador',kd:'+503'},{iso:'gq',ad:'Ekvator Ginesi',kd:'+240'},
  {iso:'er',ad:'Eritre',kd:'+291'},{iso:'ee',ad:'Estonya',kd:'+372'},{iso:'sz',ad:'Esvatini',kd:'+268'},
  {iso:'et',ad:'Etiyopya',kd:'+251'},{iso:'fj',ad:'Fiji',kd:'+679'},{iso:'fi',ad:'Finlandiya',kd:'+358'},
  {iso:'ga',ad:'Gabon',kd:'+241'},{iso:'gm',ad:'Gambiya',kd:'+220'},{iso:'ge',ad:'Gürcistan',kd:'+995'},
  {iso:'gh',ad:'Gana',kd:'+233'},{iso:'gd',ad:'Grenada',kd:'+1473'},{iso:'gt',ad:'Guatemala',kd:'+502'},
  {iso:'gn',ad:'Gine',kd:'+224'},{iso:'gw',ad:'Gine-Bissau',kd:'+245'},{iso:'gy',ad:'Guyana',kd:'+592'},
  {iso:'ht',ad:'Haiti',kd:'+509'},{iso:'hn',ad:'Honduras',kd:'+504'},{iso:'is',ad:'İzlanda',kd:'+354'},
  {iso:'id',ad:'Endonezya',kd:'+62'},{iso:'ie',ad:'İrlanda',kd:'+353'},{iso:'il',ad:'İsrail',kd:'+972'},
  {iso:'jm',ad:'Jamaika',kd:'+1876'},{iso:'jo',ad:'Ürdün',kd:'+962'},{iso:'kz',ad:'Kazakistan',kd:'+7'},
  {iso:'ke',ad:'Kenya',kd:'+254'},{iso:'ki',ad:'Kiribati',kd:'+686'},{iso:'kp',ad:'Kuzey Kore',kd:'+850'},
  {iso:'kr',ad:'Güney Kore',kd:'+82'},{iso:'kg',ad:'Kırgızistan',kd:'+996'},{iso:'la',ad:'Laos',kd:'+856'},
  {iso:'lv',ad:'Letonya',kd:'+371'},{iso:'lb',ad:'Lübnan',kd:'+961'},{iso:'ls',ad:'Lesotho',kd:'+266'},
  {iso:'lr',ad:'Liberya',kd:'+231'},{iso:'ly',ad:'Libya',kd:'+218'},{iso:'li',ad:'Lihtenştayn',kd:'+423'},
  {iso:'lt',ad:'Litvanya',kd:'+370'},{iso:'lu',ad:'Lüksemburg',kd:'+352'},{iso:'mg',ad:'Madagaskar',kd:'+261'},
  {iso:'mw',ad:'Malavi',kd:'+265'},{iso:'my',ad:'Malezya',kd:'+60'},{iso:'mv',ad:'Maldivler',kd:'+960'},
  {iso:'ml',ad:'Mali',kd:'+223'},{iso:'mt',ad:'Malta',kd:'+356'},{iso:'mh',ad:'Marshall Adaları',kd:'+692'},
  {iso:'mr',ad:'Moritanya',kd:'+222'},{iso:'mu',ad:'Mauritius',kd:'+230'},{iso:'fm',ad:'Mikronezya',kd:'+691'},
  {iso:'md',ad:'Moldova',kd:'+373'},{iso:'mc',ad:'Monako',kd:'+377'},{iso:'mn',ad:'Moğolistan',kd:'+976'},
  {iso:'me',ad:'Karadağ',kd:'+382'},{iso:'ma',ad:'Fas',kd:'+212'},{iso:'mz',ad:'Mozambik',kd:'+258'},
  {iso:'mm',ad:'Myanmar',kd:'+95'},{iso:'na',ad:'Namibya',kd:'+264'},{iso:'nr',ad:'Nauru',kd:'+674'},
  {iso:'np',ad:'Nepal',kd:'+977'},{iso:'nz',ad:'Yeni Zelanda',kd:'+64'},{iso:'ni',ad:'Nikaragua',kd:'+505'},
  {iso:'ne',ad:'Nijer',kd:'+227'},{iso:'ng',ad:'Nijerya',kd:'+234'},{iso:'mk',ad:'Kuzey Makedonya',kd:'+389'},
  {iso:'no',ad:'Norveç',kd:'+47'},{iso:'om',ad:'Umman',kd:'+968'},{iso:'pw',ad:'Palau',kd:'+680'},
  {iso:'pa',ad:'Panama',kd:'+507'},{iso:'pg',ad:'Papua Yeni Gine',kd:'+675'},{iso:'py',ad:'Paraguay',kd:'+595'},
  {iso:'pe',ad:'Peru',kd:'+51'},{iso:'ph',ad:'Filipinler',kd:'+63'},{iso:'pt',ad:'Portekiz',kd:'+351'},
  {iso:'rw',ad:'Ruanda',kd:'+250'},{iso:'kn',ad:'Saint Kitts ve Nevis',kd:'+1869'},{iso:'lc',ad:'Saint Lucia',kd:'+1758'},
  {iso:'vc',ad:'Saint Vincent ve Grenadinler',kd:'+1784'},{iso:'ws',ad:'Samoa',kd:'+685'},{iso:'sm',ad:'San Marino',kd:'+378'},
  {iso:'st',ad:'Sao Tome ve Principe',kd:'+239'},{iso:'sn',ad:'Senegal',kd:'+221'},{iso:'rs',ad:'Sırbistan',kd:'+381'},
  {iso:'sc',ad:'Seyşeller',kd:'+248'},{iso:'sl',ad:'Sierra Leone',kd:'+232'},{iso:'sg',ad:'Singapur',kd:'+65'},
  {iso:'sk',ad:'Slovakya',kd:'+421'},{iso:'si',ad:'Slovenya',kd:'+386'},{iso:'sb',ad:'Solomon Adaları',kd:'+677'},
  {iso:'so',ad:'Somali',kd:'+252'},{iso:'za',ad:'Güney Afrika',kd:'+27'},{iso:'ss',ad:'Güney Sudan',kd:'+211'},
  {iso:'lk',ad:'Sri Lanka',kd:'+94'},{iso:'sd',ad:'Sudan',kd:'+249'},{iso:'sr',ad:'Surinam',kd:'+597'},
  {iso:'se',ad:'İsveç',kd:'+46'},{iso:'sy',ad:'Suriye',kd:'+963'},{iso:'tw',ad:'Tayvan',kd:'+886'},
  {iso:'tj',ad:'Tacikistan',kd:'+992'},{iso:'tz',ad:'Tanzanya',kd:'+255'},{iso:'th',ad:'Tayland',kd:'+66'},
  {iso:'tl',ad:'Doğu Timor',kd:'+670'},{iso:'tg',ad:'Togo',kd:'+228'},{iso:'to',ad:'Tonga',kd:'+676'},
  {iso:'tt',ad:'Trinidad ve Tobago',kd:'+1868'},{iso:'tn',ad:'Tunus',kd:'+216'},{iso:'tm',ad:'Türkmenistan',kd:'+993'},
  {iso:'tv',ad:'Tuvalu',kd:'+688'},{iso:'ug',ad:'Uganda',kd:'+256'},{iso:'uy',ad:'Uruguay',kd:'+598'},
  {iso:'uz',ad:'Özbekistan',kd:'+998'},{iso:'vu',ad:'Vanuatu',kd:'+678'},{iso:'ve',ad:'Venezuela',kd:'+58'},
  {iso:'vn',ad:'Vietnam',kd:'+84'},{iso:'ye',ad:'Yemen',kd:'+967'},{iso:'zm',ad:'Zambiya',kd:'+260'},
  {iso:'zw',ad:'Zimbabve',kd:'+263'},
];

const isoToTelKod = {
  af:'+93',  al:'+355', dz:'+213', ad:'+376', ao:'+244',
  ag:'+1268',ar:'+54',  am:'+374', au:'+61',  at:'+43',
  az:'+994', bs:'+1242',bh:'+973', bd:'+880', bb:'+1246',
  by:'+375', be:'+32',  bz:'+501', bj:'+229', bt:'+975',
  bo:'+591', ba:'+387', bw:'+267', br:'+55',  bn:'+673',
  bg:'+359', bf:'+226', bi:'+257', cv:'+238', kh:'+855',
  cm:'+237', ca:'+1',   cf:'+236', td:'+235', cl:'+56',
  cn:'+86',  co:'+57',  km:'+269', cd:'+243', cg:'+242',
  cr:'+506', hr:'+385', cu:'+53',  cy:'+357', cz:'+420',
  dk:'+45',  dj:'+253', dm:'+1767',do:'+1809',ec:'+593',
  eg:'+20',  sv:'+503', gq:'+240', er:'+291', ee:'+372',
  sz:'+268', et:'+251', fj:'+679', fi:'+358', fr:'+33',
  ga:'+241', gm:'+220', ge:'+995', de:'+49',  gh:'+233',
  gr:'+30',  gd:'+1473',gt:'+502', gn:'+224', gw:'+245',
  gy:'+592', ht:'+509', hn:'+504', hu:'+36',  is:'+354',
  in:'+91',  id:'+62',  ir:'+98',  iq:'+964', ie:'+353',
  il:'+972', it:'+39',  jm:'+1876',jp:'+81',  jo:'+962',
  kz:'+7',   ke:'+254', ki:'+686', kp:'+850', kr:'+82',
  kw:'+965', kg:'+996', la:'+856', lv:'+371', lb:'+961',
  ls:'+266', lr:'+231', ly:'+218', li:'+423', lt:'+370',
  lu:'+352', mg:'+261', mw:'+265', my:'+60',  mv:'+960',
  ml:'+223', mt:'+356', mh:'+692', mr:'+222', mu:'+230',
  mx:'+52',  fm:'+691', md:'+373', mc:'+377', mn:'+976',
  me:'+382', ma:'+212', mz:'+258', mm:'+95',  na:'+264',
  nr:'+674', np:'+977', nl:'+31',  nz:'+64',  ni:'+505',
  ne:'+227', ng:'+234', mk:'+389', no:'+47',  om:'+968',
  pk:'+92',  pw:'+680', pa:'+507', pg:'+675', py:'+595',
  pe:'+51',  ph:'+63',  pl:'+48',  pt:'+351', qa:'+974',
  ro:'+40',  ru:'+7',   rw:'+250', kn:'+1869',lc:'+1758',
  vc:'+1784',ws:'+685', sm:'+378', st:'+239', sa:'+966',
  sn:'+221', rs:'+381', sc:'+248', sl:'+232', sg:'+65',
  sk:'+421', si:'+386', sb:'+677', so:'+252', za:'+27',
  ss:'+211', es:'+34',  lk:'+94',  sd:'+249', sr:'+597',
  se:'+46',  ch:'+41',  sy:'+963', tw:'+886', tj:'+992',
  tz:'+255', th:'+66',  tl:'+670', tg:'+228', to:'+676',
  tt:'+1868',tn:'+216', tr:'+90',  tm:'+993', tv:'+688',
  ug:'+256', ua:'+380', ae:'+971', gb:'+44',  us:'+1',
  uy:'+598', uz:'+998', vu:'+678', ve:'+58',  vn:'+84',
  ye:'+967', zm:'+260', zw:'+263'
};

const NUM_TO_ISO2 = {
  4:'af',8:'al',12:'dz',20:'ad',24:'ao',28:'ag',32:'ar',51:'am',36:'au',40:'at',
  31:'az',44:'bs',48:'bh',50:'bd',52:'bb',112:'by',56:'be',84:'bz',204:'bj',64:'bt',
  68:'bo',70:'ba',72:'bw',76:'br',96:'bn',100:'bg',854:'bf',108:'bi',132:'cv',116:'kh',
  120:'cm',124:'ca',140:'cf',148:'td',152:'cl',156:'cn',170:'co',174:'km',180:'cd',178:'cg',
  188:'cr',191:'hr',192:'cu',196:'cy',203:'cz',208:'dk',262:'dj',212:'dm',214:'do',218:'ec',
  818:'eg',222:'sv',226:'gq',232:'er',233:'ee',748:'sz',231:'et',242:'fj',246:'fi',250:'fr',
  266:'ga',270:'gm',268:'ge',276:'de',288:'gh',300:'gr',308:'gd',320:'gt',324:'gn',624:'gw',
  328:'gy',332:'ht',340:'hn',348:'hu',352:'is',356:'in',360:'id',364:'ir',368:'iq',372:'ie',
  376:'il',380:'it',388:'jm',392:'jp',400:'jo',398:'kz',404:'ke',296:'ki',408:'kp',410:'kr',
  414:'kw',417:'kg',418:'la',428:'lv',422:'lb',426:'ls',430:'lr',434:'ly',438:'li',440:'lt',
  442:'lu',450:'mg',454:'mw',458:'my',462:'mv',466:'ml',470:'mt',584:'mh',478:'mr',480:'mu',
  484:'mx',583:'fm',498:'md',492:'mc',496:'mn',499:'me',504:'ma',508:'mz',104:'mm',516:'na',
  520:'nr',524:'np',528:'nl',554:'nz',558:'ni',562:'ne',566:'ng',807:'mk',578:'no',512:'om',
  586:'pk',585:'pw',591:'pa',598:'pg',600:'py',604:'pe',608:'ph',616:'pl',620:'pt',634:'qa',
  642:'ro',643:'ru',646:'rw',659:'kn',662:'lc',670:'vc',882:'ws',674:'sm',678:'st',682:'sa',
  686:'sn',688:'rs',690:'sc',694:'sl',702:'sg',703:'sk',705:'si',90:'sb',706:'so',710:'za',
  728:'ss',724:'es',144:'lk',729:'sd',740:'sr',752:'se',756:'ch',760:'sy',158:'tw',762:'tj',
  834:'tz',764:'th',626:'tl',768:'tg',776:'to',780:'tt',788:'tn',792:'tr',795:'tm',798:'tv',
  800:'ug',804:'ua',784:'ae',826:'gb',840:'us',858:'uy',860:'uz',548:'vu',862:'ve',704:'vn',
  887:'ye',894:'zm',716:'zw'
};

const ISO_AD_MAP = Object.fromEntries(ulkeTelListesi.map(u => [u.iso, u.ad]));

const uzanti = ['@gmail.com','@hotmail.com','@outlook.com','@icloud.com','@yahoo.com','@gmx.de','@web.de'];

const meslekMesaj = {
  'Makyaj Sanatçısı':'Hoş geldin! Güzelliğe ışıltı katan ellerinle dünya çapında müşterilere ulaşacaksın.',
  'Kuaför':'Aramıza hoş geldin! Saçın ustası olarak herkesin tarzını sen belirleyeceksin.',
  'Berber':'Hoş geldin! Bay şıklığının adresi artık sensin, müşterilerin seni bulacak.',
  'Cilt Bakımı':'Hoş geldin! Cilde taze bir nefes verecek, herkesi ışıl ışıl parlatacaksın.',
  'Tırnak Sanatçısı':'Hoş geldin! Detaylardaki ustalığı ve zarafetiyle fark yaratacaksın.',
  'Kaş / Kirpik':'Hoş geldin! Bakışları sen güzelleştirecek, herkesin ifadesine değer katacaksın.',
  'Masaj Terapisti':'Hoş geldin! Rahatlatan ellerinle herkese huzur ve dinginlik sunacaksın.',
  'Dövme Sanatçısı':'Hoş geldin! Tene işlenen sanatınla herkesin hikayesini ölümsüz kılacaksın.',
  'Fotoğrafçı':'Hoş geldin! Objektifinden geçen anları ölümsüz kılacak, hatıralar biriktireceksin.',
  'Kameraman':'Hoş geldin! Hikayeleri sen çekecek, anları sinema tadında ölümsüz kılacaksın.',
  'Müzisyen':'Hoş geldin! Ruhlara dokunan sesinle her etkinliği unutulmaz kılacaksın.',
  'DJ':'Hoş geldin! Geceyi sen renklendirecek, dans pistini ritimle dolduracaksın.',
  'Dansçı':'Hoş geldin! Hareketin sanatçısı olarak sahneleri ve kalpleri fethedeceksin.',
  'Tasarımcı':'Hoş geldin! Sınırsız hayal gücünle markalar ve projeler yaratacaksın.',
  'İç Mimar':'Hoş geldin! Mekânlara ruh katacak, yaşam alanlarını sanat eserine çevireceksin.',
  'Terzi / Moda':'Hoş geldin! Kumaşa hayat verecek, herkese özel tarzını giydireceksin.',
  'Doktor':'Hoş geldin! Şifa dağıtan ellerinle insanlara sağlık ve umut taşıyacaksın.',
  'Diş Hekimi':'Hoş geldin! Gülüşleri güzelleştirecek, herkesin özgüvenine değer katacaksın.',
  'Psikolog':'Hoş geldin! Zihinlere iyi gelecek, insanların yanlarında güvenle olacaksın.',
  'Diyetisyen':'Hoş geldin! Sağlıklı yaşamın rehberi olarak herkese dengeli bir yol göstereceksin.',
  'Fizyoterapist':'Hoş geldin! Hareketi geri kazandıracak, yaşam kalitesini yükselteceksin.',
  'Avukat':'Hoş geldin! Adaletin savunucusu olarak hakları koruyacak, güven vereceksin.',
  'Mali Müşavir':'Hoş geldin! Rakamların ustası olarak işletmelere doğru yolu göstereceksin.',
  'Mühendis':'Hoş geldin! Çözümü sen üretecek, projelere bilgi ve emek katacaksın.',
  'Mimar':'Hoş geldin! Hayalleri inşa edecek, şehirlere kalıcı eserler bırakacaksın.',
  'Öğretmen':'Hoş geldin! Geleceği şekillendirecek, bilgiyi yeni nesillere taşıyacaksın.',
  'Tercüman':'Hoş geldin! Dünyaları birleştirecek, diller arasında köprü kuracaksın.',
  'Yazılımcı':'Hoş geldin! Geleceği kodlayacak, dijital çözümlerle hayatı kolaylaştıracaksın.',
  'Restoran / Cafe':'Hoş geldin! Lezzetin adresi olarak misafirlerine eşsiz tatlar sunacaksın.',
  'Pastane':'Hoş geldin! Tatlı mutluluklar sunacak, her kutlamaya lezzet katacaksın.',
  'Çiçekçi':'Hoş geldin! Renkleri ve güzelliği sen sunacak, anlamlı anlar yaratacaksın.',
  'Organizasyon':'Hoş geldin! Anları unutulmaz kılacak, her etkinliği kusursuz hale getireceksin.',
  'Emlakçı':'Hoş geldin! Yuvaları buluşturacak, herkese hayalindeki yeri bulacaksın.',
  'Galerici':'Hoş geldin! Sanatı sergileyecek, eserlerle insanları buluşturacaksın.',
  'Marketçi / Bakkal':'Hoş geldin! Mahallenin güveni olarak herkesin ihtiyacına koşacaksın.',
  'Oto Galerici':'Hoş geldin! Hayalindeki aracı bulacak, güvenle alışveriş sunacaksın.',
  'Kasap Dükkanı':'Hoş geldin! Kalitenin adresi olarak sofralara en iyisini taşıyacaksın.',
  'Fırın / Ekmek':'Hoş geldin! Sıcak ekmeğin adresi olarak her sabaha lezzet katacaksın.',
  'Eczacı':'Hoş geldin! Sağlığın güvenilir eli olarak herkese doğru yolu göstereceksin.',
  'Optisyen':'Hoş geldin! Net bir bakış sunacak, herkesin dünyayı görmesine yardım edeceksin.',
  'Kuyumcu':'Hoş geldin! Değerli anların ustası olarak parlak hatıralar yaratacaksın.',
  'Kırtasiyeci':'Hoş geldin! Her ihtiyaca çözüm olacak, herkesin yanında olacaksın.',
  'Teknik Servis':'Hoş geldin! Cihazlara hayat verecek, sorunları ustalıkla çözeceksin.',
  'Otelci / Pansiyon':'Hoş geldin! Konaklamanın adresi olarak misafirlerine huzur sunacaksın.',
  'Kafeci / Barista':'Hoş geldin! Lezzetli molalar sunacak, günlere keyif katacaksın.',
  'Barmen':'Hoş geldin! Geceye tat katacak, eşsiz lezzetlerle eğlence sunacaksın.',
  'Matbaacı':'Hoş geldin! Fikirleri basacak, düşünceleri kağıda ve hayata taşıyacaksın.',
  'Saat Tamircisi':'Hoş geldin! Zamanı sen tamir edecek, değerli parçalara hayat vereceksin.',
  'Ayakkabıcı':'Hoş geldin! Her adımda yanında olacak, kaliteyi ayaklara giydireceksin.',
  'Mobilyacı':'Hoş geldin! Evlere sıcaklık katacak, yaşam alanlarını güzelleştireceksin.',
  'Peyzaj / Bahçe':'Hoş geldin! Doğayı sen tasarlayacak, yeşil ve huzurlu alanlar yaratacaksın.',
  'Seyahat / Tur':'Hoş geldin! Dünyayı gezdirecek, insanlara unutulmaz yolculuklar sunacaksın.',
  'Sigortacı':'Hoş geldin! Güvencenin adresi olarak herkesin geleceğini koruyacaksın.',
  'Sanatçı / Ressam':'Hoş geldin! Renklerle anlatacak, eserlerinle ruhlara dokunacaksın.',
  'Oto Tamir':'Hoş geldin! Araçlara hayat verecek, herkesi güvenle yola çıkaracaksın.',
  'Elektrikçi':'Hoş geldin! Işığı ve enerjiyi sen taşıyacak, hayatı aydınlatacaksın.',
  'Tesisatçı':'Hoş geldin! Suyu ve düzeni sen sağlayacak, evlere konfor getireceksin.',
  'Temizlik':'Hoş geldin! Mekânlara ferahlık katacak, tertemiz alanlar yaratacaksın.',
  'Nakliyat':'Hoş geldin! Eşyaları güvenle taşıyacak, herkesin yükünü hafifleteceksin.',
  'Özel Ders':'Hoş geldin! Bilgini paylaşacak, öğrencilerin başarısına ortak olacaksın.',
  'Spor Eğitmeni':'Hoş geldin! Sağlıklı yaşama yön verecek, herkesi forma sokacaksın.',
  'Yoga / Pilates':'Hoş geldin! Bedene ve ruha denge katacak, huzuru sen öğreteceksin.',
  'Bakıcı / Dadı':'Hoş geldin! Sevgiyle bakacak, ailelerin güvenilir desteği olacaksın.',
  'Veteriner':'Hoş geldin! Can dostlara şifa olacak, sevgiyle onlara bakacaksın.',
  'Kurye':'Hoş geldin! Her şeyi zamanında ulaştıracak, hızın ve güvenin adresi olacaksın.'
};

function sadeles(t) {
  if (!t) return '';
  // TÜM DÜNYA: önce Türkçe noktalı/noktasız i (Unicode NFD bunları çözmez),
  // sonra tüm aksanları soy (ö ü ç ş ğ é è à ñ ä ï ... her kıta, her dil).
  return t.replace(/ı/g, 'i').replace(/İ/g, 'i')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function serp(hedef, adet) {
  if (!hedef) return;
  const sekil = ['&#10022;','&#9670;','&#10038;','&#9830;','&#42;'];
  const renk = ['#FFE9A8','#FFD700','#ff5d97','#FFF6D5','#ffb3d4'];
  for (let i = 0; i < adet; i++) {
    const y = document.createElement('span');
    y.className = (Math.random() > 0.5 ? 'serp-yildiz' : 'serp-elmas');
    y.innerHTML = sekil[Math.floor(Math.random() * sekil.length)];
    y.style.color = renk[Math.floor(Math.random() * renk.length)];
    y.style.left = Math.random() * 100 + '%';
    y.style.top = Math.random() * 100 + '%';
    y.style.fontSize = (6 + Math.random() * 12) + 'px';
    y.style.animationDelay = (Math.random() * 3) + 's';
    y.style.animationDuration = (1.8 + Math.random() * 2.5) + 's';
    hedef.appendChild(y);
  }
}

export default function ProfesyonelForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  // form fields
  const [isim, setIsim] = useState('');
  const [soyisim, setSoyisim] = useState('');
  const [ep, setEp] = useState('');
  const [epOneriList, setEpOneriList] = useState([]);
  const [sifreAcik, setSifreAcik] = useState(false);
  const [sifre1, setSifre1] = useState('');
  const [sifre2, setSifre2] = useState('');
  const [sifre1Tip, setSifre1Tip] = useState('password');
  const [sifre2Tip, setSifre2Tip] = useState('password');
  const [telKod, setTelKod] = useState('');
  const [telNo, setTelNo] = useState('');
  const [cinsiyet, setCinsiyet] = useState('');
  // konum
  const [konumYazi, setKonumYazi] = useState('');
  const [ilce, setIlce] = useState('');
  const [mahalle, setMahalle] = useState('');
  const [srtUlke, setSrtUlke] = useState('');
  const [srtSehir, setSrtSehir] = useState('');
  const [srtIlce, setSrtIlce] = useState('');
  const [srtMahalle, setSrtMahalle] = useState('');
  const [konumBuluyor, setKonumBuluyor] = useState(false);
  const [ulkeOneri, setUlkeOneri] = useState([]);
  const [ulkeAraniyor, setUlkeAraniyor] = useState(false);
  const [sehirOneri, setSehirOneri] = useState([]);
  const [sehirAraniyor, setSehirAraniyor] = useState(false);
  const [ilceOneri, setIlceOneri] = useState([]);
  const [ilceAraniyor, setIlceAraniyor] = useState(false);
  const [mahalleOneri, setMahalleOneri] = useState([]);
  const [mahalleAraniyor, setMahalleAraniyor] = useState(false);
  const [srtUlkeIso, setSrtUlkeIso] = useState('');
  const [srtPostaKodu, setSrtPostaKodu] = useState('');
  // rol
  const [rol, setRol] = useState('');
  // kimlik
  const [kimlikMeslek, setKimlikMeslek] = useState(t('meslekSecBaslik'));
  const [kimlikAciklama, setKimlikAciklama] = useState(t('kimlikBos'));
  const [kimlikKonum, setKimlikKonum] = useState(' ');
  const [kimlikRolYazi, setKimlikRolYazi] = useState(t('pirlantaProfesyonel'));
  // overlayler
  const katman = new URLSearchParams(location.search).get('k') || '';

  function setKatman(k, replace) {
    if (k) {
      navigate('/profesyonel?k=' + k, replace ? { replace: true } : undefined);
    } else if (replace) {
      navigate('/profesyonel', { replace: true });
    } else {
      navigate(-1);
    }
  }
  // kutlama
  const [kutlamaGor, setKutlamaGor] = useState(false);
  const [kutlamaIcerik, setKutlamaIcerik] = useState({ ik: '🎉', ad: '', alt: '', renk: 'linear-gradient(135deg,#9b0e44,#e0115f)' });
  // balon
  const [balonGor, setBalonGor] = useState(false);
  const [balonYazi, setBalonYazi] = useState('');
  const [balonPos, setBalonPos] = useState({ left: 0, top: 0 });
  // hatalar
  const [hatalar, setHatalar] = useState({});
  const [hataAlani, setHataAlani] = useState('');
  // ödeme
  const [odemeYontemAktif, setOdemeYontemAktif] = useState('kart');
  const [kartIsim, setKartIsim] = useState('');
  const [kartNo, setKartNo] = useState('');
  const [kartTarih, setKartTarih] = useState('');
  const [kartCvv, setKartCvv] = useState('');
  const [kartHatalar, setKartHatalar] = useState({});
  // ep onay
  const [kayitEposta, setKayitEposta] = useState('');
  // kartGizli: ödeme sonrası kart gizlenir
  const [kartGizli, setKartGizli] = useState(false);
  // tel pencere
  const [telAramaMetin, setTelAramaMetin] = useState('');
  const [telElleKod, setTelElleKod] = useState('');
  const [telSonuclar, setTelSonuclar] = useState([]);
  // meslek/ilgi filtre
  const [meslekFiltre, setMeslekFiltre] = useState('');
  const [ilgiFiltre2, setIlgiFiltre2] = useState('');
  const [ureticiFiltre, setUreticiFiltre] = useState('');
  // secili meslek/isci (for katman flow)
  const seciliMeslekRef = useRef({ ad: '', ik: '', renk: '' });
  const seciliIsciRef = useRef({ ad: '', ik: '', renk: '' });
  // harita
  const haritaRef = useRef(null);
  const haritaPinRef = useRef(null);
  const telHaritaRef = useRef(null);
  const telHaritaPinRef = useRef(null);
  const telHaritaKkIcRef = useRef(null);
  const scrollLockRef = useRef(0);
  const ulkeDebounceRef = useRef(null);
  const sehirDebounceRef = useRef(null);
  const ilceDebounceRef = useRef(null);
  const mahalleDebounceRef = useRef(null);
  const anaKartRef = useRef(null);
  const kimlikKartRef = useRef(null);
  const kutlamaIcRef = useRef(null);
  const odemeKkIcRef = useRef(null);
  const meslekKkIcRef = useRef(null);
  const ilgiKkIcRef = useRef(null);
  const ureticiKkIcRef = useRef(null);
  const konumKkIcRef = useRef(null);
  const cinsiyetKkIcRef = useRef(null);
  const deneyimKkIcRef = useRef(null);
  const anaSayfaKkIcRef = useRef(null);
  const epOnayKkIcRef = useRef(null);
  const bhIcRef = useRef(null);
  const kutZamanRef = useRef(null);
  const balonZamanRef = useRef(null);
  const hataZamanRef = useRef(null);

  // scroll lock — position:fixed ile kart zıplamasını önler
  useEffect(() => {
    if (katman) {
      scrollLockRef.current = window.scrollY;
      document.body.style.top = `-${scrollLockRef.current}px`;
      document.body.classList.add('pencere-acik');
    } else {
      document.body.classList.remove('pencere-acik');
      document.body.style.top = '';
      if (scrollLockRef.current) window.scrollTo(0, scrollLockRef.current);
    }
    return () => {
      document.body.classList.remove('pencere-acik');
      document.body.style.top = '';
    };
  }, [katman]);

  // onload serp on anaKart
  useEffect(() => {
    if (anaKartRef.current) {
      serp(anaKartRef.current, 40);
    }
    // clear error on input
    // (handled inline)
  }, []);

  // init leaflet when buyukHarita opens
  useEffect(() => {
    if (katman !== 'buyukHarita') return;
    if (bhIcRef.current && !bhIcRef.current.dataset.serpildi) {
      serp(bhIcRef.current, 20);
      bhIcRef.current.dataset.serpildi = '1';
    }
    const tid = setTimeout(() => {
      if (!haritaRef.current) {
        const map = L.map('gercekHarita').setView([39, 35], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        let pin = null;
        let poiGrup = null;
        let moveZmn = null;
        const poiRenk = {
          restaurant:'#e74c3c', cafe:'#e67e22', fast_food:'#c0392b',
          supermarket:'#27ae60', shop:'#2980b9', pharmacy:'#8e44ad',
          hospital:'#e91e63', bank:'#f39c12', post_office:'#16a085',
          fuel:'#d35400', school:'#3498db', cinema:'#9b59b6',
          hotel:'#1abc9c', bar:'#e67e22', atm:'#f1c40f',
          bakery:'#e67e22', hairdresser:'#c0392b', beauty:'#c0392b',
          marketplace:'#27ae60', mosque:'#2ecc71', church:'#bdc3c7',
          convenience:'#27ae60', clothes:'#9b59b6',
        };
        function poiYukle(lat, lon) {
          if (poiGrup) { try { map.removeLayer(poiGrup); } catch(e){} poiGrup = null; }
          const q = `[out:json][timeout:12];(node["amenity"~"^(restaurant|cafe|fast_food|pharmacy|hospital|bank|post_office|fuel|school|cinema|hotel|bar|atm|bakery|marketplace|mosque|church|supermarket)$"](around:700,${lat},${lon});node["shop"~"^(supermarket|mall|convenience|hairdresser|beauty|clothes|bakery)$"](around:700,${lat},${lon}););out body;`;
          fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q))
            .then(r => r.json())
            .then(d => {
              if (!haritaRef.current) return;
              const liste = (d.elements || []).map(el => {
                const tur = el.tags.amenity || el.tags.shop || '';
                const renk = poiRenk[tur] || '#7f8c8d';
                const ikon = L.divIcon({
                  className: '',
                  html: `<div style="background:${renk};width:12px;height:12px;border-radius:50%;border:2px solid rgba(255,255,255,.9);box-shadow:0 1px 4px rgba(0,0,0,.5)"></div>`,
                  iconSize: [12, 12], iconAnchor: [6, 6]
                });
                const m = L.marker([el.lat, el.lon], { icon: ikon });
                if (el.tags.name) m.bindTooltip(el.tags.name, { direction: 'top', offset: [0, -8], className: 'poi-ipucu' });
                return m;
              });
              poiGrup = L.layerGroup(liste).addTo(map);
            })
            .catch(() => {});
        }
        map.on('click', e => {
          if (pin) map.removeLayer(pin);
          pin = L.marker(e.latlng).addTo(map);
          haritaPinRef.current = e.latlng;
        });
        map.on('locationfound', e => {
          map.setView(e.latlng, 16);
          poiYukle(e.latlng.lat, e.latlng.lng);
        });
        map.on('locationerror', () => poiYukle(41.015, 28.979));
        map.on('moveend', () => {
          if (map.getZoom() < 14) return;
          clearTimeout(moveZmn);
          moveZmn = setTimeout(() => {
            const c = map.getCenter();
            poiYukle(c.lat, c.lng);
          }, 800);
        });
        haritaRef.current = map;
        map.locate({ setView: false, timeout: 8000 });
      }
      haritaRef.current.invalidateSize();
    }, 300);
    return () => clearTimeout(tid);
  }, [katman]);

  // Tel kod haritası — renkli ülke sınırları (topojson CDN + world-atlas)
  useEffect(() => {
    if (katman !== 'telHaritaKatman') return;
    if (telHaritaKkIcRef.current && !telHaritaKkIcRef.current.dataset.serpildi) {
      serp(telHaritaKkIcRef.current, 20);
      telHaritaKkIcRef.current.dataset.serpildi = '1';
    }
    const tid = setTimeout(() => {
      if (telHaritaRef.current) { telHaritaRef.current.invalidateSize(); return; }
      const yukleTopojson = () => new Promise((res, rej) => {
        if (window.topojson) { res(); return; }
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js';
        s.onload = res; s.onerror = rej;
        document.head.appendChild(s);
      });
      const renkler = ['#e74c3c','#3498db','#27ae60','#f39c12','#8e44ad','#16a085','#d35400','#c0392b','#2980b9','#1abc9c','#e67e22','#e91e63'];
      const isoRenk = iso => {
        if (!iso) return '#444';
        let h = 0;
        for (let i = 0; i < iso.length; i++) h = iso.charCodeAt(i) + ((h << 5) - h);
        return renkler[Math.abs(h) % renkler.length];
      };
      yukleTopojson()
        .then(() => fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'))
        .then(r => r.json())
        .then(dunya => {
          if (telHaritaRef.current) return;
          const harita = L.map('telGercekHarita', {
            zoomControl: true, attributionControl: false, minZoom: 1, maxZoom: 6
          }).setView([20, 0], 2);
          harita.getContainer().style.background = '#0d0818';
          const geoVeri = window.topojson.feature(dunya, dunya.objects.countries);
          let oncekiKatman = null;
          L.geoJSON(geoVeri, {
            style: f => {
              const iso2 = NUM_TO_ISO2[parseInt(f.id)] || '';
              return { fillColor: isoRenk(iso2), fillOpacity: 0.82, color: '#1a0f2a', weight: 0.7 };
            },
            onEachFeature: (f, layer) => {
              const iso2 = NUM_TO_ISO2[parseInt(f.id)] || '';
              const adTr = ulkeAdiCevir(iso2, i18n.language, ISO_AD_MAP[iso2] || '');
              const telNo = iso2 ? (isoToTelKod[iso2] || '') : '';
              if (adTr) {
                layer.bindTooltip(
                  `${adTr}${telNo ? ' ' + telNo : ''}`,
                  { permanent: true, direction: 'center', className: 'tel-ht-daimi' }
                );
              }
              layer.on('click', () => {
                if (!iso2) return;
                if (oncekiKatman) oncekiKatman.setStyle({ weight: 0.7, color: '#1a0f2a', fillOpacity: 0.82 });
                layer.setStyle({ weight: 2.5, color: '#FFD700', fillOpacity: 0.95 });
                layer.bringToFront();
                oncekiKatman = layer;
                telHaritaPinRef.current = { iso: iso2 };
              });
            }
          }).addTo(harita);
          L.marker([62,94],{icon:L.divIcon({html:'<span style="color:#fff;font-size:9px;font-weight:700;text-shadow:0 0 3px #000,0 0 3px #000;white-space:nowrap">'+ulkeAdiCevir('ru',i18n.language,'Rusya')+' +7</span>',className:'',iconSize:null}),interactive:false}).addTo(harita);
          telHaritaRef.current = harita;
          harita.invalidateSize();
        })
        .catch(() => {});
    }, 300);
    return () => clearTimeout(tid);
  }, [katman]);

  // serp on katman open
  useEffect(() => {
    if (katman === 'odemeKatman' && odemeKkIcRef.current && !odemeKkIcRef.current.dataset.serpildi) {
      serp(odemeKkIcRef.current, 18); odemeKkIcRef.current.dataset.serpildi = '1';
    }
    if (katman === 'meslekKatman' && meslekKkIcRef.current && !meslekKkIcRef.current.dataset.serpildi) {
      serp(meslekKkIcRef.current, 35); meslekKkIcRef.current.dataset.serpildi = '1';
    }
    if (katman === 'ilgiKatman' && ilgiKkIcRef.current && !ilgiKkIcRef.current.dataset.serpildi) {
      serp(ilgiKkIcRef.current, 35); ilgiKkIcRef.current.dataset.serpildi = '1';
    }
    if (katman === 'ureticiKatman' && ureticiKkIcRef.current && !ureticiKkIcRef.current.dataset.serpildi) {
      serp(ureticiKkIcRef.current, 35); ureticiKkIcRef.current.dataset.serpildi = '1';
    }
    if (katman === 'konumKatman' && konumKkIcRef.current && !konumKkIcRef.current.dataset.serpildi) {
      serp(konumKkIcRef.current, 30); konumKkIcRef.current.dataset.serpildi = '1';
    }
    if (katman === 'cinsiyetKatman' && cinsiyetKkIcRef.current && !cinsiyetKkIcRef.current.dataset.serpildi) {
      serp(cinsiyetKkIcRef.current, 20); cinsiyetKkIcRef.current.dataset.serpildi = '1';
    }
    if (katman === 'deneyimKatman' && deneyimKkIcRef.current && !deneyimKkIcRef.current.dataset.serpildi) {
      serp(deneyimKkIcRef.current, 20); deneyimKkIcRef.current.dataset.serpildi = '1';
    }
    if (katman === 'anaSayfaKatman' && anaSayfaKkIcRef.current && !anaSayfaKkIcRef.current.dataset.serpildi) {
      serp(anaSayfaKkIcRef.current, 18); anaSayfaKkIcRef.current.dataset.serpildi = '1';
    }
    if (katman === 'epOnayKatman' && epOnayKkIcRef.current && !epOnayKkIcRef.current.dataset.serpildi) {
      serp(epOnayKkIcRef.current, 18); epOnayKkIcRef.current.dataset.serpildi = '1';
    }
  }, [katman]);


  function kartParlat() {
    const kart = anaKartRef.current; if (!kart) return;
    kart.classList.add('parlama');
    setTimeout(() => kart.classList.remove('parlama'), 2000);
    const sekil = ['♦','✧','✳','✤','◆'];
    const renk = ['#FFD700','#FFE9A8','#ff5d97','#FFF6D5','#e0115f'];
    for (let i = 0; i < 40; i++) {
      const e = document.createElement('span');
      e.className = 'patlama-elmas';
      e.innerHTML = sekil[Math.floor(Math.random() * sekil.length)];
      e.style.color = renk[Math.floor(Math.random() * renk.length)];
      e.style.fontSize = (14 + Math.random() * 22) + 'px';
      const kenar = Math.floor(Math.random() * 4); const poz = Math.random() * 100;
      if (kenar === 0) { e.style.top = '0'; e.style.left = poz + '%'; }
      else if (kenar === 1) { e.style.bottom = '0'; e.style.left = poz + '%'; }
      else if (kenar === 2) { e.style.left = '0'; e.style.top = poz + '%'; }
      else { e.style.right = '0'; e.style.top = poz + '%'; }
      const ac = Math.random() * 360; const mes = 70 + Math.random() * 100;
      e.style.setProperty('--dx', (Math.cos(ac * Math.PI / 180) * mes) + 'px');
      e.style.setProperty('--dy', (Math.sin(ac * Math.PI / 180) * mes) + 'px');
      kart.appendChild(e);
      setTimeout(() => { if (e.parentNode) e.parentNode.removeChild(e); }, 2200);
    }
  }

  function kimlikParlat() {
    const kk = kimlikKartRef.current; if (!kk) return;
    kk.classList.add('kimlik-parla');
    setTimeout(() => kk.classList.remove('kimlik-parla'), 2000);
    const sekil = ['♦','✧','✳','✤','◆'];
    const renk = ['#FFD700','#FFE9A8','#ff5d97','#FFF6D5','#e0115f'];
    for (let i = 0; i < 22; i++) {
      const e = document.createElement('span'); e.className = 'patlama-elmas';
      e.innerHTML = sekil[Math.floor(Math.random() * sekil.length)];
      e.style.color = renk[Math.floor(Math.random() * renk.length)];
      e.style.fontSize = (12 + Math.random() * 18) + 'px';
      const kenar = Math.floor(Math.random() * 4); const poz = Math.random() * 100;
      if (kenar === 0) { e.style.top = '0'; e.style.left = poz + '%'; }
      else if (kenar === 1) { e.style.bottom = '0'; e.style.left = poz + '%'; }
      else if (kenar === 2) { e.style.left = '0'; e.style.top = poz + '%'; }
      else { e.style.right = '0'; e.style.top = poz + '%'; }
      const ac = Math.random() * 360; const mes = 50 + Math.random() * 70;
      e.style.setProperty('--dx', (Math.cos(ac * Math.PI / 180) * mes) + 'px');
      e.style.setProperty('--dy', (Math.sin(ac * Math.PI / 180) * mes) + 'px');
      kk.appendChild(e);
      setTimeout(() => { if (e.parentNode) e.parentNode.removeChild(e); }, 2000);
    }
  }

  function meslekKutla(ad, ik, renk) {
    const mesaj = i18n.language.split('-')[0] === 'tr' ? (meslekMesaj[ad] || 'Hoş geldin! GLAMWORLD ailesine katıldın.') : t('meslekHosgeldinSablon', { meslek: mc(ad, i18n.language) });
    setKutlamaIcerik({ ik, ad: mc(ad, i18n.language), alt: mesaj, renk: renk || 'linear-gradient(135deg,#9b0e44,#e0115f)' });
    setKutlamaGor(true);
    if (kutlamaIcRef.current) { serp(kutlamaIcRef.current, 28); }
    kartParlat();
    clearTimeout(kutZamanRef.current);
    kutZamanRef.current = setTimeout(() => {
      setKutlamaGor(false);
      kimlikParlat();
    }, 3500);
  }

  function secB(el, yazi) {
    setBalonYazi(yazi);
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2 - 40;
    setBalonPos({ left: Math.max(10, x), top: r.top - 52 });
    setBalonGor(true);
    clearTimeout(balonZamanRef.current);
    balonZamanRef.current = setTimeout(() => setBalonGor(false), 1500);
  }

  function uyariGoster(mesaj) {
    setHataAlani('⚠️ ' + mesaj);
    clearTimeout(hataZamanRef.current);
    hataZamanRef.current = setTimeout(() => setHataAlani(''), 4000);
  }

  function epOner(v) {
    if (!v || v.indexOf('@') === -1) { setEpOneriList([]); return; }
    const bas = v.split('@')[0];
    setEpOneriList(uzanti.map(u => bas + u));
  }

  function telAra(v) {
    setTelAramaMetin(v);
    if (!v || !v.trim()) { setTelSonuclar([]); return; }
    const temiz = sadeles(v.trim());
    const bulunan = ulkeTelListesi
      .filter(u => sadeles(u.ad).indexOf(temiz) > -1 || u.kd.indexOf(v.trim()) > -1)
      .slice(0, 20);
    setTelSonuclar(bulunan);
  }

  function telKoduAyarla(kod) {
    if (kod && kod.indexOf('+') === 0) {
      setTelKod(kod);
      setTelElleKod(kod);
    }
  }

  function telKonumdanBul() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}&limit=1`)
          .then(r => r.json())
          .then(data => {
            if (data && data.features && data.features.length > 0) {
              const cc = (data.features[0].properties.countrycode || '').toLowerCase();
              const kod = isoToTelKod[cc];
              if (kod) telKoduAyarla(kod);
            }
            setKatman('');
          })
          .catch(() => setKatman(''));
      },
      () => setKatman('')
    );
  }

  function telAyikla(v) {
    let temiz = v.replace(/[^0-9]/g, '');
    const kod = telKod.replace(/[^0-9]/g, '');
    if (kod && temiz.indexOf(kod) === 0 && temiz.length > kod.length) temiz = temiz.substring(kod.length);
    if (temiz.indexOf('0') === 0) temiz = temiz.substring(1);
    return temiz;
  }

  // Photon reverse sonucunu 4 alana dağıtır
  function photonDoldur(p) {
    const ulke = p.country || '';
    const sehir = p.state || '';
    const ilceDeg = p.county || p.city || p.district || '';
    const sokak = p.street ? (p.street + (p.housenumber ? ' ' + p.housenumber : '')) : '';
    const mahDeg = p.suburb || p.locality || p.village || sokak || p.name || '';
    setSrtUlke(ulke);
    setSrtSehir(sehir);
    setSrtIlce(ilceDeg);
    setSrtMahalle(mahDeg);
    setSrtUlkeIso((p.countrycode || '').toUpperCase());
    setSrtPostaKodu(p.postcode || '');
    setUlkeOneri([]);
    const ust = [sehir || p.city || p.county || '', ulke].filter(Boolean).join(', ');
    if (ust) setKonumYazi(ust);
    if (ilceDeg) setIlce(ilceDeg);
    if (mahDeg) setMahalle(mahDeg);
    const tumParca = [mahDeg, ilceDeg, sehir || p.city || '', ulke].filter(Boolean).join(', ');
    if (tumParca) setKimlikKonum(tumParca);
  }

  function konumKapat() {
    const ust = [];
    if (srtSehir.trim()) ust.push(srtSehir.trim());
    if (srtUlke.trim()) ust.push(srtUlke.trim());
    if (ust.length > 0) setKonumYazi(ust.join(', '));
    if (srtIlce.trim()) setIlce(srtIlce.trim());
    if (srtMahalle.trim()) setMahalle(srtMahalle.trim());
    const tumParca = [];
    if (srtMahalle.trim()) tumParca.push(srtMahalle.trim());
    if (srtIlce.trim()) tumParca.push(srtIlce.trim());
    if (srtSehir.trim()) tumParca.push(srtSehir.trim());
    if (srtUlke.trim()) tumParca.push(srtUlke.trim());
    if (tumParca.length > 0) setKimlikKonum(tumParca.join(', '));
    setUlkeOneri([]);
    setKatman('');
  }

  // GPS → Photon reverse → 4 alan
  function konumBul() {
    if (!navigator.geolocation) { setKonumBuluyor(false); return; }
    setKonumBuluyor(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        fetch(`https://photon.komoot.io/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&limit=1`)
          .then(r => r.json())
          .then(data => {
            setKonumBuluyor(false);
            if (data?.features?.length > 0) photonDoldur(data.features[0].properties);
          })
          .catch(() => setKonumBuluyor(false));
      },
      () => setKonumBuluyor(false),
      { timeout: 10000 }
    );
  }

  // Ülke arama kutusu → Photon country arama (400ms debounce)
  function ulkeAra(v) {
    setSrtUlke(v);
    setSrtUlkeIso('');
    setUlkeOneri([]);
    clearTimeout(ulkeDebounceRef.current);
    if (!v.trim()) { setUlkeAraniyor(false); return; }
    setUlkeAraniyor(true);
    ulkeDebounceRef.current = setTimeout(() => {
      fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(v)}&layer=country&limit=5`)
        .then(r => r.json())
        .then(data => {
          setUlkeAraniyor(false);
          if (data?.features) {
            const liste = data.features
              .map(f => ({ ad: f.properties.country || f.properties.name || '', iso: (f.properties.countrycode || '').toUpperCase() }))
              .filter(u => u.ad);
            setUlkeOneri(liste);
            // Elle yazılan ad bir öneriyle birebir eşleşiyorsa (ya da tek sonuç varsa)
            // ISO otomatik yakalanır — kullanıcı öneriden seçmese de alt şeritler daralır
            const tam = liste.find(u => sadeles(u.ad) === sadeles(v));
            if (tam && tam.iso) setSrtUlkeIso(tam.iso);
            else if (liste.length === 1 && liste[0].iso) setSrtUlkeIso(liste[0].iso);
          }
        })
        .catch(() => { setUlkeAraniyor(false); setUlkeOneri([]); });
    }, 400);
  }

  function sehirAra(v) {
    setSrtSehir(v);
    setSehirOneri([]);
    clearTimeout(sehirDebounceRef.current);
    if (!v.trim()) { setSehirAraniyor(false); return; }
    setSehirAraniyor(true);
    sehirDebounceRef.current = setTimeout(() => {
      const q = srtUlke.trim() ? v.trim() + ' ' + srtUlke.trim() : v.trim();
      fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&layer=city&layer=state&limit=6`)
        .then(r => r.json())
        .then(data => {
          setSehirAraniyor(false);
          if (data?.features) {
            const feats = srtUlkeIso
              ? data.features.filter(f => { const cc = (f.properties.countrycode || '').toUpperCase(); return !cc || cc === srtUlkeIso; })
              : data.features;
            // Türkçe harf duyarsız önceliklendirme: yazdığına uyan (ş/ı/ö/ü/ç/ğ farketmez) öne gelsin
            const vN = sadeles(v);
            const skor = f => { const n = sadeles(f.properties.name || ''); return n.indexOf(vN) === 0 ? 0 : n.indexOf(vN) > -1 ? 1 : 2; };
            const sirali = feats.slice().sort((a, b) => skor(a) - skor(b));
            setSehirOneri(sirali.map(f => ({ ad: f.properties.name || '', ulke: f.properties.country || '' })).filter(s => s.ad));
          }
        })
        .catch(() => { setSehirAraniyor(false); setSehirOneri([]); });
    }, 400);
  }

  function ilceAra(v) {
    setSrtIlce(v);
    setIlceOneri([]);
    clearTimeout(ilceDebounceRef.current);
    if (!v.trim()) { setIlceAraniyor(false); return; }
    setIlceAraniyor(true);
    ilceDebounceRef.current = setTimeout(() => {
      const ctx = [srtSehir, srtUlke].map(s => s.trim()).filter(Boolean).join(' ');
      const q = ctx ? v.trim() + ' ' + ctx : v.trim();
      // İlçe; Türkiye'de çoğu kez kasaba (place=town → city) olarak işaretli,
      // bazen idari district. İkisini birden ara, geniş çek sonra süz.
      fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&layer=city&layer=district&layer=county&limit=15`)
        .then(r => r.json())
        .then(data => {
          setIlceAraniyor(false);
          if (data?.features) {
            let feats = srtUlkeIso
              ? data.features.filter(f => { const cc = (f.properties.countrycode || '').toUpperCase(); return !cc || cc === srtUlkeIso; })
              : data.features;
            const vN = sadeles(v);
            const sehirN = sadeles(srtSehir);
            // SADECE yazılan ADA uyan VE (şehir seçiliyse) o ŞEHRE ait olanları öner.
            // Uyan yoksa öneri gösterme — saçma sonuç yerine boş (kullanıcı elle yazar, yazdığı kaydedilir).
            const uygun = feats.filter(f => {
              const p = f.properties;
              if (sadeles(p.name || '').indexOf(vN) === -1) return false;
              if (!sehirN) return true;
              const baglam = sadeles([p.city, p.county, p.state, p.locality].filter(Boolean).join(' '));
              return baglam.indexOf(sehirN) > -1;
            });
            const gorulen = new Set();
            const benzersiz = uygun.filter(f => {
              const anahtar = sadeles((f.properties.name || '') + '|' + (f.properties.state || f.properties.city || ''));
              if (gorulen.has(anahtar)) return false;
              gorulen.add(anahtar); return true;
            });
            setIlceOneri(benzersiz.slice(0, 8).map(f => ({ ad: f.properties.name || '', sehir: f.properties.city || f.properties.state || '', ulke: f.properties.country || '' })).filter(s => s.ad));
          }
        })
        .catch(() => { setIlceAraniyor(false); setIlceOneri([]); });
    }, 400);
  }

  function mahalleAra(v) {
    setSrtMahalle(v);
    setMahalleOneri([]);
    clearTimeout(mahalleDebounceRef.current);
    if (!v.trim()) { setMahalleAraniyor(false); return; }
    setMahalleAraniyor(true);
    mahalleDebounceRef.current = setTimeout(() => {
      const konteks = [srtIlce, srtSehir].map(s => s.trim()).filter(Boolean).join(' ');
      const q = konteks ? v.trim() + ' ' + konteks : v.trim();
      fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&layer=locality&layer=district&layer=street&limit=6`)
        .then(r => r.json())
        .then(data => {
          setMahalleAraniyor(false);
          if (data?.features) {
            const feats = srtUlkeIso
              ? data.features.filter(f => { const cc = (f.properties.countrycode || '').toUpperCase(); return !cc || cc === srtUlkeIso; })
              : data.features;
            // Türkçe harf duyarsız önceliklendirme: yazdığına uyan (ş/ı/ö/ü/ç/ğ farketmez) öne gelsin
            const vN = sadeles(v);
            const skor = f => { const n = sadeles(f.properties.name || ''); return n.indexOf(vN) === 0 ? 0 : n.indexOf(vN) > -1 ? 1 : 2; };
            const sirali = feats.slice().sort((a, b) => skor(a) - skor(b));
            setMahalleOneri(sirali.map(f => ({ ad: f.properties.name || '', ilce: f.properties.county || f.properties.district || f.properties.city || '', ulke: f.properties.country || '' })).filter(s => s.ad));
          }
        })
        .catch(() => { setMahalleAraniyor(false); setMahalleOneri([]); });
    }, 400);
  }

  function haritaBuyut() {
    setKatman('buyukHarita');
  }

  function haritaKucult() {
    navigate(-1);
  }

  function buKonumuSec() {
    if (!haritaPinRef.current) { setKatman('', true); return; }
    const { lat, lng } = haritaPinRef.current;
    fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&limit=1`)
      .then(r => r.json())
      .then(data => {
        if (data?.features?.length > 0) photonDoldur(data.features[0].properties);
        setKatman('', true);
      })
      .catch(() => setKatman('', true));
  }

  function haritaBuyutTel() {
    setKatman('telHaritaKatman');
  }

  function telHaritaKucult() {
    navigate(-1);
  }

  function buTelKodunuSec() {
    if (!telHaritaPinRef.current) { setKatman('', true); return; }
    const iso = telHaritaPinRef.current.iso;
    if (iso) {
      const kod = isoToTelKod[iso];
      if (kod) telKoduAyarla(kod);
    }
    setKatman('', true);
  }

  function rolVeren() {
    setRol('veren');
    setKatman('meslekKatman');
  }

  function rolAlan() {
    setRol('alan');
    setKatman('ilgiKatman');
  }

  function rolUretici() {
    setRol('uretici');
    setKatman('ureticiKatman');
  }

  function meslekSec(m) {
    seciliMeslekRef.current = { ad: m.ad, ik: m.ik, renk: m.bg };
    setKatman('');
    setTimeout(() => setKatman('cinsiyetKatman'), 200);
  }

  function cinsiyetSec(cins) {
    const { ad, ik, renk } = seciliMeslekRef.current;
    setKatman('');
    setKimlikRolYazi(t('pirlantaProfesyonel'));
    setKimlikMeslek(ik + ' ' + mc(ad, i18n.language));
    setKimlikAciklama(i18n.language.split('-')[0] === 'tr' ? ((meslekMesaj[ad] || 'Hoş geldin!') + ' GLAMWORLD ailesine katıldın. Profilin hazır, platformda yerini aldın.') : t('meslekHosgeldinSablon', { meslek: mc(ad, i18n.language) }));
    meslekKutla(ad, ik, renk);
  }

  function ilgiSec(m) {
    seciliIsciRef.current = { ad: m.ad, ik: m.ik, renk: m.bg };
    setKatman('');
    setTimeout(() => setKatman('deneyimKatman'), 200);
  }

  function deneyimSec(deneyim) {
    const { ad, ik, renk } = seciliIsciRef.current;
    setKatman('');
    setKimlikRolYazi(t('hizmetAlanIsArayan'));
    setKimlikMeslek(ik + ' ' + mc(ad, i18n.language));
    setKimlikAciklama(i18n.language.split('-')[0] === 'tr' ? ('Hoş geldin! ' + ad + ' olarak GLAMWORLD ailesine katıldın. Profilin hazır, platformda yerini aldın.') : t('kimlikHosgeldin'));
    meslekKutla(ad, ik, renk);
  }

  function kartNoFormat(v) {
    let n = v.replace(/[^0-9]/g, '').substring(0, 16);
    const g = n.match(/.{1,4}/g);
    return g ? g.join(' ') : '';
  }

  function kartTarihFormat(v) {
    let n = v.replace(/[^0-9]/g, '').substring(0, 4);
    if (n.length >= 3) return n.substring(0, 2) + '/' + n.substring(2);
    return n;
  }

  function odemeAc() {
    const yeniHatalar = {};
    let hataVar = false;
    if (!isim.trim()) { yeniHatalar.isim = 'İsim boş bırakılamaz'; hataVar = true; }
    if (!soyisim.trim()) { yeniHatalar.soyisim = 'Soyisim boş bırakılamaz'; hataVar = true; }
    if (!ep.trim()) { yeniHatalar.ep = 'E-posta boş bırakılamaz'; hataVar = true; }
    else if (ep.indexOf('@') === -1) { yeniHatalar.ep = 'Geçerli e-posta girin (örnek@mail.com)'; hataVar = true; }
    if (!sifreAcik || !sifre1.trim()) {
      yeniHatalar.sifre1 = 'Şifre boş bırakılamaz'; hataVar = true;
      setSifreAcik(true);
    } else if (sifre1.length < 8) {
      yeniHatalar.sifre1 = 'Şifre en az 8 karakter olmalı'; hataVar = true;
    }
    if (!sifre2.trim()) { yeniHatalar.sifre2 = 'Şifreyi tekrar girin'; hataVar = true; }
    else if (sifre1 !== sifre2) { yeniHatalar.sifre2 = 'Şifreler aynı değil'; hataVar = true; }
    if (!telNo.trim()) { yeniHatalar.tel = 'Telefon numarası girin'; hataVar = true; }
    if (!konumYazi) { yeniHatalar.konum = true; hataVar = true; }
    if (!ilce.trim()) { yeniHatalar.ilce = 'İlçe girin'; hataVar = true; }
    if (!mahalle.trim()) { yeniHatalar.mah = 'Mahalle/köy girin'; hataVar = true; }
    if (!rol) { yeniHatalar.rol = true; hataVar = true; }
    setHatalar(yeniHatalar);
    if (hataVar) {
      uyariGoster('Lütfen kırmızı alanları kontrol edin');
      return;
    }
    setKatman('odemeKatman');
  }

  function odemeTamamla() {
    if (odemeYontemAktif === 'kart') {
      const kh = {};
      let hataVar = false;
      if (!kartIsim.trim()) { kh.kartIsim = 'Kart üzerindeki ismi girin'; hataVar = true; }
      const no = kartNo.replace(/[^0-9]/g, '');
      if (!no) { kh.kartNo = 'Kart numarası girin'; hataVar = true; }
      else if (no.length < 16) { kh.kartNo = 'Kart numarası 16 hane olmalı'; hataVar = true; }
      if (!kartTarih) { kh.kartTarih = 'Son kullanma tarihi girin'; hataVar = true; }
      else if (kartTarih.length < 5) { kh.kartTarih = 'AA/YY şeklinde girin (örn 12/27)'; hataVar = true; }
      else { const ay = parseInt(kartTarih.substring(0, 2)); if (ay < 1 || ay > 12) { kh.kartTarih = 'Ay 01-12 arasi olmali'; hataVar = true; } }
      if (!kartCvv) { kh.kartCvv = 'CVV girin'; hataVar = true; }
      else if (kartCvv.length < 3) { kh.kartCvv = 'CVV en az 3 hane'; hataVar = true; }
      setKartHatalar(kh);
      if (hataVar) return;
    }
    setKatman('', true);
    const eposta = ep || 'eposta';
    setKayitEposta(eposta);
    const ic = kutlamaIcRef.current;
    setKutlamaIcerik({ ik: '🎉', ad: t('tebriklerKayit'), alt: t('hesabinHazirKisa'), renk: 'linear-gradient(135deg,#9b0e44,#e0115f)' });
    setKutlamaGor(true);
    if (ic) serp(ic, 28);
    kartParlat();
    clearTimeout(kutZamanRef.current);
    kutZamanRef.current = setTimeout(() => {
      setKutlamaGor(false);
      setKatman('epOnayKatman', true);
    }, 2500);
  }

  function odemeAltSistem(ad) {
    const mesajMetni = ilkAyUcretsiz
      ? ad + ' ile ödeme onayı:\n\nKırmızı Pırlanta Üyelik - İlk ay ÜCRETSİZ\n\nOnaylıyor musun?'
      : ad + ' ile ödeme onayı:\n\nKırmızı Pırlanta Üyelik - 10€/ay\n\nOnaylıyor musun?';
    const onay = window.confirm(mesajMetni);
    if (onay) odemeTamamla();
  }

  async function epOnayla() {
    // GERÇEK üyelik: Firebase'de hesap aç (kilitli çekirdeğe dokunmadan, sadece kayıt anı)
    try {
      const cred = await createUserWithEmailAndPassword(auth, ep.trim(), sifre1);
      try { await updateProfile(cred.user, { displayName: (isim.trim() + ' ' + soyisim.trim()).trim() }); } catch (e) {}
      try { await setDoc(doc(db, 'kullanicilar', cred.user.uid), { tip: 'profesyonel', isim: isim.trim(), soyisim: soyisim.trim(), eposta: ep.trim(), olusturma: Date.now() }); } catch (e) {}
    } catch (e) {
      const k = e && e.code;
      uyariGoster(k === 'auth/email-already-in-use' ? t('ghEpostaKayitli') : k === 'auth/weak-password' ? t('hataSifreKisa') : k === 'auth/invalid-email' ? t('hataEpostaGecersiz') : k === 'auth/network-request-failed' ? t('ghInternet') : t('ghGenel'));
      return;
    }
    setKatman('anaSayfaKatman', true);
  }

  function girisYap() {
    navigate('/profesyonel', { replace: true });
    setKartGizli(true);
    setKutlamaIcerik({ ik: '🏠', ad: t('anaSayfaKutla'), alt: t('girisBasarili'), renk: 'linear-gradient(135deg,#9b0e44,#e0115f)' });
    setKutlamaGor(true);
    const ic = kutlamaIcRef.current;
    if (ic) serp(ic, 20);
    clearTimeout(kutZamanRef.current);
    setTimeout(() => navigate('/kayit-tamam', { replace: true }), 1500);
  }

  const ureticiListesi = [
    { bg:'linear-gradient(135deg,#546e7a,#546e7acc)', ik:'🏭', ad:'Fabrika / İmalat' },
    { bg:'linear-gradient(135deg,#00796b,#00796bcc)', ik:'📦', ad:'Toptancı' },
    { bg:'linear-gradient(135deg,#5d4037,#5d4037cc)', ik:'🚚', ad:'Tedarikçi / Bayi' },
    { bg:'linear-gradient(135deg,#1565c0,#1565c0cc)', ik:'🌍', ad:'İthalat / İhracat' },
    { bg:'linear-gradient(135deg,#2e7d32,#2e7d32cc)', ik:'🌾', ad:'Üretici / Çiftçi' },
    { bg:'linear-gradient(135deg,#6d4c41,#6d4c41cc)', ik:'🐄', ad:'Hayvancılık / Çiftlik' },
    { bg:'linear-gradient(135deg,#ef6c00,#ef6c00cc)', ik:'🥫', ad:'Gıda Üretimi' },
    { bg:'linear-gradient(135deg,#ad1457,#ad1457cc)', ik:'🧵', ad:'Tekstil / Konfeksiyon' },
    { bg:'linear-gradient(135deg,#455a64,#455a64cc)', ik:'🧱', ad:'İnşaat Malzemesi' },
    { bg:'linear-gradient(135deg,#795548,#795548cc)', ik:'🪵', ad:'Mobilya / Ahşap' },
    { bg:'linear-gradient(135deg,#37474f,#37474fcc)', ik:'⚙️', ad:'Metal / Makine' },
    { bg:'linear-gradient(135deg,#0277bd,#0277bdcc)', ik:'🛢️', ad:'Plastik / Ambalaj' },
    { bg:'linear-gradient(135deg,#8e24aa,#8e24aacc)', ik:'🧪', ad:'Kimya / Kozmetik Üretimi' },
    { bg:'linear-gradient(135deg,#c62828,#c62828cc)', ik:'🚛', ad:'Lojistik / Dağıtım' },
    { bg:'linear-gradient(135deg,#00897b,#00897bcc)', ik:'🤲', ad:'El Sanatları / Atölye' },
    { bg:'linear-gradient(135deg,#6d4c41,#6d4c41cc)', ik:'🍷', ad:'İçecek / Su Üretimi' },
    { bg:'linear-gradient(135deg,#ef6c00,#ef6c00cc)', ik:'🥖', ad:'Un / Fırın Ürünleri' },
    { bg:'linear-gradient(135deg,#558b2f,#558b2fcc)', ik:'🫒', ad:'Zeytin / Yağ Üretimi' },
    { bg:'linear-gradient(135deg,#37474f,#37474fcc)', ik:'🔩', ad:'Hırdavat / Nalbur Toptan' },
    { bg:'linear-gradient(135deg,#1565c0,#1565c0cc)', ik:'⚡', ad:'Elektrik / Elektronik Üretim' },
    { bg:'linear-gradient(135deg,#00838f,#00838fcc)', ik:'💊', ad:'İlaç / Medikal Üretim' },
    { bg:'linear-gradient(135deg,#b71c1c,#b71c1ccc)', ik:'🥩', ad:'Et İşleme Fabrikası' },
    { bg:'linear-gradient(135deg,#cfd8dc,#90a4aecc)', ik:'🥛', ad:'Süt / Mandıra Ürünleri' },
    { bg:'linear-gradient(135deg,#d84315,#d84315cc)', ik:'🍅', ad:'Konserve / Salça' },
    { bg:'linear-gradient(135deg,#ec407a,#ec407acc)', ik:'🍬', ad:'Dondurma / Şekerleme' },
    { bg:'linear-gradient(135deg,#6d4c41,#6d4c41cc)', ik:'👞', ad:'Deri / Ayakkabı Üretimi' },
    { bg:'linear-gradient(135deg,#0097a7,#0097a7cc)', ik:'🏺', ad:'Cam / Seramik' },
    { bg:'linear-gradient(135deg,#8d6e63,#8d6e63cc)', ik:'📜', ad:'Kağıt / Karton' },
    { bg:'linear-gradient(135deg,#607d8b,#607d8bcc)', ik:'⛏️', ad:'Maden / Mermer / Doğal Taş' },
    { bg:'linear-gradient(135deg,#558b2f,#558b2fcc)', ik:'🧫', ad:'Gübre / Tarım İlacı' },
    { bg:'linear-gradient(135deg,#f9a825,#f9a825cc)', ik:'🌽', ad:'Yem / Hayvan Besini' },
    { bg:'linear-gradient(135deg,#2e7d32,#2e7d32cc)', ik:'♻️', ad:'Geri Dönüşüm' },
    { bg:'linear-gradient(135deg,#fbc02d,#fbc02dcc)', ik:'🔋', ad:'Enerji / Yenilenebilir' },
  ];

  const meslekListesi = [
    { bg:'linear-gradient(135deg,#e0115f,#e0115fcc)', ik:'💄', ad:'Makyaj Sanatçısı' },
    { bg:'linear-gradient(135deg,#d6336c,#d6336ccc)', ik:'✂️', ad:'Kuaför' },
    { bg:'linear-gradient(135deg,#7a4a2a,#7a4a2acc)', ik:'💈', ad:'Berber' },
    { bg:'linear-gradient(135deg,#ff8fb5,#ff8fb5cc)', ik:'🫧', ad:'Cilt Bakımı' },
    { bg:'linear-gradient(135deg,#e84393,#e84393cc)', ik:'💅', ad:'Tırnak Sanatçısı' },
    { bg:'linear-gradient(135deg,#6c3483,#6c3483cc)', ik:'👁️', ad:'Kaş / Kirpik' },
    { bg:'linear-gradient(135deg,#16a085,#16a085cc)', ik:'💆', ad:'Masaj Terapisti' },
    { bg:'linear-gradient(135deg,#2c3e50,#2c3e50cc)', ik:'🎨', ad:'Dövme Sanatçısı' },
    { bg:'linear-gradient(135deg,#34495e,#34495ecc)', ik:'📷', ad:'Fotoğrafçı' },
    { bg:'linear-gradient(135deg,#2c2c54,#2c2c54cc)', ik:'🎥', ad:'Kameraman' },
    { bg:'linear-gradient(135deg,#8e44ad,#8e44adcc)', ik:'🎤', ad:'Müzisyen' },
    { bg:'linear-gradient(135deg,#9b59b6,#9b59b6cc)', ik:'🎧', ad:'DJ' },
    { bg:'linear-gradient(135deg,#e056fd,#e056fdcc)', ik:'💃', ad:'Dansçı' },
    { bg:'linear-gradient(135deg,#e67e22,#e67e22cc)', ik:'🎨', ad:'Tasarımcı' },
    { bg:'linear-gradient(135deg,#a0522d,#a0522dcc)', ik:'🛋️', ad:'İç Mimar' },
    { bg:'linear-gradient(135deg,#c0392b,#c0392bcc)', ik:'🧵', ad:'Terzi / Moda' },
    { bg:'linear-gradient(135deg,#3498db,#3498dbcc)', ik:'🩺', ad:'Doktor' },
    { bg:'linear-gradient(135deg,#5dade2,#5dade2cc)', ik:'🦷', ad:'Diş Hekimi' },
    { bg:'linear-gradient(135deg,#48c9b0,#48c9b0cc)', ik:'🧠', ad:'Psikolog' },
    { bg:'linear-gradient(135deg,#52be80,#52be80cc)', ik:'🥗', ad:'Diyetisyen' },
    { bg:'linear-gradient(135deg,#45b39d,#45b39dcc)', ik:'🦾', ad:'Fizyoterapist' },
    { bg:'linear-gradient(135deg,#34495e,#34495ecc)', ik:'⚖️', ad:'Avukat' },
    { bg:'linear-gradient(135deg,#b7950b,#b7950bcc)', ik:'💰', ad:'Mali Müşavir' },
    { bg:'linear-gradient(135deg,#566573,#566573cc)', ik:'🔧', ad:'Mühendis' },
    { bg:'linear-gradient(135deg,#7f8c8d,#7f8c8dcc)', ik:'📐', ad:'Mimar' },
    { bg:'linear-gradient(135deg,#2980b9,#2980b9cc)', ik:'📚', ad:'Öğretmen' },
    { bg:'linear-gradient(135deg,#16a085,#16a085cc)', ik:'🗣️', ad:'Tercüman' },
    { bg:'linear-gradient(135deg,#2c3e50,#2c3e50cc)', ik:'💻', ad:'Yazılımcı' },
    { bg:'linear-gradient(135deg,#e74c3c,#e74c3ccc)', ik:'🍽️', ad:'Restoran / Cafe' },
    { bg:'linear-gradient(135deg,#f78fb3,#f78fb3cc)', ik:'🎂', ad:'Pastane' },
    { bg:'linear-gradient(135deg,#e84393,#e84393cc)', ik:'💐', ad:'Çiçekçi' },
    { bg:'linear-gradient(135deg,#e056fd,#e056fdcc)', ik:'🎉', ad:'Organizasyon' },
    { bg:'linear-gradient(135deg,#27ae60,#27ae60cc)', ik:'🏠', ad:'Emlakçı' },
    { bg:'linear-gradient(135deg,#7f8c8d,#7f8c8dcc)', ik:'🔧', ad:'Oto Tamir' },
    { bg:'linear-gradient(135deg,#f39c12,#f39c12cc)', ik:'⚡', ad:'Elektrikçi' },
    { bg:'linear-gradient(135deg,#2980b9,#2980b9cc)', ik:'🚿', ad:'Tesisatçı' },
    { bg:'linear-gradient(135deg,#1abc9c,#1abc9ccc)', ik:'🧹', ad:'Temizlik' },
    { bg:'linear-gradient(135deg,#d35400,#d35400cc)', ik:'🚚', ad:'Nakliyat' },
    { bg:'linear-gradient(135deg,#2980b9,#2980b9cc)', ik:'✏️', ad:'Özel Ders' },
    { bg:'linear-gradient(135deg,#c0392b,#c0392bcc)', ik:'🏋️', ad:'Spor Eğitmeni' },
    { bg:'linear-gradient(135deg,#9b59b6,#9b59b6cc)', ik:'🧘', ad:'Yoga / Pilates' },
    { bg:'linear-gradient(135deg,#f8a5c2,#f8a5c2cc)', ik:'👶', ad:'Bakıcı / Dadı' },
    { bg:'linear-gradient(135deg,#16a085,#16a085cc)', ik:'🐾', ad:'Veteriner' },
    { bg:'linear-gradient(135deg,#e67e22,#e67e22cc)', ik:'🛵', ad:'Kurye' },
    { bg:'linear-gradient(135deg,#8e44ad,#8e44adcc)', ik:'🏛️', ad:'Galerici' },
    { bg:'linear-gradient(135deg,#27ae60,#27ae60cc)', ik:'🛒', ad:'Marketçi / Bakkal' },
    { bg:'linear-gradient(135deg,#c0392b,#c0392bcc)', ik:'🚘', ad:'Oto Galerici' },
    { bg:'linear-gradient(135deg,#a93226,#a93226cc)', ik:'🥩', ad:'Kasap Dükkanı' },
    { bg:'linear-gradient(135deg,#d4a017,#d4a017cc)', ik:'🍞', ad:'Fırın / Ekmek' },
    { bg:'linear-gradient(135deg,#16a085,#16a085cc)', ik:'💊', ad:'Eczacı' },
    { bg:'linear-gradient(135deg,#2980b9,#2980b9cc)', ik:'👓', ad:'Optisyen' },
    { bg:'linear-gradient(135deg,#b7950b,#b7950bcc)', ik:'👑', ad:'Kuyumcu' },
    { bg:'linear-gradient(135deg,#e67e22,#e67e22cc)', ik:'📝', ad:'Kırtasiyeci' },
    { bg:'linear-gradient(135deg,#34495e,#34495ecc)', ik:'📱', ad:'Teknik Servis' },
    { bg:'linear-gradient(135deg,#2980b9,#2980b9cc)', ik:'⛺', ad:'Otelci / Pansiyon' },
    { bg:'linear-gradient(135deg,#7a4a2a,#7a4a2acc)', ik:'☕', ad:'Kafeci / Barista' },
    { bg:'linear-gradient(135deg,#c0392b,#c0392bcc)', ik:'🍸', ad:'Barmen' },
    { bg:'linear-gradient(135deg,#566573,#566573cc)', ik:'🖨️', ad:'Matbaacı' },
    { bg:'linear-gradient(135deg,#7f8c8d,#7f8c8dcc)', ik:'⌚', ad:'Saat Tamircisi' },
    { bg:'linear-gradient(135deg,#8b4513,#8b4513cc)', ik:'👞', ad:'Ayakkabıcı' },
    { bg:'linear-gradient(135deg,#a0522d,#a0522dcc)', ik:'🪑', ad:'Mobilyacı' },
    { bg:'linear-gradient(135deg,#27ae60,#27ae60cc)', ik:'🌱', ad:'Peyzaj / Bahçe' },
    { bg:'linear-gradient(135deg,#2980b9,#2980b9cc)', ik:'✈️', ad:'Seyahat / Tur' },
    { bg:'linear-gradient(135deg,#34495e,#34495ecc)', ik:'🛡️', ad:'Sigortacı' },
    { bg:'linear-gradient(135deg,#e056fd,#e056fdcc)', ik:'🎨', ad:'Sanatçı / Ressam' },
    { bg:'linear-gradient(135deg,#1e3a5f,#1e3a5fcc)', ik:'🏦', ad:'Bankacı / Banka' },
    { bg:'linear-gradient(135deg,#2e7d32,#2e7d32cc)', ik:'💱', ad:'Dövizci' },
    { bg:'linear-gradient(135deg,#37474f,#37474fcc)', ik:'📰', ad:'Gazete / Medya' },
    { bg:'linear-gradient(135deg,#c62828,#c62828cc)', ik:'⛽', ad:'Benzin İstasyonu' },
    { bg:'linear-gradient(135deg,#0277bd,#0277bdcc)', ik:'🚿', ad:'Oto Yıkama' },
    { bg:'linear-gradient(135deg,#455a64,#455a64cc)', ik:'🛞', ad:'Lastikçi' },
    { bg:'linear-gradient(135deg,#5d4037,#5d4037cc)', ik:'🚙', ad:'Araç Kiralama' },
    { bg:'linear-gradient(135deg,#ad1457,#ad1457cc)', ik:'👗', ad:'Giyim Mağazası' },
    { bg:'linear-gradient(135deg,#283593,#283593cc)', ik:'📺', ad:'Elektronik / Beyaz Eşya' },
    { bg:'linear-gradient(135deg,#0288d1,#0288d1cc)', ik:'📱', ad:'Telefon / GSM Bayi' },
    { bg:'linear-gradient(135deg,#455a64,#455a64cc)', ik:'🖥️', ad:'Bilgisayarcı' },
    { bg:'linear-gradient(135deg,#6d4c41,#6d4c41cc)', ik:'🔩', ad:'Nalbur / Hırdavat' },
    { bg:'linear-gradient(135deg,#f06292,#f06292cc)', ik:'🧸', ad:'Oyuncakçı' },
    { bg:'linear-gradient(135deg,#8d6e63,#8d6e63cc)', ik:'🐶', ad:'Pet Shop / Evcil Hayvan' },
    { bg:'linear-gradient(135deg,#ab47bc,#ab47bccc)', ik:'🧴', ad:'Parfümeri / Kozmetik' },
    { bg:'linear-gradient(135deg,#43a047,#43a047cc)', ik:'🍎', ad:'Manav' },
    { bg:'linear-gradient(135deg,#fbc02d,#fbc02dcc)', ik:'🧀', ad:'Şarküteri' },
    { bg:'linear-gradient(135deg,#0097a7,#0097a7cc)', ik:'🐟', ad:'Balıkçı' },
    { bg:'linear-gradient(135deg,#8d6e63,#8d6e63cc)', ik:'🥜', ad:'Kuruyemişçi' },
    { bg:'linear-gradient(135deg,#039be5,#039be5cc)', ik:'💧', ad:'Su / İçecek Bayi' },
    { bg:'linear-gradient(135deg,#ec407a,#ec407acc)', ik:'🍦', ad:'Tatlıcı / Dondurma' },
    { bg:'linear-gradient(135deg,#e64a19,#e64a19cc)', ik:'🥙', ad:'Döner / Fast Food' },
    { bg:'linear-gradient(135deg,#607d8b,#607d8bcc)', ik:'🔑', ad:'Çilingir / Anahtarcı' },
    { bg:'linear-gradient(135deg,#0288d1,#0288d1cc)', ik:'🪟', ad:'Cam / Ayna' },
    { bg:'linear-gradient(135deg,#00acc1,#00acc1cc)', ik:'❄️', ad:'Klima / Soğutma' },
    { bg:'linear-gradient(135deg,#5c6bc0,#5c6bc0cc)', ik:'🧼', ad:'Halı Yıkama' },
    { bg:'linear-gradient(135deg,#546e7a,#546e7acc)', ik:'👔', ad:'Kuru Temizleme' },
    { bg:'linear-gradient(135deg,#455a64,#455a64cc)', ik:'📜', ad:'Noter' },
    { bg:'linear-gradient(135deg,#5d4037,#5d4037cc)', ik:'💼', ad:'Danışmanlık' },
    { bg:'linear-gradient(135deg,#d81b60,#d81b60cc)', ik:'📣', ad:'Reklam / Ajans' },
    { bg:'linear-gradient(135deg,#1565c0,#1565c0cc)', ik:'🌐', ad:'Web / Dijital' },
    { bg:'linear-gradient(135deg,#f57f17,#f57f17cc)', ik:'🚦', ad:'Sürücü Kursu' },
    { bg:'linear-gradient(135deg,#26a69a,#26a69acc)', ik:'🧒', ad:'Kreş / Anaokulu' },
    { bg:'linear-gradient(135deg,#7e57c2,#7e57c2cc)', ik:'🎼', ad:'Müzik Kursu' },
    { bg:'linear-gradient(135deg,#c0392b,#c0392bcc)', ik:'🏋️', ad:'Spor Salonu / Fitness' },
    { bg:'linear-gradient(135deg,#ad1457,#ad1457cc)', ik:'💒', ad:'Düğün Salonu' },
    { bg:'linear-gradient(135deg,#ef6c00,#ef6c00cc)', ik:'🏗️', ad:'İnşaat Firması' },
    { bg:'linear-gradient(135deg,#6a1b9a,#6a1b9acc)', ik:'🚪', ad:'PVC / Doğrama' },
    { bg:'linear-gradient(135deg,#00838f,#00838fcc)', ik:'🏥', ad:'Klinik / Poliklinik' },
    { bg:'linear-gradient(135deg,#3949ab,#3949abcc)', ik:'📹', ad:'Güvenlik / Kamera Sistemleri' },
  ];

  const ilgiListesi = [
    { bg:'linear-gradient(135deg,#e74c3c,#e74c3ccc)', ik:'🧑‍🍳', ad:'Garson' },
    { bg:'linear-gradient(135deg,#27ae60,#27ae60cc)', ik:'💳', ad:'Kasiyer' },
    { bg:'linear-gradient(135deg,#d35400,#d35400cc)', ik:'🍳', ad:'Aşçı / Mutfak' },
    { bg:'linear-gradient(135deg,#7f8c8d,#7f8c8dcc)', ik:'🍽️', ad:'Komi / Bulaşık' },
    { bg:'linear-gradient(135deg,#16a085,#16a085cc)', ik:'🧹', ad:'Temizlik Görevlisi' },
    { bg:'linear-gradient(135deg,#2980b9,#2980b9cc)', ik:'🚗', ad:'Şoför' },
    { bg:'linear-gradient(135deg,#e67e22,#e67e22cc)', ik:'🛵', ad:'Kurye / Motokurye' },
    { bg:'linear-gradient(135deg,#8e44ad,#8e44adcc)', ik:'🛍️', ad:'Tezgâhtar' },
    { bg:'linear-gradient(135deg,#a0522d,#a0522dcc)', ik:'📦', ad:'Depo / Ambar' },
    { bg:'linear-gradient(135deg,#34495e,#34495ecc)', ik:'👮', ad:'Güvenlik' },
    { bg:'linear-gradient(135deg,#e67e22,#e67e22cc)', ik:'👷', ad:'İnşaat İşçisi' },
    { bg:'linear-gradient(135deg,#c0392b,#c0392bcc)', ik:'🎨', ad:'Boyacı / Badana' },
    { bg:'linear-gradient(135deg,#7a4a2a,#7a4a2acc)', ik:'🔧', ad:'Kalfa / Çırak' },
    { bg:'linear-gradient(135deg,#f8a5c2,#f8a5c2cc)', ik:'👵', ad:'Bakıcı / Yaşlı Bakım' },
    { bg:'linear-gradient(135deg,#f78fb3,#f78fb3cc)', ik:'👶', ad:'Çocuk Bakıcı' },
    { bg:'linear-gradient(135deg,#27ae60,#27ae60cc)', ik:'🌱', ad:'Bahçıvan' },
    { bg:'linear-gradient(135deg,#566573,#566573cc)', ik:'🏭', ad:'İşçi / Fabrika' },
    { bg:'linear-gradient(135deg,#d4a017,#d4a017cc)', ik:'📦', ad:'Paketleme' },
    { bg:'linear-gradient(135deg,#e74c3c,#e74c3ccc)', ik:'🍽️', ad:'Servis Elemanı' },
    { bg:'linear-gradient(135deg,#7a4a2a,#7a4a2acc)', ik:'☕', ad:'Barista' },
    { bg:'linear-gradient(135deg,#27ae60,#27ae60cc)', ik:'🍎', ad:'Manav' },
    { bg:'linear-gradient(135deg,#d4a017,#d4a017cc)', ik:'🍞', ad:'Fırın Elemanı' },
    { bg:'linear-gradient(135deg,#7a4a2a,#7a4a2acc)', ik:'💈', ad:'Berber Kalfası' },
    { bg:'linear-gradient(135deg,#d6336c,#d6336ccc)', ik:'✂️', ad:'Kuaför Kalfası' },
    { bg:'linear-gradient(135deg,#c0392b,#c0392bcc)', ik:'🧵', ad:'Terzi Elemanı' },
    { bg:'linear-gradient(135deg,#7f8c8d,#7f8c8dcc)', ik:'🔩', ad:'Tamirci Yardımcısı' },
    { bg:'linear-gradient(135deg,#2980b9,#2980b9cc)', ik:'🪟', ad:'Cam / Boya' },
    { bg:'linear-gradient(135deg,#8b4513,#8b4513cc)', ik:'💪', ad:'Hamal / Taşıyıcı' },
    { bg:'linear-gradient(135deg,#34495e,#34495ecc)', ik:'🚙', ad:'Vale / Otopark' },
    { bg:'linear-gradient(135deg,#566573,#566573cc)', ik:'🏢', ad:'Kapıcı' },
    { bg:'linear-gradient(135deg,#9b59b6,#9b59b6cc)', ik:'📞', ad:'Çağrı Merkezi' },
    { bg:'linear-gradient(135deg,#2c3e50,#2c3e50cc)', ik:'⌨️', ad:'Veri Girişi' },
    { bg:'linear-gradient(135deg,#3498db,#3498dbcc)', ik:'🎓', ad:'Stajyer' },
    { bg:'linear-gradient(135deg,#48c9b0,#48c9b0cc)', ik:'🩺', ad:'Hemşire Yardımcısı' },
    { bg:'linear-gradient(135deg,#16a085,#16a085cc)', ik:'🧪', ad:'Laborant' },
    { bg:'linear-gradient(135deg,#e84393,#e84393cc)', ik:'🛍️', ad:'Satış Elemanı' },
    { bg:'linear-gradient(135deg,#27ae60,#27ae60cc)', ik:'🛒', ad:'Reyon Görevlisi' },
    { bg:'linear-gradient(135deg,#34495e,#34495ecc)', ik:'🔦', ad:'Bekçi' },
    { bg:'linear-gradient(135deg,#d4a017,#d4a017cc)', ik:'🍵', ad:'Çay Ocağı' },
    { bg:'linear-gradient(135deg,#48c9b0,#48c9b0cc)', ik:'🩺', ad:'Hemşire' },
    { bg:'linear-gradient(135deg,#16a085,#16a085cc)', ik:'🚑', ad:'Sağlık Personeli' },
    { bg:'linear-gradient(135deg,#e74c3c,#e74c3ccc)', ik:'🍽️', ad:'Garson Yardımcısı' },
    { bg:'linear-gradient(135deg,#2980b9,#2980b9cc)', ik:'🚌', ad:'Otobüs / TIR Şoförü' },
    { bg:'linear-gradient(135deg,#8e44ad,#8e44adcc)', ik:'🧵', ad:'Tekstil İşçisi' },
    { bg:'linear-gradient(135deg,#566573,#566573cc)', ik:'⚙️', ad:'Makine Operatörü' },
    { bg:'linear-gradient(135deg,#e67e22,#e67e22cc)', ik:'🔌', ad:'Elektrik Yardımcısı' },
    { bg:'linear-gradient(135deg,#2980b9,#2980b9cc)', ik:'🔧', ad:'Tesisat Yardımcısı' },
    { bg:'linear-gradient(135deg,#27ae60,#27ae60cc)', ik:'🌾', ad:'Tarım İşçisi' },
    { bg:'linear-gradient(135deg,#7f8c8d,#7f8c8dcc)', ik:'🏗️', ad:'Usta Yardımcısı' },
    { bg:'linear-gradient(135deg,#9b59b6,#9b59b6cc)', ik:'💇', ad:'Salon Çalışanı' },
    { bg:'linear-gradient(135deg,#e84393,#e84393cc)', ik:'🛍️', ad:'Mağaza Çalışanı' },
    { bg:'linear-gradient(135deg,#34495e,#34495ecc)', ik:'📋', ad:'Ofis Elemanı' },
    { bg:'linear-gradient(135deg,#d35400,#d35400cc)', ik:'🍕', ad:'Mutfak Yardımcısı' },
    { bg:'linear-gradient(135deg,#16a085,#16a085cc)', ik:'🧖', ad:'Spa / Hamam Çalışanı' },
    { bg:'linear-gradient(135deg,#37474f,#37474fcc)', ik:'🔥', ad:'Kaynakçı' },
    { bg:'linear-gradient(135deg,#795548,#795548cc)', ik:'🪚', ad:'Marangoz' },
    { bg:'linear-gradient(135deg,#455a64,#455a64cc)', ik:'🧱', ad:'Sıvacı / Fayansçı' },
    { bg:'linear-gradient(135deg,#ef6c00,#ef6c00cc)', ik:'🚜', ad:'Forklift Operatörü' },
    { bg:'linear-gradient(135deg,#3498db,#3498dbcc)', ik:'🛎️', ad:'Resepsiyon / Sekreter' },
    { bg:'linear-gradient(135deg,#b7950b,#b7950bcc)', ik:'🧾', ad:'Muhasebe Elemanı' },
    { bg:'linear-gradient(135deg,#e84393,#e84393cc)', ik:'📣', ad:'Pazarlama Elemanı' },
    { bg:'linear-gradient(135deg,#34495e,#34495ecc)', ik:'👔', ad:'Ütücü / Kuru Temizleme' },
    { bg:'linear-gradient(135deg,#f8a5c2,#f8a5c2cc)', ik:'🏠', ad:'Ev İşleri / Yardımcı' },
    { bg:'linear-gradient(135deg,#9b59b6,#9b59b6cc)', ik:'🎙️', ad:'Animatör / Sunucu' },
  ];

  const sv = sadeles(meslekFiltre);
  const filtrelenmisM = meslekListesi.filter(m => sadeles(m.ad + m.ik).indexOf(sv) > -1 || !meslekFiltre);
  const sv2 = sadeles(ilgiFiltre2);
  const filtrelenmisI = ilgiListesi.filter(m => sadeles(m.ad + m.ik).indexOf(sv2) > -1 || !ilgiFiltre2);
  const sv3 = sadeles(ureticiFiltre);
  const filtrelenmisU = ureticiListesi.filter(m => sadeles(m.ad + m.ik).indexOf(sv3) > -1 || !ureticiFiltre);

  return (
    <div className="pf-sayfa">
      <SurumRozeti />

      {/* BALON */}
      <div className={'balon' + (balonGor ? ' gor' : '')} style={{ left: balonPos.left, top: balonPos.top }}>{balonYazi}</div>

      {/* KUTLAMA */}
      <div className={'meslek-kutlama' + (kutlamaGor ? ' gor' : '')}>
        <div ref={kutlamaIcRef} className="mkut-ic" style={{ background: kutlamaIcerik.renk }}>
          <span className="mkut-ik">{kutlamaIcerik.ik}</span>
          <span className="mkut-ad">{kutlamaIcerik.ad}</span>
          <span className="mkut-alt">{kutlamaIcerik.alt}</span>
        </div>
      </div>

      {/* ANA KART */}
      {!kartGizli && (
        <div className="kart" id="anaKart" ref={anaKartRef}>
          <div className="ic">
            <div className="ust">
              <span className="pir-sol">
                <svg viewBox="0 0 120 120" style={{width:'44px',height:'44px'}}>
                  <defs>
                    <radialGradient id="kyv" cx="50%" cy="42%" r="62%"><stop offset="0" stopColor="#2a1018"/><stop offset="60%" stopColor="#12090d"/><stop offset="100%" stopColor="#050303"/></radialGradient>
                    <radialGradient id="kbt" cx="50%" cy="40%" r="62%"><stop offset="0" stopColor="#ffd9e6"/><stop offset="40%" stopColor="#ff5d97"/><stop offset="75%" stopColor="#e0115f"/><stop offset="100%" stopColor="#9b0e44"/></radialGradient>
                    <radialGradient id="kbm" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="rgba(255,220,235,.98)"/><stop offset="100%" stopColor="rgba(224,17,95,0)"/></radialGradient>
                  </defs>
                  <ellipse cx="60" cy="60" rx="50" ry="50" fill="url(#kyv)" stroke="#C9A227" strokeWidth="2.5"/>
                  <ellipse cx="60" cy="60" rx="41" ry="41" fill="#0a0305" stroke="rgba(201,162,39,.3)" strokeWidth="1.2"/>
                  <circle cx="60" cy="60" r="32" fill="url(#kbt)"/>
                  <polygon points="60,60 40,46 60,38" fill="#ffd9e6" opacity=".6"/><polygon points="60,60 60,38 80,46" fill="#ffc2d8" opacity=".5"/>
                  <polygon points="60,60 80,46 86,64" fill="#ff8fb5" opacity=".45"/><polygon points="60,60 86,64 74,82" fill="#e0115f" opacity=".5"/>
                  <polygon points="60,60 74,82 46,82" fill="#b50d4e" opacity=".5"/><polygon points="60,60 46,82 34,64" fill="#c70f54" opacity=".5"/>
                  <polygon points="60,60 34,64 40,46" fill="#ff8fb5" opacity=".45"/>
                  <circle cx="60" cy="58" r="14" fill="url(#kbm)"/>
                  <circle cx="60" cy="29" r="5.5" fill="#FFE9A8" stroke="#8a6010" strokeWidth="1.2"/><circle cx="89" cy="48" r="5.5" fill="#FFD700" stroke="#8a6010" strokeWidth="1.2"/><circle cx="31" cy="48" r="5.5" fill="#FFD700" stroke="#8a6010" strokeWidth="1.2"/>
                </svg>
              </span>
              <span className="logo">GLAMWORLD</span>
            </div>
            <div className="h2">{t('proOlBaslik')}</div>
            <div className="slogan">{t('proSlogan')}</div>
            <div className="ayrac"></div>

            {/* İSİM / SOYİSİM */}
            <div className="satir">
              <div className="alan">
                <label>{t('isim')}</label>
                <input type="text" placeholder={t('isimPh')} value={isim}
                  className={hatalar.isim ? 'hatali' : ''}
                  onChange={e => { setIsim(e.target.value); setHatalar(h => ({...h, isim: ''})); }} />
                {hatalar.isim && <span className="alan-hata gor">{hatalar.isim}</span>}
              </div>
              <div className="alan">
                <label>{t('soyisim')}</label>
                <input type="text" placeholder={t('soyisimPh')} value={soyisim}
                  className={hatalar.soyisim ? 'hatali' : ''}
                  onChange={e => { setSoyisim(e.target.value); setHatalar(h => ({...h, soyisim: ''})); }} />
                {hatalar.soyisim && <span className="alan-hata gor">{hatalar.soyisim}</span>}
              </div>
            </div>

            {/* E-POSTA */}
            <label>{t('eposta')}</label>
            <div className="eposta-sar">
              <input type="text" placeholder={t('epostaPh')} value={ep} autoComplete="off"
                className={hatalar.ep ? 'hatali' : ''}
                onChange={e => { setEp(e.target.value); epOner(e.target.value); setHatalar(h => ({...h, ep: ''})); }} />
              {epOneriList.length > 0 && (
                <div className="oneri">
                  {epOneriList.map(o => (
                    <div key={o} onClick={() => { setEp(o); setEpOneriList([]); }}>{o}</div>
                  ))}
                </div>
              )}
            </div>
            {hatalar.ep && <span className="alan-hata gor">{hatalar.ep}</span>}

            {/* ŞİFRE */}
            {!sifreAcik && (
              <div className="sifre-kapali" onClick={() => setSifreAcik(true)}>
                <span>&#128274; {t('sifreBelirle')}</span>
                <span className="ok">&#9662;</span>
              </div>
            )}
            {sifreAcik && (
              <div className="satir">
                <div className="alan">
                  <label>{t('sifre')}</label>
                  <div className="sifre-sar">
                    <input type={sifre1Tip} placeholder={t('sifrePh')} value={sifre1}
                      className={hatalar.sifre1 ? 'hatali' : ''}
                      onChange={e => { setSifre1(e.target.value); setHatalar(h => ({...h, sifre1: ''})); }} />
                    <span className="goz" onClick={() => setSifre1Tip(p => p === 'password' ? 'text' : 'password')}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={sifre1Tip==='text'?'#ff5d97':'#FFD700'} strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                    </span>
                  </div>
                  {hatalar.sifre1 && <span className="alan-hata gor">{hatalar.sifre1}</span>}
                </div>
                <div className="alan">
                  <label>{t('sifreTekrar')}</label>
                  <div className="sifre-sar">
                    <input type={sifre2Tip} placeholder={t('sifreTekrarPh')} value={sifre2}
                      className={hatalar.sifre2 ? 'hatali' : ''}
                      onChange={e => { setSifre2(e.target.value); setHatalar(h => ({...h, sifre2: ''})); }} />
                    <span className="goz" onClick={() => setSifre2Tip(p => p === 'password' ? 'text' : 'password')}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={sifre2Tip==='text'?'#ff5d97':'#FFD700'} strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
                    </span>
                  </div>
                  {hatalar.sifre2 && <span className="alan-hata gor">{hatalar.sifre2}</span>}
                </div>
              </div>
            )}

            {/* TELEFON */}
            <label>{t('telefon')}</label>
            <div className="tel-satir">
              <div className="tel-kod" onClick={() => setKatman('telKatman')}>
                <span>{telKod || '+--'}</span>
              </div>
              <input type="tel" placeholder={t('telefonPh')} value={telNo}
                className={hatalar.tel ? 'hatali' : ''}
                onChange={e => { setTelNo(telAyikla(e.target.value)); setHatalar(h => ({...h, tel: ''})); }} />
            </div>
            {hatalar.tel && <span className="alan-hata gor">{hatalar.tel}</span>}

            {/* CİNSİYET */}
            <label>{t('cinsiyet')}</label>
            <div className="cins-sira">
              <div className={'cins erkek' + (cinsiyet === 'Bay' ? ' secili' : '')}
                onClick={e => { setCinsiyet('Bay'); secB(e.currentTarget, t('bay')); setHatalar(h => ({...h, cinsiyet: ''})); }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={cinsiyet==='Bay'?'#7a0030':'#FFD700'} strokeWidth="2.2"><circle cx="10" cy="14" r="4.5"/><line x1="13.2" y1="10.8" x2="18.5" y2="5.5"/><polyline points="14 5.5 18.5 5.5 18.5 10"/></svg>
                <span className="cins-yazi-alt">{t('bay')}</span>
              </div>
              <div className={'cins kadin' + (cinsiyet === 'Bayan' ? ' secili' : '')}
                onClick={e => { setCinsiyet('Bayan'); secB(e.currentTarget, t('bayan')); }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={cinsiyet==='Bayan'?'#5a0030':'#f0b8d8'} strokeWidth="2.2"><circle cx="12" cy="9" r="4.5"/><line x1="12" y1="13.5" x2="12" y2="20"/><line x1="9.5" y1="17.5" x2="14.5" y2="17.5"/></svg>
                <span className="cins-yazi-alt">{t('bayan')}</span>
              </div>
              <div className={'cins gizli' + (cinsiyet === 'Gizli' ? ' secili' : '')}
                onClick={e => { setCinsiyet('Gizli'); secB(e.currentTarget, t('belirtmekIstemiyorum')); }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={cinsiyet==='Gizli'?'#2a1850':'#c0b8e0'} strokeWidth="2.2"><circle cx="12" cy="12" r="8.5"/><path d="M9.8 9.5 a2.2 2.2 0 1 1 2.6 3.5 v1.2"/><circle cx="12" cy="16.5" r=".55" fill="#c0b8e0"/></svg>
                <span className="cins-yazi-alt">{t('gizli')}</span>
              </div>
            </div>

            {/* KONUM */}
            <label>&#127757; {t('konumLabel')}</label>
            <div className="yer-serit">
              <div className={'secim-btn' + (hatalar.konum ? ' hatali' : '')}
                onClick={() => { setKatman('konumKatman'); setHatalar(h => ({...h, konum: false})); }}>
                <span className={'yazi' + (konumYazi ? '' : ' bos')}>{konumYazi || t('sehirEyalet')}</span>
                <span className="ok">&#9662;</span>
              </div>
              <input type="text" className={'ilce-kutu' + (hatalar.ilce ? ' hatali' : '')} placeholder={t('ilceLabel')} value={ilce}
                onChange={e => { setIlce(e.target.value); setHatalar(h => ({...h, ilce: ''})); }} />
            </div>
            {hatalar.ilce && <span className="alan-hata gor">{hatalar.ilce}</span>}
            <input type="text" className={'mahalle-kutu' + (hatalar.mah ? ' hatali' : '')} placeholder={t('mahalleKoy')} value={mahalle}
              onChange={e => { setMahalle(e.target.value); setHatalar(h => ({...h, mah: ''})); }} />
            {hatalar.mah && <span className="alan-hata gor">{hatalar.mah}</span>}

            <div className="ayrac"></div>
            <span className="etiket">{t('enOnemli')}</span>

            {/* ROL */}
            <label>{t('platformdaRolun')}</label>
            <div className={'rol-sira' + (hatalar.rol ? ' hatali-rol' : '')}>
              <div className={'rol-btn uretici' + (rol === 'uretici' ? ' secili' : '')} onClick={rolUretici}>
                <span className="rol-ik">&#127981;</span>
                <span className="rol-ad">{t('ureticiRol')}</span>
                <span className="rol-aciklama">{t('ureticiAlt')}</span>
              </div>
              <div className={'rol-btn veren' + (rol === 'veren' ? ' secili' : '')} onClick={rolVeren}>
                <span className="rol-ik">&#128081;</span>
                <span className="rol-ad">{t('hizmetVeren')}</span>
                <span className="rol-aciklama">{t('hizmetVerenAlt')}</span>
              </div>
              <div className={'rol-btn alan' + (rol === 'alan' ? ' secili' : '')} onClick={rolAlan}>
                <span className="rol-ik">&#128722;</span>
                <span className="rol-ad">{t('hizmetAlan')}</span>
                <span className="rol-aciklama">{t('hizmetAlanAlt')}</span>
              </div>
            </div>

            {/* KİMLİK */}
            <div className="ayrac"></div>
            <span className="etiket">{t('kimligin')}</span>
            <div className="kimlik" ref={kimlikKartRef}>
              <div className="rol">{kimlikRolYazi}</div>
              <div className="isim" dangerouslySetInnerHTML={{__html: kimlikMeslek}}></div>
              <div className="kimlik-aciklama">{kimlikAciklama}</div>
              <div className="detay">{kimlikKonum}</div>
            </div>

            {/* ÖDEME */}
            <div className="ayrac"></div>
            <span className="etiket">{t('uyelik')}</span>
            <div className="plan">
              {ilkAyUcretsiz && <span className="rozet">{t('ilkAyRozet')}</span>}
              <div className="plan-baslik">{t('planBaslik')}</div>
              <div className="fiyat">10&euro;<span>{t('ayBirim')}</span></div>
              <p className="plan-aciklama">{t('planAcikUcretsiz')}</p>
              <ul className="ozellik">
                <li>{t('ozellik1')}</li>
                <li>{t('ozellik2')}</li>
                <li>{t('ozellik3')}</li>
                <li>{t('ozellik4')}</li>
              </ul>
              {/* Ödeme yöntemi kartları (PayPal/VISA/Mastercard...) ana karttan KALDIRILDI —
                  müşteriyi korkutmasın diye sadece "HEMEN KATIL" sonrası ödeme penceresinde gösterilir (kullanıcı isteği) */}
              {hataAlani && <div id="hataAlani" className="hata-uyari">{hataAlani}</div>}
              <button className="ana-btn" onClick={odemeAc}>{t('hemenKatil')}</button>
              <p className="not">{t('notUcretsiz')}</p>
              <button className="geri-btn" onClick={() => navigate('/uyeol', {replace:true})}>&#8592; {t('geriDon')}</button>
              <div className="alt-not">{t('zatenHesap')} <b onClick={() => navigate('/')}>{t('girisYapLink')}</b></div>
            </div>
          </div>
        </div>
      )}

      {/* ===== KATMANLAR ===== */}

      {/* CİNSİYET KATMANI (calisma durumu) */}
      <div className={'konum-katman' + (katman === 'cinsiyetKatman' ? ' acik' : '')} style={{zIndex:9999}}
        onClick={e => { if (e.target === e.currentTarget) setKatman(''); }}>
        <div className="kk-ic" ref={cinsiyetKkIcRef} onClick={e => e.stopPropagation()}>
          <div className="kk-ust"><span className="kk-baslik">&#128188; {t('calismaDurumun')}</span><button className="kk-kapat" onClick={() => setKatman('')}>&#10005;</button></div>
          <p style={{textAlign:'center',color:'#cbb890',fontStyle:'italic',fontSize:'14px',marginBottom:'16px'}}>{t('ikonaBasDurum')}</p>
          <div className="cins-sira" style={{gap:'14px'}}>
            <div className="cins erkek" onClick={e => cinsiyetSec('Kendi isi')}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M3 9 l9-6 9 6v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/></svg>
              <span className="cins-yazi-alt">{t('kendiIsi')}</span>
            </div>
            <div className="cins kadin" onClick={e => cinsiyetSec('Calisan')}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f0b8d8" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              <span className="cins-yazi-alt">{t('calisan')}</span>
            </div>
            <div className="cins gizli" onClick={e => cinsiyetSec('Belirtmek istemiyorum')}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c0b8e0" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9 a2.5 2.5 0 1 1 3 4 v1.5"/><circle cx="12" cy="17.5" r=".6" fill="#c0b8e0"/></svg>
              <span className="cins-yazi-alt">{t('gizli')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* EP ONAY KATMANI */}
      <div className={'konum-katman' + (katman === 'epOnayKatman' ? ' acik' : '')} style={{zIndex:10001}}
        onClick={e => { if (e.target === e.currentTarget) setKatman(''); }}>
        <div className="kk-ic" ref={epOnayKkIcRef} onClick={e => e.stopPropagation()}>
          <div className="kk-ust"><span className="kk-baslik">&#9993;&#65039; {t('hesabinHazir')}</span></div>
          <p style={{textAlign:'center',color:'#cbb890',fontSize:'14px',lineHeight:'1.5',marginBottom:'14px'}}>{t('epKayitMetin')}</p>
          <div className="ep-onay-kutu"><span style={{color:'#FFD700',fontSize:'16px',fontWeight:'600'}}>{kayitEposta}</span></div>
          <p style={{textAlign:'center',color:'#9ad0a0',fontSize:'12.5px',margin:'12px 0'}}>&#128274; {t('onayGonderildi')}</p>
          <button className="kk-tamam" onClick={epOnayla}>{t('tamamDevam')}</button>
        </div>
      </div>

      {/* ANA SAYFA KATMANI */}
      <div className={'konum-katman' + (katman === 'anaSayfaKatman' ? ' acik' : '')} style={{zIndex:10001}}
        onClick={e => { if (e.target === e.currentTarget) setKatman(''); }}>
        <div className="kk-ic" ref={anaSayfaKkIcRef} onClick={e => e.stopPropagation()}>
          <div className="kk-ust"><span className="kk-baslik">&#127968; GLAMWORLD</span></div>
          <p style={{textAlign:'center',color:'#FFD700',fontFamily:"'Cinzel',serif",fontSize:'18px',marginBottom:'6px'}}>{t('hosgeldinKisa')}</p>
          <p style={{textAlign:'center',color:'#cbb890',fontSize:'14px',lineHeight:'1.5',marginBottom:'18px'}}>{t('anasayfaMetin')}</p>
          <button className="ana-btn" onClick={girisYap}>&#9993;&#65039; {kayitEposta} {t('ileGirisYapSon')}</button>
          <p style={{textAlign:'center',color:'#7a6f50',fontSize:'12px',marginTop:'14px'}}>{t('veyaSecebilirsin')}</p>
          <button className="oturum-yontem" style={{width:'100%',marginTop:'6px'}} onClick={girisYap}><span className="oy-ikon"><b style={{color:'#4285F4'}}>G</b></span> {t('googleIleGiris')}</button>
        </div>
      </div>

      {/* ÖDEME KATMANI */}
      <div className={'konum-katman' + (katman === 'odemeKatman' ? ' acik' : '')} style={{zIndex:10000}}
        onClick={e => { if (e.target === e.currentTarget) setKatman(''); }}>
        <div className="kk-ic" ref={odemeKkIcRef} onClick={e => e.stopPropagation()}>
          <div className="kk-ust"><span className="kk-baslik">&#128179; {t('guvenliOdeme')}</span><button className="kk-kapat" onClick={() => setKatman('')}>&#10005;</button></div>
          <div className="odeme-ozet">
            <span>{t('planBaslik')}</span>
            <span className="odeme-tutar">{ilkAyUcretsiz ? t('ilkAyUcretsizKisa') : '10€ / ay'}</span>
          </div>
          <p className="odeme-alt-bilgi">{t('odemeAltUcretsiz')}</p>
          <div className="odeme-secim">
            <button className={'oturum-yontem' + (odemeYontemAktif === 'kart' && kartNo === '' ? ' aktif' : odemeYontemAktif === 'kart' ? ' aktif' : '')}
              onClick={() => setOdemeYontemAktif('kart')}>
              <span className="oy-ikon"><b style={{fontStyle:'italic',letterSpacing:'.5px',color:'#fff',background:'#1a1f71',padding:'1px 4px',borderRadius:'3px',fontSize:'11px'}}>VISA</b></span>
            </button>
            <button className={'oturum-yontem' + (odemeYontemAktif === 'mastercard' ? ' aktif' : '')}
              onClick={() => setOdemeYontemAktif('kart')}>
              <span className="oy-ikon"><span className="mc-daire-mini"></span></span>Mastercard
            </button>
            <button className={'oturum-yontem' + (odemeYontemAktif === 'paypal' ? ' aktif' : '')}
              onClick={() => setOdemeYontemAktif('paypal')}>
              <span className="oy-ikon"><b style={{fontStyle:'italic',color:'#fff'}}>P</b></span>PayPal
            </button>
            <button className={'oturum-yontem' + (odemeYontemAktif === 'applepay' ? ' aktif' : '')}
              onClick={() => setOdemeYontemAktif('applepay')}>
              <span className="oy-ikon"><svg width="13" height="15" viewBox="0 0 24 28" fill="#fff"><path d="M17 14.5c0-3 2.4-4.4 2.5-4.5-1.4-2-3.5-2.3-4.2-2.3-1.8-.2-3.5 1-4.4 1-.9 0-2.3-1-3.8-1-1.9 0-3.7 1.1-4.7 2.9-2 3.5-.5 8.7 1.4 11.5.9 1.4 2 2.9 3.5 2.9 1.4-.1 1.9-.9 3.6-.9s2.2.9 3.7.9c1.5 0 2.5-1.4 3.4-2.8 1.1-1.6 1.5-3.1 1.5-3.2-.1 0-2.9-1.1-3-4.4zM14.2 5.8c.8-1 1.3-2.3 1.2-3.7-1.1.1-2.5.8-3.3 1.7-.7.8-1.4 2.2-1.2 3.5 1.3.1 2.5-.6 3.3-1.5z"/></svg></span>Apple&#8202;Pay
            </button>
            <button className={'oturum-yontem' + (odemeYontemAktif === 'googlepay' ? ' aktif' : '')}
              onClick={() => setOdemeYontemAktif('googlepay')}>
              <span className="oy-ikon"><b><span style={{color:'#4285F4'}}>G</span></b></span>G&#8202;Pay
            </button>
          </div>
          {(odemeYontemAktif === 'kart' || odemeYontemAktif === 'mastercard') && (
            <div>
              <div className="kk-alan"><label>{t('kartUstIsim')}</label><input type="text" placeholder={t('adSoyadPh')} value={kartIsim} className={kartHatalar.kartIsim?'hatali':''} onChange={e=>{setKartIsim(e.target.value);setKartHatalar(h=>({...h,kartIsim:''}));}}/>{kartHatalar.kartIsim&&<span className="alan-hata gor">{kartHatalar.kartIsim}</span>}</div>
              <div className="kk-alan"><label>{t('kartNumarasi')}</label><input type="text" placeholder="0000 0000 0000 0000" inputMode="numeric" maxLength="19" value={kartNo} className={kartHatalar.kartNo?'hatali':''} onChange={e=>{setKartNo(kartNoFormat(e.target.value));setKartHatalar(h=>({...h,kartNo:''}));}}/>{kartHatalar.kartNo&&<span className="alan-hata gor">{kartHatalar.kartNo}</span>}</div>
              <div className="kart-satir">
                <div className="kk-alan"><label>{t('sonKullanma')}</label><input type="text" placeholder="AA/YY" maxLength="5" inputMode="numeric" value={kartTarih} className={kartHatalar.kartTarih?'hatali':''} onChange={e=>{setKartTarih(kartTarihFormat(e.target.value));setKartHatalar(h=>({...h,kartTarih:''}));}}/>{kartHatalar.kartTarih&&<span className="alan-hata gor">{kartHatalar.kartTarih}</span>}</div>
                <div className="kk-alan"><label>CVV</label><input type="text" placeholder="123" inputMode="numeric" maxLength="4" value={kartCvv} className={kartHatalar.kartCvv?'hatali':''} onChange={e=>{setKartCvv(e.target.value.replace(/[^0-9]/g,''));setKartHatalar(h=>({...h,kartCvv:''}));}}/>{kartHatalar.kartCvv&&<span className="alan-hata gor">{kartHatalar.kartCvv}</span>}</div>
              </div>
            </div>
          )}
          {odemeYontemAktif === 'paypal' && (
            <div style={{textAlign:'center',padding:'20px'}}>
              <p style={{color:'#cbb890',marginBottom:'14px'}}>{t('paypalMetin')}</p>
              <button className="kk-tamam" style={{background:'linear-gradient(135deg,#003087,#009cde)'}} onClick={() => odemeAltSistem('PayPal')}>{t('paypalIleOde')}</button>
            </div>
          )}
          {odemeYontemAktif === 'applepay' && (
            <div style={{textAlign:'center',padding:'20px'}}>
              <p style={{color:'#cbb890',marginBottom:'14px'}}>{t('applePayMetin')}</p>
              <button className="kk-tamam" style={{background:'#000'}} onClick={() => odemeAltSistem('Apple Pay')}><svg width="13" height="15" viewBox="0 0 24 28" fill="#fff" style={{verticalAlign:'-2px',marginRight:'5px'}}><path d="M17 14.5c0-3 2.4-4.4 2.5-4.5-1.4-2-3.5-2.3-4.2-2.3-1.8-.2-3.5 1-4.4 1-.9 0-2.3-1-3.8-1-1.9 0-3.7 1.1-4.7 2.9-2 3.5-.5 8.7 1.4 11.5.9 1.4 2 2.9 3.5 2.9 1.4-.1 1.9-.9 3.6-.9s2.2.9 3.7.9c1.5 0 2.5-1.4 3.4-2.8 1.1-1.6 1.5-3.1 1.5-3.2-.1 0-2.9-1.1-3-4.4zM14.2 5.8c.8-1 1.3-2.3 1.2-3.7-1.1.1-2.5.8-3.3 1.7-.7.8-1.4 2.2-1.2 3.5 1.3.1 2.5-.6 3.3-1.5z"/></svg> Pay ile Ode</button>
            </div>
          )}
          {odemeYontemAktif === 'googlepay' && (
            <div style={{textAlign:'center',padding:'20px'}}>
              <p style={{color:'#cbb890',marginBottom:'14px'}}>{t('googlePayMetin')}</p>
              <button className="kk-tamam" style={{background:'#fff',color:'#3c4043'}} onClick={() => odemeAltSistem('Google Pay')}><b><span style={{color:'#4285F4'}}>G</span><span style={{color:'#EA4335'}}>o</span><span style={{color:'#FBBC04'}}>o</span><span style={{color:'#4285F4'}}>g</span><span style={{color:'#34A853'}}>l</span><span style={{color:'#EA4335'}}>e</span></b> Pay ile Ode</button>
            </div>
          )}
          <div className="odeme-guven">&#128274; {t('odemeGuven')}</div>
          {(odemeYontemAktif === 'kart' || odemeYontemAktif === 'mastercard') && (
            <button className="kk-tamam" onClick={odemeTamamla}>&#128274; {t('guvenliKayitOl')}</button>
          )}
        </div>
      </div>

      {/* DENEYİM KATMANI */}
      <div className={'konum-katman' + (katman === 'deneyimKatman' ? ' acik' : '')} style={{zIndex:9999}}
        onClick={e => { if (e.target === e.currentTarget) setKatman(''); }}>
        <div className="kk-ic" ref={deneyimKkIcRef} onClick={e => e.stopPropagation()}>
          <div className="kk-ust"><span className="kk-baslik">&#11088; {t('tecruben')}</span><button className="kk-kapat" onClick={() => setKatman('')}>&#10005;</button></div>
          <p style={{textAlign:'center',color:'#cbb890',fontStyle:'italic',fontSize:'14px',marginBottom:'16px'}}>{t('ikonaBasDurum')}</p>
          <div className="cins-sira" style={{gap:'14px'}}>
            <div className="cins erkek" onClick={() => deneyimSec('Deneyimli')}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFD700" strokeWidth="2"><path d="M12 2 l2.4 7.4H22l-6 4.5 2.3 7.1L12 16.5 5.7 21l2.3-7.1-6-4.5h7.6z"/></svg>
              <span className="cins-yazi-alt">{t('deneyimli')}</span>
            </div>
            <div className="cins kadin" onClick={() => deneyimSec('Yeni baslayan')}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f0b8d8" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>
              <span className="cins-yazi-alt">{t('yeni')}</span>
            </div>
            <div className="cins gizli" onClick={() => deneyimSec('Belirtmek istemiyorum')}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c0b8e0" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M9.5 9 a2.5 2.5 0 1 1 3 4 v1.5"/><circle cx="12" cy="17.5" r=".6" fill="#c0b8e0"/></svg>
              <span className="cins-yazi-alt">{t('gizli')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* İLGİ KATMANI */}
      <div className={'konum-katman' + (katman === 'ilgiKatman' ? ' acik' : '')}
        onClick={e => { if (e.target === e.currentTarget) setKatman(''); }}>
        <div className="kk-ic" ref={ilgiKkIcRef} onClick={e => e.stopPropagation()}>
          <div className="kk-ust"><span className="kk-baslik">&#128119; {t('ilgiBaslik')}</span><button className="kk-kapat" onClick={() => setKatman('')}>&#10005;</button></div>
          <input type="text" className="tel-ara" placeholder={t('ilgiAraPh')} value={ilgiFiltre2} onChange={e => setIlgiFiltre2(e.target.value)} />
          <div className="meslek-grid" style={{marginTop:'12px'}}>
            {filtrelenmisI.map((m, i) => (
              <span key={i} className="meslek" style={{background: m.bg}}
                onClick={() => ilgiSec(m)}>
                <span className="mik">{m.ik}</span>{mc(m.ad, i18n.language)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ÜRETİCİ / TEDARİKÇİ KATMANI */}
      <div className={'konum-katman' + (katman === 'ureticiKatman' ? ' acik' : '')}
        onClick={e => { if (e.target === e.currentTarget) setKatman(''); }}>
        <div className="kk-ic" ref={ureticiKkIcRef} onClick={e => e.stopPropagation()}>
          <div className="kk-ust"><span className="kk-baslik">&#127981; {t('ureticiBaslik')}</span><button className="kk-kapat" onClick={() => setKatman('')}>&#10005;</button></div>
          <input type="text" className="tel-ara" placeholder={t('ureticiAraPh')} value={ureticiFiltre} onChange={e => setUreticiFiltre(e.target.value)} />
          <div className="meslek-grid" style={{marginTop:'12px'}}>
            {filtrelenmisU.map((m, i) => (
              <span key={i} className="meslek" style={{background: m.bg}}
                onClick={() => meslekSec(m)}>
                <span className="mik">{m.ik}</span>{mc(m.ad, i18n.language)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* MESLEK KATMANI */}
      <div className={'konum-katman' + (katman === 'meslekKatman' ? ' acik' : '')}
        onClick={e => { if (e.target === e.currentTarget) setKatman(''); }}>
        <div className="kk-ic" ref={meslekKkIcRef} onClick={e => e.stopPropagation()}>
          <div className="kk-ust"><span className="kk-baslik">&#128081; {t('meslekSecBaslik')}</span><button className="kk-kapat" onClick={() => setKatman('')}>&#10005;</button></div>
          <input type="text" className="tel-ara" placeholder={t('meslekAraPh')} value={meslekFiltre} onChange={e => setMeslekFiltre(e.target.value)} />
          <div className="meslek-grid" id="meslekListe" style={{marginTop:'12px'}}>
            {filtrelenmisM.map((m, i) => (
              <span key={i} className="meslek" style={{background: m.bg}}
                onClick={() => meslekSec(m)}>
                <span className="mik">{m.ik}</span>{mc(m.ad, i18n.language)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* KONUM KATMANI */}
      <div className={'konum-katman' + (katman === 'konumKatman' ? ' acik' : '')}
        onClick={e => { if (e.target === e.currentTarget) konumKapat(); }}>
        <div className="kk-ic" ref={konumKkIcRef} onClick={e => e.stopPropagation()}>
          <span className="kk-yildiz" style={{top:'20px',left:'24px',fontSize:'13px',animationDelay:'0s'}}>&#10022;</span>
          <span className="kk-yildiz" style={{top:'60px',right:'30px',fontSize:'11px',animationDelay:'.7s'}}>&#10022;</span>
          <span className="kk-yildiz" style={{bottom:'80px',left:'30px',fontSize:'12px',animationDelay:'1.3s'}}>&#10022;</span>
          <span className="kk-elmas" style={{top:'120px',right:'40px',fontSize:'11px',animationDelay:'.4s'}}>&#9670;</span>
          <div className="kk-ust"><span className="kk-baslik">&#127757; {t('konumunuBelirle')}</span><button className="kk-kapat" onClick={konumKapat}>&#10005;</button></div>
          <button className="kk-konum" onClick={konumBul}>{konumBuluyor ? '⌖ ' + t('konumBulunuyor') : '\u{1F4CD} ' + t('simdikiKonum')}</button>
          <div className="harita-cerceve">
            <div className="harita-zemin" onClick={haritaBuyut}>
              <span className="harita-pin">&#128205;</span>
              <span className="harita-dalga"></span>
              <div className="harita-isik"></div>
              <span className="harita-ipucu">{t('haritadanSec')}</span>
            </div>
          </div>
          <div className="kk-ayrac"><span>{t('veyaElleYaz')}</span></div>
          <div className="kk-alan" style={{position:'relative'}}>
            <label>{t('ulke')}</label>
            <input type="text" autoComplete="off" placeholder={t('ulkePh')} value={srtUlke}
              onChange={e => ulkeAra(e.target.value)}
              onBlur={() => setTimeout(() => setUlkeOneri([]), 200)} />
            {ulkeAraniyor && (
              <div style={{color:'#FFD700',fontSize:'12px',marginTop:'4px',fontStyle:'italic',letterSpacing:'.5px'}}>
                ● {t('araniyor')}
              </div>
            )}
            {ulkeOneri.length > 0 && (
              <div className="oneri">
                {ulkeOneri.map((u, i) => (
                  <div key={i} onMouseDown={e => { e.preventDefault(); setSrtUlke(ulkeAdiCevir(u.iso, i18n.language, u.ad)); setSrtUlkeIso(u.iso || ''); setUlkeOneri([]); }}>
                    {ulkeAdiCevir(u.iso, i18n.language, u.ad)}{u.iso ? <span style={{color:'#FFD700',fontSize:'12px',marginLeft:'6px'}}>({u.iso})</span> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="kk-alan" style={{position:'relative'}}>
            <label>{t('eyaletSehir')}</label>
            <input type="text" autoComplete="off" placeholder={t('eyaletSehirPh')} value={srtSehir}
              onChange={e => sehirAra(e.target.value)}
              onBlur={() => setTimeout(() => setSehirOneri([]), 200)} />
            {sehirAraniyor && <div style={{color:'#FFD700',fontSize:'12px',marginTop:'4px',fontStyle:'italic',letterSpacing:'.5px'}}>● {t('araniyor')}</div>}
            {sehirOneri.length > 0 && (
              <div className="oneri">
                {sehirOneri.map((s, i) => (
                  <div key={i} onMouseDown={e => { e.preventDefault(); setSrtSehir(s.ad); setSehirOneri([]); }}>
                    {s.ad}{s.ulke ? <span style={{color:'#FFD700',fontSize:'12px',marginLeft:'6px'}}>({s.ulke})</span> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="kk-alan" style={{position:'relative'}}>
            <label>{t('ilceKent')}</label>
            <input type="text" autoComplete="off" placeholder={t('ilceKentPh')} value={srtIlce}
              onChange={e => ilceAra(e.target.value)}
              onBlur={() => setTimeout(() => setIlceOneri([]), 200)} />
            {ilceAraniyor && <div style={{color:'#FFD700',fontSize:'12px',marginTop:'4px',fontStyle:'italic',letterSpacing:'.5px'}}>● {t('araniyor')}</div>}
            {ilceOneri.length > 0 && (
              <div className="oneri">
                {ilceOneri.map((s, i) => (
                  <div key={i} onMouseDown={e => { e.preventDefault(); setSrtIlce(s.ad); setIlceOneri([]); }}>
                    {s.ad}{s.sehir ? <span style={{color:'rgba(255,215,0,.6)',fontSize:'12px',marginLeft:'6px'}}>· {s.sehir}</span> : s.ulke ? <span style={{color:'rgba(255,215,0,.6)',fontSize:'12px',marginLeft:'6px'}}>({s.ulke})</span> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="kk-alan">
            <label>{t('mahalleSokakKoy')}</label>
            <input type="text" autoComplete="off" placeholder={t('mahalleSokakKoyPh')} value={srtMahalle}
              onChange={e => mahalleAra(e.target.value)}
              onBlur={() => setTimeout(() => setMahalleOneri([]), 300)} />
            {mahalleAraniyor && <div style={{color:'#FFD700',fontSize:'12px',marginTop:'4px',fontStyle:'italic',letterSpacing:'.5px'}}>● {t('araniyor')}</div>}
            {mahalleOneri.length > 0 && (
              <div className="oneri">
                {mahalleOneri.map((s, i) => (
                  <div key={i} onMouseDown={e => { e.preventDefault(); setSrtMahalle(s.ad); setMahalleOneri([]); }}>
                    {s.ad}{s.ilce ? <span style={{color:'rgba(255,215,0,.6)',fontSize:'12px',marginLeft:'6px'}}>· {s.ilce}</span> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="kk-alan">
            <label>{t('postaKodu')}</label>
            <input type="text" autoComplete="off" placeholder={t('postaKoduPh')} value={srtPostaKodu}
              onChange={e => setSrtPostaKodu(e.target.value)} />
          </div>
          <p className="kk-dunya">{t('dunyaKayit')}</p>
          <button className="kk-tamam" onClick={konumKapat}>{t('kaydet')}</button>
        </div>
      </div>

      {/* TEL KATMANI */}
      <div className={'konum-katman' + (katman === 'telKatman' ? ' acik' : '')}
        onClick={e => { if (e.target === e.currentTarget) setKatman(''); }}>
        <div className="tel-pencere" onClick={e => e.stopPropagation()}>
          <div className="tel-baslik">
            <span>&#128222; {t('telKoduBaslik')}</span>
            <button className="tel-kapat" onClick={() => setKatman('')}>&#10005;</button>
          </div>
          <button className="tel-konum-btn" onClick={telKonumdanBul}>&#128205; {t('konumaGoreKod')}</button>
          <div className="tel-harita" onClick={haritaBuyutTel}>
            <span className="tel-harita-pin">&#128205;</span>
            <span className="tel-harita-ipucu">{t('haritadanUlkeSec')}</span>
          </div>
          <div className="tel-ayrac"><span>{t('veyaUlkeAra')}</span></div>
          <input type="text" className="tel-ara" placeholder={t('ulkeAraPh')} value={telAramaMetin} onChange={e => telAra(e.target.value)} />
          <div className="tel-sonuc">
            {telSonuclar.map((u, i) => (
              <div key={i} className="tel-sonuc-sat" onClick={() => { telKoduAyarla(u.kd); setKatman('', true); }}>
                <span className="ad">{ulkeAdiCevir(u.iso, i18n.language, u.ad)}</span><span className="kd">{u.kd}</span>
              </div>
            ))}
          </div>
          <input type="text" className="tel-elle" placeholder={t('ulkeKoduElle')} value={telElleKod}
            onChange={e => setTelElleKod(e.target.value)}
            onBlur={e => telKoduAyarla(e.target.value)} />
        </div>
      </div>

      {/* KONUM HARİTA */}
      <div className={'konum-katman' + (katman === 'buyukHarita' ? ' acik' : '')} style={{zIndex:10005,alignItems:'center'}}
        onClick={e => { if (e.target === e.currentTarget) haritaKucult(); }}>
        <div className="bh-ic" ref={bhIcRef} onClick={e => e.stopPropagation()}>
          <div className="kk-ust"><span className="kk-baslik">&#128506; {t('haritadanKonumSec')}</span><button className="kk-kapat" onClick={haritaKucult}>&#10005;</button></div>
          <p style={{textAlign:'center',color:'#FFD700',fontFamily:"'Cinzel',serif",fontSize:'13px',margin:'0 0 10px',letterSpacing:'.5px'}}>{t('haritaSurukle')}</p>
          <div className="bh-harita" id="gercekHarita"></div>
          <button className="kk-tamam" onClick={buKonumuSec}>{t('buKonumuSec')}</button>
        </div>
      </div>

      {/* TEL KOD HARİTA */}
      <div className={'konum-katman' + (katman === 'telHaritaKatman' ? ' acik' : '')} style={{zIndex:10005,alignItems:'center'}}
        onClick={e => { if (e.target === e.currentTarget) telHaritaKucult(); }}>
        <div className="bh-ic" ref={telHaritaKkIcRef} onClick={e => e.stopPropagation()}>
          <div className="kk-ust"><span className="kk-baslik">&#128506; {t('haritadanUlkeSec')}</span><button className="kk-kapat" onClick={telHaritaKucult}>&#10005;</button></div>
          <p style={{textAlign:'center',color:'#FFD700',fontFamily:"'Cinzel',serif",fontSize:'13px',margin:'0 0 10px',letterSpacing:'.5px'}}>{t('ulkeyeBas')}</p>
          <div className="bh-harita" id="telGercekHarita"></div>
          <button className="kk-tamam" onClick={buTelKodunuSec}>{t('buUlkeyiSec')}</button>
        </div>
      </div>
    </div>
  );
}
