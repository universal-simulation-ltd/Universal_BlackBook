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
    body: `O BlackBook guarda a sua agenda no dispositivo que está a usar. Num navegador, fica no armazenamento que esse navegador reserva a este site; na aplicação para telemóvel, fica no armazenamento da própria aplicação. Nada sobre os seus contactos é enviado para lado nenhum, a menos que inicie sessão, o que liga a cópia de segurança online.

Não precisa de conta para usar o BlackBook. Tudo funciona sem iniciar sessão.

## O que isto significa na prática

- **Cada dispositivo tem a sua própria agenda.** Os contactos adicionados no portátil não aparecem sozinhos no telemóvel. É a cópia de segurança online que os liga. É com um ficheiro de cópia de segurança que os passa de um para o outro.
- **Limpar o navegador pode apagar a agenda.** Eliminar os dados ou o histórico deste site, usar uma janela privada ou desinstalar a aplicação remove a agenda ali guardada.
- **Os contactos do dispositivo são à parte.** O BlackBook não acrescenta nada, não altera nem sincroniza com a agenda integrada do seu telemóvel.

## Ter uma cópia

Como a agenda no seu dispositivo pode ser a única cópia, vale a pena ter outra:

1. Inicie sessão com o seu Universal ID. A cópia de segurança online encriptada começa sozinha.
2. Guarde de vez em quando um ficheiro de cópia de segurança (Afinar, depois Cópia e exportar na aplicação para telemóvel; Ações, depois Avançado, depois Cópia e exportar no site) e mantenha-o num local seguro. Contém tudo, incluindo as tarefas, e pode ter uma palavra-passe.
3. Ou exporte um ficheiro CSV, que qualquer folha de cálculo ou agenda consegue ler, mas que deixa de fora as suas tarefas.

## Ajustar esta aplicação

As escolhas sobre o aspeto e o comportamento da aplicação neste dispositivo, como os separadores apresentados, ficam guardadas neste dispositivo. Um ficheiro de cópia de segurança também as leva, mas só Substituir tudo as repõe.`,
  },
  {
    id: 'importing-and-exporting',
    title: 'Trazer contactos para dentro e levá-los para fora',
    summary: 'Um só Importar para contactos, notas, tarefas e cópias de segurança, e uma exportação CSV.',
    group: 'Como funciona',
    body: `## Uma porta para entrar, uma para sair

Tudo o que entra no BlackBook passa por **Importar**: Afinar, depois Importar na aplicação para telemóvel, ou Ações, depois Avançado, depois Importar no site. Há quatro opções:

- **Contactos**, a partir de um ficheiro CSV e, na aplicação para telemóvel, dos contactos do próprio telemóvel.
- **Notas**, a partir de ficheiros Word, páginas web (.html, .htm, .mht), texto simples ou Markdown. Consulte Traga as suas notas do OneNote.
- **Tarefas**, a partir de uma lista num ficheiro de texto, Markdown, folha de cálculo ou calendário (mais abaixo).
- **Restaurar uma cópia do BlackBook**, que abre um ficheiro de cópia de segurança que guardou (consulte O seu ficheiro de cópia de segurança).

Tudo o que sai está em **Cópia e exportar**: Afinar, depois Cópia e exportar na aplicação para telemóvel, ou Ações, depois Avançado, depois Cópia e exportar no site. Aí guarda um ficheiro de cópia de segurança e exporta um CSV.

## Exportar

A exportação guarda toda a sua agenda num ficheiro CSV com a data de hoje no nome. Tem uma coluna para o nome, o email, as etiquetas, as notas, o aniversário, o telefone, a empresa e para indicar se o aniversário ou o cartão de uma pessoa está oculto, pelo que voltar a importá-lo repõe os seus contactos tal como os deixou. O ficheiro abre em qualquer programa de folha de cálculo. Deixa de fora as suas tarefas: para uma cópia completa, guarde antes um ficheiro de cópia de segurança (consulte O seu ficheiro de cópia de segurança).

## Importar um ficheiro CSV

Escolha Importar, depois Contactos. Pode importar um ficheiro CSV exportado do BlackBook ou de outra agenda. Escolhe se quer **acrescentar** as pessoas do ficheiro à sua agenda ou **substituir** a agenda por elas.

O BlackBook entende os nomes de coluna usados pelo Google Contacts e pelo Outlook. Por exemplo:

- Uma coluna "Categories", "Groups" ou "Labels" é lida como etiquetas.
- "Mobile", "Telephone" ou as colunas de telefone numeradas do Google são lidas como o número de telefone.
- "Organisation" e a coluna de organização do Google são lidas como a empresa.

As linhas sem nome e sem email são ignoradas.

## Aniversários num ficheiro

Os aniversários são aceites como 1990-06-04, 4 June 1990, June 4 ou --06-04 (um aniversário sem ano). Uma data escrita como 04/06/1990 é recusada de propósito: no Reino Unido é 4 de junho, nos Estados Unidos é 6 de abril, e adivinhar estaria errado para metade dos utilizadores.

## A partir dos contactos do telemóvel

Na aplicação para telemóvel, pode escolher uma pessoa dos contactos do telemóvel para preencher um novo cartão, ou importar de uma só vez toda a agenda do telemóvel com Importar, depois Contactos. A importação completa ignora quem já está na sua agenda, por isso pode repeti-la mais tarde sem problemas. No Chrome para Android, o seletor de contactos do navegador oferece o mesmo para um nome, um email e um número.

O BlackBook só lê os contactos do telemóvel quando lho pede e nunca escreve nada neles. A nota do cartão de contacto do telemóvel não é copiada.

## Importar tarefas

Escolha Importar, depois Tarefas, para trazer uma lista que já mantém noutro lado. Pode escolher vários ficheiros de uma vez, e cada ficheiro é lido no seu dispositivo; nada é enviado.

- **Texto e Markdown (.txt, .md).** Uma tarefa por linha. As marcas de lista e os números são retirados, uma caixa assinalada ([x]) chega como concluída, e as linhas avançadas por baixo de uma tarefa passam a ser os seus detalhes. Os títulos de Markdown são nomes de secção, não tarefas, por isso ficam de fora.
- **Folhas de cálculo (.csv, .tsv).** As colunas são lidas pelo nome: Title, Task ou Content para a tarefa, Notes ou Description para os detalhes, Due ou Deadline para a data, e Done, Completed ou Status para saber se está concluída. A exportação do Todoist funciona tal como está; as suas secções ficam de fora.
- **Ficheiros de calendário (.ics).** As tarefas do ficheiro, com os detalhes, os prazos e se estavam concluídas.

São lidos prazos escritos como 2026-10-25 ou 25 October 2026. Uma data escrita como 04/06/2026 fica de fora de propósito, tal como nos aniversários: a tarefa entra na mesma, apenas sem data.

Vê o que foi encontrado antes de se acrescentar alguma coisa e pode retirar qualquer item deslizando-o. A importação liga o separador Tarefas, para que veja o que entrou.`,
  },
  {
    id: 'tags-lists-and-hiding',
    title: 'Etiquetas, listas de email e pessoas ocultas',
    summary: 'Formas de organizar a sua agenda sem eliminar ninguém.',
    group: 'Como funciona',
    body: `## Etiquetas

As etiquetas são rótulos seus, como Família, Trabalho ou Clube de leitura. Uma agenda nova começa sem nenhuma, porque a forma de organizar as pessoas é decisão sua. Pode criar quantas quiser, dar uma cor a cada uma e pôr uma pessoa em tantas etiquetas quantas fizerem sentido. O filtro mostra todas as pessoas que tenham qualquer uma das etiquetas escolhidas.

## Listas de email

Se ativar as listas de email em **Ajustar esta aplicação**, pode manter grupos de pessoas a quem escreve em conjunto. Uma lista é um tipo de etiqueta. Copiar uma lista dá-lhe uma linha de nomes e endereços pronta a colar no campo Para do Gmail, do Outlook ou do Apple Mail. As pessoas sem email ficam de fora, e um endereço repetido entra apenas uma vez.

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
    body: `Pode definir um PIN de 4 dígitos para que o BlackBook o peça sempre que for iniciado nesse dispositivo: depois de ser fechado ou de a página ser recarregada. Voltar a ele a partir de outra app não o volta a pedir. Serve para impedir a entrada a quem pegue no seu telemóvel ou computador.

## O que protege

- Impede qualquer pessoa de abrir a aplicação neste dispositivo sem o PIN.
- Após cinco tentativas erradas seguidas, o teclado obriga-o a esperar antes de tentar de novo, e a espera duplica de cada vez.
- O PIN em si nunca é guardado. O BlackBook guarda apenas uma impressão baralhada dele, propositadamente lenta de verificar, o que torna dispendioso tentar adivinhá-lo.
- O bloqueio pertence apenas a este dispositivo e nunca é enviado para a internet.

## O que não faz

O PIN bloqueia a aplicação, não os dados. A sua agenda continua no armazenamento do dispositivo tal como antes, por isso não substitui o bloqueio de ecrã e o código do seu dispositivo. Quatro dígitos permitem apenas 10 000 combinações, muito poucas para uma chave de encriptação segura.

## Se se esquecer do PIN

Ninguém lhe pode dizer o seu PIN nem retirar o bloqueio por si. A única forma de ultrapassar um PIN esquecido é o botão "Forgotten your PIN?" no ecrã de bloqueio, que **apaga a agenda deste dispositivo** e recomeça do zero, sem bloqueio. É isso que torna seguro oferecê-lo: um estranho poderia esvaziar a aplicação, mas nunca lê-la.

Se usar a cópia de segurança online encriptada, esquecer o PIN é apenas um incómodo: inicie sessão de novo (e introduza a frase de acesso da cópia de segurança, se tiver acrescentado uma) e a sua agenda volta. Se tiver um ficheiro de cópia de segurança, esquecer o PIN é apenas um incómodo: depois da reposição, escolha Importar, depois Restaurar uma cópia do BlackBook, selecione o ficheiro e a sua agenda volta. Sem ele não há nada a partir do qual repor, por isso guarde uma cópia de segurança antes de definir um PIN.`,
  },
  {
    id: 'encrypted-online-backup',
    title: 'A cópia de segurança online encriptada',
    summary: 'Como a sua agenda é encriptada antes de sair do dispositivo, quem guarda a chave e o que acrescenta uma frase de acesso.',
    group: 'Privacidade e segurança',
    body: `A cópia de segurança online é opcional e precisa de um Universal ID. Iniciar sessão liga-a (na aplicação para telemóvel, inicie sessão em Afinar, depois Conta) e, a partir daí, o BlackBook guarda uma cópia da sua agenda nos servidores da UNI·SIM, para que sobreviva à perda de um dispositivo e abra em todos os dispositivos em que iniciar sessão. As opções da cópia estão em Cópia online: Afinar, depois Conta, depois Cópia online na aplicação para telemóvel, ou Ações, depois Avançado, depois Cópia online no site.

## Encriptada antes de sair

A sua agenda é encriptada no seu dispositivo antes de qualquer envio, com **AES-GCM e uma chave de 256 bits**, uma norma amplamente utilizada. Quem consegue ler a cópia online depende de onde essa chave fica guardada, e é o utilizador quem escolhe.

## Sem frase de acesso (a predefinição)

A chave é aleatória e fica guardada com a sua conta nos servidores da UNI·SIM. É isso que permite que um dispositivo novo abra a sua agenda apenas ao iniciar sessão. Só a sua própria conta a consegue obter, mas a UNI·SIM **poderia** tecnicamente ler a cópia online, como acontece com a maioria das aplicações que sincronizam.

## Com uma frase de acesso

Assinale Protegê-la com uma frase-passe ao ligar a cópia, ou escolha mais tarde Adicionar uma frase-passe em Cópia online. A partir daí, ninguém além de si consegue ler a cópia online, nem mesmo a UNI·SIM.

- A chave é obtida a partir da sua frase de acesso, com PBKDF2 e SHA-256 em 600 000 iterações, o que torna cada tentativa de a adivinhar lenta e dispendiosa, e a chave é retirada do servidor.
- A sua frase de acesso nunca sai do seu dispositivo. **Não** é a palavra-passe do seu Universal ID, e alterar essa palavra-passe não a afeta.
- Cada um dos seus outros dispositivos pede-a uma vez.

Isto importa porque as pessoas da sua agenda não se registaram em nada. Os nomes, os endereços e as suas notas privadas sobre elas merecem o mesmo cuidado que os seus próprios dados.

## Com frase de acesso, não há recuperação

A UNI·SIM deixa então de guardar qualquer cópia da sua chave e não tem forma de repor a sua frase de acesso. Se a esquecer, ninguém consegue abrir a cópia online. A agenda no seu dispositivo não é afetada, e é por isso que a cópia online é uma cópia de segurança e não a cópia principal.

## Memorizar um dispositivo

Com uma frase de acesso, pode pedir a um dispositivo que memorize a chave, para não ter de a introduzir sempre. A chave é guardada de forma que a aplicação a pode usar, mas não extrair. Terminar sessão, ou escolher Esquecer este dispositivo, remove-a.

## Alterar ou eliminar

Alterar a frase de acesso, ou escolher Remover a frase-passe, exige a atual, mesmo num dispositivo que a memoriza, e volta a encriptar a cópia de segurança num único passo. Removê-la volta a guardar uma chave aleatória com a sua conta, e os seus dispositivos abrem a cópia online apenas ao iniciar sessão de novo. Desligar e apagar a cópia online elimina por completo a cópia online, deixa a agenda do seu dispositivo como está e faz com que iniciar sessão de novo nesse dispositivo não volte a ligar a cópia. Eliminar o seu Universal ID elimina também a cópia online.

A cópia de segurança tem um limite de cerca de 2 MB de dados encriptados, o que equivale a muitos milhares de contactos. Notas muito longas são normalmente a razão quando uma agenda atinge esse limite.`,
  },
  {
    id: 'backup-file',
    title: 'O seu ficheiro de cópia de segurança',
    summary: 'Um ficheiro com tudo o que está na sua agenda, uma palavra-passe opcional e como voltar a abri-lo.',
    group: 'Privacidade e segurança',
    body: `Um ficheiro de cópia de segurança é uma cópia completa da sua agenda num único ficheiro. Para guardar um, abra Cópia e exportar (Afinar, depois Cópia e exportar na aplicação para telemóvel; Ações, depois Avançado, depois Cópia e exportar no site) e escolha Guardar uma cópia. No telemóvel abre-se o menu de partilha, para que possa guardar o ficheiro em Ficheiros, num serviço de armazenamento na nuvem ou num email para si próprio; num navegador, o ficheiro é transferido.

## O que contém

- Todos os contactos, com todos os campos: nome, email, telefone, empresa, morada, aniversário, notas, etiquetas, fixações e quem está oculto.
- As suas etiquetas e listas de email.
- A sua lista de tarefas.
- As suas escolhas em Ajustar esta aplicação e a vista com que a lista abre.

O seu PIN não está incluído. O PIN pertence ao dispositivo.

## Protegê-lo com uma palavra-passe

A sua agenda diz respeito a outras pessoas, que nunca se registaram em nada, por isso pode trancar o ficheiro com uma palavra-passe. Assinale Proteger com palavra-passe antes de guardar.

- O ficheiro é encriptado com **AES-GCM e uma chave de 256 bits**, uma norma amplamente utilizada.
- A chave é obtida a partir da sua palavra-passe com PBKDF2, SHA-256 e 600 000 iterações, o que torna cada tentativa de a adivinhar lenta e dispendiosa.
- A palavra-passe nunca é guardada nem enviada para lado nenhum. Ninguém, incluindo a UNI·SIM, consegue abrir o ficheiro sem ela, e não há forma de a repor.

Sem palavra-passe, o ficheiro é texto simples, como uma exportação CSV: qualquer pessoa que o obtenha consegue lê-lo.

## Abrir uma cópia de segurança

Escolha Importar, depois Restaurar uma cópia do BlackBook (Afinar, depois Importar na aplicação para telemóvel; Ações, depois Avançado, depois Importar no site). Escolha Abrir uma cópia e selecione o ficheiro, ou arraste-o para a janela num navegador. Se tiver palavra-passe, ser-lhe-á pedida. Depois escolha:

- **Acrescentar ao que já existe.** Tudo o que já está neste dispositivo mantém-se. As pessoas e tarefas do ficheiro são acrescentadas e, se uma estiver em ambos, fica a cópia editada mais recentemente. Quem já cá estiver com o mesmo nome e o mesmo email ou número de telefone não é acrescentado duas vezes, e as etiquetas com o mesmo nome passam a ser uma só.
- **Substituir tudo.** A agenda deste dispositivo é trocada pela do ficheiro, depois de confirmar.

O BlackBook verifica cada campo de um ficheiro antes de o usar, por isso um ficheiro danificado ou editado não consegue avariar a aplicação.`,
  },
  {
    id: 'using-two-devices',
    title: 'Usar o BlackBook em mais do que um dispositivo',
    summary: 'Fundir ao iniciar sessão, guardar automaticamente e o que acontece quando dois dispositivos não coincidem.',
    group: 'Privacidade e segurança',
    body: `Com a cópia de segurança online ativa, pode abrir a mesma agenda no telemóvel, no tablet e no computador. Cada dispositivo guarda a sua própria cópia, e a cópia online mantém-nas em dia.

## Iniciar sessão num dispositivo novo

1. Inicie sessão com o seu Universal ID (na aplicação para telemóvel, em Afinar, depois Conta).
2. Se protegeu a cópia de segurança com uma frase de acesso, introduza-a. Sem ela, basta iniciar sessão.
3. Se este dispositivo já tiver contactos ou tarefas próprios, como os que acrescentou antes de iniciar sessão, o BlackBook funde-os na cópia online e guarda-a de imediato. Não há nada para escolher.

Ao fundir, a cópia online é o ponto de partida e os contactos deste dispositivo são-lhe acrescentados. Quem já lá estiver, reconhecido como o mesmo cartão ou pelo mesmo nome com o mesmo email ou telefone, não é acrescentado duas vezes. As etiquetas com o mesmo nome passam a ser uma só. Fundir só acrescenta, por isso alguém que eliminou noutro dispositivo pode voltar a partir de um dispositivo que ainda o tenha. Para ficar antes com a cópia online exatamente como está, abra Cópia online (Afinar, depois Conta, depois Cópia online na aplicação para telemóvel; Ações, depois Avançado, depois Cópia online no site) e escolha Obter a cópia online.

## Guardar

Enquanto a cópia de segurança estiver ativa, cada alteração é encriptada e guardada online poucos segundos depois. A indicação de sincronização junto ao título mostra que está a ser guardada uma alteração. Quando abre o BlackBook noutro dispositivo, este transfere a cópia mais recente.

## Quando dois dispositivos não coincidem

A cópia online é guardada como uma agenda inteira. Se dois dispositivos alteraram a agenda desde a última gravação, o BlackBook não escolhe em silêncio. Para e pergunta qual manter: a cópia online mais recente ou a versão deste dispositivo. A que não escolher é substituída, por isso, em caso de dúvida, exporte primeiro um ficheiro CSV.

## Depois de alterar a frase de acesso

Quando acrescenta ou altera a frase de acesso num dispositivo, os outros deixam de guardar e pedem-na uma vez. Nada se perde neles, e ao desbloqueá-los oferecem-se para voltar a fundir os seus contactos. Um dispositivo que ainda tenha a chave antiga não consegue sobrepor-se à alteração. Quando remove a frase de acesso, os outros dispositivos voltam a abrir a cópia online sozinhos.

## Passar a sua agenda sem conta

1. No dispositivo que tem a sua agenda, guarde um ficheiro de cópia de segurança em Cópia e exportar. Uma palavra-passe é boa ideia se o ficheiro for passar por email ou por um serviço de armazenamento na nuvem.
2. Faça chegar o ficheiro ao outro dispositivo, por exemplo por AirDrop, por um serviço de armazenamento na nuvem ou por email.
3. No outro dispositivo, abra o BlackBook, escolha Importar, depois Restaurar uma cópia do BlackBook, e selecione o ficheiro.

Se o outro dispositivo for novo, escolha Substituir tudo. Se já tiver pessoas próprias, escolha Acrescentar ao que já existe e as duas agendas são fundidas.`,
  },
  {
    id: 'notes-from-onenote',
    title: "Traga as suas notas do OneNote",
    summary: "Exporte páginas do OneNote e importe os ficheiros em Notas.",
    group: "Como funciona",
    body: `O BlackBook não consegue abrir sozinho um bloco de notas do OneNote, mas lê os ficheiros que o OneNote exporta. Tudo é lido no seu dispositivo; nada é enviado.

## OneNote para Windows

1. Abra a página ou a secção que quer trazer.
2. Escolha **Ficheiro** ▸ **Exportar**.
3. Em **Exportar Atual**, escolha **Página** ou **Secção**.
4. Em **Selecionar Formato**, escolha **Documento do Word** (.docx), ou **Página Web de Ficheiro Único** (.mht) se o Word não for proposto.
5. Escolha **Exportar** e guarde o ficheiro.

Um bloco de notas inteiro não pode ser exportado para Word: exporte-o secção a secção.

## OneNote no Mac ou na web

Segundo a Microsoft, o OneNote para Mac e o OneNote para a web ainda não exportam páginas. Abra o bloco de notas no OneNote para Windows (na web: **Edição** ▸ **Abrir na Aplicação de Ambiente de Trabalho**) ou copie uma página de cada vez: selecione tudo na página, copie, cole num documento de texto ou do Word e guarde-o.

## Importar no BlackBook

Escolha **Importar** ▸ **Notas**: na aplicação para telemóvel, Importar está em **Afinar**; no site, em **Ações** ▸ **Avançado**. Pode escolher vários ficheiros de uma vez: Word (.docx), páginas web (.html, .htm, .mht), texto simples (.txt) e Markdown (.md).

- Um ficheiro Word com várias páginas do OneNote passa a uma nota por página, dividida em cada título de página.
- O título de cada nota é o título da página; se não houver, o primeiro cabeçalho; se não, o nome do ficheiro.
- O texto chega como texto simples: parágrafos e listas mantêm-se; formatação, imagens, desenhos e anexos não.
- Se o OneNote escreveu a data da página por baixo do título, essa passa a ser a data da nota.

Vê o que foi encontrado antes de se acrescentar alguma coisa e pode retirar qualquer item deslizando-o. A importação liga o separador Notas.`,
  },
]

export default articles
