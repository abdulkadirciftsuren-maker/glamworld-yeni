import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MusteriForm.css';
import SurumRozeti from './SurumRozeti';
import { Elmas6Kose } from './Anasayfa';
import { ulkeAdiCevir } from './i18n';
import { auth, db, googleProvider } from './firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signInWithPopup, linkWithPopup } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { girisEpostasiGonder } from './eposta';

// CRA/webpack'te Leaflet varsayılan ikon yolları kırılıyor — sabit
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

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

const isoToTelKod = Object.fromEntries(ulkeTelListesi.map(u => [u.iso, u.kd]));
const ISO_AD_MAP = Object.fromEntries(ulkeTelListesi.map(u => [u.iso, u.ad]));

// world-atlas sayısal ülke kodu → ISO2 (renkli telefon haritası için)
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

const uzanti = ['@gmail.com','@hotmail.com','@outlook.com','@icloud.com','@yahoo.com','@gmx.de','@web.de'];

function sadeles(t) {
  if (!t) return '';
  // TÜM DÜNYA: önce Türkçe noktalı/noktasız i (Unicode NFD bunları çözmez),
  // sonra tüm aksanları soy (ö ü ç ş ğ é è à ñ ä ï ... her kıta, her dil).
  return t.replace(/ı/g, 'i').replace(/İ/g, 'i')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export default function MusteriForm() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  // form alanları
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
  const [srtUlkeIso, setSrtUlkeIso] = useState('');
  const [srtPostaKodu, setSrtPostaKodu] = useState('');
  const [konumBuluyor, setKonumBuluyor] = useState(false);
  const [ulkeOneri, setUlkeOneri] = useState([]);
  const [ulkeAraniyor, setUlkeAraniyor] = useState(false);
  const [sehirOneri, setSehirOneri] = useState([]);
  const [sehirAraniyor, setSehirAraniyor] = useState(false);
  const [ilceOneri, setIlceOneri] = useState([]);
  const [ilceAraniyor, setIlceAraniyor] = useState(false);
  const [mahalleOneri, setMahalleOneri] = useState([]);
  const [mahalleAraniyor, setMahalleAraniyor] = useState(false);
  // tel pencere
  const [telAramaMetin, setTelAramaMetin] = useState('');
  const [telElleKod, setTelElleKod] = useState('');
  const [telSonuclar, setTelSonuclar] = useState([]);
  // baloncuk + hata
  const [balonGor, setBalonGor] = useState(false);
  const [balonYazi, setBalonYazi] = useState('');
  const [balonPos, setBalonPos] = useState({ left: 0, top: 0 });
  const [hatalar, setHatalar] = useState({});
  const [hataAlani, setHataAlani] = useState('');

  // overlay = URL ?k=
  const katman = new URLSearchParams(location.search).get('k') || '';
  function setKatman(k, replace) {
    if (k) {
      navigate('/musteri?k=' + k, replace ? { replace: true } : undefined);
    } else if (replace) {
      navigate('/musteri', { replace: true });
    } else {
      navigate(-1);
    }
  }

  const haritaRef = useRef(null);
  const haritaPinRef = useRef(null);
  const telHaritaRef = useRef(null);
  const telHaritaPinRef = useRef(null);
  const scrollLockRef = useRef(0);
  const ulkeDebounceRef = useRef(null);
  const sehirDebounceRef = useRef(null);
  const ilceDebounceRef = useRef(null);
  const mahalleDebounceRef = useRef(null);
  const bhIcRef = useRef(null);
  const balonZamanRef = useRef(null);
  const hataZamanRef = useRef(null);

  // scroll lock — overlay açılınca kart zıplamasını önler
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

  // konum haritası (OSM + Overpass POI) — büyük harita açılınca
  useEffect(() => {
    if (katman !== 'buyukHarita') return;
    const tid = setTimeout(() => {
      if (!haritaRef.current) {
        const map = L.map('musteriHarita').setView([39, 35], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19, attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        let pin = null;
        let poiGrup = null;
        let moveZmn = null;
        const poiRenk = {
          restaurant:'#e74c3c', cafe:'#e67e22', supermarket:'#27ae60', pharmacy:'#8e44ad',
          hospital:'#e91e63', bank:'#f39c12', school:'#3498db', hotel:'#1abc9c',
          mosque:'#2ecc71', atm:'#f1c40f', bakery:'#e67e22', hairdresser:'#c0392b', beauty:'#c0392b',
        };
        function poiYukle(lat, lon) {
          if (poiGrup) { try { map.removeLayer(poiGrup); } catch (e) {} poiGrup = null; }
          const q = `[out:json][timeout:12];(node["amenity"~"^(restaurant|cafe|pharmacy|hospital|bank|school|hotel|atm|bakery|mosque)$"](around:700,${lat},${lon});node["shop"~"^(supermarket|hairdresser|beauty|bakery)$"](around:700,${lat},${lon}););out body;`;
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
        map.on('locationfound', e => { map.setView(e.latlng, 16); poiYukle(e.latlng.lat, e.latlng.lng); });
        map.on('locationerror', () => poiYukle(41.015, 28.979));
        map.on('moveend', () => {
          if (map.getZoom() < 14) return;
          clearTimeout(moveZmn);
          moveZmn = setTimeout(() => { const c = map.getCenter(); poiYukle(c.lat, c.lng); }, 800);
        });
        haritaRef.current = map;
        map.locate({ setView: false, timeout: 8000 });
      }
      haritaRef.current.invalidateSize();
    }, 300);
    return () => clearTimeout(tid);
  }, [katman]);

  // telefon kodu haritası — RENKLİ ülke sınırları (topojson + world-atlas), profesyonel kartla aynı
  useEffect(() => {
    if (katman !== 'telHaritaKatman') return;
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
          const harita = L.map('musteriTelHarita', {
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
                layer.bindTooltip(`${adTr}${telNo ? ' ' + telNo : ''}`, { permanent: true, direction: 'center', className: 'tel-ht-daimi' });
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

  // e-posta uzantı önerisi
  function epOner(v) {
    if (!v || v.indexOf('@') === -1) { setEpOneriList([]); return; }
    const bas = v.split('@')[0];
    setEpOneriList(uzanti.map(u => bas + u));
  }

  // telefon kodu arama (ülke listesinden, harf duyarsız)
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
    if (kod && kod.indexOf('+') === 0) { setTelKod(kod); setTelElleKod(kod); }
  }

  function telKonumdanBul() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => {
        fetch(`https://photon.komoot.io/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&limit=1`)
          .then(r => r.json())
          .then(data => {
            if (data?.features?.length > 0) {
              const cc = (data.features[0].properties.countrycode || '').toLowerCase();
              const kod = isoToTelKod[cc];
              if (kod) telKoduAyarla(kod);
            }
            setKatman('', true);
          })
          .catch(() => setKatman('', true));
      },
      () => setKatman('', true)
    );
  }

  function telAyikla(v) {
    let temiz = v.replace(/[^0-9]/g, '');
    const kod = telKod.replace(/[^0-9]/g, '');
    if (kod && temiz.indexOf(kod) === 0 && temiz.length > kod.length) temiz = temiz.substring(kod.length);
    if (temiz.indexOf('0') === 0) temiz = temiz.substring(1);
    return temiz;
  }

  // Photon reverse sonucunu alanlara dağıt
  function photonDoldur(p) {
    const ulke = p.country || '';
    const sehir = p.state || '';
    const ilceDeg = p.county || p.city || p.district || '';
    const sokak = p.street ? (p.street + (p.housenumber ? ' ' + p.housenumber : '')) : '';
    const mahDeg = p.suburb || p.locality || p.village || sokak || p.name || '';
    setSrtUlke(ulke); setSrtSehir(sehir); setSrtIlce(ilceDeg); setSrtMahalle(mahDeg);
    setSrtUlkeIso((p.countrycode || '').toUpperCase());
    setSrtPostaKodu(p.postcode || '');
    setUlkeOneri([]);
    const ust = [sehir || p.city || p.county || '', ulke].filter(Boolean).join(', ');
    if (ust) setKonumYazi(ust);
    if (ilceDeg) setIlce(ilceDeg);
    if (mahDeg) setMahalle(mahDeg);
  }

  function konumKapat() {
    const ust = [];
    if (srtSehir.trim()) ust.push(srtSehir.trim());
    if (srtUlke.trim()) ust.push(srtUlke.trim());
    if (ust.length > 0) setKonumYazi(ust.join(', '));
    if (srtIlce.trim()) setIlce(srtIlce.trim());
    if (srtMahalle.trim()) setMahalle(srtMahalle.trim());
    setUlkeOneri([]);
    setKatman('', true);
  }

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

  function ulkeAra(v) {
    setSrtUlke(v); setSrtUlkeIso(''); setUlkeOneri([]);
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
            const tam = liste.find(u => sadeles(u.ad) === sadeles(v));
            if (tam && tam.iso) setSrtUlkeIso(tam.iso);
            else if (liste.length === 1 && liste[0].iso) setSrtUlkeIso(liste[0].iso);
          }
        })
        .catch(() => { setUlkeAraniyor(false); setUlkeOneri([]); });
    }, 400);
  }

  function sehirAra(v) {
    setSrtSehir(v); setSehirOneri([]);
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
    setSrtIlce(v); setIlceOneri([]);
    clearTimeout(ilceDebounceRef.current);
    if (!v.trim()) { setIlceAraniyor(false); return; }
    setIlceAraniyor(true);
    ilceDebounceRef.current = setTimeout(() => {
      const ctx = [srtSehir, srtUlke].map(s => s.trim()).filter(Boolean).join(' ');
      const q = ctx ? v.trim() + ' ' + ctx : v.trim();
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
    setSrtMahalle(v); setMahalleOneri([]);
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
            const vN = sadeles(v);
            const skor = f => { const n = sadeles(f.properties.name || ''); return n.indexOf(vN) === 0 ? 0 : n.indexOf(vN) > -1 ? 1 : 2; };
            const sirali = feats.slice().sort((a, b) => skor(a) - skor(b));
            setMahalleOneri(sirali.map(f => ({ ad: f.properties.name || '', ilce: f.properties.county || f.properties.district || f.properties.city || '', ulke: f.properties.country || '' })).filter(s => s.ad));
          }
        })
        .catch(() => { setMahalleAraniyor(false); setMahalleOneri([]); });
    }, 400);
  }

  function haritaBuyut() { setKatman('buyukHarita'); }
  function haritaKucult() { navigate(-1); }
  function haritaBuyutTel() { setKatman('telHaritaKatman'); }
  function telHaritaKucult() { navigate(-1); }
  function buTelKodunuSec() {
    if (!telHaritaPinRef.current) { setKatman('', true); return; }
    const iso = telHaritaPinRef.current.iso;
    if (iso) { const kod = isoToTelKod[iso]; if (kod) telKoduAyarla(kod); }
    setKatman('', true);
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

  // baloncuk (seçim düğmelerinde ipucu)
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

  // Kayıt-sonrası pencere (ana sayfaya atmadan tercih ekranı)
  const [kayitBitti, setKayitBitti] = useState(false);
  const [kayitEp, setKayitEp] = useState('');
  // Google ile gelmişse e-postasını forma hazır getir
  useEffect(() => { try { if (auth.currentUser && auth.currentUser.email) setEp((e) => e || auth.currentUser.email); } catch (x) {} }, []);

  // Penceredeki "Google ile giriş" — GERÇEK Google hesabıyla gir, FOTO + ad yaz.
  async function googleGir() {
    try {
      let res;
      try {
        res = auth.currentUser
          ? await linkWithPopup(auth.currentUser, googleProvider)
          : await signInWithPopup(auth, googleProvider);
      } catch (e1) {
        const k = (e1 && e1.code) || '';
        if (['auth/credential-already-in-use','auth/email-already-in-use','auth/provider-already-linked','auth/account-exists-with-different-credential'].includes(k)) {
          res = await signInWithPopup(auth, googleProvider);
        } else { throw e1; }
      }
      const u = res.user;
      const g = (u.providerData || []).find(p => p.providerId === 'google.com') || {};
      const foto = g.photoURL || u.photoURL || '';
      const ad = g.displayName || u.displayName || '';
      try { await updateProfile(u, { photoURL: foto || u.photoURL, displayName: ad || u.displayName }); } catch (e) {}
      try { await setDoc(doc(db, 'kullanicilar', u.uid), { tip: 'musteri', isim: ad, eposta: u.email || '', foto, saglayici: 'google' }, { merge: true }); } catch (e) {}
      girisEpostasiGonder(u.email, ad); // giriş bildirim e-postası
    } catch (e) { /* popup iptal vb. → sessiz */ }
    navigate('/anasayfa', { replace: true });
  }

  async function uyeOl() {
    const mevcut = auth.currentUser; // Google ile gelip üyeliğini tamamlıyor olabilir
    const yh = {};
    let hata = false;
    if (!isim.trim()) { yh.isim = t('hataIsim'); hata = true; }
    if (!soyisim.trim()) { yh.soyisim = t('hataSoyisim'); hata = true; }
    // E-posta + şifre SADECE Google ile GELMEMİŞSE zorunlu (Google'da e-posta hazır, şifre gerekmez)
    if (!mevcut) {
      if (!ep.trim()) { yh.ep = t('hataEposta'); hata = true; }
      else if (ep.indexOf('@') === -1) { yh.ep = t('hataEpostaGecersiz'); hata = true; }
      if (!sifreAcik || !sifre1.trim()) { yh.sifre1 = t('hataSifre'); hata = true; setSifreAcik(true); }
      else if (sifre1.length < 8) { yh.sifre1 = t('hataSifreKisa'); hata = true; }
      if (!sifre2.trim()) { yh.sifre2 = t('hataSifreTekrar'); hata = true; }
      else if (sifre1 !== sifre2) { yh.sifre2 = t('hataSifreUyusmaz'); hata = true; }
    }
    if (!telNo.trim()) { yh.tel = t('hataTelefon'); hata = true; }
    if (!konumYazi) { yh.konum = true; hata = true; }
    if (!cinsiyet) { yh.cinsiyet = true; hata = true; }
    setHatalar(yh);
    if (hata) { uyariGoster(t('hataAlanlar')); return; }

    // GOOGLE ile gelmiş → form bilgileriyle profili oluştur (createUser YOK), direkt ana sayfa.
    // SIRA ÖNEMLİ: ÖNCE profili yaz (kapı kontrolü bulsun), sonra updateProfile (yarış olmasın).
    if (mevcut) {
      try { localStorage.setItem('gw_profilVar', '1'); localStorage.setItem('gw_profilVarZaman', String(Date.now())); } catch (e) {}
      try { await setDoc(doc(db, 'kullanicilar', mevcut.uid), { tip: 'musteri', isim: isim.trim(), soyisim: soyisim.trim(), eposta: mevcut.email || ep.trim(), telefon: telNo.trim(), cinsiyet, konum: konumYazi, foto: mevcut.photoURL || '', saglayici: 'google', olusturma: Date.now() }, { merge: true }); } catch (e) {}
      try { await updateProfile(mevcut, { displayName: (isim.trim() + ' ' + soyisim.trim()).trim() }); } catch (e) {}
      try { localStorage.setItem('gw_profilVar', '1'); } catch (e) {}
      try { window.dispatchEvent(new Event('gwProfilVar')); } catch (e) {} // App'e "profil hazır" de (yarış olmasın)
      girisEpostasiGonder(mevcut.email, (isim.trim() + ' ' + soyisim.trim()).trim()).catch(() => {}); // mail (sayfa kapanmaz, kesilmez)
      navigate('/anasayfa', { replace: true });
      return;
    }

    // E-POSTA/ŞİFRE ile yeni üyelik
    try {
      const cred = await createUserWithEmailAndPassword(auth, ep.trim(), sifre1);
      try { await updateProfile(cred.user, { displayName: (isim.trim() + ' ' + soyisim.trim()).trim() }); } catch (e) {}
      try { await setDoc(doc(db, 'kullanicilar', cred.user.uid), { tip: 'musteri', isim: isim.trim(), soyisim: soyisim.trim(), eposta: ep.trim(), telefon: telNo.trim(), cinsiyet, konum: konumYazi, olusturma: Date.now() }); } catch (e) {}
    } catch (e) {
      if (e && e.code === 'auth/email-already-in-use') {
        try { await signInWithEmailAndPassword(auth, ep.trim(), sifre1); } catch (e2) {}
      }
    }
    try { localStorage.setItem('gw_profilVar', '1'); } catch (e) {}
    setKayitEp(ep.trim());
    setKayitBitti(true);
  }

  return (
    <div className="pf-sayfa">
      <SurumRozeti />

      {/* BALON */}
      <div className={'balon' + (balonGor ? ' gor' : '')} style={{ left: balonPos.left, top: balonPos.top }}>{balonYazi}</div>

      {/* ANA KART */}
      <div className="kart" id="anaKart">
        <div className="ic">
          <div className="ust">
            <span className="logo-amblem">
              <span className="pir-sol"><Elmas6Kose c="#dfeaff" /></span>
              <span className="logo notranslate" translate="no">GROXORG</span>
            </span>
          </div>
          <div className="h2">{t('uyeolBaslik')}</div>
          <div className="slogan">{t('musteriSlogan')}</div>
          <div className="ayrac"></div>

          {/* İSİM / SOYİSİM */}
          <div className="satir">
            <div className="alan">
              <label>{t('isim')}</label>
              <input type="text" placeholder={t('isimPh')} value={isim}
                className={hatalar.isim ? 'hatali' : ''}
                onChange={e => { setIsim(e.target.value); setHatalar(h => ({ ...h, isim: '' })); }} />
              {hatalar.isim && <span className="alan-hata gor">{hatalar.isim}</span>}
            </div>
            <div className="alan">
              <label>{t('soyisim')}</label>
              <input type="text" placeholder={t('soyisimPh')} value={soyisim}
                className={hatalar.soyisim ? 'hatali' : ''}
                onChange={e => { setSoyisim(e.target.value); setHatalar(h => ({ ...h, soyisim: '' })); }} />
              {hatalar.soyisim && <span className="alan-hata gor">{hatalar.soyisim}</span>}
            </div>
          </div>

          {/* E-POSTA */}
          <label>{t('eposta')}</label>
          <div className="eposta-sar">
            <input type="text" placeholder={t('epostaPh')} value={ep} autoComplete="off"
              className={hatalar.ep ? 'hatali' : ''}
              onChange={e => { setEp(e.target.value); epOner(e.target.value); setHatalar(h => ({ ...h, ep: '' })); }} />
            {epOneriList.length > 0 && (
              <div className="oneri">
                {epOneriList.map(o => (<div key={o} onClick={() => { setEp(o); setEpOneriList([]); }}>{o}</div>))}
              </div>
            )}
          </div>
          {hatalar.ep && <span className="alan-hata gor">{hatalar.ep}</span>}

          {/* ŞİFRE */}
          {!sifreAcik && (
            <div className="sifre-kapali" onClick={() => setSifreAcik(true)}>
              <span>&#128274; {t('sifreBelirle')}</span><span className="ok">&#9662;</span>
            </div>
          )}
          {sifreAcik && (
            <div className="satir">
              <div className="alan">
                <label>{t('sifre')}</label>
                <div className="sifre-sar">
                  <input type={sifre1Tip} placeholder={t('sifrePh')} value={sifre1}
                    className={hatalar.sifre1 ? 'hatali' : ''}
                    onChange={e => { setSifre1(e.target.value); setHatalar(h => ({ ...h, sifre1: '' })); }} />
                  <span className="goz" onClick={() => setSifre1Tip(t => t === 'password' ? 'text' : 'password')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={sifre1Tip === 'text' ? '#8090a0' : '#FFD700'} strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  </span>
                </div>
                {hatalar.sifre1 && <span className="alan-hata gor">{hatalar.sifre1}</span>}
              </div>
              <div className="alan">
                <label>{t('sifreTekrar')}</label>
                <div className="sifre-sar">
                  <input type={sifre2Tip} placeholder={t('sifreTekrarPh')} value={sifre2}
                    className={hatalar.sifre2 ? 'hatali' : ''}
                    onChange={e => { setSifre2(e.target.value); setHatalar(h => ({ ...h, sifre2: '' })); }} />
                  <span className="goz" onClick={() => setSifre2Tip(t => t === 'password' ? 'text' : 'password')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={sifre2Tip === 'text' ? '#8090a0' : '#FFD700'} strokeWidth="2"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
                  </span>
                </div>
                {hatalar.sifre2 && <span className="alan-hata gor">{hatalar.sifre2}</span>}
              </div>
            </div>
          )}

          {/* TELEFON */}
          <label>{t('telefon')}</label>
          <div className="tel-satir">
            <div className="tel-kod" onClick={() => setKatman('telKatman')}><span>{telKod || '+--'}</span></div>
            <input type="tel" placeholder={t('telefonPh')} value={telNo}
              className={hatalar.tel ? 'hatali' : ''}
              onChange={e => { setTelNo(telAyikla(e.target.value)); setHatalar(h => ({ ...h, tel: '' })); }} />
          </div>
          {hatalar.tel && <span className="alan-hata gor">{hatalar.tel}</span>}

          {/* CİNSİYET */}
          <label>{t('cinsiyet')}</label>
          <div className={'cins-sira' + (hatalar.cinsiyet ? ' hatali-rol' : '')}>
            <div className={'cins erkek' + (cinsiyet === 'Bay' ? ' secili' : '')}
              onClick={e => { setCinsiyet('Bay'); secB(e.currentTarget, t('bay')); setHatalar(h => ({ ...h, cinsiyet: '' })); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={cinsiyet === 'Bay' ? '#1a2a3a' : '#FFD700'} strokeWidth="2.2"><circle cx="10" cy="14" r="4.5" /><line x1="13.2" y1="10.8" x2="18.5" y2="5.5" /><polyline points="14 5.5 18.5 5.5 18.5 10" /></svg>
              <span className="cins-yazi-alt">{t('bay')}</span>
            </div>
            <div className={'cins kadin' + (cinsiyet === 'Bayan' ? ' secili' : '')}
              onClick={e => { setCinsiyet('Bayan'); secB(e.currentTarget, t('bayan')); setHatalar(h => ({ ...h, cinsiyet: '' })); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={cinsiyet === 'Bayan' ? '#5a0030' : '#f0b8d8'} strokeWidth="2.2"><circle cx="12" cy="9" r="4.5" /><line x1="12" y1="13.5" x2="12" y2="20" /><line x1="9.5" y1="17.5" x2="14.5" y2="17.5" /></svg>
              <span className="cins-yazi-alt">{t('bayan')}</span>
            </div>
            <div className={'cins gizli' + (cinsiyet === 'Gizli' ? ' secili' : '')}
              onClick={e => { setCinsiyet('Gizli'); secB(e.currentTarget, t('belirtmekIstemiyorum')); setHatalar(h => ({ ...h, cinsiyet: '' })); }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={cinsiyet === 'Gizli' ? '#2a1850' : '#c0b8e0'} strokeWidth="2.2"><circle cx="12" cy="12" r="8.5" /><path d="M9.8 9.5 a2.2 2.2 0 1 1 2.6 3.5 v1.2" /><circle cx="12" cy="16.5" r=".55" fill="#c0b8e0" /></svg>
              <span className="cins-yazi-alt">{t('gizli')}</span>
            </div>
          </div>

          {/* KONUM */}
          <label>&#127757; {t('konumLabel')}</label>
          <div className="yer-serit">
            <div className={'secim-btn' + (hatalar.konum ? ' hatali' : '')}
              onClick={() => { setKatman('konumKatman'); setHatalar(h => ({ ...h, konum: false })); }}>
              <span className={'yazi' + (konumYazi ? '' : ' bos')}>{konumYazi || t('sehirEyalet')}</span>
              <span className="ok">&#9662;</span>
            </div>
            <input type="text" className="ilce-kutu" placeholder={t('ilceLabel')} value={ilce}
              onChange={e => setIlce(e.target.value)} />
          </div>
          <input type="text" className="mahalle-kutu" placeholder={t('mahalleKoy')} value={mahalle}
            onChange={e => setMahalle(e.target.value)} />

          <div className="ayrac"></div>
          <span className="etiket">{t('uyelik')}</span>
          <div className="ucretsiz-kutu">
            <span className="ucretsiz-rozet">{t('tamamenUcretsiz')}</span>
            <p>{t('musteriUcretsizMetin')}</p>
          </div>

          {hataAlani && <div className="hata-uyari">{hataAlani}</div>}
          <button className="ana-btn" onClick={uyeOl}>{t('uyeol')}</button>
          <p className="not">{t('kvkk')}</p>
          <button className="geri-btn" onClick={() => navigate('/uyeol', { replace: true })}>&#8592; {t('geriDon')}</button>
          <div className="alt-not">{t('zatenHesap')} <b onClick={() => navigate('/')}>{t('girisYapLink')}</b></div>
        </div>
      </div>

      {/* ===== KATMANLAR ===== */}

      {/* TELEFON KODU */}
      <div className={'konum-katman' + (katman === 'telKatman' ? ' acik' : '')} style={{ zIndex: 10005, alignItems: 'center' }}
        onClick={e => { if (e.target === e.currentTarget) setKatman(''); }}>
        <div className="bh-ic" onClick={e => e.stopPropagation()}>
          <div className="kk-ust"><span className="kk-baslik">&#128222; {t('telKoduBaslik')}</span><button className="tel-kapat" onClick={() => setKatman('')}>&#10005;</button></div>
          <button className="tel-konum-btn" onClick={telKonumdanBul}>&#128205; {t('konumaGoreKod')}</button>
          <button className="tel-konum-btn" onClick={haritaBuyutTel}>&#128506; {t('haritadanUlkeSec')}</button>
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

      {/* KONUM ŞERİTLERİ */}
      <div className={'konum-katman' + (katman === 'konumKatman' ? ' acik' : '')} style={{ zIndex: 10002 }}
        onClick={e => { if (e.target === e.currentTarget) konumKapat(); }}>
        <div className="kk-ic" ref={bhIcRef} onClick={e => e.stopPropagation()}>
          <div className="kk-ust"><span className="kk-baslik">&#127757; {t('konumunuBelirle')}</span><button className="kk-kapat" onClick={konumKapat}>&#10005;</button></div>
          <button className="tel-konum-btn" onClick={konumBul}>&#128205; {konumBuluyor ? t('konumBulunuyor') : t('simdikiKonum')}</button>
          <div className="harita-zemin" onClick={haritaBuyut}>
            <span className="harita-ipucu">&#128506; {t('haritadanSec')}</span>
          </div>
          <div className="kk-ayrac"><span>{t('veyaElleYaz')}</span></div>

          <div className="kk-alan" style={{ position: 'relative' }}>
            <label>{t('ulke')} {ulkeAraniyor && <span className="araniyor-yazi">● {t('araniyor')}</span>}</label>
            <input type="text" autoComplete="off" placeholder={t('ulkePh')} value={srtUlke}
              onChange={e => ulkeAra(e.target.value)} onBlur={() => setTimeout(() => setUlkeOneri([]), 200)} />
            {ulkeOneri.length > 0 && (
              <div className="oneri">
                {ulkeOneri.map((u, i) => (
                  <div key={i} onMouseDown={e => { e.preventDefault(); setSrtUlke(ulkeAdiCevir(u.iso, i18n.language, u.ad)); setSrtUlkeIso(u.iso || ''); setUlkeOneri([]); }}>
                    {ulkeAdiCevir(u.iso, i18n.language, u.ad)}{u.iso ? <span style={{ color: '#FFD700', fontSize: '12px', marginLeft: '6px' }}>({u.iso})</span> : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="kk-alan" style={{ position: 'relative' }}>
            <label>{t('eyaletSehir')} {sehirAraniyor && <span className="araniyor-yazi">● {t('araniyor')}</span>}</label>
            <input type="text" autoComplete="off" placeholder={t('eyaletSehirPh')} value={srtSehir}
              onChange={e => sehirAra(e.target.value)} onBlur={() => setTimeout(() => setSehirOneri([]), 200)} />
            {sehirOneri.length > 0 && (
              <div className="oneri">
                {sehirOneri.map((s, i) => (
                  <div key={i} onMouseDown={e => { e.preventDefault(); setSrtSehir(s.ad); setSehirOneri([]); }}>
                    {s.ad}{s.ulke ? <span style={{ color: '#FFD700', fontSize: '12px', marginLeft: '6px' }}>({s.ulke})</span> : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="kk-alan" style={{ position: 'relative' }}>
            <label>{t('ilceKent')} {ilceAraniyor && <span className="araniyor-yazi">● {t('araniyor')}</span>}</label>
            <input type="text" autoComplete="off" placeholder={t('ilceKentPh')} value={srtIlce}
              onChange={e => ilceAra(e.target.value)} onBlur={() => setTimeout(() => setIlceOneri([]), 200)} />
            {ilceOneri.length > 0 && (
              <div className="oneri">
                {ilceOneri.map((s, i) => (
                  <div key={i} onMouseDown={e => { e.preventDefault(); setSrtIlce(s.ad); setIlceOneri([]); }}>
                    {s.ad}{s.sehir ? <span style={{ color: 'rgba(255,215,0,.6)', fontSize: '12px', marginLeft: '6px' }}>· {s.sehir}</span> : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="kk-alan" style={{ position: 'relative' }}>
            <label>{t('mahalleSokakKoy')} {mahalleAraniyor && <span className="araniyor-yazi">● {t('araniyor')}</span>}</label>
            <input type="text" autoComplete="off" placeholder={t('mahalleSokakKoyPh')} value={srtMahalle}
              onChange={e => mahalleAra(e.target.value)} onBlur={() => setTimeout(() => setMahalleOneri([]), 300)} />
            {mahalleOneri.length > 0 && (
              <div className="oneri">
                {mahalleOneri.map((s, i) => (
                  <div key={i} onMouseDown={e => { e.preventDefault(); setSrtMahalle(s.ad); setMahalleOneri([]); }}>
                    {s.ad}{s.ilce ? <span style={{ color: 'rgba(255,215,0,.6)', fontSize: '12px', marginLeft: '6px' }}>· {s.ilce}</span> : null}
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

      {/* KONUM HARİTASI */}
      <div className={'konum-katman' + (katman === 'buyukHarita' ? ' acik' : '')} style={{ zIndex: 10005, alignItems: 'center' }}
        onClick={e => { if (e.target === e.currentTarget) haritaKucult(); }}>
        <div className="bh-ic" onClick={e => e.stopPropagation()}>
          <div className="kk-ust"><span className="kk-baslik">&#128506; {t('haritadanKonumSec')}</span><button className="kk-kapat" onClick={haritaKucult}>&#10005;</button></div>
          <p style={{ textAlign: 'center', color: '#FFD700', fontFamily: "'Cinzel',serif", fontSize: '13px', margin: '0 0 10px', letterSpacing: '.5px' }}>{t('haritaSurukle')}</p>
          <div className="bh-harita" id="musteriHarita"></div>
          <button className="kk-tamam" onClick={buKonumuSec}>{t('buKonumuSec')}</button>
        </div>
      </div>

      {/* TELEFON KODU HARİTASI */}
      <div className={'konum-katman' + (katman === 'telHaritaKatman' ? ' acik' : '')} style={{ zIndex: 10006, alignItems: 'center' }}
        onClick={e => { if (e.target === e.currentTarget) telHaritaKucult(); }}>
        <div className="bh-ic" onClick={e => e.stopPropagation()}>
          <div className="kk-ust"><span className="kk-baslik">&#128506; {t('haritadanUlkeBaslik')}</span><button className="kk-kapat" onClick={telHaritaKucult}>&#10005;</button></div>
          <p style={{ textAlign: 'center', color: '#FFD700', fontFamily: "'Cinzel',serif", fontSize: '13px', margin: '0 0 10px', letterSpacing: '.5px' }}>{t('ulkeyeBas')}</p>
          <div className="bh-harita" id="musteriTelHarita"></div>
          <button className="kk-tamam" onClick={buTelKodunuSec}>{t('buUlkeyiSec')}</button>
        </div>
      </div>

      {/* KAYIT SONRASI TERCİH PENCERESİ — ana sayfaya atmaz; e-postayla gir veya GERÇEK Google ile gir */}
      {kayitBitti && (
        <div className="konum-katman acik" style={{ zIndex: 10001, alignItems: 'center' }}>
          <div className="kk-ic" style={{ textAlign: 'center' }}>
            <div className="kk-ust"><span className="kk-baslik">&#127968; GROXORG</span></div>
            <p style={{ textAlign: 'center', color: '#FFD700', fontFamily: "'Cinzel',serif", fontSize: '18px', margin: '10px 0 6px' }}>{t('hosgeldinKisa')}</p>
            <p style={{ textAlign: 'center', color: '#cbb890', fontSize: '14px', lineHeight: '1.5', marginBottom: '18px' }}>{t('anasayfaMetin')}</p>
            <button onClick={() => navigate('/anasayfa', { replace: true })} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,215,0,.5)', background: 'linear-gradient(135deg,#B8860B,#FFD700)', color: '#1c1404', fontWeight: 700, cursor: 'pointer' }}>&#9993;&#65039; {kayitEp} {t('ileGirisYapSon')}</button>
            <p style={{ textAlign: 'center', color: '#7a6f50', fontSize: '12px', marginTop: '14px' }}>{t('veyaSecebilirsin')}</p>
            <button onClick={googleGir} style={{ width: '100%', marginTop: '6px', padding: '12px', borderRadius: '12px', background: '#fff', color: '#222', fontWeight: 600, cursor: 'pointer', border: (kayitEp || '').toLowerCase().endsWith('@gmail.com') ? '1.5px solid #FFD700' : '1px solid #ddd', boxShadow: (kayitEp || '').toLowerCase().endsWith('@gmail.com') ? '0 0 16px rgba(255,215,0,.4)' : 'none' }}><b style={{ color: '#4285F4' }}>G</b> {t('googleIleGiris')}{(kayitEp || '').toLowerCase().endsWith('@gmail.com') && ' ✦'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
