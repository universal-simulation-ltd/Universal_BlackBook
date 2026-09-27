import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-a-csv-file',
    title: 'O que é um ficheiro CSV?',
    summary: 'O ficheiro de texto simples, em forma de folha de cálculo, que o BlackBook usa para importar e exportar.',
    group: 'O essencial',
    body: `CSV significa "comma-separated values", ou seja, "valores separados por vírgulas". É praticamente a forma mais simples de guardar uma tabela: um ficheiro de texto em que cada linha é uma linha da tabela e as vírgulas separam as colunas.

Uma agenda minúscula em formato CSV tem este aspeto num editor de texto:

- Name,Email,Phone
- Sam Okonkwo,sam@example.com,07700 900123
- Priya Shah,priya@example.com,

A primeira linha contém os nomes das colunas. Cada linha seguinte é uma pessoa. Se não houver nada entre duas vírgulas, essa célula está vazia. Se um valor tiver uma vírgula própria, fica entre aspas para não ser confundido com o início de uma nova coluna.

## Porque é útil

- **Quase tudo o consegue ler.** O Excel, o Numbers, o Google Sheets e o LibreOffice abrem ficheiros CSV como folha de cálculo, e a maioria das agendas consegue exportar um.
- **Pode ser lido por uma pessoa.** Não há formatação escondida: pode abrir o ficheiro e ver exatamente o que contém.
- **Não o prende a nada.** Uma exportação CSV é sua para guardar, mover ou abrir noutro sítio, com ou sem o BlackBook.

## O que não consegue fazer

Um ficheiro CSV contém apenas texto. Não tem imagens, palavra-passe nem encriptação, por isso qualquer pessoa que obtenha o ficheiro pode ler todos os nomes, números e notas. Guarde as exportações num local de confiança e elimine as cópias de que já não precisa.

## Datas e folhas de cálculo

Os programas de folha de cálculo por vezes mudam o formato do que abrem, transformando um aniversário ou um número de telefone longo noutra coisa. Se editar uma exportação numa folha de cálculo antes de a voltar a importar, verifique essas colunas antes de guardar.`,
  },
  {
    id: 'where-your-book-lives',
    title: 'Onde a sua agenda é guardada',
    summary: 'Neste dispositivo, sem precisar de conta, e o que isso significa para si.',
    group: 'O essencial',
    body: `O BlackBook guarda a sua agenda no dispositivo que está a usar. Num navegador, fica no armazenamento que esse navegador reserva a este site; na aplicação para telemóvel, fica no armazenamento da própria aplicação. Nada sobre os seus contactos é enviado para lado nenhum, a menos que ative a cópia de segurança online.

Não precisa de conta para usar o BlackBook. Tudo funciona sem iniciar sessão.

## O que isto significa na prática

- **Cada dispositivo tem a sua própria agenda.** Os contactos adicionados no portátil não aparecem sozinhos no telemóvel. É a cópia de segurança online que os liga.
- **Limpar o navegador pode apagar a agenda.** Eliminar os dados ou o histórico deste site, usar uma janela privada ou desinstalar a aplicação remove a agenda ali guardada.
- **Os contactos do dispositivo são à parte.** O BlackBook não acrescenta nada, não altera nem sincroniza com a agenda integrada do seu telemóvel.

## Ter uma cópia

Como a agenda no seu dispositivo pode ser a única cópia, vale a pena ter outra:

1. Exporte de vez em quando um ficheiro CSV e guarde-o num local seguro, ou
2. Inicie sessão com o seu Universal ID e ative a cópia de segurança online encriptada.

## Preferências

As escolhas sobre o aspeto e o comportamento da aplicação neste dispositivo, como os separadores apresentados, ficam apenas neste dispositivo e não fazem parte da cópia de segurança.`,
  },
  {
    id: 'importing-and-exporting',
    title: 'Trazer contactos para dentro e levá-los para fora',
    summary: 'Importar e exportar CSV, e escolher pessoas dos contactos do telemóvel.',
    group: 'Como funciona',
    body: `## Exportar

A exportação guarda toda a sua agenda num ficheiro CSV com a data de hoje no nome. Tem uma coluna para o nome, o email, as etiquetas, as notas, o aniversário, o telefone, a empresa e para indicar se o aniversário ou o cartão de uma pessoa está oculto, pelo que uma cópia de segurança repõe a agenda tal como a deixou. O ficheiro abre em qualquer programa de folha de cálculo.

## Importar um ficheiro CSV

Pode importar um ficheiro CSV exportado do BlackBook ou de outra agenda. Escolhe se quer **acrescentar** as pessoas do ficheiro à sua agenda ou **substituir** a agenda por elas.

O BlackBook entende os nomes de coluna usados pelo Google Contacts e pelo Outlook. Por exemplo:

- Uma coluna "Categories", "Groups" ou "Labels" é lida como etiquetas.
- "Mobile", "Telephone" ou as colunas de telefone numeradas do Google são lidas como o número de telefone.
- "Organisation" e a coluna de organização do Google são lidas como a empresa.

As linhas sem nome e sem email são ignoradas.

## Aniversários num ficheiro

Os aniversários são aceites como 1990-06-04, 4 June 1990, June 4 ou --06-04 (um aniversário sem ano). Uma data escrita como 04/06/1990 é recusada de propósito: no Reino Unido é 4 de junho, nos Estados Unidos é 6 de abril, e adivinhar estaria errado para metade dos utilizadores.

## A partir dos contactos do telemóvel

Na aplicação para telemóvel, pode escolher uma pessoa dos contactos do telemóvel para preencher um novo cartão, ou importar de uma só vez toda a agenda do telemóvel. A importação completa ignora quem já está na sua agenda, por isso pode repeti-la mais tarde sem problemas. No Chrome para Android, o seletor de contactos do navegador oferece o mesmo para um nome, um email e um número.

O BlackBook só lê os contactos do telemóvel quando lho pede e nunca escreve nada neles. A nota do cartão de contacto do telemóvel não é copiada.`,
  },
  {
    id: 'tags-lists-and-hiding',
    title: 'Etiquetas, listas de email e pessoas ocultas',
    summary: 'Formas de organizar a sua agenda sem eliminar ninguém.',
    group: 'Como funciona',
    body: `## Etiquetas

As etiquetas são rótulos seus, como Família, Trabalho ou Clube de leitura. Uma agenda nova começa sem nenhuma, porque a forma de organizar as pessoas é decisão sua. Pode criar quantas quiser, dar uma cor a cada uma e pôr uma pessoa em tantas etiquetas quantas fizerem sentido. O filtro mostra todas as pessoas que tenham qualquer uma das etiquetas escolhidas.

## Listas de email

Se ativar as listas de email nas preferências da aplicação, pode manter grupos de pessoas a quem escreve em conjunto. Uma lista é um tipo de etiqueta. Copiar uma lista dá-lhe uma linha de nomes e endereços pronta a colar no campo Para do Gmail, do Outlook ou do Apple Mail. As pessoas sem email ficam de fora, e um endereço repetido entra apenas uma vez.

## Ocultar alguém da lista

Deslize um cartão para a direita no telemóvel, ou use o botão redondo no canto, para retirar alguém da lista principal. A pessoa fica oculta ao percorrer a lista, nunca ao pesquisar: escreva o nome e ela aparece, esbatida, com o mesmo botão para a repor. Uma gaveta no fim da lista mostra todas as pessoas ocultas.

## Ocultar um lembrete de aniversário

A vista de aniversários mostra todas as pessoas com aniversário registado, do mais próximo para o mais distante. Pode ocultar uma pessoa dessa vista sem apagar a data. Ocultar alguém da lista principal e ocultar o aniversário são escolhas independentes.

## Eliminar

Eliminar pede sempre confirmação e diz quem vai ser eliminado. No telemóvel, deslizar um cartão para a esquerda apenas revela o botão Eliminar; o gesto sozinho não elimina nada. Também pode selecionar várias pessoas para as eliminar, etiquetar ou ocultar de uma só vez.`,
  },
  {
    id: 'the-pin-lock',
    title: 'O que o PIN faz e o que não faz',
    summary: 'Um bloqueio de 4 dígitos na aplicação, não uma encriptação da agenda.',
    group: 'Privacidade e segurança',
    body: `Pode definir um PIN de 4 dígitos para que o BlackBook o peça sempre que for aberto nesse dispositivo. Serve para impedir a entrada a quem pegue no seu telemóvel ou computador.

## O que protege

- Impede qualquer pessoa de abrir a aplicação neste dispositivo sem o PIN.
- Após cinco tentativas erradas seguidas, o teclado obriga-o a esperar antes de tentar de novo, e a espera duplica de cada vez.
- O PIN em si nunca é guardado. O BlackBook guarda apenas uma impressão baralhada dele, propositadamente lenta de verificar, o que torna dispendioso tentar adivinhá-lo.
- O bloqueio pertence apenas a este dispositivo e nunca é enviado para a internet.

## O que não faz

O PIN bloqueia a aplicação, não os dados. A sua agenda continua no armazenamento do dispositivo tal como antes, por isso não substitui o bloqueio de ecrã e o código do seu dispositivo. Quatro dígitos permitem apenas 10 000 combinações, muito poucas para uma chave de encriptação segura.

## Se se esquecer do PIN

Ninguém lhe pode dizer o seu PIN nem retirar o bloqueio por si. A única forma de ultrapassar um PIN esquecido é o botão "Forgotten your PIN?" no ecrã de bloqueio, que **apaga a agenda deste dispositivo** e recomeça do zero, sem bloqueio. É isso que torna seguro oferecê-lo: um estranho poderia esvaziar a aplicação, mas nunca lê-la.

Se usar a cópia de segurança online encriptada, esquecer o PIN é apenas um incómodo: inicie sessão de novo, introduza a frase de acesso da cópia de segurança e a sua agenda volta. Sem cópia de segurança não há nada a partir do qual repor, por isso ative-a, ou exporte um ficheiro CSV, antes de definir um PIN.`,
  },
  {
    id: 'encrypted-online-backup',
    title: 'A cópia de segurança online encriptada',
    summary: 'Como a sua agenda é encriptada antes de sair do dispositivo e porque mais ninguém a consegue ler.',
    group: 'Privacidade e segurança',
    body: `A cópia de segurança online é opcional e fica desligada até iniciar sessão com o seu Universal ID. Depois de ativada, o BlackBook guarda uma cópia da sua agenda nos servidores da UNI·SIM, para que sobreviva à perda de um dispositivo e possa ser aberta noutro.

## Encriptada antes de sair

A sua agenda é encriptada no seu dispositivo antes de qualquer envio. O servidor recebe e guarda apenas dados baralhados para os quais não tem chave, por isso a UNI·SIM não consegue ler os seus contactos, notas, etiquetas ou tarefas.

- A encriptação é **AES-GCM com uma chave de 256 bits**, uma norma amplamente utilizada.
- A chave é obtida a partir de uma **frase de acesso escolhida por si**, com PBKDF2 e SHA-256 em 600 000 iterações, o que torna cada tentativa de a adivinhar lenta e dispendiosa.
- A sua frase de acesso nunca sai do seu dispositivo. **Não** é a palavra-passe do seu Universal ID, e alterar essa palavra-passe não a afeta.

Isto importa porque as pessoas da sua agenda não se registaram em nada. Os nomes, os endereços e as suas notas privadas sobre elas merecem o mesmo cuidado que os seus próprios dados.

## Não há recuperação

A UNI·SIM não guarda nenhuma cópia da sua chave e não tem forma de repor a sua frase de acesso. Se a esquecer, ninguém consegue abrir a cópia online. A agenda no seu dispositivo não é afetada, e é por isso que a cópia online é uma cópia de segurança e não a cópia principal.

## Memorizar um dispositivo

Pode pedir a um dispositivo que memorize a chave, para não ter de introduzir a frase de acesso sempre. A chave é guardada de forma que a aplicação a pode usar, mas não extrair. Terminar sessão, ou escolher esquecer este dispositivo, remove-a.

## Alterar ou eliminar

Alterar a frase de acesso exige a atual, mesmo num dispositivo que a memoriza, e volta a encriptar a cópia de segurança num único passo. Desligar a cópia de segurança elimina por completo a cópia online e deixa a agenda do seu dispositivo como está. Eliminar o seu Universal ID elimina também a cópia online.

A cópia de segurança tem um limite de cerca de 2 MB de dados encriptados, o que equivale a muitos milhares de contactos. Notas muito longas são normalmente a razão quando uma agenda atinge esse limite.`,
  },
  {
    id: 'using-two-devices',
    title: 'Usar o BlackBook em mais do que um dispositivo',
    summary: 'Fundir ao iniciar sessão, guardar automaticamente e o que acontece quando dois dispositivos não coincidem.',
    group: 'Privacidade e segurança',
    body: `Com a cópia de segurança online ativa, pode abrir a mesma agenda no telemóvel, no tablet e no computador. Cada dispositivo guarda a sua própria cópia, e a cópia online mantém-nas em dia.

## Iniciar sessão num dispositivo novo

1. Inicie sessão com o seu Universal ID.
2. Introduza a frase de acesso da cópia de segurança.
3. Se este dispositivo já tiver contactos próprios, o BlackBook pergunta se os quer fundir ou usar apenas a cópia online.

Ao fundir, a cópia online é o ponto de partida e os contactos deste dispositivo são-lhe acrescentados. Quem já lá estiver, reconhecido como o mesmo cartão ou pelo mesmo nome com o mesmo email ou telefone, não é acrescentado duas vezes. As etiquetas com o mesmo nome passam a ser uma só.

## Guardar

Enquanto a cópia de segurança estiver ativa, cada alteração é encriptada e guardada online poucos segundos depois. A indicação de sincronização junto ao título mostra que está a ser guardada uma alteração. Quando abre o BlackBook noutro dispositivo, este transfere a cópia mais recente.

## Quando dois dispositivos não coincidem

A cópia online é guardada como uma agenda inteira. Se dois dispositivos alteraram a agenda desde a última gravação, o BlackBook não escolhe em silêncio. Para e pergunta qual manter: a cópia online mais recente ou a versão deste dispositivo. A que não escolher é substituída, por isso, em caso de dúvida, exporte primeiro um ficheiro CSV.

## Depois de alterar a frase de acesso

Quando altera a frase de acesso num dispositivo, os outros deixam de guardar e pedem a nova. Nada se perde neles, e ao desbloqueá-los oferecem-se para voltar a fundir os seus contactos. Um dispositivo que ainda tenha a chave antiga não consegue sobrepor-se à alteração.`,
  },
]

export default articles
