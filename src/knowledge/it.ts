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
    body: `BlackBook conserva la tua rubrica sul dispositivo che stai usando. In un browser si trova nello spazio che quel browser riserva a questo sito; nell’app per telefono si trova nello spazio di archiviazione dell’app. Nulla dei tuoi contatti viene inviato da nessuna parte, a meno che tu non acceda, cosa che attiva il backup online.

Non ti serve un account per usare BlackBook. Tutto funziona senza accedere.

## Cosa significa in pratica

- **Ogni dispositivo ha la sua rubrica.** I contatti aggiunti sul portatile non compaiono da soli sul telefono. È il backup online a collegarli. Per spostarli serve un file di backup.
- **Svuotare il browser può svuotare la rubrica.** Eliminare i dati o la cronologia di questo sito, usare una finestra privata o disinstallare l’app cancella la rubrica conservata lì.
- **I contatti del dispositivo sono separati.** BlackBook non aggiunge nulla, non modifica e non si sincronizza con la rubrica integrata nel telefono.

## Tenere una copia

Poiché la rubrica sul tuo dispositivo potrebbe essere l’unica copia, conviene averne un’altra:

1. Accedi con il tuo Universal ID. Il backup online crittografato parte da solo.
2. Salva ogni tanto un file di backup (Regola, poi Backup ed esportazione nell’app per telefono; Azioni, poi Avanzate, poi Backup ed esportazione sul sito web) e conservalo in un posto sicuro. Contiene tutto, attività comprese, e può avere una password.
3. Oppure esporta un file CSV, che qualsiasi foglio di calcolo o rubrica può leggere ma che esclude le tue attività.

## Regola questa app

Le scelte sull’aspetto e sul comportamento dell’app su questo dispositivo, come le schede mostrate, restano su questo dispositivo. Anche un file di backup le contiene, ma solo Sostituisci tutto le ripristina.`,
  },
  {
    id: 'importing-and-exporting',
    title: 'Far entrare e uscire i contatti',
    summary: 'Un solo Importa per contatti, note, attività e backup, e un’esportazione CSV.',
    group: 'Come funziona',
    body: `## Una porta per entrare, una per uscire

Tutto ciò che entra in BlackBook passa da **Importa**: Regola, poi Importa nell’app per telefono, oppure Azioni, poi Avanzate, poi Importa sul sito web. Ci sono quattro scelte:

- **Contatti**, da un file CSV e, nell’app per telefono, dai contatti del telefono.
- **Note**, da file Word, pagine web (.html, .htm, .mht), testo semplice o Markdown. Vedi Porta le tue note da OneNote.
- **Cose da fare**, da un elenco in un file di testo, Markdown, foglio di calcolo o calendario (più sotto).
- **Ripristina un backup di BlackBook**, che apre un file di backup che hai salvato (vedi Il tuo file di backup).

Tutto ciò che esce è in **Backup ed esportazione**: Regola, poi Backup ed esportazione nell’app per telefono, oppure Azioni, poi Avanzate, poi Backup ed esportazione sul sito web. Lì salvi un file di backup ed esporti un CSV.

## Esportare

L’esportazione salva tutta la rubrica in un file CSV con la data di oggi nel nome. Ha una colonna per nome, email, etichette, note, compleanno, telefono, azienda e per indicare se il compleanno o la scheda di una persona sono nascosti, così reimportarlo ripristina i tuoi contatti come li avevi lasciati. Il file si apre in qualsiasi foglio di calcolo. Esclude le tue attività: per una copia completa, salva invece un file di backup (vedi Il tuo file di backup).

## Importare un file CSV

Scegli Importa, poi Contatti. Puoi importare un file CSV esportato da BlackBook o da un’altra rubrica. Scegli tu se **aggiungere** le persone del file alla tua rubrica o **sostituire** la rubrica con loro.

BlackBook riconosce i nomi di colonna usati da Google Contacts e Outlook. Per esempio:

- Una colonna «Categories», «Groups» o «Labels» viene letta come etichette.
- «Mobile», «Telephone» o le colonne numerate del telefono di Google vengono lette come numero di telefono.
- «Organisation» e la colonna dell’organizzazione di Google vengono lette come azienda.

Le righe senza nome né indirizzo email vengono saltate.

## Compleanni in un file

I compleanni sono accettati come 1990-06-04, 4 June 1990, June 4 o --06-04 (un compleanno senza anno). Una data scritta 04/06/1990 viene rifiutata di proposito: nel Regno Unito è il 4 giugno, negli Stati Uniti il 6 aprile, e tirare a indovinare sarebbe sbagliato per metà degli utenti.

## Dai contatti del telefono

Nell’app per telefono puoi scegliere una persona dai contatti del telefono per compilare una nuova scheda, oppure importare in una volta tutta la rubrica del telefono con Importa, poi Contatti. L’importazione completa salta chi è già nella tua rubrica, quindi puoi ripeterla più avanti senza problemi. In Chrome su Android, il selettore di contatti del browser offre lo stesso per un nome, un’email e un numero.

BlackBook legge i contatti del telefono solo quando glielo chiedi e non vi scrive mai nulla. La nota della scheda contatto del telefono non viene copiata.

## Importare le attività

Scegli Importa, poi Cose da fare, per portare un elenco che tieni già altrove. Puoi scegliere più file insieme, e ogni file viene letto sul tuo dispositivo; non viene caricato nulla.

- **Testo e Markdown (.txt, .md).** Un’attività per riga. Punti elenco e numeri vengono tolti, una casella spuntata ([x]) arriva come fatta e le righe rientrate sotto un’attività diventano i suoi dettagli. I titoli Markdown sono nomi di sezione, non attività, quindi vengono esclusi.
- **Fogli di calcolo (.csv, .tsv).** Le colonne vengono lette per nome: Title, Task o Content per l’attività, Notes o Description per i dettagli, Due o Deadline per la data, e Done, Completed o Status per sapere se è fatta. L’esportazione di Todoist funziona così com’è; le sue sezioni vengono escluse.
- **File di calendario (.ics).** Le attività del file, con i dettagli, le scadenze e se erano state fatte.

Le scadenze scritte come 2026-10-25 o 25 October 2026 vengono lette. Una data scritta come 04/06/2026 viene esclusa di proposito, come per i compleanni: l’attività arriva comunque, solo senza data.

Vedi cosa è stato trovato prima che venga aggiunto qualcosa, e puoi togliere qualsiasi elemento scorrendolo. L’importazione attiva la scheda Da fare, così vedi cosa è arrivato.`,
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
    body: `Puoi impostare un PIN di 4 cifre perché BlackBook lo chieda ogni volta che si avvia su quel dispositivo: dopo essere stato chiuso o dopo aver ricaricato la pagina. Tornarci da un’altra app non lo richiede di nuovo. Serve a tenere fuori chi prende in mano il tuo telefono o il tuo computer.

## Cosa protegge

- Impedisce a chiunque di aprire l’app su questo dispositivo senza il PIN.
- Dopo cinque tentativi sbagliati di fila, il tastierino ti fa aspettare prima di riprovare, e l’attesa raddoppia ogni volta.
- Il PIN in sé non viene mai salvato. BlackBook conserva solo un’impronta codificata, volutamente lenta da verificare, che rende costoso tirare a indovinare.
- Il blocco riguarda solo questo dispositivo e non viene mai caricato online.

## Cosa non fa

Il PIN blocca l’app, non i dati. La rubrica resta nella memoria del dispositivo esattamente come prima, quindi non sostituisce il blocco schermo e il codice del dispositivo. Quattro cifre offrono solo 10.000 combinazioni, troppo poche per una chiave di crittografia sicura.

## Se dimentichi il PIN

Nessuno può dirti il tuo PIN né togliere il blocco al posto tuo. L’unico modo per superare un PIN dimenticato è il pulsante «Forgotten your PIN?» nella schermata di blocco, che **cancella la rubrica su questo dispositivo** e ricomincia da capo, senza blocco. È questo che lo rende sicuro: un estraneo potrebbe svuotare l’app, ma mai leggerla.

Se usi il backup online crittografato, un PIN dimenticato è solo un fastidio: accedi di nuovo (e inserisci la passphrase del backup, se ne hai aggiunta una) e la rubrica torna. Se hai un file di backup, un PIN dimenticato è solo un fastidio: dopo l’azzeramento, scegli Importa, poi Ripristina un backup di BlackBook, seleziona il file e la rubrica torna. Senza un backup non c’è nulla da ripristinare, quindi salvane uno prima di impostare un PIN.`,
  },
  {
    id: 'encrypted-online-backup',
    title: 'Il backup online crittografato',
    summary: 'Come la rubrica viene crittografata prima di lasciare il dispositivo, chi ha la chiave e cosa aggiunge una passphrase.',
    group: 'Privacy e sicurezza',
    body: `Il backup online è facoltativo e richiede un Universal ID. Accedere lo attiva (nell’app per telefono, accedi da Regola, poi Account), e da quel momento BlackBook conserva una copia della rubrica sui server di UNI·SIM, così sopravvive alla perdita di un dispositivo e si apre su ogni dispositivo su cui accedi. Le impostazioni del backup sono in Backup online: Regola, poi Account, poi Backup online nell’app per telefono, oppure Azioni, poi Avanzate, poi Backup online sul sito web.

## Crittografato prima di partire

La rubrica viene crittografata sul tuo dispositivo prima che venga inviato qualsiasi cosa, con **AES-GCM e una chiave a 256 bit**, uno standard molto diffuso. Chi può leggere la copia online dipende da dove è conservata quella chiave, e lo scegli tu.

## Senza passphrase (l’impostazione predefinita)

La chiave è una chiave casuale, conservata con il tuo account sui server di UNI·SIM. È questo che permette a un nuovo dispositivo di aprire la rubrica solo accedendo. Solo il tuo account può recuperarla, ma UNI·SIM **potrebbe** tecnicamente leggere la copia online, come accade con la maggior parte delle app che sincronizzano.

## Con una passphrase

Spunta Proteggila con una passphrase quando attivi il backup, oppure scegli più tardi Aggiungi una passphrase in Backup online. Allora nessuno tranne te può leggere la copia online, nemmeno UNI·SIM.

- La chiave è ricavata dalla passphrase con PBKDF2 e SHA-256 su 600.000 cicli, il che rende ogni tentativo di indovinarla lento e costoso, e la chiave viene tolta dal server.
- La passphrase non lascia mai il tuo dispositivo. **Non** è la password del tuo Universal ID, e cambiare quella password non la modifica.
- Ognuno dei tuoi altri dispositivi te la chiede una volta.

È importante perché le persone nella tua rubrica non si sono iscritte a niente. I loro nomi, i loro indirizzi e le tue note private su di loro meritano la stessa cura dei tuoi dati.

## Con una passphrase non c’è recupero

UNI·SIM allora non conserva alcuna copia della tua chiave e non ha modo di reimpostare la passphrase. Se la dimentichi, nessuno può aprire la copia online. La rubrica sul tuo dispositivo non viene toccata: per questo la copia online è un backup e non la copia principale.

## Ricordare un dispositivo

Con una passphrase, puoi chiedere a un dispositivo di ricordare la chiave, così non devi inserire la passphrase ogni volta. La chiave viene conservata in una forma che l’app può usare ma non estrarre. Uscire dall’account, o scegliere Dimentica questo dispositivo, la rimuove.

## Cambiarlo o eliminarlo

Per cambiare la passphrase, o per scegliere Rimuovi la passphrase, serve quella attuale, anche su un dispositivo che la ricorda, e il backup viene crittografato di nuovo in un solo passaggio. Rimuoverla rimette una chiave casuale con il tuo account, così i tuoi dispositivi aprono la copia online semplicemente accedendo di nuovo. Disattiva ed elimina la copia online elimina completamente la copia online, lascia la rubrica sul dispositivo com’è e fa sì che accedere di nuovo su quel dispositivo non riattivi il backup. Eliminare il tuo Universal ID elimina anche la copia online.

Il backup ha un limite di circa 2 MB di dati crittografati, pari a molte migliaia di contatti. Di solito sono le note molto lunghe a far raggiungere il limite.`,
  },
  {
    id: 'backup-file',
    title: 'Il tuo file di backup',
    summary: 'Un solo file con tutto ciò che c’è nella rubrica, una password facoltativa e come riaprirlo.',
    group: 'Privacy e sicurezza',
    body: `Un file di backup è una copia completa della tua rubrica in un solo file. Per salvarne uno, apri Backup ed esportazione (Regola, poi Backup ed esportazione nell’app per telefono; Azioni, poi Avanzate, poi Backup ed esportazione sul sito web) e scegli Salva un backup. Sul telefono si apre il menu di condivisione, così puoi tenere il file in File, in un servizio cloud o in un’email a te stesso; nel browser viene scaricato.

## Cosa contiene

- Ogni contatto, con tutti i campi: nome, email, telefono, azienda, indirizzo, compleanno, note, etichette, contatti fissati e chi è nascosto.
- Le tue etichette e liste email.
- La tua lista di attività.
- Le tue scelte in Regola questa app e la vista con cui si apre l’elenco.

Il PIN non è incluso. Il PIN appartiene al dispositivo.

## Proteggerlo con una password

La tua rubrica riguarda altre persone, che non si sono mai iscritte a nulla, quindi puoi bloccare il file con una password. Spunta Proteggi con una password prima di salvare.

- Il file è crittografato con **AES-GCM e una chiave a 256 bit**, uno standard molto diffuso.
- La chiave è ricavata dalla tua password con PBKDF2, SHA-256 e 600.000 cicli, il che rende ogni tentativo lento e costoso.
- La password non viene mai salvata né inviata da nessuna parte. Nessuno, nemmeno UNI·SIM, può aprire il file senza di essa, e non c’è modo di reimpostarla.

Senza password il file è testo in chiaro, come un’esportazione CSV: chiunque ne entri in possesso può leggerlo.

## Aprire un backup

Scegli Importa, poi Ripristina un backup di BlackBook (Regola, poi Importa nell’app per telefono; Azioni, poi Avanzate, poi Importa sul sito web). Scegli Apri un backup e seleziona il file, oppure trascinalo sulla finestra nel browser. Se ha una password, ti viene chiesta. Poi scegli:

- **Aggiungi a quello che c’è.** Tutto ciò che è già su questo dispositivo resta. Le persone e le attività del file vengono aggiunte e, se una si trova in entrambi, viene tenuta la copia modificata per ultima. Chi è già qui con lo stesso nome e la stessa email o lo stesso numero di telefono non viene aggiunto due volte, e le etichette con lo stesso nome diventano una sola.
- **Sostituisci tutto.** La rubrica su questo dispositivo viene sostituita da quella del file, dopo la tua conferma.

BlackBook controlla ogni campo di un file prima di usarlo, così un file danneggiato o modificato non può mandare in errore l’app.`,
  },
  {
    id: 'using-two-devices',
    title: 'Usare BlackBook su più dispositivi',
    summary: 'L’unione all’accesso, il salvataggio automatico e cosa succede quando due dispositivi non concordano.',
    group: 'Privacy e sicurezza',
    body: `Con il backup online attivo puoi aprire la stessa rubrica su telefono, tablet e computer. Ogni dispositivo tiene la propria copia e il backup online le mantiene allineate.

## Accedere su un nuovo dispositivo

1. Accedi con il tuo Universal ID (nell’app per telefono, da Regola, poi Account).
2. Se hai protetto il backup con una passphrase, inseriscila. Senza, basta accedere.
3. Se questo dispositivo ha già dei contatti o delle attività suoi, per esempio quelli aggiunti prima di accedere, BlackBook li unisce alla copia online e la salva subito. Non c’è nulla da scegliere.

Nell’unione, la copia online è il punto di partenza e vi si aggiungono i contatti di questo dispositivo. Chi c’è già, riconosciuto come la stessa scheda oppure per lo stesso nome con la stessa email o lo stesso numero, non viene aggiunto due volte. Le etichette con lo stesso nome diventano una sola. L’unione aggiunge soltanto, quindi qualcuno che hai eliminato su un altro dispositivo può tornare da un dispositivo che lo ha ancora. Per prendere invece la copia online esattamente com’è, apri Backup online (Regola, poi Account, poi Backup online nell’app per telefono; Azioni, poi Avanzate, poi Backup online sul sito web) e scegli Recupera la copia online.

## Salvataggio

Finché il backup è attivo, ogni modifica viene crittografata e salvata online pochi secondi dopo. L’indicazione di sincronizzazione accanto al titolo mostra che un salvataggio è in corso. Quando apri BlackBook su un altro dispositivo, scarica la copia più recente.

## Quando due dispositivi non concordano

La copia online viene salvata come rubrica intera. Se due dispositivi hanno entrambi modificato la rubrica dall’ultimo salvataggio, BlackBook non sceglie in silenzio. Si ferma e ti chiede quale tenere: la copia online più recente o la versione di questo dispositivo. Quella che non scegli viene sostituita, quindi, se hai dubbi, esporta prima un file CSV.

## Dopo il cambio della passphrase

Quando aggiungi o cambi la passphrase su un dispositivo, gli altri smettono di salvare e te la chiedono una volta. Su di essi non si perde nulla, e quando li sblocchi propongono di unire di nuovo i loro contatti. Un dispositivo che ha ancora la vecchia chiave non può sovrascrivere il cambiamento. Quando rimuovi la passphrase, gli altri dispositivi riaprono da soli la copia online.

## Spostare la rubrica senza account

1. Sul dispositivo che ha la tua rubrica, salva un file di backup da Backup ed esportazione. Una password è una buona idea se il file passerà per email o per un servizio cloud.
2. Porta il file sull’altro dispositivo, per esempio con AirDrop, un servizio cloud o un’email.
3. Sull’altro dispositivo, apri BlackBook, scegli Importa, poi Ripristina un backup di BlackBook, e seleziona il file.

Se l’altro dispositivo è nuovo, scegli Sostituisci tutto. Se ha già dei contatti suoi, scegli Aggiungi a quello che c’è e le due rubriche vengono unite.`,
  },
  {
    id: 'notes-from-onenote',
    title: "Porta le tue note da OneNote",
    summary: "Esporta le pagine da OneNote, poi importa i file in Note.",
    group: "Come funziona",
    body: `BlackBook non può aprire da solo un blocco appunti di OneNote, ma legge i file che OneNote esporta. Tutto viene letto sul tuo dispositivo; nulla viene caricato.

## OneNote per Windows

1. Apri la pagina o la sezione che vuoi portare.
2. Scegli **File** ▸ **Esporta**.
3. In **Esporta corrente**, scegli **Pagina** o **Sezione**.
4. In **Seleziona formato**, scegli **Documento di Word** (.docx), oppure **Pagina Web in file unico** (.mht) se Word non è proposto.
5. Scegli **Esporta** e salva il file.

Un intero blocco appunti non si può esportare in Word: esportalo una sezione alla volta.

## OneNote su Mac o sul web

Secondo Microsoft, OneNote per Mac e OneNote per il web non possono ancora esportare pagine. Apri il blocco appunti in OneNote per Windows (sul web: **Modifica** ▸ **Apri nell’app desktop**) oppure copia una pagina alla volta: seleziona tutto nella pagina, copialo, incollalo in un documento di testo o di Word e salvalo.

## Importare in BlackBook

Scegli **Importa** ▸ **Note**: nell’app per telefono Importa è in **Regola**; sul sito web, in **Azioni** ▸ **Avanzate**. Puoi scegliere più file insieme: Word (.docx), pagine web (.html, .htm, .mht), testo semplice (.txt) e Markdown (.md).

- Un file Word con più pagine di OneNote diventa una nota per pagina, divisa a ogni titolo di pagina.
- Il titolo di ogni nota è il titolo della pagina, altrimenti il primo titoletto, altrimenti il nome del file.
- Il testo arriva come testo semplice: paragrafi ed elenchi restano; formattazione, immagini, disegni e allegati no.
- Se OneNote ha scritto la data della pagina sotto il titolo, diventa la data della nota.

Vedi cosa è stato trovato prima che venga aggiunto qualcosa, e puoi togliere qualsiasi elemento scorrendolo. L’importazione attiva la scheda Note.`,
  },
]

export default articles
