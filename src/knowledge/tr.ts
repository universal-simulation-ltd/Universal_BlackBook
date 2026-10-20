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
    body: `BlackBook adres defterinizi kullandığınız cihazda saklar. Bir tarayıcıda, o tarayıcının bu site için ayırdığı depolama alanında durur; telefon uygulamasında ise uygulamanın kendi depolama alanında durur. Kişilerinizle ilgili hiçbir şey hiçbir zaman hiçbir yere gönderilmez.

Hesap yoktur ve oturum açılacak hiçbir şey yoktur.

## Pratikte bunun anlamı

- **Her cihazın kendi rehberi vardır.** Dizüstü bilgisayarda eklediğiniz kişiler telefonunuzda kendiliğinden görünmez. Onları diğer cihaza bir yedek dosyasıyla taşırsınız.
- **Tarayıcıyı temizlemek rehberi silebilir.** Bu sitenin verilerini veya geçmişini silmek, gizli pencere kullanmak ya da uygulamayı kaldırmak orada saklanan rehberi siler.
- **Cihazınızın kendi kişileri ayrıdır.** BlackBook, telefonunuzdaki yerleşik adres defterine bir şey eklemez, onu değiştirmez ve onunla eşitlenmez.

## Bir kopya tutmak

Cihazınızdaki rehber tek kopya olabileceği için bir kopya daha tutmakta fayda vardır:

1. Zaman zaman bir yedek dosyası kaydedin ("Gelişmiş", ardından "Yedek, içe ve dışa aktarma") ve güvenli bir yerde saklayın. Dosya, yapılacaklarınız dahil her şeyi içerir ve parolalı olabilir.
2. Ya da her tablo programının ve adres defterinin okuyabildiği, ancak yapılacaklarınızı dışarıda bırakan bir CSV dosyası dışa aktarın.

## Bu uygulamayı ayarla

Uygulamanın bu cihazdaki görünümü ve davranışıyla ilgili seçimler, örneğin hangi sekmelerin gösterileceği, bu cihazda kalır. Bir yedek dosyası bunları da taşır, ancak onları yalnızca "Her şeyi değiştir" geri getirir.`,
  },
  {
    id: 'importing-and-exporting',
    title: 'Kişileri içeri almak ve dışarı çıkarmak',
    summary: 'CSV içe ve dışa aktarma ile telefon kişilerinizden kişi seçme.',
    group: 'Nasıl çalışır',
    body: `## Dışa aktarma

Dışa aktarma, rehberinizin tamamını adında bugünün tarihi olan bir CSV dosyasına kaydeder. Dosyada ad, e-posta, etiketler, notlar, doğum günü, telefon, şirket ve bir kişinin doğum gününün ya da kartının gizlenip gizlenmediği için birer sütun vardır; böylece dosyayı yeniden içe aktardığınızda kişileriniz bıraktığınız gibi geri gelir. Dosya her tablo programında açılır. Yapılacaklarınız dosyada yer almaz: eksiksiz bir kopya için bunun yerine bir yedek dosyası kaydedin (bkz. "Yedek dosyanız").

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
- Kilit yalnızca bu cihaza aittir ve asla bir yedek dosyasına konmaz.

## Neyi yapmaz

PIN verileri değil, uygulamayı kilitler. Rehberiniz cihazın depolama alanında eskisi gibi durur; bu nedenle cihazınızın kendi ekran kilidinin ve parolasının yerini tutmaz. Dört hane yalnızca 10.000 olasılık sunar; bu, güvenli bir şifreleme anahtarı için çok azdır.

## PIN’inizi unutursanız

Kimse size PIN’inizi söyleyemez veya kilidi sizin yerinize kaldıramaz. Unutulan bir PIN’i aşmanın tek yolu kilit ekranındaki "Forgotten your PIN?" düğmesidir; bu düğme **bu cihazdaki rehberi siler** ve kilitsiz olarak baştan başlar. Bunu sunmayı güvenli kılan da budur: bir yabancı uygulamayı boşaltabilir ama asla okuyamaz.

Bir yedek dosyanız varsa, unutulan bir PIN yalnızca küçük bir zahmettir: sıfırlamadan sonra yedeği açın ve rehberiniz geri gelir. Yedek yoksa geri yüklenecek bir şey de yoktur; bu nedenle PIN belirlemeden önce bir yedek kaydedin.`,
  },
  {
    id: 'backup-file',
    title: 'Yedek dosyanız',
    summary: 'Rehberinizdeki her şeyi içeren tek bir dosya, isteğe bağlı bir parola ve dosyayı yeniden nasıl açacağınız.',
    group: 'Gizlilik ve güvenlik',
    body: `Yedek dosyası, rehberinizin tek bir dosyadaki eksiksiz kopyasıdır. Kaydetmek için "Eylemler", ardından "Gelişmiş", ardından "Yedek, içe ve dışa aktarma" bölümünü açın ve "Yedek kaydet" seçeneğini seçin. Telefonda paylaşım menüsü açılır; dosyayı Dosyalar’da, bir bulut sürücüde ya da kendinize gönderdiğiniz bir e-postada saklayabilirsiniz. Tarayıcıda ise dosya indirilir.

## İçinde neler var

- Her alanıyla birlikte her kişi: ad, e-posta, telefon, şirket, adres, doğum günü, notlar, etiketler, sabitlenenler ve gizlenenler.
- Etiketleriniz ve e-posta listeleriniz.
- Yapılacaklar listeniz.
- "Bu uygulamayı ayarla" bölümündeki seçimleriniz ve listenin açıldığı görünüm.

PIN’iniz dosyada yer almaz. PIN cihaza aittir.

## Parolayla korumak

Rehberiniz, hiçbir şeye kaydolmamış başka insanlarla ilgilidir; bu yüzden dosyayı bir parolayla kilitleyebilirsiniz. Kaydetmeden önce "Parolayla koru" kutusunu işaretleyin.

- Dosya, yaygın olarak kullanılan bir standart olan **256 bit anahtarlı AES-GCM** ile şifrelenir.
- Anahtar, parolanızdan PBKDF2, SHA-256 ve 600.000 turla türetilir; bu da her tahmin denemesini yavaş ve maliyetli kılar.
- Parola hiçbir zaman saklanmaz veya bir yere gönderilmez. UNI·SIM dahil hiç kimse dosyayı parola olmadan açamaz ve parolayı sıfırlamanın bir yolu yoktur.

Parola olmadan dosya, bir CSV dışa aktarımı gibi düz metindir: onu ele geçiren herkes okuyabilir.

## Bir yedeği açmak

"Yedek aç" seçeneğini seçip dosyayı belirleyin ya da tarayıcıda dosyayı pencereye bırakın. Dosyanın parolası varsa parola sorulur. Ardından şunlardan birini seçin:

- **Mevcutlara ekle.** Bu cihazda zaten olan her şey kalır. Dosyadaki kişiler ve yapılacaklar eklenir; bir öğe ikisinde de varsa en son düzenlenen kopya tutulur. Burada aynı adla ve aynı e-posta ya da telefon numarasıyla zaten bulunan biri iki kez eklenmez; aynı adlı etiketler tek etikete dönüşür.
- **Her şeyi değiştir.** Siz onayladıktan sonra bu cihazdaki rehberin yerini dosyadaki rehber alır.

BlackBook bir dosyayı kullanmadan önce içindeki her alanı kontrol eder; bu sayede bozuk veya düzenlenmiş bir dosya uygulamayı bozamaz.`,
  },
  {
    id: 'using-two-devices',
    title: 'BlackBook’u birden fazla cihazda kullanmak',
    summary: 'Rehberinizi bir yedek dosyasıyla cihazlar arasında taşımak.',
    group: 'Gizlilik ve güvenlik',
    body: `BlackBook’ta hesap ve çevrimiçi kopya yoktur; bu yüzden her cihaz kendi rehberini tutar ve hiçbir şey onları sizden habersiz birleştirmez. Rehberinizi başka bir cihaza götürmek için bir yedek dosyası kullanın.

## Rehberinizi taşımak

1. Rehberinizin bulunduğu cihazda bir yedek dosyası kaydedin. Dosya e-postadan veya bir bulut sürücüden geçecekse parola koymak iyi bir fikirdir.
2. Dosyayı diğer cihaza aktarın; örneğin AirDrop, bir bulut sürücü veya e-postayla.
3. Diğer cihazda BlackBook’u açın, "Yedek aç" seçeneğini seçin ve dosyayı belirleyin.

Diğer cihaz yeniyse "Her şeyi değiştir" seçeneğini seçin. Cihazda zaten kendi kişileri varsa "Mevcutlara ekle" seçeneğini seçin; iki rehber birleştirilir.

## İki cihazı güncel tutmak

Otomatik eşitleme yoktur. İki cihaza da kişi eklerseniz, birinde bir yedek kaydedip diğerinde "Mevcutlara ekle" ile açın: kimse iki kez eklenmez ve en son düzenlenen kopya kazanır. Birleştirme yalnızca ekleme yapar; bu yüzden bir cihazda sildiğiniz biri, onu hâlâ içeren bir yedekten geri gelebilir.

## Neden oturum açma yok

Bir adres defteri başka insanların adlarını, numaralarını ve onlar hakkındaki notlarınızı içerir. Onu yalnızca kendi cihazlarınızda tutmak ve denetimi sizde olan bir dosyayla taşımak, hiç kimsenin sunucusunda bir kopyasının bulunmaması demektir.`,
  },
]

export default articles
