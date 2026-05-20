const simdi = new Date().toLocaleString('tr-TR');

export default function App() {
  return (
    <div className="sayfa">
      <h1 className="baslik">GLAMWORLD</h1>
      <div className="bilgi-kutu">
        <span>Versiyon: v1</span>
        <span>{simdi}</span>
        <span>Son işlem: ilk kurulum</span>
      </div>
    </div>
  );
}
