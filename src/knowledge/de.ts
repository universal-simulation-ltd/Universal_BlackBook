import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-a-csv-file',
    title: 'Was ist eine CSV-Datei?',
    summary: 'Die schlichte Textdatei in Tabellenform, mit der BlackBook importiert und exportiert.',
    group: 'Grundlagen',
    body: `CSV steht für „comma-separated values“, also „durch Kommas getrennte Werte“. Es ist so ziemlich die einfachste Art, eine Tabelle zu speichern: eine reine Textdatei, in der jede Zeile eine Tabellenzeile ist und Kommas die Spalten trennen.

Ein winziges Adressbuch als CSV-Datei sieht in einem Texteditor so aus:

- Name,Email,Phone
- Sam Okonkwo,sam@example.com,07700 900123
- Priya Shah,priya@example.com,

Die erste Zeile enthält die Spaltennamen. Jede weitere Zeile ist eine Person. Steht zwischen zwei Kommas nichts, ist dieses Feld leer. Enthält ein Wert selbst ein Komma, wird er in Anführungszeichen gesetzt, damit er nicht für den Beginn einer neuen Spalte gehalten wird.

## Warum das nützlich ist

- **Fast alles kann sie lesen.** Excel, Numbers, Google Sheets und LibreOffice öffnen CSV-Dateien als Tabelle, und die meisten Adressbücher können eine exportieren.
- **Menschen können sie lesen.** Es gibt keine versteckte Formatierung: Sie können die Datei öffnen und genau sehen, was darin steht.
- **Sie bindet Sie nicht.** Ein CSV-Export gehört Ihnen. Sie können ihn behalten, verschieben oder woanders öffnen, mit oder ohne BlackBook.

## Was sie nicht kann

Eine CSV-Datei enthält nur Text. Sie hat keine Bilder, kein Passwort und keine Verschlüsselung. Wer die Datei in die Hände bekommt, kann also jeden Namen, jede Nummer und jede Notiz darin lesen. Bewahren Sie Exporte an einem vertrauenswürdigen Ort auf und löschen Sie Kopien, die Sie nicht mehr brauchen.

## Datumsangaben und Tabellenprogramme

Tabellenprogramme formatieren manchmal um, was sie öffnen, und machen aus einem Geburtstag oder einer langen Telefonnummer etwas anderes. Wenn Sie einen Export in einer Tabelle bearbeiten, bevor Sie ihn wieder importieren, prüfen Sie diese Spalten vor dem Speichern.`,
  },
  {
    id: 'where-your-book-lives',
    title: 'Wo Ihr Adressbuch gespeichert ist',
    summary: 'Auf diesem Gerät, ohne Konto – und was das für Sie bedeutet.',
    group: 'Grundlagen',
    body: `BlackBook speichert Ihr Adressbuch auf dem Gerät, das Sie gerade verwenden. Im Browser liegt es im Speicher, den dieser Browser für diese Website vorsieht; in der App auf dem Telefon liegt es im eigenen Speicher der App. Nichts über Ihre Kontakte wird irgendwohin gesendet, es sei denn, Sie schalten die Online-Sicherung ein.

Sie brauchen kein Konto, um BlackBook zu nutzen. Alles funktioniert auch ohne Anmeldung.

## Was das praktisch bedeutet

- **Jedes Gerät hat sein eigenes Adressbuch.** Kontakte, die Sie am Laptop hinzufügen, erscheinen nicht von selbst auf dem Telefon. Die Online-Sicherung verbindet sie.
- **Browserdaten löschen kann das Adressbuch löschen.** Wenn Sie Website-Daten oder den Verlauf dieser Website löschen, ein privates Fenster verwenden oder die App deinstallieren, wird das dort gespeicherte Adressbuch entfernt.
- **Die Kontakte Ihres Geräts sind getrennt.** BlackBook fügt dem eingebauten Adressbuch Ihres Telefons nichts hinzu, ändert es nicht und synchronisiert sich nicht damit.

## Eine Kopie behalten

Da das Adressbuch auf Ihrem Gerät womöglich die einzige Kopie ist, lohnt sich eine zweite:

1. Exportieren Sie ab und zu eine CSV-Datei und bewahren Sie sie sicher auf, oder
2. melden Sie sich mit Ihrer Universal ID an und schalten Sie die verschlüsselte Online-Sicherung ein.

## Einstellungen

Einstellungen dazu, wie die App auf diesem Gerät aussieht und sich verhält, etwa welche Tabs angezeigt werden, bleiben nur auf diesem Gerät und gehören nicht zur Sicherung.`,
  },
  {
    id: 'importing-and-exporting',
    title: 'Kontakte hinein- und hinausbringen',
    summary: 'CSV-Import und -Export sowie das Übernehmen von Personen aus den Kontakten Ihres Telefons.',
    group: 'So funktioniert es',
    body: `## Exportieren

Der Export speichert Ihr gesamtes Adressbuch als CSV-Datei mit dem heutigen Datum im Namen. Sie enthält je eine Spalte für Name, E-Mail, Schlagwörter, Notizen, Geburtstag, Telefon, Firma sowie dafür, ob der Geburtstag oder die Karte einer Person ausgeblendet ist. Eine Sicherung stellt das Adressbuch also so wieder her, wie Sie es verlassen haben. Die Datei lässt sich in jedem Tabellenprogramm öffnen.

## Eine CSV-Datei importieren

Sie können eine CSV-Datei importieren, die aus BlackBook oder aus einem anderen Adressbuch exportiert wurde. Sie wählen, ob die Personen aus der Datei Ihrem Adressbuch **hinzugefügt** werden oder ob sie Ihr Adressbuch **ersetzen**.

BlackBook versteht die Spaltennamen, die Google Contacts und Outlook verwenden. Zum Beispiel:

- Eine Spalte „Categories“, „Groups“ oder „Labels“ wird als Schlagwörter gelesen.
- „Mobile“, „Telephone“ oder die nummerierten Telefonspalten von Google werden als Telefonnummer gelesen.
- „Organisation“ und die Organisationsspalte von Google werden als Firma gelesen.

Zeilen ohne Namen und ohne E-Mail-Adresse werden übersprungen.

## Geburtstage in einer Datei

Geburtstage werden als 1990-06-04, 4 June 1990, June 4 oder --06-04 (ein Geburtstag ohne Jahr) angenommen. Ein Datum wie 04/06/1990 wird bewusst abgelehnt: Im Vereinigten Königreich ist das der 4. Juni, in den USA der 6. April, und Raten wäre für die Hälfte der Nutzer falsch.

## Aus den Kontakten Ihres Telefons

In der App auf dem Telefon können Sie eine Person aus den Kontakten Ihres Telefons wählen, um eine neue Karte auszufüllen, oder das ganze Telefonbuch auf einmal importieren. Der Gesamtimport überspringt alle, die schon in Ihrem Adressbuch stehen, Sie können ihn also später gefahrlos wiederholen. In Chrome unter Android bietet die Kontaktauswahl des Browsers dasselbe für einen Namen, eine E-Mail-Adresse und eine Nummer.

BlackBook liest die Kontakte Ihres Telefons nur, wenn Sie es darum bitten, und schreibt nie etwas zurück. Die Notiz auf der Kontaktkarte Ihres Telefons wird nicht übernommen.`,
  },
  {
    id: 'tags-lists-and-hiding',
    title: 'Schlagwörter, E-Mail-Listen und ausgeblendete Personen',
    summary: 'Möglichkeiten, Ihr Adressbuch zu ordnen, ohne jemanden zu löschen.',
    group: 'So funktioniert es',
    body: `## Schlagwörter

Schlagwörter sind Ihre eigenen Bezeichnungen, etwa Familie, Arbeit oder Buchclub. Ein neues Adressbuch hat keine, denn wie Sie Menschen einordnen, entscheiden Sie. Sie können beliebig viele anlegen, jedem eine Farbe geben und eine Person unter so viele Schlagwörter setzen, wie passen. Der Filter zeigt alle, die mindestens eines der gewählten Schlagwörter haben.

## E-Mail-Listen

Wenn Sie E-Mail-Listen in den Einstellungen der App einschalten, können Sie Gruppen von Personen führen, denen Sie gemeinsam schreiben. Eine Liste ist eine Art Schlagwort. Wenn Sie eine Liste kopieren, erhalten Sie eine Zeile mit Namen und Adressen, die Sie direkt in das An-Feld von Gmail, Outlook oder Apple Mail einfügen können. Personen ohne E-Mail-Adresse werden ausgelassen, und eine doppelte Adresse erscheint nur einmal.

## Jemanden aus der Liste ausblenden

Wischen Sie auf dem Telefon eine Karte nach rechts oder verwenden Sie die runde Schaltfläche in ihrer Ecke, um jemanden aus der Hauptliste zu nehmen. Die Person ist beim Durchblättern ausgeblendet, nie bei der Suche: Tippen Sie ihren Namen ein, und sie erscheint abgeblendet, mit derselben Schaltfläche, um sie zurückzuholen. Eine Schublade am Ende der Liste zeigt alle Ausgeblendeten.

## Eine Geburtstagserinnerung ausblenden

Die Geburtstagsansicht zeigt alle Personen mit eingetragenem Geburtstag, den nächsten zuerst. Sie können eine Person aus dieser Ansicht ausblenden, ohne das Datum zu löschen. Jemanden aus der Hauptliste auszublenden und seinen Geburtstag auszublenden, sind zwei getrennte Entscheidungen.

## Löschen

Beim Löschen wird immer zuerst nachgefragt und genannt, wer gelöscht wird. Auf dem Telefon legt das Wischen einer Karte nach links nur die Schaltfläche zum Löschen frei; die Geste allein löscht nichts. Sie können auch mehrere Personen auswählen, um sie gemeinsam zu löschen, zu verschlagworten oder auszublenden.`,
  },
  {
    id: 'the-pin-lock',
    title: 'Was die PIN-Sperre tut und was nicht',
    summary: 'Eine vierstellige Sperre für die App, keine Verschlüsselung des Adressbuchs.',
    group: 'Datenschutz und Sicherheit',
    body: `Sie können eine vierstellige PIN festlegen, nach der BlackBook bei jedem Öffnen auf diesem Gerät fragt. Sie soll jemanden fernhalten, der Ihr Telefon oder Ihren Laptop in die Hand nimmt.

## Was sie schützt

- Niemand kann die App auf diesem Gerät ohne die PIN öffnen.
- Nach fünf falschen Versuchen hintereinander lässt Sie das Tastenfeld warten, bevor Sie es erneut versuchen können, und die Wartezeit verdoppelt sich jedes Mal.
- Ihre PIN selbst wird nie gespeichert. BlackBook bewahrt nur einen unkenntlich gemachten Fingerabdruck davon auf, dessen Prüfung absichtlich langsam ist. Das macht Raten aufwendig.
- Die Sperre gehört nur zu diesem Gerät und wird nie hochgeladen.

## Was sie nicht tut

Die PIN sperrt die App, nicht die Daten. Ihr Adressbuch liegt weiterhin genau so im Speicher des Geräts wie zuvor. Sie ersetzt also nicht die Bildschirmsperre und den Code Ihres Geräts. Vier Ziffern ergeben nur 10.000 Kombinationen – viel zu wenig für einen sicheren Schlüssel.

## Wenn Sie Ihre PIN vergessen

Niemand kann Ihnen Ihre PIN nennen oder die Sperre für Sie aufheben. Der einzige Weg an einer vergessenen PIN vorbei ist die Schaltfläche „Forgotten your PIN?“ auf dem Sperrbildschirm. Sie **löscht das Adressbuch auf diesem Gerät** und beginnt neu, ohne Sperre. Genau deshalb ist sie sicher: Ein Fremder könnte die App leeren, aber nie lesen.

Wenn Sie die verschlüsselte Online-Sicherung nutzen, ist eine vergessene PIN nur lästig: Melden Sie sich erneut an, geben Sie Ihre Passphrase für die Sicherung ein, und Ihr Adressbuch ist wieder da. Ohne Sicherung gibt es nichts wiederherzustellen. Schalten Sie sie also ein oder exportieren Sie eine CSV-Datei, bevor Sie eine PIN festlegen.`,
  },
  {
    id: 'encrypted-online-backup',
    title: 'Die verschlüsselte Online-Sicherung',
    summary: 'Wie Ihr Adressbuch verschlüsselt wird, bevor es das Gerät verlässt, und warum niemand sonst es lesen kann.',
    group: 'Datenschutz und Sicherheit',
    body: `Die Online-Sicherung ist freiwillig und bleibt aus, bis Sie sich mit Ihrer Universal ID anmelden. Ist sie eingeschaltet, speichert BlackBook eine Kopie Ihres Adressbuchs auf den Servern von UNI·SIM. So übersteht es den Verlust eines Geräts und lässt sich auf einem anderen öffnen.

## Verschlüsselt, bevor es losgeht

Ihr Adressbuch wird auf Ihrem Gerät verschlüsselt, bevor irgendetwas gesendet wird. Der Server empfängt und speichert nur unlesbare Daten, für die er keinen Schlüssel hat. UNI·SIM kann Ihre Kontakte, Notizen, Schlagwörter und Aufgaben daher nicht lesen.

- Verschlüsselt wird mit **AES-GCM und einem 256-Bit-Schlüssel**, einem weit verbreiteten Standard.
- Der Schlüssel wird aus einer **Passphrase, die Sie selbst wählen**, mit PBKDF2 und SHA-256 in 600.000 Durchläufen abgeleitet. Das macht jeden Rateversuch langsam und teuer.
- Ihre Passphrase verlässt nie Ihr Gerät. Sie ist **nicht** das Passwort Ihrer Universal ID, und eine Änderung dieses Passworts wirkt sich nicht auf sie aus.

Das ist wichtig, weil sich die Menschen in Ihrem Adressbuch nirgends angemeldet haben. Ihre Namen, Adressen und Ihre privaten Notizen über sie verdienen dieselbe Sorgfalt wie Ihre eigenen Daten.

## Keine Wiederherstellung

UNI·SIM besitzt keine Kopie Ihres Schlüssels und kann Ihre Passphrase nicht zurücksetzen. Wenn Sie sie vergessen, kann niemand die Online-Kopie öffnen. Das Adressbuch auf Ihrem Gerät ist davon nicht betroffen – deshalb ist die Online-Kopie eine Sicherung und nicht die Hauptkopie.

## Ein Gerät merken

Sie können ein Gerät den Schlüssel merken lassen, damit Sie die Passphrase nicht jedes Mal eingeben müssen. Der Schlüssel wird so gespeichert, dass die App ihn verwenden, aber nicht auslesen kann. Abmelden oder „Forget this device“ entfernt ihn.

## Ändern oder löschen

Zum Ändern der Passphrase brauchen Sie die aktuelle, auch auf einem Gerät, das sie sich merkt. Die Sicherung wird dann in einem Schritt neu verschlüsselt. Wenn Sie die Sicherung ausschalten, wird die Online-Kopie vollständig gelöscht und das Adressbuch auf Ihrem Gerät bleibt, wie es ist. Wenn Sie Ihre Universal ID löschen, wird die Online-Kopie mitgelöscht.

Die Sicherung ist auf etwa 2 MB verschlüsselte Daten begrenzt, das sind viele Tausend Kontakte. Meist sind sehr lange Notizen der Grund, wenn ein Adressbuch diese Grenze erreicht.`,
  },
  {
    id: 'using-two-devices',
    title: 'BlackBook auf mehreren Geräten nutzen',
    summary: 'Zusammenführen bei der Anmeldung, automatisches Speichern und was passiert, wenn zwei Geräte sich widersprechen.',
    group: 'Datenschutz und Sicherheit',
    body: `Mit eingeschalteter Online-Sicherung können Sie dasselbe Adressbuch auf Telefon, Tablet und Computer öffnen. Jedes Gerät hat seine eigene Kopie, und die Online-Sicherung hält sie auf demselben Stand.

## Auf einem neuen Gerät anmelden

1. Melden Sie sich mit Ihrer Universal ID an.
2. Geben Sie Ihre Passphrase für die Sicherung ein.
3. Hat dieses Gerät schon eigene Kontakte, fragt BlackBook, ob sie zusammengeführt werden sollen oder ob nur die Online-Kopie verwendet werden soll.

Beim Zusammenführen ist die Online-Kopie die Grundlage, und die Kontakte dieses Geräts werden ergänzt. Wer schon vorhanden ist – als dieselbe Karte oder mit demselben Namen und derselben E-Mail-Adresse oder Telefonnummer –, wird nicht doppelt hinzugefügt. Schlagwörter mit gleichem Namen werden zu einem.

## Speichern

Solange die Sicherung eingeschaltet ist, wird jede Änderung wenige Sekunden danach verschlüsselt und online gespeichert. Der Synchronisierungshinweis neben dem Titel zeigt, dass gerade gespeichert wird. Wenn Sie BlackBook auf einem anderen Gerät öffnen, holt es die neuere Kopie.

## Wenn zwei Geräte sich widersprechen

Die Online-Kopie wird als ganzes Adressbuch gespeichert. Haben zwei Geräte das Adressbuch seit dem letzten Speichern beide geändert, entscheidet BlackBook nicht stillschweigend. Es hält an und fragt, welche Version bleiben soll: die neuere Online-Kopie oder die dieses Geräts. Die andere wird ersetzt. Exportieren Sie im Zweifel vorher eine CSV-Datei.

## Nach einer Änderung der Passphrase

Wenn Sie die Passphrase auf einem Gerät ändern, hören Ihre anderen Geräte auf zu speichern und fragen nach der neuen. Auf ihnen geht nichts verloren, und beim Entsperren bieten sie an, ihre Kontakte wieder zusammenzuführen. Ein Gerät mit dem alten Schlüssel kann die Änderung nicht überschreiben.`,
  },
]

export default articles
