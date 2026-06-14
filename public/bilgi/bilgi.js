// ═══════════════════════════════════════════════════════════════
// DeepFin — Bilgi Bankası  (yatırımcı/filtre verileri deepfin.js ile senkron üretilir)
// ═══════════════════════════════════════════════════════════════

var LVL = {
  b:{label:'Başlangıç',cls:'bk-lvl-b'},
  o:{label:'Orta',cls:'bk-lvl-o'},
  i:{label:'İleri',cls:'bk-lvl-i'}
};

var GUIDES = [
  {
    id: 'value', title: 'Değer Yatırımı Nedir?', level: 'b', mins: 6,
    sub: 'Graham ve Buffett\'in temelini attığı, hisseleri içsel değerinin altında satın alma yaklaşımı.',
    preset: 'value',
    body:
      '<p><strong>Değer yatırımı</strong>, bir şirketin hisselerini gerçek (içsel) değerinin altında bir fiyata satın alıp, piyasa bu değeri fark ettiğinde kâr etmeyi hedefleyen yaklaşımdır. Temeli 1930\'larda <strong>Benjamin Graham</strong> tarafından atılmış, en ünlü uygulayıcısı <strong>Warren Buffett</strong> olmuştur.</p>'+
      '<h2>Temel mantık: Güvenlik marjı</h2>'+
      '<p>Graham\'ın merkezindeki kavram <strong>güvenlik marjı</strong>dır: Bir hissenin içsel değerini hesapla, ardından bu değerin belirgin biçimde altında al. Aradaki fark, hata payın ve koruma kalkanındır. 1 TL değerindeki bir şeyi 60 kuruşa almak, hem yükseliş potansiyeli hem de düşüşe karşı tampon sağlar.</p>'+
      '<h2>Hangi şirketler ucuz sayılır?</h2>'+
      '<ul>'+
      '<li>Düşük <strong>F/K</strong> (Fiyat/Kazanç): Şirket kazancına göre ucuz fiyatlanmış.</li>'+
      '<li>Düşük <strong>PD/DD</strong> (Piyasa Değeri/Defter Değeri): Fiyat, özkaynak değerine yakın.</li>'+
      '<li>Düzenli <strong>temettü</strong> ödeyen, borcu makul şirketler tercih edilir.</li>'+
      '</ul>'+
      '<div class="bk-callout"><div class="bk-callout-h">Dikkat: Değer Tuzağı</div><p>Ucuz olan her hisse fırsat değildir. Bazı şirketler haklı sebeplerle (düşen sektör, zayıf yönetim, yapısal sorun) ucuzdur. Düşük F/K\'yı her zaman kârlılık (ROE) ve büyüme ile birlikte değerlendir.</p></div>'+
      '<h2>DeepFin\'de tipik kriterler</h2>'+
      '<div class="bk-crit-box"><div class="bk-crit-row"><span>F/K</span><span>&lt; 15</span></div><div class="bk-crit-row"><span>PD/DD</span><span>&lt; 2</span></div><div class="bk-crit-row"><span>Temettü Verimi</span><span>&gt; %2</span></div></div>'
  },
  {
    id: 'graham', title: 'Graham Defansif Yatırımcı Kriterleri', level: 'b', mins: 7,
    sub: 'Benjamin Graham\'ın "Akıllı Yatırımcı" kitabındaki, riski düşük tutan klasik eleme kuralları.',
    preset: 'value',
    body:
      '<p><strong>Benjamin Graham</strong>, yatırımcıları iki gruba ayırır: aktif (girişimci) ve <strong>defansif (savunmacı)</strong>. Savunmacı yatırımcı, zamanını ve enerjisini sınırlı tutmak isteyen, sağlam ve güvenli şirketler arayan kişidir. Graham bunun için net, sayısal kurallar tanımlamıştır.</p>'+
      '<h2>Savunmacı yatırımcının kontrol listesi</h2>'+
      '<ul>'+
      '<li><strong>Yeterli büyüklük:</strong> Çok küçük şirketlerden kaçın; ölçek istikrar getirir.</li>'+
      '<li><strong>Güçlü finansal durum:</strong> Cari oran 2\'nin üzerinde, borç kontrol altında.</li>'+
      '<li><strong>Kazanç istikrarı:</strong> Son yıllarda zarar etmemiş olmak.</li>'+
      '<li><strong>Temettü geçmişi:</strong> Kesintisiz temettü ödeme alışkanlığı.</li>'+
      '<li><strong>Makul fiyat:</strong> F/K düşük (≈15 altı) ve PD/DD ılımlı (≈1.5 altı).</li>'+
      '</ul>'+
      '<p>Graham ayrıca bir "kestirme" sunar: <strong>F/K × PD/DD &lt; 22.5</strong> kuralı. Yani bir hisse hem kazancına hem defter değerine göre aşırı pahalı olmamalı.</p>'+
      '<div class="bk-callout"><div class="bk-callout-h">Neden işe yarar?</div><p>Bu kriterler tek başına dahi olarak görkemli getiriler vaat etmez; amaç <em>kalıcı sermaye kaybını önlemektir</em>. Graham\'ın felsefesi "önce kaybetme" üzerine kuruludur.</p></div>'+
      '<div class="bk-crit-box"><div class="bk-crit-row"><span>F/K</span><span>&lt; 15</span></div><div class="bk-crit-row"><span>PD/DD</span><span>&lt; 1.5</span></div><div class="bk-crit-row"><span>Cari Oran</span><span>&gt; 2</span></div><div class="bk-crit-row"><span>Temettü</span><span>Ödüyor</span></div></div>'
  },
  {
    id: 'dividend', title: 'Temettü Yatırımı Stratejisi', level: 'b', mins: 5,
    sub: 'Sürdürülebilir temettü ödeyen şirketleri seçme rehberi.',
    preset: 'dividend',
    body:
      '<p><strong>Temettü yatırımı</strong>, hisse fiyatı oynamasa bile düzenli nakit akışı üretmeyi amaçlar. Şirketler kârlarının bir kısmını hissedarlara temettü olarak dağıtır; bu, özellikle pasif gelir arayan yatırımcılar için cazip bir yaklaşımdır.</p>'+
      '<h2>Yüksek verim her zaman iyi mi?</h2>'+
      '<p>Hayır. <strong>Temettü verimi = Yıllık Temettü / Hisse Fiyatı</strong>. Fiyat sert düştüğünde verim suni olarak yükselir; bu çoğu zaman bir uyarı işaretidir. Sağlıklı temettü için verimin yanında <strong>ödeme kapasitesine</strong> de bakılır.</p>'+
      '<h2>Sürdürülebilir temettünün işaretleri</h2>'+
      '<ul>'+
      '<li><strong>Makul dağıtım oranı:</strong> Kârın tamamını dağıtan şirket büyüyemez; %30–70 bandı sağlıklıdır.</li>'+
      '<li><strong>Düşük borç:</strong> Borç/özkaynak yüksekse temettü ilk kesilen kalemdir.</li>'+
      '<li><strong>İstikrarlı nakit akışı:</strong> Cari oran 1.2 üzeri, faaliyetlerden pozitif nakit.</li>'+
      '</ul>'+
      '<div class="bk-crit-box"><div class="bk-crit-row"><span>Temettü Verimi</span><span>&gt; %4</span></div><div class="bk-crit-row"><span>Borç/Özkaynak</span><span>&lt; %80</span></div><div class="bk-crit-row"><span>Cari Oran</span><span>&gt; 1.2</span></div></div>'
  },
  {
    id: 'peg', title: 'PEG Oranı ile Büyüme Hisseleri Bulmak', level: 'o', mins: 8,
    sub: 'Lynch\'in popülerleştirdiği PEG oranının nasıl kullanılacağı.',
    preset: 'growth',
    body:
      '<p><strong>Peter Lynch</strong>, Fidelity Magellan fonunu 13 yılda yıllık ~%29 getiriyle yöneten efsane yatırımcıdır. En bilinen aracı <strong>PEG oranı</strong>dır: F/K oranını büyüme hızına bölerek "büyümeye göre pahalılığı" ölçer.</p>'+
      '<h2>PEG nasıl hesaplanır?</h2>'+
      '<p><strong>PEG = F/K ÷ Yıllık Kazanç Büyümesi (%)</strong></p>'+
      '<p>Örneğin F/K\'sı 20 olan bir şirket yılda %20 büyüyorsa PEG = 1.0\'dır. Lynch\'e göre <strong>PEG &lt; 1</strong> ilginç, <strong>PEG &gt; 1.5</strong> ise pahalı bölgedir. Mantık: Yüksek F/K tek başına pahalı görünse de, eğer kazanç hızla büyüyorsa bu fiyat haklı olabilir — "GARP" (Growth At a Reasonable Price / makul fiyata büyüme) felsefesi budur.</p>'+
      '<h2>Lynch\'in altın kuralları</h2>'+
      '<ul>'+
      '<li>Anladığın işe yatırım yap; "bildiğin şeyi al".</li>'+
      '<li>Kazanç büyümesi gerçek ve sürdürülebilir olmalı (tek seferlik sıçramalar yanıltır).</li>'+
      '<li>Borç düşük, bilanço temiz olmalı; büyüme borçla finanse edilmemeli.</li>'+
      '</ul>'+
      '<div class="bk-callout"><div class="bk-callout-h">PEG\'in sınırı</div><p>Çok yüksek büyüme oranları (örn. %80) sürdürülemez ve PEG\'i yapay olarak düşürür. Aşırı uçlardaki büyüme tahminlerine şüpheyle yaklaş; 3–5 yıllık ortalama büyümeyi tercih et.</p></div>'+
      '<div class="bk-crit-box"><div class="bk-crit-row"><span>F/K</span><span>5 – 35</span></div><div class="bk-crit-row"><span>Kazanç Büyümesi</span><span>&gt; %20</span></div><div class="bk-crit-row"><span>PEG</span><span>&lt; 1.5</span></div></div>'
  },
  {
    id: 'quality', title: 'Kalite Yatırımı — Buffett & Munger', level: 'o', mins: 9,
    sub: '"Harika şirketi makul fiyata al" felsefesi: yüksek kârlılık ve dayanıklı rekabet avantajı.',
    preset: 'quality',
    body:
      '<p>Genç Buffett saf bir Graham takipçisiydi: "ucuz olsun da ne olursa olsun". Ortağı <strong>Charlie Munger</strong>\'ın etkisiyle felsefesi olgunlaştı: <em>"Harika bir şirketi adil bir fiyata almak, vasat bir şirketi harika bir fiyata almaktan çok daha iyidir."</em></p>'+
      '<h2>Kaliteyi ne tanımlar?</h2>'+
      '<ul>'+
      '<li><strong>Yüksek özkaynak kârlılığı (ROE):</strong> Şirket, hissedar parasını verimli kullanıyor (&gt;%20 güçlüdür).</li>'+
      '<li><strong>Yüksek ve istikrarlı marjlar:</strong> Brüt ve net marj, fiyatlama gücünün işaretidir.</li>'+
      '<li><strong>Ekonomik hendek (moat):</strong> Marka, ağ etkisi, ölçek veya maliyet avantajı gibi rakiplerin aşamadığı koruma.</li>'+
      '<li><strong>Düşük borç:</strong> Krizlerde ayakta kalan bilanço.</li>'+
      '</ul>'+
      '<h2>Neden marjlar bu kadar önemli?</h2>'+
      '<p>Yüksek brüt marj (örn. &gt;%40), şirketin ürününü maliyetinin çok üzerinde satabildiğini gösterir — bu genelde güçlü bir marka veya fiyatlama gücüdür. Munger\'ın deyimiyle, kaliteyi belirleyen bu kalıcı avantajlardır; "tek seferlik ucuzluk" değil.</p>'+
      '<div class="bk-callout"><div class="bk-callout-h">Bileşik getirinin gücü</div><p>Kalite yatırımının özü <strong>uzun vadeli bileşik büyümedir</strong>. Yüksek ROE\'li bir şirket kazancını yıllarca verimli yeniden yatırırsa, değer üstel olarak büyür. Bu yüzden Buffett "en sevdiğim elde tutma süresi: sonsuza dek" der.</p></div>'+
      '<div class="bk-crit-box"><div class="bk-crit-row"><span>ROE</span><span>&gt; %20</span></div><div class="bk-crit-row"><span>Net Marj</span><span>&gt; %15</span></div><div class="bk-crit-row"><span>Brüt Marj</span><span>&gt; %35</span></div><div class="bk-crit-row"><span>Borç/Özkaynak</span><span>Düşük</span></div></div>'
  },
  {
    id: 'magic', title: 'Greenblatt Sihirli Formül', level: 'o', mins: 7,
    sub: 'Joel Greenblatt\'in iki orana indirgediği sistematik değer-kalite yaklaşımı.',
    preset: 'quality',
    body:
      '<p><strong>Joel Greenblatt</strong>, "The Little Book That Beats the Market" kitabında değer yatırımını iki basit orana indirger. Amaç: <strong>iyi şirketleri ucuz fiyata</strong> bulmak.</p>'+
      '<h2>İki bileşen</h2>'+
      '<ul>'+
      '<li><strong>Kazanç verimi (Earnings Yield):</strong> Şirket ne kadar ucuz? (F/K\'nın tersi gibi düşün — yüksek olması iyi.)</li>'+
      '<li><strong>Sermaye getirisi (ROIC / ROE):</strong> Şirket ne kadar kaliteli? Yatırılan sermayeyi ne verimle çeviriyor?</li>'+
      '</ul>'+
      '<p>Formül, tüm şirketleri bu iki kritere göre ayrı ayrı sıralar ve sıralamaları toplar. En tepedeki şirketler "hem ucuz hem kaliteli" olanlardır. Greenblatt bunu mekanik, duygusuz bir disiplin olarak uygular — tek tek hisse seçmenin getirdiği önyargıları azaltır.</p>'+
      '<div class="bk-callout"><div class="bk-callout-h">Disiplin şarttır</div><p>Sihirli Formül yıllar bazında piyasayı yenmeyi hedefler ama <em>her yıl</em> değil. Bazı dönemler geride kalır; başarısının sırrı çoğu yatırımcının terk ettiği yerde stratejiye sadık kalmaktır.</p></div>'+
      '<div class="bk-crit-box"><div class="bk-crit-row"><span>ROE</span><span>&gt; %25</span></div><div class="bk-crit-row"><span>F/K</span><span>&lt; 12</span></div></div>'
  },
  {
    id: 'canslim', title: 'CAN SLIM — William O\'Neil', level: 'i', mins: 11,
    sub: 'Temel ve teknik analizi birleştiren, büyüme + momentum odaklı 7 kriterli sistem.',
    preset: 'breakout',
    body:
      '<p><strong>William O\'Neil</strong>\'in geliştirdiği <strong>CAN SLIM</strong>, piyasa tarihindeki en büyük kazanan hisselerin ortak özelliklerini inceleyerek oluşturulmuş 7 harfli bir kontrol listesidir. Hem güçlü temeli hem güçlü fiyat momentumunu arar.</p>'+
      '<h2>7 kriter</h2>'+
      '<ul>'+
      '<li><strong>C</strong> — Current Earnings: Son çeyrek kazanç büyümesi güçlü (&gt;%25).</li>'+
      '<li><strong>A</strong> — Annual Earnings: Yıllık kazanç büyümesi de yüksek ve hızlanıyor.</li>'+
      '<li><strong>N</strong> — New: Yeni ürün, yeni yönetim ya da yeni zirve — bir katalizör.</li>'+
      '<li><strong>S</strong> — Supply &amp; Demand: Sınırlı arz, artan talep; hacimle gelen yükseliş.</li>'+
      '<li><strong>L</strong> — Leader: Sektörünün lideri ol, takipçisi değil (yüksek göreli güç).</li>'+
      '<li><strong>I</strong> — Institutional: Kurumsal yatırımcıların artan ilgisi.</li>'+
      '<li><strong>M</strong> — Market: Genel piyasa yönü yukarı olmalı; akıntıya karşı yüzme.</li>'+
      '</ul>'+
      '<p>CAN SLIM\'in özü, "ucuz" değil <strong>"güçlü"</strong> hisse aramaktır. O\'Neil\'a göre kazanan hisseler genelde zaten pahalı görünür; çünkü piyasa onların büyümesini fiyatlamaya başlamıştır. Kritik olan, yeni bir zirveden hacimle <strong>kırılım (breakout)</strong> anını yakalamaktır.</p>'+
      '<div class="bk-callout"><div class="bk-callout-h">Risk yönetimi</div><p>O\'Neil katı bir <strong>%7–8 zarar kes</strong> kuralı uygular. Momentum stratejilerinde yanılma kaçınılmazdır; başarının anahtarı kazançları büyütüp kayıpları küçük tutmaktır.</p></div>'+
      '<div class="bk-crit-box"><div class="bk-crit-row"><span>Çeyrek EPS Büyümesi</span><span>&gt; %25</span></div><div class="bk-crit-row"><span>Yıllık Büyüme</span><span>Yüksek</span></div><div class="bk-crit-row"><span>Fiyat</span><span>52H zirveye yakın</span></div><div class="bk-crit-row"><span>Göreli Güç</span><span>Sektör lideri</span></div></div>'
  },
  {
    id: 'vcp', title: 'Minervini VCP Formasyonu', level: 'i', mins: 12,
    sub: 'Volatilite daralması paterni ile momentum hisselerini yakalama tekniği.',
    preset: 'nearHigh',
    body:
      '<p><strong>Mark Minervini</strong>, ABD Yatırım Şampiyonası\'nı üç haneli getirilerle kazanmış bir trader\'dır. Yöntemi <strong>SEPA</strong> (Specific Entry Point Analysis) olarak bilinir; merkezinde <strong>VCP — Volatility Contraction Pattern</strong> (volatilite daralma paterni) yer alır.</p>'+
      '<h2>VCP nedir?</h2>'+
      '<p>Güçlü bir hisse yükselişe geçmeden önce genellikle bir dizi <strong>giderek daralan düzeltme</strong> yaşar. Her geri çekilme bir öncekinden daha sığ olur (örn. %25 → %15 → %8), hacim de kurur. Bu daralma, satıcıların tükendiğini ve hissenin "sıkıştığını" gösterir — yay gerilmektedir.</p>'+
      '<h2>Aşamalar</h2>'+
      '<ul>'+
      '<li><strong>Trend şablonu:</strong> Fiyat 50, 150 ve 200 günlük ortalamaların üzerinde; ortalamalar yukarı dizilmiş.</li>'+
      '<li><strong>Daralma:</strong> Ardışık düzeltmeler sığlaşır, dalgalanma azalır.</li>'+
      '<li><strong>Hacim kuruması:</strong> Daralmanın sonunda işlem hacmi belirgin düşer.</li>'+
      '<li><strong>Kırılım (pivot):</strong> Fiyat, direnç noktasını <strong>artan hacimle</strong> aşar — giriş noktası burasıdır.</li>'+
      '</ul>'+
      '<div class="bk-callout"><div class="bk-callout-h">Önce temel, sonra teknik</div><p>Minervini yalnızca grafiklere bakmaz. VCP\'yi sadece <strong>kazancı ve satışları güçlü büyüyen</strong>, sektör lideri şirketlerde arar. Teknik patern, güçlü bir temelin üzerine "zamanlama" katmanıdır.</p></div>'+
      '<div class="bk-callout"><div class="bk-callout-h">Sıkı risk kontrolü</div><p>Pivot kırılımından sonra fiyat geri gelip pivotun altına düşerse pozisyon kapatılır. Tipik zarar kes %5–%8 bandındadır. Düşük riskli giriş noktası bulmak, VCP\'nin asıl amacıdır.</p></div>'+
      '<div class="bk-crit-box"><div class="bk-crit-row"><span>Fiyat</span><span>200G ortalama üzeri</span></div><div class="bk-crit-row"><span>52H zirveye uzaklık</span><span>&lt; %15</span></div><div class="bk-crit-row"><span>Kazanç Büyümesi</span><span>Güçlü</span></div><div class="bk-crit-row"><span>Kırılım Hacmi</span><span>Ortalamanın üzeri</span></div></div>'
  }
];;

var INVESTORS = [{"name":"Bill Ackman","style":"Activist","desc":"Karlı, nakit üreten ama ucuz kalmış kaliteli şirketleri bulur. ROE %15, net marj %10 üzeri, F/K 20 altı.","tags":["F/K<20","ROE>15%","Marj>10%","Borç<80","Cari>1.2"]},{"name":"Cathie Wood / ARK","style":"","desc":"Yüksek büyüme potansiyelli yenilikçi teknoloji şirketlerini bulur. Gelir büyümesi %30 üzeri.","tags":["Gel↑30%","Cari>1"]},{"name":"Warren Buffett","style":"","desc":"Yüksek karlılık ve düşük borca sahip kaliteli şirketleri bulur. ROE %20, net marj %20, brüt marj %40 üzeri, F/K 5-25 arası.","tags":["F/K<25","F/K>5","ROE>20%","Brüt>40%","Marj>20%","Borç<50","Cari>1.5"]},{"name":"David Einhorn","style":"Deep Value","desc":"Piyasanın gözardı ettiği ucuz ama karlı şirketleri bulur. F/K 15 altı, ROE %10 üzeri, düşük borç.","tags":["F/K<15","ROE>10%","Marj>8%","Borç<50","Cari>1.5"]},{"name":"Philip Fisher","style":"Scuttlebutt","desc":"Satış ve karı istikrarlı büyüyen, yüksek marjlı şirketleri bulur. Büyüme %15, brüt marj %35, net marj %12 üzeri.","tags":["Brüt>35%","Marj>12%","K↑15%","Gel↑15%","Borç<60"]},{"name":"Benjamin Graham","style":"","desc":"Savunmacı yatırımcı kriterleriyle ucuz ve güvenli şirketleri bulur. F/K 15 altı, F/DD 1.5 altı, cari oran 2 üzeri, temettü ödeyen.","tags":["F/K<15","F/DD<1.5","Borç<50","Cari>2","Temettü>1%"]},{"name":"Joel Greenblatt","style":"Magic Formula","desc":"Magic Formula yaklaşımıyla hem ucuz hem yüksek getirili şirketleri bulur. ROE %25 üzeri, F/K 12 altı.","tags":["F/K<12","ROE>25%"]},{"name":"Carl Icahn","style":"Activist Value","desc":"Defter değerine yakın fiyatlı, nakit zengini şirketleri bulur. F/DD 1.5 altı, F/K 12 altı, temettü ödeyen.","tags":["F/K<12","F/DD<1.5","Borç<60","Cari>1.5","Temettü>1%"]},{"name":"Seth Klarman","style":"Margin of Safety","desc":"Geniş güvenlik marjıyla çok ucuz ve sağlam bilançolu şirketleri bulur. F/K 10 altı, F/DD 1.2 altı, borç minimal.","tags":["F/K<10","F/DD<1.2","Marj>5%","Borç<40","Cari>2"]},{"name":"Peter Lynch","style":"GARP","desc":"Büyüme hızına göre ucuz kalmış (GARP) şirketleri bulur. EPS büyümesi %20 üzeri, PEG 1.5 altı önceliklendirilir.","tags":["F/K<35","F/K>5","K↑20%","Borç<80","Cari>1"]},{"name":"Mark Minervini","style":"SEPA","desc":"Temel verileri güçlü, kar ivmesi yüksek şirketleri bulur. EPS büyümesi %25, ROE %17 üzeri.","tags":["ROE>17%","Marj>10%","K↑25%","Borç<100","Cari>1"]},{"name":"Charlie Munger","style":"Quality Compounder","desc":"Çok yüksek marjlı, neredeyse borçsuz kaliteli şirketleri bulur. Brüt marj %50, ROE %20 üzeri, borç/özkaynak %30 altı.","tags":["ROE>20%","Brüt>50%","Marj>20%","Borç<30","Cari>1.5"]},{"name":"William O'Neil","style":"CAN SLIM","desc":"CAN SLIM kriterleriyle kazanç ve satış ivmesi güçlü şirketleri bulur. EPS ve gelir büyümesi %25 üzeri, ROE %17 üzeri.","tags":["ROE>17%","K↑25%","Gel↑25%","Borç<100","Cari>1"]},{"name":"O'Shaughnessy","style":"Cornerstone Growth","desc":"Düşük F/S oranını büyüme ve momentumla birleştirir. F/S 1.5 altı, 6 aylık getiri %15 üzeri.","tags":["F/S<1.5","K↑5%","6A>15%"]},{"name":"Piotroski F-Score","style":"","desc":"Düşük F/DD hisseler arasında finansal sağlamlığı yüksek olanları bulur. F-Score 7-9 arası önceliklendirilir, F/DD 1 altı.","tags":["F/DD<1","ROE>3%","Cari>1"]},{"name":"Walter Schloss","style":"Deep Value","desc":"Defter değerinin altında, temettü ödeyen klasik ucuz hisseleri bulur. F/DD 1 altı, F/K 12 altı, temettü %2 üzeri.","tags":["F/K<12","F/DD<1","Borç<100","Cari>1.5","Temettü>2%"]},{"name":"George Soros","style":"Reflexivity","desc":"Güçlü fiyat momentumunu teknik onayla birleştirir. 3 aylık %10, 6 aylık %20 üzeri getiri, teknik skor 0.3 üzeri.","tags":["Teknik","3A>10%","6A>20%"]},{"name":"John Neff","style":"Windsor Fund","desc":"Düşük F/K ile makul büyüme ve temettüyü birleştirir. F/K 12 altı, büyüme %7 üzeri, temettü %2 üzeri.","tags":["F/K<12","Marj>8%","K↑7%","Gel↑7%","Temettü>2%"]},{"name":"Martin Zweig","style":"Winning on Wall Street","desc":"Yüksek kazanç büyümesini makul fiyatla birleştirir. EPS büyümesi %20, satış büyümesi %15 üzeri, F/K 30 altı.","tags":["F/K<30","K↑20%","Gel↑15%","Borç<50"]},{"name":"David Dreman","style":"Contrarian","desc":"Piyasanın en gözden düşmüş ama karlı hisselerini bulur. F/K 12 altı, F/DD 1.5 altı, EPS büyümesi pozitif.","tags":["F/K<12","F/DD<1.5","K↑5%"]},{"name":"Kenneth Fisher","style":"PSR","desc":"Düşük Fiyat/Satış oranıyla istikrarlı karlı şirketleri bulur. F/S 1.5 altı, net marj %5, EPS büyümesi %15 üzeri.","tags":["F/S<1.5","Marj>5%","K↑15%","Borç<40"]},{"name":"Terry Smith","style":"Fundsmith","desc":"Yüksek sermaye getirili, yüksek marjlı kaliteli şirketleri bulur. ROE %15, brüt marj %40, net marj %15 üzeri.","tags":["ROE>15%","Brüt>40%","Marj>15%","Borç<50"]},{"name":"Graham","style":"Net-Net (NCAV)","desc":"Net dönen varlık değerinin altında işlem gören en ucuz hisseleri bulur. F/DD 0.67 altı, cari oran 2 üzeri.","tags":["F/DD<0.67","Marj>1%","Borç<80","Cari>2"]},{"name":"Tobias Carlisle","style":"Acquirer's Multiple","desc":"Saf ucuzluk prensibiyle en düşük çarpanlı hisseleri bulur. F/K 10 altı.","tags":["F/K<10","Cari>1"]},{"name":"John Templeton","style":"Global Value","desc":"Küresel değer yaklaşımıyla ucuz ve büyüyen şirketleri bulur. F/K 15 altı, F/DD 1.5 altı, EPS büyümesi pozitif.","tags":["F/K<15","F/DD<1.5","K↑5%"]}];

var FUND_FILTERS = [{"name":"Değer Odaklı","style":"","desc":"Kazancına göre ucuz, defter değerine yakın fiyatlı ve temettü ödeyen şirketleri bulur. F/K 15 altı, PD/DD 2 altı, temettü %2 üzeri.","tags":["F/K<15","F/DD<2","Temettü>2%"]},{"name":"Büyüme Odaklı","style":"","desc":"Satışları ve karları hızla büyüyen, özkaynağını verimli kullanan şirketleri bulur. Kazanç büyümesi %20, gelir büyümesi %15, ROE %15 üzeri.","tags":["ROE>15%","K↑20%","Gel↑15%"]},{"name":"Temettü Odaklı","style":"","desc":"Yüksek ve sürdürülebilir temettü ödeyen, borcu makul şirketleri bulur. Temettü %4 üzeri, borç/özkaynak %80 altı, cari oran 1.2 üzeri.","tags":["Borç<80","Cari>1.2","Temettü>4%"]},{"name":"Kalite Odaklı","style":"","desc":"Yüksek karlılık ve düşük borçla her koşulda ayakta kalan şirketleri bulur. ROE %20, net marj %15, brüt marj %35 üzeri.","tags":["ROE>20%","Brüt>35%","Marj>15%","Borç<80","Cari>1.5"]},{"name":"Düşük Borç Odaklı","style":"","desc":"Borcu çok düşük, nakdi güçlü, krize dayanıklı şirketleri bulur. Borç/özkaynak %30 altı, cari oran 2 üzeri.","tags":["Borç<30","Cari>2"]},{"name":"Momentum Odaklı","style":"","desc":"Satış ve kar büyümesi aynı anda ivmelenen şirketleri bulur. Her ikisi de %20 üzeri.","tags":["K↑20%","Gel↑20%"]},{"name":"Küçük Ölçek","style":"","desc":"Kurumların radarına girmemiş küçük ama karlı şirketleri bulur. Piyasa değeri 500M dolar altı, ROE %15 ve kazanç büyümesi %15 üzeri.","tags":["ROE>15%","K↑15%","PD<$500M"]},{"name":"Büyük Ölçek","style":"","desc":"Oturmuş, güvenilir büyük şirketleri bulur. Piyasa değeri 10 milyar dolar üzeri, ROE %12 üzeri ve temettü ödeyen.","tags":["ROE>12%","Temettü>1%","PD>$10B"]}];

var TECH_FILTERS = [{"name":"Breakout","style":"","desc":"52 haftalık zirvesinin dibinde hacimli yukarı hareket yapan hisseleri bulur. Zirveye %5 mesafe, günlük %1.5 üzeri artış.","tags":["Teknik","Günlük>1.5%","Hacim>0.5M","Zirveye 5%"]},{"name":"Aşırı Satış","style":"","desc":"Sert düşüş sonrası aşırı satılmış bölgeye giren hisseleri bulur. RSI 35 altı, zirveden %20 üzeri uzaklık.","tags":["Günlük>0%","RSI<35","Zirveden ↓20%"]},{"name":"52H Zirve","style":"","desc":"52 haftalık zirvesine yakın seyreden güçlü trenddeki hisseleri bulur. Zirveye %5 mesafe, 3 aylık getiri %5 üzeri.","tags":["3A>5%","Zirveye 5%"]},{"name":"Düzeltme","style":"","desc":"Güçlü trendde kısa geri çekilme yaşayan hisseleri bulur. Zirveden %5-15 geride, 6 aylık getiri %15 üzeri.","tags":["6A>15%","Zirveye 15%","Zirveden ↓5%"]},{"name":"Günlük Hareket","style":"","desc":"Bugün yüksek hacimle sert yükselen hisseleri bulur. Günlük %2 üzeri artış, 0.5M üzeri hacim.","tags":["Günlük>2%","Hacim>0.5M"]},{"name":"Yüksek Hacim","style":"","desc":"Normalinin en az 2 katı hacimle yükselen hisseleri bulur. Göreli hacim artışı kurumsal ilginin en güvenilir işaretidir.","tags":["Günlük>0%","Hacim 2×"]},{"name":"Teknik Alım","style":"","desc":"26 teknik göstergenin çoğunluğunun alım sinyali verdiği hisseleri bulur. Teknik skor 0.5 üzeri.","tags":["Teknik"]},{"name":"3A Momentum","style":"","desc":"Hem 3 hem 6 aydır piyasanın önünde giden hisseleri bulur. 3 aylık %15, 6 aylık %20 üzeri getiri.","tags":["3A>15%","6A>20%"]},{"name":"Trend Takibi","style":"","desc":"52 haftalık dibinden uzaklaşmış, kazancını koruyan hisseleri bulur. Dipten %25 üzeri, 6 aylık getiri %10 üzeri.","tags":["6A>10%","Dip>25%"]},{"name":"Dip Tepkisi","style":"","desc":"Aşırı satıştan çıkıp toparlanmanın erken aşamasında olan hisseleri bulur. RSI 30-50 arası, dipten %3 üzeri.","tags":["RSI<50","RSI>30","Dip>3%"]},{"name":"Golden Cross","style":"","desc":"Uzun vadeli yapısal yükseliş trendindeki hisseleri bulur. Fiyat 200 günlük ortalamanın, 50 günlük ortalama 200 günlüğün üzerinde.","tags":[">SMA200","50>200"]},{"name":"MACD Dönüşü","style":"","desc":"Düşüş sonrası yeni yükseliş sinyali veren hisseleri bulur. MACD sinyal çizgisini yukarı kesmiş, henüz sıfırın altında.","tags":["MACD↑"]},{"name":"Belirgin Trend","style":"","desc":"Gücü ölçülebilir, alıcı yönü baskın trendleri bulur. ADX 25 üzeri, +DI eksi DI üzerinde.","tags":["ADX>25"]},{"name":"Bollinger Dibi","style":"","desc":"Alt banda gerileyip ortalamaya dönüş potansiyeli taşıyan hisseleri bulur. Fiyat alt bandın %3 yakınında, RSI 40 altı.","tags":["RSI<40","BB Alt Bant"]},{"name":"Stokastik Dönüş","style":"","desc":"Aşırı satım bölgesinden yukarı dönen hisseleri bulur. %K 25 altı ve %D çizgisinin üzerine çıkmış.","tags":["%K<25","%K>%D"]},{"name":"Ortalama Onayı","style":"","desc":"15 hareketli ortalamanın çoğunluğunun üzerinde işlem gören hisseleri bulur. Ortalama skoru 0.5 üzeri.","tags":["MA Onayı"]},{"name":"Osilatör Onayı","style":"","desc":"Momentum osilatörlerinin alım bölgesinde olduğu hisseleri bulur. Osilatör skoru 0.1 üzeri.","tags":["Osilatör"]},{"name":"Defansif","style":"","desc":"Piyasadan az dalgalanan temettülü hisseleri bulur. Beta 0.8 altı, temettü %1 üzeri.","tags":["Temettü>1%","Beta<0.8"]},{"name":"1A Momentum","style":"","desc":"Son bir ayda güçlü ivme kazanan hisseleri bulur. 1 aylık getiri %10, 3 aylık getiri %10 üzeri.","tags":["3A>10%","1A>10%"]}];

var COLUMNS = [{"n":"FİYAT","e":"price","d":"Hissenin güncel piyasa fiyatı (borsanın yerel para biriminde)."},{"n":"P.Değeri","e":"market cap","d":"Piyasa değeri = fiyat × hisse adedi. Şirketin borsadaki toplam büyüklüğü."},{"n":"Günlük%","e":"change","d":"Bir önceki kapanışa göre günlük yüzde fiyat değişimi."},{"n":"PD/DD","e":"price/book","d":"Piyasa değerinin defter değerine (özkaynak) oranı. Düşük olması fiyatın varlık değerine yakınlığını gösterir."},{"n":"F/K","e":"price/earnings","d":"Fiyatın hisse başı yıllık kazanca oranı. Kazanca göre değerlemenin temel ölçüsü."},{"n":"GELİR↑%","e":"revenue growth","d":"Son 12 ayın bir önceki yıla göre gelir (ciro) büyüme oranı."},{"n":"ROE%","e":"return on equity","d":"Özkaynak kârlılığı. Şirketin hissedar parasını ne verimle kâra çevirdiği."},{"n":"MARJ%","e":"net margin","d":"Net kâr marjı. Her 100 TL satıştan kalan net kâr."},{"n":"B/Ö","e":"debt/equity","d":"Borç/özkaynak oranı. Finansal kaldıraç ve risk göstergesi; düşük olması sağlamlıktır."},{"n":"RSI","e":"rsi","d":"Göreceli Güç Endeksi (0–100). 70 üzeri aşırı alım, 30 altı aşırı satım bölgesi."},{"n":"ŞİRKET ADI","e":"name","d":"Şirketin tam unvanı."},{"n":"F/S","e":"price/sales","d":"Fiyatın satışlara (ciroya) oranı. Kârı dalgalı şirketlerde değerleme için kullanışlı."},{"n":"ROA%","e":"return on assets","d":"Aktif kârlılığı. Toplam varlıkların ne kadar verimli kâr ürettiği."},{"n":"K.BÜY%","e":"eps growth","d":"Hisse başı kazanç (EPS) büyümesi, yıldan yıla."},{"n":"F-Score","e":"piotroski","d":"Piotroski F-Skor (0–9). 9 finansal sağlık kriterine göre puan; 7+ güçlüdür."},{"n":"CARİ","e":"current ratio","d":"Cari oran = dönen varlık / kısa vadeli borç. Kısa vadeli ödeme gücü."},{"n":"TEMETTÜ%","e":"dividend yield","d":"Temettü verimi = yıllık temettü / fiyat. Pasif nakit getirisi."},{"n":"PEG","e":"peg","d":"F/K ÷ kazanç büyümesi. Büyümeye göre pahalılık; 1 altı cazip kabul edilir."},{"n":"Teknik Skor","e":"tech rating","d":"26 teknik göstergenin bileşik al/sat skoru (−1 güçlü sat … +1 güçlü al)."},{"n":"1H Geti%","e":"1w perf","d":"Son bir haftalık fiyat getirisi."},{"n":"3A Geti%","e":"3m perf","d":"Son üç aylık fiyat getirisi."},{"n":"H.Açık%","e":"free float","d":"Halka açıklık oranı; dolaşımdaki (serbest) hisse yüzdesi."},{"n":"SEKTÖR","e":"sector","d":"Şirketin faaliyet gösterdiği sektör."}];

var TERMS = [
  { n: 'F/K', e: 'Price/Earnings', d: 'Hisse fiyatının yıllık hisse başı kazanca oranı. Şirketin kazancına göre kaç yılda kendini ödeyeceğini gösterir; düşük olması "ucuz" işaretidir.' },
  { n: 'PD/DD', e: 'Price/Book', d: 'Piyasa değerinin defter değerine (özkaynak) oranı. 1\'in altı, fiyatın muhasebe değerinin altında olduğunu gösterir.' },
  { n: 'ROE', e: 'Return on Equity', d: 'Özkaynak kârlılığı. Şirketin hissedar parasını ne verimle kâra çevirdiğini ölçer; %15+ genelde güçlüdür.' },
  { n: 'ROA', e: 'Return on Assets', d: 'Aktif kârlılığı. Toplam varlıkların ne kadar verimli kâr ürettiğini gösterir.' },
  { n: 'PEG', e: 'P/E to Growth', d: 'F/K oranının büyüme hızına bölümü. Büyümeye göre değerlemeyi ölçer; 1\'in altı cazip kabul edilir.' },
  { n: 'F/S', e: 'Price/Sales', d: 'Fiyatın satışlara (ciroya) oranı. Henüz kâra geçmemiş ya da kârı dalgalı şirketleri değerlemede kullanışlıdır.' },
  { n: 'Net Marj', e: 'Net Margin', d: 'Net kârın satışlara oranı. Her 100 TL satıştan kaç TL net kâr kaldığını gösterir.' },
  { n: 'Brüt Marj', e: 'Gross Margin', d: 'Brüt kârın satışlara oranı. Fiyatlama gücü ve maliyet verimliliğinin göstergesidir.' },
  { n: 'Piotroski F-Skor', e: 'F-Score', d: '9 finansal sağlık kriterine göre 0–9 arası puan. Yüksek skor (7+) güçlü bilanço ve iyileşen temeli işaret eder.' },
  { n: 'Cari Oran', e: 'Current Ratio', d: 'Dönen varlıkların kısa vadeli borçlara oranı. Şirketin kısa vadeli yükümlülüklerini karşılama gücünü gösterir; 1.5+ sağlıklıdır.' },
  { n: 'Borç/Özkaynak', e: 'Debt/Equity', d: 'Toplam borcun özkaynağa oranı. Düşük olması finansal sağlamlık ve krizlere dayanıklılık işaretidir.' },
  { n: 'Temettü Verimi', e: 'Dividend Yield', d: 'Yıllık temettünün hisse fiyatına oranı. Pasif nakit getirisini ölçer; aşırı yüksek verim risk işareti olabilir.' },
  { n: 'Piyasa Değeri', e: 'Market Cap', d: 'Hisse fiyatı × toplam hisse adedi. Şirketin borsadaki toplam büyüklüğünü gösterir.' },
  { n: 'TTM', e: 'Trailing 12 Months', d: 'Son 12 aylık kümülatif veri. Yıllık rapor yerine en güncel 4 çeyreği toplar.' },
  { n: 'YoY', e: 'Year over Year', d: 'Bu dönemin geçen yılın aynı dönemiyle kıyaslanması. Mevsimsellikten arınmış büyümeyi gösterir.' },
  { n: 'Beta', e: 'Beta', d: 'Hissenin piyasaya göre dalgalanma katsayısı. 1 piyasayla aynı, &lt;1 daha sakin, &gt;1 daha oynak demektir.' }
];;

var INDICATORS = [
  { n: 'RSI — Göreceli Güç Endeksi', e: 'Relative Strength Index', d: '0–100 arası momentum osilatörü. Genel kabule göre 70 üzeri "aşırı alım", 30 altı "aşırı satım" bölgesidir. Trend gücünü ve olası dönüşleri ölçmede kullanılır.' },
  { n: 'MACD', e: 'Moving Average Convergence Divergence', d: 'İki hareketli ortalamanın farkına dayanan trend-momentum göstergesi. Sinyal çizgisini yukarı kesmesi yükseliş, aşağı kesmesi düşüş ivmesini işaret eder.' },
  { n: 'Hareketli Ortalamalar', e: 'SMA / EMA', d: 'Fiyatın belirli dönemdeki ortalamasını çizer (50, 200 gün yaygındır). Fiyatın ortalamanın üzerinde olması yükseliş trendini; 50G\'nin 200G\'yi yukarı kesmesi (Golden Cross) güçlü sinyali gösterir.' },
  { n: 'Bollinger Bantları', e: 'Bollinger Bands', d: 'Ortalama etrafına standart sapma ile çizilen üst/alt bantlar. Bantların daralması düşük volatiliteyi (olası kırılım öncesi), fiyatın alt banda değmesi aşırı satımı işaret edebilir.' },
  { n: 'Hacim Analizi', e: 'Volume', d: 'Bir fiyat hareketinin "gücünü" teyit eder. Yükselişe hacim eşlik ediyorsa hareket sağlıklı; hacimsiz yükseliş şüphelidir. Ortalamanın katı hacim kurumsal ilgiyi gösterebilir.' },
  { n: 'ADX — Trend Gücü', e: 'Average Directional Index', d: 'Trendin yönünü değil <em>gücünü</em> ölçer (0–100). 25 üzeri belirgin bir trendi, düşük değerler yatay/kararsız piyasayı gösterir.' },
  { n: 'Stokastik', e: 'Stochastic Oscillator', d: 'Kapanışın son dönemdeki fiyat aralığına göre konumunu ölçer. Aşırı satım bölgesinden yukarı dönüşler kısa vadeli toparlanma sinyali olabilir.' },
  { n: 'Destek & Direnç', e: 'Support / Resistance', d: 'Fiyatın tekrar tekrar tepki verdiği seviyeler. Direncin hacimle kırılması yeni bir yükseliş aşaması, desteğin kırılması zayıflık işareti olabilir.' }
];;

// ═══════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════
var SECTIONS = [
  { key: 'guides',    label: 'Strateji Rehberleri' },
  { key: 'investors', label: 'Yatırımcı Lensleri' },
  { key: 'filters',   label: 'Filtre Açıklamaları' },
  { key: 'columns',   label: 'Kolon Açıklamaları' },
  { key: 'ref',       label: 'Terimler & Göstergeler' }
];
var _active = 'guides';

function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _tags(arr){ if(!arr||!arr.length) return ''; return '<div class="bk-tags">'+arr.map(function(t){return '<span class="bk-tag">'+esc(t)+'</span>';}).join('')+'</div>'; }

function renderNav(){
  document.getElementById('bk-nav').innerHTML = SECTIONS.map(function(s){
    return '<button class="bk-nav-btn'+(s.key===_active?' on':'')+'" onclick="bkSelect(\''+s.key+'\')">'+s.label+'</button>';
  }).join('');
}

function bkSelect(key){
  _active = key;
  try{ history.replaceState(null,'','#'+key); }catch(e){}
  renderNav();
  renderContent();
  window.scrollTo({top:0,behavior:'smooth'});
}

function _lvlBadge(lvl){ var L = LVL[lvl] || LVL.b; return '<span class="bk-lvl '+L.cls+'">'+L.label+'</span>'; }

function _itemCard(name, eng, desc, tags){
  return '<div class="bk-item">'+
    '<div class="bk-item-name">'+esc(name)+(eng?' <span class="bk-eng">'+esc(eng)+'</span>':'')+'</div>'+
    '<div class="bk-item-desc">'+desc+'</div>'+ (tags||'') +
  '</div>';
}

function renderContent(){
  var c = document.getElementById('bk-content');
  if (_active === 'guides') {
    c.innerHTML =
      '<div class="bk-sec-intro">Dünyaca ünlü yatırımcıların kanıtlanmış yaklaşımlarını sade rehberlerle öğren. Her rehber bir zorluk seviyesi ve okuma süresiyle işaretlidir.</div>'+
      '<div class="bk-list">'+ GUIDES.map(function(g){
        return '<div class="bk-card" onclick="bkOpenGuide(\''+g.id+'\')">'+
          '<div class="bk-card-title">'+esc(g.title)+'</div>'+
          '<div class="bk-card-desc">'+esc(g.sub)+'</div>'+
          '<div class="bk-card-meta">'+_lvlBadge(g.level)+'<span class="bk-time">'+g.mins+' dk</span></div>'+
        '</div>';
      }).join('') +'</div>';
  } else if (_active === 'investors') {
    c.innerHTML =
      '<div class="bk-sec-intro">Pro tarayıcıdaki tüm yatırımcı lensleri. Her biri, ilgili yatırımcının kamuya açık metodolojisinden uyarlanan kriterlerle hisseleri eler. Toplam '+INVESTORS.length+' lens.</div>'+
      '<div class="bk-grid">'+ INVESTORS.map(function(g){
        var nm = g.name + (g.style ? ' <span class="bk-eng">'+esc(g.style)+'</span>' : '');
        return '<div class="bk-item"><div class="bk-item-name">'+esc(g.name)+(g.style?' <span class="bk-eng">'+esc(g.style)+'</span>':'')+'</div>'+
          '<div class="bk-item-desc">'+esc(g.desc)+'</div>'+_tags(g.tags)+'</div>';
      }).join('') +'</div>';
  } else if (_active === 'filters') {
    c.innerHTML =
      '<div class="bk-sec-intro">Tarayıcıdaki hazır filtre setleri ve uyguladıkları kriterler.</div>'+
      '<h2 class="bk-grp">Temel Filtreler</h2>'+
      '<div class="bk-grid">'+ FUND_FILTERS.map(function(f){ return _itemCard(f.name,'',esc(f.desc),_tags(f.tags)); }).join('') +'</div>'+
      '<h2 class="bk-grp">Teknik Filtreler</h2>'+
      '<div class="bk-grid">'+ TECH_FILTERS.map(function(f){ return _itemCard(f.name,'',esc(f.desc),_tags(f.tags)); }).join('') +'</div>';
  } else if (_active === 'columns') {
    c.innerHTML =
      '<div class="bk-sec-intro">Tarayıcı tablosundaki her kolonun ne anlama geldiği. Pro modda kolonlar sürüklenip gizlenebilir.</div>'+
      '<div class="bk-grid">'+ COLUMNS.map(function(t){ return _itemCard(t.n,t.e,t.d); }).join('') +'</div>';
  } else if (_active === 'ref') {
    c.innerHTML =
      '<div class="bk-sec-intro">Sık kullanılan finansal terimler ve teknik analiz göstergeleri.</div>'+
      '<h2 class="bk-grp">Terimler Sözlüğü</h2>'+
      '<div class="bk-grid">'+ TERMS.map(function(t){ return _itemCard(t.n,t.e,t.d); }).join('') +'</div>'+
      '<h2 class="bk-grp">Teknik Göstergeler</h2>'+
      '<div class="bk-grid">'+ INDICATORS.map(function(t){ return _itemCard(t.n,t.e,t.d); }).join('') +'</div>';
  }
}

function bkOpenGuide(id){
  var g = GUIDES.find(function(x){ return x.id===id; });
  if (!g) return;
  var c = document.getElementById('bk-content');
  var tryBtn = g.preset ? '<a class="bk-try" href="/?strateji='+encodeURIComponent(g.preset)+'">Bu stratejiyi tarayıcıda dene →</a>' : '';
  c.innerHTML =
    '<div class="bk-article">'+
      '<button class="bk-back" onclick="bkSelect(\'guides\')">← Rehberlere dön</button>'+
      '<div class="bk-art-meta">'+_lvlBadge(g.level)+'<span class="bk-time">'+g.mins+' dk okuma</span></div>'+
      '<h1 class="bk-art-h1">'+esc(g.title)+'</h1>'+
      g.body + tryBtn +
    '</div>';
  window.scrollTo({top:0,behavior:'smooth'});
}

(function init(){
  var h = (location.hash||'').replace('#','');
  if (SECTIONS.some(function(s){return s.key===h;})) _active = h;
  renderNav();
  renderContent();
})();
