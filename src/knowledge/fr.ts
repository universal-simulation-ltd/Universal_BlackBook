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
    body: `BlackBook conserve votre carnet d’adresses sur l’appareil que vous utilisez. Dans un navigateur, il se trouve dans l’espace de stockage que ce navigateur réserve à ce site ; dans l’application pour téléphone, il se trouve dans le stockage propre à l’application. Rien de vos contacts n’est envoyé nulle part, sauf si vous activez la sauvegarde en ligne.

Vous n’avez pas besoin de compte pour utiliser BlackBook. Tout fonctionne sans être connecté.

## Ce que cela signifie concrètement

- **Chaque appareil a son propre carnet.** Les contacts ajoutés sur votre ordinateur n’apparaissent pas d’eux-mêmes sur votre téléphone. C’est la sauvegarde en ligne qui les relie.
- **Vider le navigateur peut vider le carnet.** Supprimer les données ou l’historique de ce site, utiliser une fenêtre de navigation privée ou désinstaller l’application efface le carnet qui y était conservé.
- **Les contacts de votre appareil sont à part.** BlackBook n’ajoute rien au carnet d’adresses intégré à votre téléphone, ne le modifie pas et ne se synchronise pas avec lui.

## Garder une copie

Comme le carnet de votre appareil est peut-être la seule copie, il vaut la peine d’en garder une autre :

1. Exportez de temps en temps un fichier CSV et rangez-le en lieu sûr, ou
2. Connectez-vous avec votre Universal ID et activez la sauvegarde en ligne chiffrée.

## Régler cette application

Les choix sur l’apparence et le comportement de l’application sur cet appareil, comme les onglets affichés, restent sur cet appareil et ne font pas partie de la sauvegarde.`,
  },
  {
    id: 'importing-and-exporting',
    title: 'Faire entrer et sortir des contacts',
    summary: 'Import et export CSV, et choix de personnes parmi les contacts de votre téléphone.',
    group: 'Fonctionnement',
    body: `## Exporter

L’export enregistre tout votre carnet dans un fichier CSV portant la date du jour. Il comporte une colonne pour le nom, l’e-mail, les étiquettes, les notes, l’anniversaire, le téléphone, l’entreprise, et pour indiquer si l’anniversaire ou la fiche d’une personne est masqué : une sauvegarde restaure donc le carnet tel que vous l’aviez laissé. Le fichier s’ouvre dans n’importe quel tableur.

## Importer un fichier CSV

Vous pouvez importer un fichier CSV exporté depuis BlackBook ou depuis un autre carnet d’adresses. Vous choisissez d’**ajouter** les personnes du fichier à votre carnet ou de **remplacer** votre carnet par elles.

BlackBook comprend les noms de colonnes utilisés par Google Contacts et Outlook. Par exemple :

- Une colonne « Categories », « Groups » ou « Labels » est lue comme des étiquettes.
- « Mobile », « Telephone » ou les colonnes de téléphone numérotées de Google sont lues comme le numéro de téléphone.
- « Organisation » et la colonne d’organisation de Google sont lues comme l’entreprise.

Les lignes qui n’ont ni nom ni adresse e-mail sont ignorées.

## Les anniversaires dans un fichier

Les dates d’anniversaire sont acceptées sous la forme 1990-06-04, 4 June 1990, June 4 ou --06-04 (un anniversaire sans année). Une date écrite 04/06/1990 est refusée volontairement : au Royaume-Uni c’est le 4 juin, aux États-Unis le 6 avril, et deviner serait faux pour la moitié des utilisateurs.

## Depuis les contacts de votre téléphone

Dans l’application pour téléphone, vous pouvez choisir une personne dans les contacts de votre téléphone pour remplir une nouvelle fiche, ou importer tout le carnet de votre téléphone d’un coup. L’import complet ignore les personnes déjà présentes dans votre carnet : vous pouvez donc le relancer plus tard sans risque. Dans Chrome sur Android, le sélecteur de contacts du navigateur propose la même chose pour un nom, un e-mail et un numéro.

BlackBook ne lit les contacts de votre téléphone que lorsque vous le lui demandez, et n’y écrit jamais rien. La note de la fiche de contact de votre téléphone n’est pas copiée.`,
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
    body: `Vous pouvez définir un code PIN à 4 chiffres pour que BlackBook le demande à chaque ouverture sur cet appareil. Il sert à tenir à l’écart quelqu’un qui prendrait votre téléphone ou votre ordinateur.

## Ce qu’il protège

- Il empêche quiconque d’ouvrir l’application sur cet appareil sans le code.
- Après cinq essais erronés d’affilée, le clavier vous fait attendre avant de réessayer, et l’attente double à chaque fois.
- Votre code lui-même n’est jamais enregistré. BlackBook ne garde qu’une empreinte brouillée, volontairement lente à vérifier, ce qui rend les tentatives coûteuses.
- Le verrou ne concerne que cet appareil et n’est jamais envoyé en ligne.

## Ce qu’il ne fait pas

Le code verrouille l’application, pas les données. Votre carnet reste dans le stockage de l’appareil exactement comme avant : il ne remplace donc pas le verrouillage d’écran et le code de votre appareil. Quatre chiffres ne donnent que 10 000 combinaisons, bien trop peu pour une clé de chiffrement sûre.

## Si vous oubliez votre code

Personne ne peut vous donner votre code ni retirer le verrou à votre place. Le seul moyen de passer un code oublié est le bouton « Forgotten your PIN? » sur l’écran de verrouillage, qui **efface le carnet de cet appareil** et repart de zéro, sans verrou. C’est ce qui rend cette option sûre : un inconnu pourrait vider l’application, mais jamais la lire.

Si vous utilisez la sauvegarde en ligne chiffrée, un code oublié n’est qu’un désagrément : reconnectez-vous, saisissez votre phrase secrète de sauvegarde, et votre carnet revient. Sans sauvegarde, il n’y a rien à restaurer : activez-la, ou exportez un fichier CSV, avant de définir un code.`,
  },
  {
    id: 'encrypted-online-backup',
    title: 'La sauvegarde en ligne chiffrée',
    summary: 'Comment votre carnet est chiffré avant de quitter l’appareil, et pourquoi personne d’autre ne peut le lire.',
    group: 'Confidentialité et sécurité',
    body: `La sauvegarde en ligne est facultative et reste désactivée tant que vous ne vous connectez pas avec votre Universal ID. Une fois activée, BlackBook garde une copie de votre carnet sur les serveurs d’UNI·SIM, afin qu’il survive à la perte d’un appareil et puisse être ouvert sur un autre.

## Chiffré avant de partir

Votre carnet est chiffré sur votre appareil avant tout envoi. Le serveur ne reçoit et ne conserve que des données brouillées pour lesquelles il n’a aucune clé : UNI·SIM ne peut donc lire ni vos contacts, ni vos notes, ni vos étiquettes, ni vos tâches.

- Le chiffrement est **AES-GCM avec une clé de 256 bits**, une norme très répandue.
- La clé est dérivée d’une **phrase secrète que vous choisissez**, avec PBKDF2 et SHA-256 sur 600 000 tours, ce qui rend chaque tentative de deviner la phrase lente et coûteuse.
- Votre phrase secrète ne quitte jamais votre appareil. Ce n’est **pas** le mot de passe de votre Universal ID, et changer ce mot de passe ne la modifie pas.

C’est important, car les personnes de votre carnet ne se sont inscrites à rien. Leurs noms, leurs adresses et vos notes privées à leur sujet méritent le même soin que vos propres données.

## Aucune récupération possible

UNI·SIM ne détient aucune copie de votre clé et n’a aucun moyen de réinitialiser votre phrase secrète. Si vous l’oubliez, personne ne peut ouvrir la copie en ligne. Le carnet de votre appareil n’est pas touché : c’est pourquoi la copie en ligne est une sauvegarde et non la copie principale.

## Mémoriser un appareil

Vous pouvez demander à un appareil de mémoriser la clé pour ne pas avoir à saisir la phrase secrète à chaque fois. La clé est conservée sous une forme que l’application peut utiliser mais ne peut pas extraire. Se déconnecter, ou choisir d’oublier cet appareil, la supprime.

## La modifier ou la supprimer

Changer de phrase secrète exige la phrase actuelle, même sur un appareil qui la mémorise, et chiffre à nouveau la sauvegarde en une seule étape. Désactiver la sauvegarde supprime entièrement la copie en ligne et laisse le carnet de votre appareil tel quel. Supprimer votre Universal ID supprime aussi la copie en ligne.

La sauvegarde est limitée à environ 2 Mo de données chiffrées, soit plusieurs milliers de contacts. Ce sont généralement des notes très longues qui font atteindre cette limite.`,
  },
  {
    id: 'using-two-devices',
    title: 'Utiliser BlackBook sur plusieurs appareils',
    summary: 'La fusion à la connexion, l’enregistrement automatique, et ce qui se passe quand deux appareils divergent.',
    group: 'Confidentialité et sécurité',
    body: `Avec la sauvegarde en ligne activée, vous pouvez ouvrir le même carnet sur votre téléphone, votre tablette et votre ordinateur. Chaque appareil garde sa propre copie, et la sauvegarde en ligne les maintient à jour.

## Se connecter sur un nouvel appareil

1. Connectez-vous avec votre Universal ID.
2. Saisissez votre phrase secrète de sauvegarde.
3. Si cet appareil a déjà ses propres contacts, BlackBook vous demande s’il faut les fusionner ou utiliser uniquement la copie en ligne.

Lors d’une fusion, la copie en ligne sert de base et les contacts de cet appareil y sont ajoutés. Une personne déjà présente, reconnue comme la même fiche ou par le même nom avec le même e-mail ou numéro, n’est pas ajoutée deux fois. Les étiquettes portant le même nom ne forment plus qu’une.

## Enregistrement

Tant que la sauvegarde est active, chaque modification est chiffrée et enregistrée en ligne quelques secondes après. L’indication de synchronisation à côté du titre montre qu’un enregistrement est en cours. Quand vous ouvrez BlackBook sur un autre appareil, il récupère la copie la plus récente.

## Quand deux appareils divergent

La copie en ligne est enregistrée comme un carnet entier. Si deux appareils ont tous deux modifié le carnet depuis leur dernier enregistrement, BlackBook ne choisit pas en silence. Il s’arrête et vous demande laquelle garder : la copie en ligne plus récente, ou la version de cet appareil. Celle que vous ne choisissez pas est remplacée : exportez d’abord un fichier CSV en cas de doute.

## Après un changement de phrase secrète

Quand vous changez la phrase secrète sur un appareil, vos autres appareils cessent d’enregistrer et demandent la nouvelle phrase. Rien n’y est perdu, et lorsque vous les déverrouillez, ils proposent de fusionner à nouveau leurs contacts. Un appareil qui a encore l’ancienne clé ne peut pas écraser le changement.`,
  },
]

export default articles
