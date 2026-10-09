import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-a-csv-file',
    title: 'Che cos’è un file CSV?',
    summary: 'Il semplice file di testo, a forma di tabella, che BlackBook usa per importare ed esportare.',
    group: 'Le basi',
    body: `CSV sta per «comma-separated values», cioè «valori separati da virgole». È quasi il modo più semplice che esista per conservare una tabella: un file di testo in cui ogni riga è una riga della tabella e le virgole separano le colonne.

Una piccolissima rubrica in formato CSV, aperta in un editor di testo, appare così:

- Name,Email,Phone
- Sam Okonkwo,sam@example.com,07700 900123
- Priya Shah,priya@example.com,

La prima riga contiene i nomi delle colonne. Ogni riga successiva è una persona. Se tra due virgole non c’è niente, quella cella è vuota. Se un valore contiene a sua volta una virgola, viene racchiuso tra virgolette perché non venga scambiato per l’inizio di una nuova colonna.

## Perché è utile

- **Quasi tutto lo sa leggere.** Excel, Numbers, Google Sheets e LibreOffice aprono i file CSV come fogli di calcolo, e la maggior parte delle rubriche sa esportarne uno.
- **È leggibile da una persona.** Non c’è formattazione nascosta: puoi aprire il file e vedere esattamente cosa contiene.
- **Non ti vincola.** Un’esportazione CSV è tua: puoi tenerla, spostarla o aprirla altrove, con o senza BlackBook.

## Cosa non può fare

Un file CSV contiene solo testo. Non ha immagini, password né crittografia, quindi chiunque ne ottenga una copia può leggere ogni nome, numero e nota. Conserva i file esportati in un posto di cui ti fidi ed elimina le copie che non ti servono più.

## Date e fogli di calcolo

I fogli di calcolo a volte cambiano il formato di ciò che aprono, trasformando un compleanno o un numero di telefono lungo in qualcos’altro. Se modifichi un’esportazione in un foglio di calcolo prima di reimportarla, controlla quelle colonne prima di salvare.`,
  },
  {
    id: 'where-your-book-lives',
    title: 'Dove viene conservata la tua rubrica',
    summary: 'Su questo dispositivo, senza bisogno di un account, e cosa significa per te.',
    group: 'Le basi',
    body: `BlackBook conserva la tua rubrica sul dispositivo che stai usando. In un browser si trova nello spazio che quel browser riserva a questo sito; nell’app per telefono si trova nello spazio di archiviazione dell’app. Nulla dei tuoi contatti viene inviato da nessuna parte, a meno che tu non attivi il backup online.

Non ti serve un account per usare BlackBook. Tutto funziona senza accedere.

## Cosa significa in pratica

- **Ogni dispositivo ha la sua rubrica.** I contatti aggiunti sul portatile non compaiono da soli sul telefono. È il backup online a collegarli.
- **Svuotare il browser può svuotare la rubrica.** Eliminare i dati o la cronologia di questo sito, usare una finestra privata o disinstallare l’app cancella la rubrica conservata lì.
- **I contatti del dispositivo sono separati.** BlackBook non aggiunge nulla, non modifica e non si sincronizza con la rubrica integrata nel telefono.

## Tenere una copia

Poiché la rubrica sul tuo dispositivo potrebbe essere l’unica copia, conviene averne un’altra:

1. Esporta ogni tanto un file CSV e conservalo in un posto sicuro, oppure
2. Accedi con il tuo Universal ID e attiva il backup online crittografato.

## Regola questa app

Le scelte sull’aspetto e sul comportamento dell’app su questo dispositivo, come le schede mostrate, restano solo su questo dispositivo e non fanno parte del backup.`,
  },
  {
    id: 'importing-and-exporting',
    title: 'Far entrare e uscire i contatti',
    summary: 'Importazione ed esportazione CSV, e scelta di persone dai contatti del telefono.',
    group: 'Come funziona',
    body: `## Esportare

L’esportazione salva tutta la rubrica in un file CSV con la data di oggi nel nome. Ha una colonna per nome, email, etichette, note, compleanno, telefono, azienda e per indicare se il compleanno o la scheda di una persona sono nascosti, così un backup ripristina la rubrica come l’avevi lasciata. Il file si apre in qualsiasi foglio di calcolo.

## Importare un file CSV

Puoi importare un file CSV esportato da BlackBook o da un’altra rubrica. Scegli tu se **aggiungere** le persone del file alla tua rubrica o **sostituire** la rubrica con loro.

BlackBook riconosce i nomi di colonna usati da Google Contacts e Outlook. Per esempio:

- Una colonna «Categories», «Groups» o «Labels» viene letta come etichette.
- «Mobile», «Telephone» o le colonne numerate del telefono di Google vengono lette come numero di telefono.
- «Organisation» e la colonna dell’organizzazione di Google vengono lette come azienda.

Le righe senza nome né indirizzo email vengono saltate.

## Compleanni in un file

I compleanni sono accettati come 1990-06-04, 4 June 1990, June 4 o --06-04 (un compleanno senza anno). Una data scritta 04/06/1990 viene rifiutata di proposito: nel Regno Unito è il 4 giugno, negli Stati Uniti il 6 aprile, e tirare a indovinare sarebbe sbagliato per metà degli utenti.

## Dai contatti del telefono

Nell’app per telefono puoi scegliere una persona dai contatti del telefono per compilare una nuova scheda, oppure importare in una volta tutta la rubrica del telefono. L’importazione completa salta chi è già nella tua rubrica, quindi puoi ripeterla più avanti senza problemi. In Chrome su Android, il selettore di contatti del browser offre lo stesso per un nome, un’email e un numero.

BlackBook legge i contatti del telefono solo quando glielo chiedi e non vi scrive mai nulla. La nota della scheda contatto del telefono non viene copiata.`,
  },
  {
    id: 'tags-lists-and-hiding',
    title: 'Etichette, liste email e persone nascoste',
    summary: 'Modi per organizzare la rubrica senza eliminare nessuno.',
    group: 'Come funziona',
    body: `## Etichette

Le etichette sono le tue categorie personali, come Famiglia, Lavoro o Club del libro. Una rubrica nuova non ne ha nessuna, perché come ordinare le persone lo decidi tu. Puoi crearne quante vuoi, dare un colore a ciascuna e mettere una persona sotto tutte le etichette che le si addicono. Il filtro mostra chiunque abbia almeno una delle etichette scelte.

## Liste email

Se attivi le liste email in **Regola questa app**, puoi tenere gruppi di persone a cui scrivi insieme. Una lista è un tipo di etichetta. Copiando una lista ottieni una riga di nomi e indirizzi pronta da incollare nel campo A di Gmail, Outlook o Apple Mail. Chi non ha un indirizzo email viene escluso, e un indirizzo ripetuto viene incluso una sola volta.

## Nascondere qualcuno dall’elenco

Scorri una scheda verso destra sul telefono, oppure usa il pulsante rotondo nel suo angolo, per togliere qualcuno dall’elenco principale. È nascosto quando scorri, mai quando cerchi: scrivi il suo nome e compare, attenuato, con lo stesso pulsante per riportarlo. Un cassetto in fondo all’elenco mostra tutte le persone nascoste.

## Nascondere un promemoria di compleanno

La vista dei compleanni mostra tutte le persone con un compleanno registrato, dal più vicino. Puoi nascondere una persona da quella vista senza eliminare la data. Nascondere qualcuno dall’elenco principale e nasconderne il compleanno sono scelte separate.

## Eliminare

L’eliminazione chiede sempre conferma e indica chi verrà eliminato. Sul telefono, scorrere una scheda verso sinistra mostra solo il pulsante Elimina; il gesto da solo non elimina nulla. Puoi anche selezionare più persone per eliminarle, etichettarle o nasconderle insieme.`,
  },
  {
    id: 'the-pin-lock',
    title: 'Cosa fa il PIN e cosa non fa',
    summary: 'Un blocco a 4 cifre sull’app, non una crittografia della rubrica.',
    group: 'Privacy e sicurezza',
    body: `Puoi impostare un PIN di 4 cifre perché BlackBook lo chieda ogni volta che viene aperto su quel dispositivo. Serve a tenere fuori chi prende in mano il tuo telefono o il tuo computer.

## Cosa protegge

- Impedisce a chiunque di aprire l’app su questo dispositivo senza il PIN.
- Dopo cinque tentativi sbagliati di fila, il tastierino ti fa aspettare prima di riprovare, e l’attesa raddoppia ogni volta.
- Il PIN in sé non viene mai salvato. BlackBook conserva solo un’impronta codificata, volutamente lenta da verificare, che rende costoso tirare a indovinare.
- Il blocco riguarda solo questo dispositivo e non viene mai caricato online.

## Cosa non fa

Il PIN blocca l’app, non i dati. La rubrica resta nella memoria del dispositivo esattamente come prima, quindi non sostituisce il blocco schermo e il codice del dispositivo. Quattro cifre offrono solo 10.000 combinazioni, troppo poche per una chiave di crittografia sicura.

## Se dimentichi il PIN

Nessuno può dirti il tuo PIN né togliere il blocco al posto tuo. L’unico modo per superare un PIN dimenticato è il pulsante «Forgotten your PIN?» nella schermata di blocco, che **cancella la rubrica su questo dispositivo** e ricomincia da capo, senza blocco. È questo che lo rende sicuro: un estraneo potrebbe svuotare l’app, ma mai leggerla.

Se usi il backup online crittografato, un PIN dimenticato è solo un fastidio: accedi di nuovo, inserisci la passphrase del backup e la rubrica torna. Senza backup non c’è nulla da ripristinare, quindi attivalo, o esporta un file CSV, prima di impostare un PIN.`,
  },
  {
    id: 'encrypted-online-backup',
    title: 'Il backup online crittografato',
    summary: 'Come la rubrica viene crittografata prima di lasciare il dispositivo e perché nessun altro può leggerla.',
    group: 'Privacy e sicurezza',
    body: `Il backup online è facoltativo e resta disattivato finché non accedi con il tuo Universal ID. Una volta attivo, BlackBook conserva una copia della rubrica sui server di UNI·SIM, così sopravvive alla perdita di un dispositivo e si può aprire su un altro.

## Crittografato prima di partire

La rubrica viene crittografata sul tuo dispositivo prima che venga inviato qualsiasi cosa. Il server riceve e conserva solo dati codificati di cui non ha la chiave, quindi UNI·SIM non può leggere i tuoi contatti, le note, le etichette o le attività.

- La crittografia è **AES-GCM con una chiave a 256 bit**, uno standard molto diffuso.
- La chiave è ricavata da una **passphrase che scegli tu**, con PBKDF2 e SHA-256 su 600.000 cicli, il che rende ogni tentativo di indovinarla lento e costoso.
- La passphrase non lascia mai il tuo dispositivo. **Non** è la password del tuo Universal ID, e cambiare quella password non la modifica.

È importante perché le persone nella tua rubrica non si sono iscritte a niente. I loro nomi, i loro indirizzi e le tue note private su di loro meritano la stessa cura dei tuoi dati.

## Nessun recupero

UNI·SIM non conserva alcuna copia della tua chiave e non ha modo di reimpostare la passphrase. Se la dimentichi, nessuno può aprire la copia online. La rubrica sul tuo dispositivo non viene toccata: per questo la copia online è un backup e non la copia principale.

## Ricordare un dispositivo

Puoi chiedere a un dispositivo di ricordare la chiave, così non devi inserire la passphrase ogni volta. La chiave viene conservata in una forma che l’app può usare ma non estrarre. Uscire dall’account, o scegliere di dimenticare questo dispositivo, la rimuove.

## Cambiarlo o eliminarlo

Per cambiare la passphrase serve quella attuale, anche su un dispositivo che la ricorda, e il backup viene crittografato di nuovo in un solo passaggio. Disattivare il backup elimina completamente la copia online e lascia la rubrica sul dispositivo com’è. Eliminare il tuo Universal ID elimina anche la copia online.

Il backup ha un limite di circa 2 MB di dati crittografati, pari a molte migliaia di contatti. Di solito sono le note molto lunghe a far raggiungere il limite.`,
  },
  {
    id: 'using-two-devices',
    title: 'Usare BlackBook su più dispositivi',
    summary: 'L’unione all’accesso, il salvataggio automatico e cosa succede quando due dispositivi non concordano.',
    group: 'Privacy e sicurezza',
    body: `Con il backup online attivo puoi aprire la stessa rubrica su telefono, tablet e computer. Ogni dispositivo tiene la propria copia e il backup online le mantiene allineate.

## Accedere su un nuovo dispositivo

1. Accedi con il tuo Universal ID.
2. Inserisci la passphrase del backup.
3. Se questo dispositivo ha già dei contatti suoi, BlackBook ti chiede se unirli o usare solo la copia online.

Nell’unione, la copia online è il punto di partenza e vi si aggiungono i contatti di questo dispositivo. Chi c’è già, riconosciuto come la stessa scheda oppure per lo stesso nome con la stessa email o lo stesso numero, non viene aggiunto due volte. Le etichette con lo stesso nome diventano una sola.

## Salvataggio

Finché il backup è attivo, ogni modifica viene crittografata e salvata online pochi secondi dopo. L’indicazione di sincronizzazione accanto al titolo mostra che un salvataggio è in corso. Quando apri BlackBook su un altro dispositivo, scarica la copia più recente.

## Quando due dispositivi non concordano

La copia online viene salvata come rubrica intera. Se due dispositivi hanno entrambi modificato la rubrica dall’ultimo salvataggio, BlackBook non sceglie in silenzio. Si ferma e ti chiede quale tenere: la copia online più recente o la versione di questo dispositivo. Quella che non scegli viene sostituita, quindi, se hai dubbi, esporta prima un file CSV.

## Dopo il cambio della passphrase

Quando cambi la passphrase su un dispositivo, gli altri smettono di salvare e chiedono quella nuova. Su di essi non si perde nulla, e quando li sblocchi propongono di unire di nuovo i loro contatti. Un dispositivo che ha ancora la vecchia chiave non può sovrascrivere il cambiamento.`,
  },
]

export default articles
