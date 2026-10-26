import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-a-csv-file',
    title: 'Qu’est-ce qu’un fichier CSV ?',
    summary: 'Le fichier texte, en forme de tableau, que BlackBook utilise pour importer et exporter.',
    group: 'Les bases',
    body: `CSV signifie « comma-separated values », c’est-à-dire « valeurs séparées par des virgules ». C’est presque la façon la plus simple de ranger un tableau : un fichier texte où chaque ligne est une rangée, et où des virgules séparent les colonnes.

Un tout petit carnet d’adresses au format CSV ressemble à ceci dans un éditeur de texte :

- Name,Email,Phone
- Sam Okonkwo,sam@example.com,07700 900123
- Priya Shah,priya@example.com,

La première ligne contient les noms des colonnes. Chaque ligne suivante correspond à une personne. Rien entre deux virgules signifie simplement que la case est vide. Si une valeur contient elle-même une virgule, elle est placée entre guillemets pour ne pas être prise pour le début d’une nouvelle colonne.

## Pourquoi c’est utile

- **Presque tout sait le lire.** Excel, Numbers, Google Sheets et LibreOffice ouvrent les fichiers CSV comme un tableur, et la plupart des carnets d’adresses savent en exporter.
- **Il est lisible par un humain.** Il n’y a aucune mise en forme cachée : vous pouvez ouvrir le fichier et voir exactement ce qu’il contient.
- **Il ne vous enferme pas.** Un export CSV vous appartient : vous pouvez le garder, le déplacer ou l’ouvrir ailleurs, avec ou sans BlackBook.

## Ce qu’il ne peut pas faire

Un fichier CSV ne contient que du texte. Il n’a ni images, ni mot de passe, ni chiffrement : toute personne qui s’en procure une copie peut lire chaque nom, numéro et note qu’il contient. Conservez vos exports dans un endroit de confiance et supprimez les copies dont vous n’avez plus besoin.

## Dates et tableurs

Les tableurs reformatent parfois ce qu’ils ouvrent, en transformant une date d’anniversaire ou un long numéro de téléphone en autre chose. Si vous modifiez un export dans un tableur avant de le réimporter, vérifiez ces colonnes avant d’enregistrer.`,
  },
  {
    id: 'where-your-book-lives',
    title: 'Où votre carnet est conservé',
    summary: 'Sur cet appareil, sans compte nécessaire — et ce que cela implique pour vous.',
    group: 'Les bases',
    body: `BlackBook conserve votre carnet d’adresses sur l’appareil que vous utilisez. Dans un navigateur, il se trouve dans l’espace de stockage que ce navigateur réserve à ce site ; dans l’application pour téléphone, il se trouve dans le stockage propre à l’application. Rien de vos contacts n’est envoyé nulle part, sauf si vous vous connectez, ce qui active la sauvegarde en ligne.

Vous n’avez pas besoin de compte pour utiliser BlackBook. Tout fonctionne sans être connecté.

## Ce que cela signifie concrètement

- **Chaque appareil a son propre carnet.** Les contacts ajoutés sur votre ordinateur n’apparaissent pas d’eux-mêmes sur votre téléphone. C’est la sauvegarde en ligne qui les relie. C’est avec un fichier de sauvegarde que vous les y transférez.
- **Vider le navigateur peut vider le carnet.** Supprimer les données ou l’historique de ce site, utiliser une fenêtre de navigation privée ou désinstaller l’application efface le carnet qui y était conservé.
- **Les contacts de votre appareil sont à part.** BlackBook n’ajoute rien au carnet d’adresses intégré à votre téléphone, ne le modifie pas et ne se synchronise pas avec lui.

## Garder une copie

Comme le carnet de votre appareil est peut-être la seule copie, il vaut la peine d’en garder une autre :

1. Connectez-vous avec votre Universal ID. La sauvegarde en ligne chiffrée démarre alors d’elle-même.
2. Enregistrez de temps en temps un fichier de sauvegarde (Réglages, puis Sauvegarde et export dans l’application pour téléphone ; Actions, puis Avancé, puis Sauvegarde et export sur le site web) et rangez-le en lieu sûr. Il contient tout, tâches comprises, et peut être protégé par un mot de passe.
3. Ou exportez un fichier CSV, que n’importe quel tableur ou carnet d’adresses peut lire, mais qui laisse de côté vos tâches.

## Régler cette application

Les choix sur l’apparence et le comportement de l’application sur cet appareil, comme les onglets affichés, sont conservés sur cet appareil. Un fichier de sauvegarde les contient aussi, mais seul Tout remplacer les rétablit.`,
  },
  {
    id: 'importing-and-exporting',
    title: 'Faire entrer et sortir des contacts',
    summary: 'Un seul Importer pour les contacts, les notes, les tâches et les sauvegardes, et un export CSV.',
    group: 'Fonctionnement',
    body: `## Une porte pour entrer, une pour sortir

Tout ce qui entre dans BlackBook passe par **Importer** : Réglages, puis Importer dans l’application pour téléphone, ou Actions, puis Avancé, puis Importer sur le site web. Quatre choix y sont proposés :

- **Contacts**, depuis un fichier CSV et, dans l’application pour téléphone, depuis les contacts de votre téléphone.
- **Notes**, depuis des fichiers Word, des pages web (.html, .htm, .mht), du texte brut ou du Markdown. Voir Rapatrier vos notes de OneNote.
- **Tâches**, depuis une liste dans un fichier texte, Markdown, tableur ou agenda (voir plus bas).
- **Restaurer une sauvegarde BlackBook**, qui ouvre un fichier de sauvegarde que vous avez enregistré (voir Votre fichier de sauvegarde).

Tout ce qui sort se trouve dans **Sauvegarde et export** : Réglages, puis Sauvegarde et export dans l’application pour téléphone, ou Actions, puis Avancé, puis Sauvegarde et export sur le site web. Vous y enregistrez un fichier de sauvegarde et exportez un CSV.

## Exporter

L’export enregistre tout votre carnet dans un fichier CSV portant la date du jour. Il comporte une colonne pour le nom, l’e-mail, les étiquettes, les notes, l’anniversaire, le téléphone, l’entreprise, et pour indiquer si l’anniversaire ou la fiche d’une personne est masqué : le réimporter restaure donc vos contacts tels que vous les aviez laissés. Le fichier s’ouvre dans n’importe quel tableur. Il laisse de côté vos tâches : pour une copie complète, enregistrez plutôt un fichier de sauvegarde (voir Votre fichier de sauvegarde).

## Importer un fichier CSV

Choisissez Importer, puis Contacts. Vous pouvez importer un fichier CSV exporté depuis BlackBook ou depuis un autre carnet d’adresses. Vous choisissez d’**ajouter** les personnes du fichier à votre carnet ou de **remplacer** votre carnet par elles.

BlackBook comprend les noms de colonnes utilisés par Google Contacts et Outlook. Par exemple :

- Une colonne « Categories », « Groups » ou « Labels » est lue comme des étiquettes.
- « Mobile », « Telephone » ou les colonnes de téléphone numérotées de Google sont lues comme le numéro de téléphone.
- « Organisation » et la colonne d’organisation de Google sont lues comme l’entreprise.

Les lignes qui n’ont ni nom ni adresse e-mail sont ignorées.

## Les anniversaires dans un fichier

Les dates d’anniversaire sont acceptées sous la forme 1990-06-04, 4 June 1990, June 4 ou --06-04 (un anniversaire sans année). Une date écrite 04/06/1990 est refusée volontairement : au Royaume-Uni c’est le 4 juin, aux États-Unis le 6 avril, et deviner serait faux pour la moitié des utilisateurs.

## Depuis les contacts de votre téléphone

Dans l’application pour téléphone, vous pouvez choisir une personne dans les contacts de votre téléphone pour remplir une nouvelle fiche, ou importer tout le carnet de votre téléphone d’un coup avec Importer, puis Contacts. L’import complet ignore les personnes déjà présentes dans votre carnet : vous pouvez donc le relancer plus tard sans risque. Dans Chrome sur Android, le sélecteur de contacts du navigateur propose la même chose pour un nom, un e-mail et un numéro.

BlackBook ne lit les contacts de votre téléphone que lorsque vous le lui demandez, et n’y écrit jamais rien. La note de la fiche de contact de votre téléphone n’est pas copiée.

## Importer des tâches

Choisissez Importer, puis Tâches, pour faire entrer une liste que vous tenez déjà ailleurs. Vous pouvez choisir plusieurs fichiers à la fois, et chaque fichier est lu sur votre appareil ; rien n’est envoyé.

- **Texte et Markdown (.txt, .md).** Une tâche par ligne. Les puces et les numéros sont retirés, une case cochée ([x]) arrive comme faite, et les lignes en retrait sous une tâche deviennent ses détails. Les titres Markdown sont des noms de section, pas des tâches : ils sont laissés de côté.
- **Tableurs (.csv, .tsv).** Les colonnes sont lues d’après leur nom : Title, Task ou Content pour la tâche, Notes ou Description pour ses détails, Due ou Deadline pour sa date, et Done, Completed ou Status pour savoir si elle est faite. L’export de Todoist fonctionne tel quel ; ses sections sont laissées de côté.
- **Fichiers d’agenda (.ics).** Les tâches du fichier, avec leurs détails, leurs échéances et leur état.

Les échéances écrites 2026-10-25 ou 25 October 2026 sont lues. Une date écrite 04/06/2026 est laissée de côté volontairement, comme pour les anniversaires : la tâche arrive quand même, simplement sans date.

Vous voyez ce qui a été trouvé avant que quoi que ce soit soit ajouté, et vous pouvez écarter n’importe quel élément d’un balayage. L’import active l’onglet À faire, pour que vous voyiez ce qui est arrivé.`,
  },
  {
    id: 'tags-lists-and-hiding',
    title: 'Étiquettes, listes d’e-mails et personnes masquées',
    summary: 'Des façons d’organiser votre carnet sans supprimer personne.',
    group: 'Fonctionnement',
    body: `## Étiquettes

Les étiquettes sont vos propres libellés, comme Famille, Travail ou Club de lecture. Un nouveau carnet n’en a aucune, car c’est à vous de décider comment classer les gens. Vous pouvez en créer autant que vous le souhaitez, donner une couleur à chacune et placer une personne sous autant d’étiquettes que nécessaire. Le filtre affiche toutes les personnes qui ont au moins une des étiquettes choisies.

## Listes d’e-mails

Si vous activez les listes d’e-mails dans **Régler cette application**, vous pouvez garder des groupes de personnes à qui vous écrivez ensemble. Une liste est un type d’étiquette. Copier une liste vous donne une ligne de noms et d’adresses prête à coller dans le champ À de Gmail, Outlook ou Apple Mail. Les personnes sans adresse e-mail sont laissées de côté, et une adresse présente deux fois n’est incluse qu’une fois.

## Masquer quelqu’un de la liste

Balayez une fiche vers la droite sur un téléphone, ou utilisez le bouton rond dans son coin, pour retirer quelqu’un de la liste principale. La personne est masquée à la navigation, jamais à la recherche : tapez son nom et elle apparaît, grisée, avec le même bouton pour la faire revenir. Un tiroir en bas de la liste montre toutes les personnes masquées.

## Masquer un rappel d’anniversaire

La vue des anniversaires affiche toutes les personnes dont l’anniversaire est enregistré, du plus proche au plus lointain. Vous pouvez masquer une personne de cette vue sans supprimer la date. Masquer quelqu’un de la liste principale et masquer son anniversaire sont deux choix distincts.

## Supprimer

La suppression demande toujours confirmation et nomme les personnes concernées. Sur un téléphone, balayer une fiche vers la gauche fait seulement apparaître le bouton Supprimer ; le geste seul ne supprime rien. Vous pouvez aussi sélectionner plusieurs personnes pour les supprimer, les étiqueter ou les masquer ensemble.`,
  },
  {
    id: 'the-pin-lock',
    title: 'Ce que fait le code PIN, et ce qu’il ne fait pas',
    summary: 'Un verrou à 4 chiffres sur l’application, pas un chiffrement du carnet.',
    group: 'Confidentialité et sécurité',
    body: `Vous pouvez définir un code PIN à 4 chiffres pour que BlackBook le demande à chaque démarrage sur cet appareil : après sa fermeture ou le rechargement de la page. Revenir à l’app depuis une autre ne le redemande pas. Il sert à tenir à l’écart quelqu’un qui prendrait votre téléphone ou votre ordinateur.

## Ce qu’il protège

- Il empêche quiconque d’ouvrir l’application sur cet appareil sans le code.
- Après cinq essais erronés d’affilée, le clavier vous fait attendre avant de réessayer, et l’attente double à chaque fois.
- Votre code lui-même n’est jamais enregistré. BlackBook ne garde qu’une empreinte brouillée, volontairement lente à vérifier, ce qui rend les tentatives coûteuses.
- Le verrou ne concerne que cet appareil et n’est jamais envoyé en ligne.

## Ce qu’il ne fait pas

Le code verrouille l’application, pas les données. Votre carnet reste dans le stockage de l’appareil exactement comme avant : il ne remplace donc pas le verrouillage d’écran et le code de votre appareil. Quatre chiffres ne donnent que 10 000 combinaisons, bien trop peu pour une clé de chiffrement sûre.

## Si vous oubliez votre code

Personne ne peut vous donner votre code ni retirer le verrou à votre place. Le seul moyen de passer un code oublié est le bouton « Forgotten your PIN? » sur l’écran de verrouillage, qui **efface le carnet de cet appareil** et repart de zéro, sans verrou. C’est ce qui rend cette option sûre : un inconnu pourrait vider l’application, mais jamais la lire.

Si vous utilisez la sauvegarde en ligne chiffrée, un code oublié n’est qu’un désagrément : reconnectez-vous (et saisissez votre phrase secrète de sauvegarde, si vous en avez ajouté une), et votre carnet revient. Si vous avez un fichier de sauvegarde, un code oublié n’est qu’un désagrément : après la réinitialisation, choisissez Importer, puis Restaurer une sauvegarde BlackBook, sélectionnez le fichier et votre carnet revient. Sans sauvegarde, il n’y a rien à restaurer : enregistrez-en une avant de définir un code.`,
  },
  {
    id: 'encrypted-online-backup',
    title: 'La sauvegarde en ligne chiffrée',
    summary: 'Comment votre carnet est chiffré avant de quitter l’appareil, qui détient la clé, et ce qu’apporte une phrase secrète.',
    group: 'Confidentialité et sécurité',
    body: `La sauvegarde en ligne est facultative et nécessite une Universal ID. Se connecter l’active (dans l’application pour téléphone, connectez-vous depuis Réglages, puis Compte), et dès lors BlackBook garde une copie de votre carnet sur les serveurs d’UNI·SIM, afin qu’il survive à la perte d’un appareil et s’ouvre sur chaque appareil où vous vous connectez. Les réglages de la sauvegarde se trouvent dans Sauvegarde en ligne : Réglages, puis Compte, puis Sauvegarde en ligne dans l’application pour téléphone, ou Actions, puis Avancé, puis Sauvegarde en ligne sur le site web.

## Chiffré avant de partir

Votre carnet est chiffré sur votre appareil avant tout envoi, avec **AES-GCM et une clé de 256 bits**, une norme très répandue. Qui peut lire la copie en ligne dépend de l’endroit où cette clé est conservée, et c’est vous qui choisissez.

## Sans phrase secrète (par défaut)

La clé est une clé aléatoire, conservée avec votre compte sur les serveurs d’UNI·SIM. C’est ce qui permet à un nouvel appareil d’ouvrir votre carnet simplement en vous connectant. Seul votre propre compte peut la récupérer, mais UNI·SIM **pourrait** techniquement lire la copie en ligne, comme pour la plupart des applications qui synchronisent.

## Avec une phrase secrète

Cochez Le protéger par une phrase secrète en activant la sauvegarde, ou choisissez plus tard Ajouter une phrase secrète dans Sauvegarde en ligne. Personne d’autre que vous ne peut alors lire la copie en ligne, pas même UNI·SIM.

- La clé est dérivée de votre phrase secrète avec PBKDF2 et SHA-256 sur 600 000 tours, ce qui rend chaque tentative de la deviner lente et coûteuse, et la clé est retirée du serveur.
- Votre phrase secrète ne quitte jamais votre appareil. Ce n’est **pas** le mot de passe de votre Universal ID, et changer ce mot de passe ne la modifie pas.
- Chacun de vos autres appareils vous la demande une fois.

C’est important, car les personnes de votre carnet ne se sont inscrites à rien. Leurs noms, leurs adresses et vos notes privées à leur sujet méritent le même soin que vos propres données.

## Avec une phrase secrète, aucune récupération possible

UNI·SIM ne détient alors aucune copie de votre clé et n’a aucun moyen de réinitialiser votre phrase secrète. Si vous l’oubliez, personne ne peut ouvrir la copie en ligne. Le carnet de votre appareil n’est pas touché : c’est pourquoi la copie en ligne est une sauvegarde et non la copie principale.

## Mémoriser un appareil

Avec une phrase secrète, vous pouvez demander à un appareil de mémoriser la clé pour ne pas avoir à saisir la phrase à chaque fois. La clé est conservée sous une forme que l’application peut utiliser mais ne peut pas extraire. Se déconnecter, ou choisir Oublier cet appareil, la supprime.

## La modifier ou la supprimer

Changer de phrase secrète, ou choisir Retirer la phrase secrète, exige la phrase actuelle, même sur un appareil qui la mémorise, et chiffre à nouveau la sauvegarde en une seule étape. La retirer remet une clé aléatoire avec votre compte : vos appareils ouvrent alors la copie en ligne simplement en se reconnectant. Désactiver et supprimer la copie en ligne supprime entièrement la copie en ligne, laisse le carnet de votre appareil tel quel, et fait qu’une nouvelle connexion sur cet appareil ne réactive pas la sauvegarde. Supprimer votre Universal ID supprime aussi la copie en ligne.

La sauvegarde est limitée à environ 2 Mo de données chiffrées, soit plusieurs milliers de contacts. Ce sont généralement des notes très longues qui font atteindre cette limite.`,
  },
  {
    id: 'backup-file',
    title: 'Votre fichier de sauvegarde',
    summary: 'Un seul fichier avec tout votre carnet, un mot de passe facultatif, et comment le rouvrir.',
    group: 'Confidentialité et sécurité',
    body: `Un fichier de sauvegarde est une copie complète de votre carnet en un seul fichier. Pour en enregistrer un, ouvrez Sauvegarde et export (Réglages, puis Sauvegarde et export dans l’application pour téléphone ; Actions, puis Avancé, puis Sauvegarde et export sur le site web) et choisissez Enregistrer une sauvegarde. Sur un téléphone, la feuille de partage s’ouvre pour que vous puissiez garder le fichier dans Fichiers, sur un stockage en ligne ou dans un e-mail envoyé à vous-même ; dans un navigateur, il est téléchargé.

## Ce qu’il contient

- Chaque contact, avec tous ses champs : nom, e-mail, téléphone, entreprise, adresse, anniversaire, notes, étiquettes, épingles et personnes masquées.
- Vos étiquettes et vos listes d’e-mails.
- Votre liste de tâches.
- Vos choix dans Régler cette application, et la vue sur laquelle la liste s’ouvre.

Votre code PIN n’y figure pas. Le code appartient à l’appareil.

## Le protéger par un mot de passe

Votre carnet parle d’autres personnes, qui ne se sont inscrites à rien : vous pouvez donc verrouiller le fichier avec un mot de passe. Cochez Protéger par un mot de passe avant d’enregistrer.

- Le fichier est chiffré avec **AES-GCM et une clé de 256 bits**, une norme très répandue.
- La clé est dérivée de votre mot de passe avec PBKDF2, SHA-256 et 600 000 tours, ce qui rend chaque tentative lente et coûteuse.
- Le mot de passe n’est jamais enregistré ni envoyé nulle part. Personne, pas même UNI·SIM, ne peut ouvrir le fichier sans lui, et il est impossible de le réinitialiser.

Sans mot de passe, le fichier est en texte clair, comme un export CSV : quiconque met la main dessus peut le lire.

## Ouvrir une sauvegarde

Choisissez Importer, puis Restaurer une sauvegarde BlackBook (Réglages, puis Importer dans l’application pour téléphone ; Actions, puis Avancé, puis Importer sur le site web). Choisissez Ouvrir une sauvegarde et sélectionnez le fichier, ou déposez-le sur la fenêtre dans un navigateur. S’il a un mot de passe, il vous est demandé. Choisissez ensuite :

- **Ajouter à l’existant.** Tout ce qui se trouve déjà sur cet appareil reste. Les personnes et les tâches du fichier sont ajoutées, et si l’une d’elles se trouve des deux côtés, c’est la copie modifiée en dernier qui est gardée. Une personne déjà présente avec le même nom et le même e-mail ou numéro de téléphone n’est pas ajoutée deux fois, et les étiquettes portant le même nom ne forment plus qu’une.
- **Tout remplacer.** Le carnet de cet appareil est remplacé par celui du fichier, après votre confirmation.

BlackBook vérifie chaque champ d’un fichier avant de l’utiliser : un fichier endommagé ou modifié ne peut donc pas casser l’application.`,
  },
  {
    id: 'using-two-devices',
    title: 'Utiliser BlackBook sur plusieurs appareils',
    summary: 'La fusion à la connexion, l’enregistrement automatique, et ce qui se passe quand deux appareils divergent.',
    group: 'Confidentialité et sécurité',
    body: `Avec la sauvegarde en ligne activée, vous pouvez ouvrir le même carnet sur votre téléphone, votre tablette et votre ordinateur. Chaque appareil garde sa propre copie, et la sauvegarde en ligne les maintient à jour.

## Se connecter sur un nouvel appareil

1. Connectez-vous avec votre Universal ID (dans l’application pour téléphone, depuis Réglages, puis Compte).
2. Si vous avez protégé la sauvegarde par une phrase secrète, saisissez-la. Sans phrase secrète, la connexion suffit.
3. Si cet appareil a déjà ses propres contacts ou tâches, par exemple ceux ajoutés avant de vous connecter, BlackBook les fusionne dans la copie en ligne et l’enregistre aussitôt. Vous n’avez rien à choisir.

Lors d’une fusion, la copie en ligne sert de base et les contacts de cet appareil y sont ajoutés. Une personne déjà présente, reconnue comme la même fiche ou par le même nom avec le même e-mail ou numéro, n’est pas ajoutée deux fois. Les étiquettes portant le même nom ne forment plus qu’une. La fusion ne fait qu’ajouter : une personne supprimée sur un autre appareil peut donc revenir depuis un appareil qui l’a encore. Pour reprendre plutôt la copie en ligne exactement telle qu’elle est, ouvrez Sauvegarde en ligne (Réglages, puis Compte, puis Sauvegarde en ligne dans l’application pour téléphone ; Actions, puis Avancé, puis Sauvegarde en ligne sur le site web) et choisissez Récupérer la copie en ligne.

## Enregistrement

Tant que la sauvegarde est active, chaque modification est chiffrée et enregistrée en ligne quelques secondes après. L’indication de synchronisation à côté du titre montre qu’un enregistrement est en cours. Quand vous ouvrez BlackBook sur un autre appareil, il récupère la copie la plus récente.

## Quand deux appareils divergent

La copie en ligne est enregistrée comme un carnet entier. Si deux appareils ont tous deux modifié le carnet depuis leur dernier enregistrement, BlackBook ne choisit pas en silence. Il s’arrête et vous demande laquelle garder : la copie en ligne plus récente, ou la version de cet appareil. Celle que vous ne choisissez pas est remplacée : exportez d’abord un fichier CSV en cas de doute.

## Après un changement de phrase secrète

Quand vous ajoutez ou changez la phrase secrète sur un appareil, vos autres appareils cessent d’enregistrer et vous la demandent une fois. Rien n’y est perdu, et lorsque vous les déverrouillez, ils proposent de fusionner à nouveau leurs contacts. Un appareil qui a encore l’ancienne clé ne peut pas écraser le changement. Quand vous retirez la phrase secrète, vos autres appareils rouvrent la copie en ligne d’eux-mêmes.

## Transférer votre carnet sans compte

1. Sur l’appareil qui contient votre carnet, enregistrez un fichier de sauvegarde depuis Sauvegarde et export. Un mot de passe est une bonne idée si le fichier doit passer par un e-mail ou un stockage en ligne.
2. Faites parvenir le fichier sur l’autre appareil, par exemple avec AirDrop, un stockage en ligne ou un e-mail.
3. Sur l’autre appareil, ouvrez BlackBook, choisissez Importer, puis Restaurer une sauvegarde BlackBook, et sélectionnez le fichier.

Si l’autre appareil est neuf, choisissez Tout remplacer. S’il contient déjà ses propres contacts, choisissez Ajouter à l’existant et les deux carnets sont fusionnés.`,
  },
  {
    id: 'notes-from-onenote',
    title: "Rapatrier vos notes de OneNote",
    summary: "Exportez des pages de OneNote, puis importez les fichiers dans Notes.",
    group: "Fonctionnement",
    body: `BlackBook ne peut pas ouvrir lui-même un bloc-notes OneNote, mais il lit les fichiers que OneNote exporte. Tout est lu sur votre appareil ; rien n’est envoyé.

## OneNote pour Windows

1. Ouvrez la page ou la section à rapatrier.
2. Choisissez **Fichier** ▸ **Exporter**.
3. Sous **Exporter l’élément actif**, choisissez **Page** ou **Section**.
4. Sous **Sélectionner le format**, choisissez **Document Word** (.docx), ou **Page Web à fichier unique** (.mht) si Word n’est pas proposé.
5. Choisissez **Exporter** et enregistrez le fichier.

Un bloc-notes entier ne peut pas être exporté en Word : exportez-le section par section.

## OneNote sur Mac ou sur le web

D’après Microsoft, OneNote pour Mac et OneNote pour le web ne peuvent pas encore exporter de pages. Ouvrez le bloc-notes dans OneNote pour Windows (sur le web : **Modification** ▸ **Ouvrir dans l’application de bureau**), ou copiez une page à la fois : sélectionnez tout le contenu de la page, copiez-le, collez-le dans un document texte ou Word, puis enregistrez-le.

## Importer dans BlackBook

Choisissez **Importer** ▸ **Notes** : dans l’application pour téléphone, Importer se trouve dans **Réglages** ; sur le site web, dans **Actions** ▸ **Avancé**. Vous pouvez choisir plusieurs fichiers à la fois : Word (.docx), pages web (.html, .htm, .mht), texte brut (.txt) et Markdown (.md).

- Un fichier Word contenant plusieurs pages OneNote devient une note par page, découpée à chaque titre de page.
- Le titre de chaque note est le titre de la page, sinon son premier intertitre, sinon le nom du fichier.
- Le texte arrive en texte brut : paragraphes et listes sont conservés ; la mise en forme, les images, les dessins et les pièces jointes ne le sont pas.
- Si OneNote a écrit la date de la page sous son titre, elle devient la date de la note.

Vous voyez ce qui a été trouvé avant que quoi que ce soit soit ajouté, et vous pouvez écarter n’importe quel élément d’un balayage. L’import active l’onglet Notes.`,
  },
]

export default articles
