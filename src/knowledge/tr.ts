import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-a-csv-file',
    title: 'CSV dosyası nedir?',
    summary: 'BlackBook’un içe ve dışa aktarmak için kullandığı, tablo biçimindeki düz metin dosyası.',
    group: 'Temel bilgiler',
    body: `CSV, "comma-separated values", yani "virgülle ayrılmış değerler" anlamına gelir. Bir tabloyu saklamanın neredeyse en basit yoludur: her satırın tablodaki bir satır olduğu ve sütunların virgüllerle ayrıldığı düz bir metin dosyası.

Küçücük bir adres defteri, CSV dosyası olarak bir metin düzenleyicide şöyle görünür:

- Name,Email,Phone
- Sam Okonkwo,sam@example.com,07700 900123
- Priya Shah,priya@example.com,

İlk satır sütun adlarını içerir. Sonraki her satır bir kişidir. İki virgül arasında hiçbir şey yoksa o hücre boştur. Bir değerin içinde kendi virgülü varsa, yeni bir sütunun başlangıcı sanılmasın diye çift tırnak içine alınır.

## Neden kullanışlıdır

- **Neredeyse her şey okuyabilir.** Excel, Numbers, Google Sheets ve LibreOffice CSV dosyalarını tablo olarak açar; çoğu adres defteri de CSV dışa aktarabilir.
- **İnsanlar okuyabilir.** Gizli bir biçimlendirme yoktur; dosyayı açıp içinde tam olarak ne olduğunu görebilirsiniz.
- **Sizi bağlamaz.** Bir CSV dışa aktarımı sizindir; BlackBook ile ya da BlackBook olmadan saklayabilir, taşıyabilir veya başka yerde açabilirsiniz.

## Neler yapamaz

Bir CSV dosyası yalnızca metin içerir. Resim, parola veya şifreleme yoktur; bu nedenle dosyayı ele geçiren herkes içindeki her adı, numarayı ve notu okuyabilir. Dışa aktarılan dosyaları güvendiğiniz bir yerde saklayın ve artık ihtiyacınız olmayan kopyaları silin.

## Tarihler ve tablolar

Tablo programları bazen açtıkları içeriğin biçimini değiştirir ve bir doğum gününü ya da uzun bir telefon numarasını başka bir şeye dönüştürür. Bir dışa aktarımı yeniden içe aktarmadan önce tablo programında düzenlerseniz, kaydetmeden önce bu sütunları kontrol edin.`,
  },
  {
    id: 'where-your-book-lives',
    title: 'Rehberiniz nerede saklanır',
    summary: 'Bu cihazda, hesap gerekmeden; bunun sizin için anlamı.',
    group: 'Temel bilgiler',
    body: `BlackBook adres defterinizi kullandığınız cihazda saklar. Bir tarayıcıda, o tarayıcının bu site için ayırdığı depolama alanında durur; telefon uygulamasında ise uygulamanın kendi depolama alanında durur. Çevrimiçi yedeklemeyi açmadığınız sürece kişilerinizle ilgili hiçbir şey hiçbir yere gönderilmez.

BlackBook’u kullanmak için hesaba ihtiyacınız yoktur. Oturum açmadan her şey çalışır.

## Pratikte bunun anlamı

- **Her cihazın kendi rehberi vardır.** Dizüstü bilgisayarda eklediğiniz kişiler telefonunuzda kendiliğinden görünmez. Onları birleştiren çevrimiçi yedeklemedir.
- **Tarayıcıyı temizlemek rehberi silebilir.** Bu sitenin verilerini veya geçmişini silmek, gizli pencere kullanmak ya da uygulamayı kaldırmak orada saklanan rehberi siler.
- **Cihazınızın kendi kişileri ayrıdır.** BlackBook, telefonunuzdaki yerleşik adres defterine bir şey eklemez, onu değiştirmez ve onunla eşitlenmez.

## Bir kopya tutmak

Cihazınızdaki rehber tek kopya olabileceği için bir kopya daha tutmakta fayda vardır:

1. Zaman zaman bir CSV dosyası dışa aktarıp güvenli bir yerde saklayın veya
2. Universal ID ile oturum açıp şifreli çevrimiçi yedeklemeyi açın.

## Bu uygulamayı ayarla

Uygulamanın bu cihazdaki görünümü ve davranışıyla ilgili seçimler, örneğin hangi sekmelerin gösterileceği, yalnızca bu cihazda kalır ve yedeğin parçası değildir.`,
  },
  {
    id: 'importing-and-exporting',
    title: 'Kişileri içeri almak ve dışarı çıkarmak',
    summary: 'CSV içe ve dışa aktarma ile telefon kişilerinizden kişi seçme.',
    group: 'Nasıl çalışır',
    body: `## Dışa aktarma

Dışa aktarma, rehberinizin tamamını adında bugünün tarihi olan bir CSV dosyasına kaydeder. Dosyada ad, e-posta, etiketler, notlar, doğum günü, telefon, şirket ve bir kişinin doğum gününün ya da kartının gizlenip gizlenmediği için birer sütun vardır; böylece bir yedek, rehberi bıraktığınız gibi geri getirir. Dosya her tablo programında açılır.

## CSV dosyası içe aktarma

BlackBook’tan veya başka bir adres defterinden dışa aktarılmış bir CSV dosyasını içe aktarabilirsiniz. Dosyadaki kişileri rehberinize **eklemeyi** ya da rehberinizi onlarla **değiştirmeyi** siz seçersiniz.

BlackBook, Google Contacts ve Outlook’un kullandığı sütun adlarını tanır. Örneğin:

- "Categories", "Groups" veya "Labels" sütunu etiket olarak okunur.
- "Mobile", "Telephone" veya Google’ın numaralı telefon sütunları telefon numarası olarak okunur.
- "Organisation" ve Google’ın kuruluş sütunu şirket olarak okunur.

Ne adı ne de e-posta adresi olan satırlar atlanır.

## Dosyadaki doğum günleri

Doğum günleri 1990-06-04, 4 June 1990, June 4 veya --06-04 (yılı olmayan bir doğum günü) biçiminde kabul edilir. 04/06/1990 şeklinde yazılmış bir tarih bilerek reddedilir: Birleşik Krallık’ta bu 4 Haziran, ABD’de ise 6 Nisan’dır ve tahmin etmek kullanıcıların yarısı için yanlış olurdu.

## Telefon kişilerinizden

Telefon uygulamasında, yeni bir kartı doldurmak için telefon kişilerinizden birini seçebilir ya da telefonunuzun tüm adres defterini tek seferde içe aktarabilirsiniz. Toplu içe aktarma, rehberinizde zaten olan kişileri atlar; bu yüzden daha sonra güvenle yeniden çalıştırabilirsiniz. Android’deki Chrome’da tarayıcının kişi seçicisi aynı işlemi bir ad, bir e-posta ve bir numara için sunar.

BlackBook telefon kişilerinizi yalnızca siz istediğinizde okur ve onlara hiçbir zaman bir şey yazmaz. Telefonunuzdaki kişi kartında bulunan not kopyalanmaz.`,
  },
  {
    id: 'tags-lists-and-hiding',
    title: 'Etiketler, e-posta listeleri ve gizlenen kişiler',
    summary: 'Kimseyi silmeden rehberinizi düzenlemenin yolları.',
    group: 'Nasıl çalışır',
    body: `## Etiketler

Etiketler Aile, İş veya Kitap kulübü gibi size ait adlardır. Yeni bir rehber hiç etiketle başlamaz, çünkü insanları nasıl sınıflandıracağınıza siz karar verirsiniz. İstediğiniz kadar etiket oluşturabilir, her birine bir renk verebilir ve bir kişiyi uygun olduğu kadar etikete koyabilirsiniz. Filtre, seçtiğiniz etiketlerden herhangi birine sahip olan herkesi gösterir.

## E-posta listeleri

**Bu uygulamayı ayarla** bölümünde e-posta listelerini açarsanız, birlikte e-posta gönderdiğiniz kişilerden gruplar oluşturabilirsiniz. Liste bir tür etikettir. Bir listeyi kopyaladığınızda Gmail, Outlook veya Apple Mail’in Kime alanına yapıştırmaya hazır bir ad ve adres satırı elde edersiniz. E-posta adresi olmayan kişiler dışarıda kalır, iki kez geçen bir adres yalnızca bir kez eklenir.

## Birini listeden gizlemek

Birini ana listeden çıkarmak için telefonda kartını sağa kaydırın veya kartın köşesindeki yuvarlak düğmeyi kullanın. Kişi göz atarken gizlenir, aramada asla gizlenmez: adını yazdığınızda soluk olarak, onu geri getirecek aynı düğmeyle birlikte görünür. Listenin altındaki bir çekmece gizlenen herkesi gösterir.

## Bir doğum günü hatırlatmasını gizlemek

Doğum günleri görünümü, doğum günü kayıtlı herkesi en yakından başlayarak gösterir. Tarihi silmeden bir kişiyi bu görünümden gizleyebilirsiniz. Birini ana listeden gizlemek ile doğum gününü gizlemek birbirinden bağımsız seçimlerdir.

## Silmek

Silme her zaman önce onay ister ve kimin silineceğini adıyla belirtir. Telefonda bir kartı sola kaydırmak yalnızca Sil düğmesini ortaya çıkarır; kaydırma tek başına hiçbir şeyi silmez. Birden fazla kişiyi seçip birlikte silebilir, etiketleyebilir veya gizleyebilirsiniz.`,
  },
  {
    id: 'the-pin-lock',
    title: 'PIN kilidi ne yapar, ne yapmaz',
    summary: 'Uygulama için 4 haneli bir kilit; rehberin şifrelenmesi değil.',
    group: 'Gizlilik ve güvenlik',
    body: `BlackBook’un o cihazda her açılışta sormasını sağlamak için 4 haneli bir PIN belirleyebilirsiniz. Amacı, telefonunuzu veya dizüstü bilgisayarınızı eline alan birini uzak tutmaktır.

## Neyi korur

- Bu cihazda uygulamayı PIN olmadan kimsenin açmasına izin vermez.
- Art arda beş yanlış denemeden sonra tuş takımı yeniden denemeden önce sizi bekletir ve bekleme süresi her seferinde iki katına çıkar.
- PIN’inizin kendisi asla saklanmaz. BlackBook yalnızca onun karıştırılmış bir parmak izini tutar; bu iz bilerek yavaş doğrulanır ve bu da tahmin etmeyi pahalı hâle getirir.
- Kilit yalnızca bu cihaza aittir ve asla internete yüklenmez.

## Neyi yapmaz

PIN verileri değil, uygulamayı kilitler. Rehberiniz cihazın depolama alanında eskisi gibi durur; bu nedenle cihazınızın kendi ekran kilidinin ve parolasının yerini tutmaz. Dört hane yalnızca 10.000 olasılık sunar; bu, güvenli bir şifreleme anahtarı için çok azdır.

## PIN’inizi unutursanız

Kimse size PIN’inizi söyleyemez veya kilidi sizin yerinize kaldıramaz. Unutulan bir PIN’i aşmanın tek yolu kilit ekranındaki "Forgotten your PIN?" düğmesidir; bu düğme **bu cihazdaki rehberi siler** ve kilitsiz olarak baştan başlar. Bunu sunmayı güvenli kılan da budur: bir yabancı uygulamayı boşaltabilir ama asla okuyamaz.

Şifreli çevrimiçi yedeklemeyi kullanıyorsanız, unutulan bir PIN yalnızca küçük bir zahmettir: yeniden oturum açın, yedek parola ifadenizi girin ve rehberiniz geri gelir. Yedek yoksa geri yüklenecek bir şey de yoktur; bu nedenle PIN belirlemeden önce yedeklemeyi açın veya bir CSV dosyası dışa aktarın.`,
  },
  {
    id: 'encrypted-online-backup',
    title: 'Şifreli çevrimiçi yedekleme',
    summary: 'Rehberinizin cihazdan çıkmadan önce nasıl şifrelendiği ve neden başka kimsenin okuyamadığı.',
    group: 'Gizlilik ve güvenlik',
    body: `Çevrimiçi yedekleme isteğe bağlıdır ve Universal ID ile oturum açana kadar kapalıdır. Açıldığında BlackBook, rehberinizin bir kopyasını UNI·SIM sunucularında tutar; böylece rehber bir cihazın kaybolmasından etkilenmez ve başka bir cihazda açılabilir.

## Çıkmadan önce şifrelenir

Rehberiniz, herhangi bir şey gönderilmeden önce cihazınızda şifrelenir. Sunucu yalnızca anahtarına sahip olmadığı karışık veriyi alır ve saklar; bu nedenle UNI·SIM kişilerinizi, notlarınızı, etiketlerinizi veya yapılacaklarınızı okuyamaz.

- Şifreleme, yaygın olarak kullanılan bir standart olan **256 bit anahtarlı AES-GCM**’dir.
- Anahtar, **sizin seçtiğiniz bir parola ifadesinden** PBKDF2 ve SHA-256 ile 600.000 turda türetilir; bu da parola ifadesini tahmin etmeye yönelik her denemeyi yavaş ve maliyetli kılar.
- Parola ifadeniz cihazınızdan hiç çıkmaz. Universal ID parolanız **değildir** ve o parolayı değiştirmek onu etkilemez.

Bu önemlidir, çünkü rehberinizdeki kişiler hiçbir şeye kaydolmamıştır. Onların adları, adresleri ve onlar hakkındaki özel notlarınız, kendi verileriniz kadar özeni hak eder.

## Kurtarma yoktur

UNI·SIM anahtarınızın hiçbir kopyasını tutmaz ve parola ifadenizi sıfırlamanın bir yolu yoktur. Unutursanız çevrimiçi kopyayı kimse açamaz. Cihazınızdaki rehber etkilenmez; çevrimiçi kopyanın ana kopya değil, bir yedek olmasının nedeni budur.

## Cihazı hatırlatmak

Parola ifadesini her seferinde girmemek için bir cihazdan anahtarı hatırlamasını isteyebilirsiniz. Anahtar, uygulamanın kullanabileceği ama dışarı çıkaramayacağı bir biçimde saklanır. Oturumu kapatmak veya bu cihazı unutmayı seçmek anahtarı kaldırır.

## Değiştirmek veya silmek

Parola ifadesini değiştirmek, onu hatırlayan bir cihazda bile mevcut ifadeyi gerektirir ve yedeği tek adımda yeniden şifreler. Yedeklemeyi kapatmak çevrimiçi kopyayı tamamen siler ve cihazınızdaki rehberi olduğu gibi bırakır. Universal ID’nizi silmek çevrimiçi kopyayı da siler.

Yedeğin yaklaşık 2 MB şifreli veri sınırı vardır; bu, binlerce kişiye karşılık gelir. Bir rehber bu sınıra ulaştığında neden genellikle çok uzun notlardır.`,
  },
  {
    id: 'using-two-devices',
    title: 'BlackBook’u birden fazla cihazda kullanmak',
    summary: 'Oturum açarken birleştirme, otomatik kaydetme ve iki cihaz anlaşamadığında ne olduğu.',
    group: 'Gizlilik ve güvenlik',
    body: `Çevrimiçi yedekleme açıkken aynı rehberi telefonunuzda, tabletinizde ve bilgisayarınızda açabilirsiniz. Her cihaz kendi kopyasını tutar, çevrimiçi yedek ise hepsini güncel tutar.

## Yeni bir cihazda oturum açmak

1. Universal ID ile oturum açın.
2. Yedek parola ifadenizi girin.
3. Bu cihazda zaten kendi kişileri varsa, BlackBook bunları birleştirmek mi yoksa yalnızca çevrimiçi kopyayı kullanmak mı istediğinizi sorar.

Birleştirirken çevrimiçi kopya temel alınır ve bu cihazın kişileri ona eklenir. Zaten orada olan biri, aynı kart olarak ya da aynı ad ve aynı e-posta veya telefon numarasıyla tanınır ve iki kez eklenmez. Aynı adlı etiketler tek etikete dönüşür.

## Kaydetme

Yedekleme açıkken her değişiklik, yapıldıktan birkaç saniye sonra şifrelenip çevrimiçi kaydedilir. Başlığın yanındaki eşitleme göstergesi bir kaydın yolda olduğunu gösterir. BlackBook’u başka bir cihazda açtığınızda daha yeni kopyayı indirir.

## İki cihaz anlaşamadığında

Çevrimiçi kopya bütün bir rehber olarak kaydedilir. İki cihaz da son kayıttan bu yana rehberi değiştirdiyse, BlackBook sessizce birini seçmez. Durur ve hangisini tutmak istediğinizi sorar: daha yeni çevrimiçi kopyayı mı, yoksa bu cihazdaki sürümü mü. Seçmediğiniz sürümün yerine diğeri yazılır; emin değilseniz önce bir CSV dosyası dışa aktarın.

## Parola ifadesini değiştirdikten sonra

Bir cihazda parola ifadesini değiştirdiğinizde diğer cihazlarınız kaydetmeyi bırakır ve yeni ifadeyi ister. Onlarda hiçbir şey kaybolmaz ve kilitlerini açtığınızda kişilerini yeniden birleştirmeyi önerirler. Hâlâ eski anahtarı tutan bir cihaz bu değişikliğin üzerine yazamaz.`,
  },
]

export default articles
