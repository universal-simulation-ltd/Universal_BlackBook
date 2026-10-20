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
    body: `O BlackBook guarda a sua agenda no dispositivo que está a usar. Num navegador, fica no armazenamento que esse navegador reserva a este site; na aplicação para telemóvel, fica no armazenamento da própria aplicação. Nada sobre os seus contactos é alguma vez enviado para lado nenhum.

Não há conta nem sessão para iniciar.

## O que isto significa na prática

- **Cada dispositivo tem a sua própria agenda.** Os contactos adicionados no portátil não aparecem sozinhos no telemóvel. É com um ficheiro de cópia de segurança que os passa de um para o outro.
- **Limpar o navegador pode apagar a agenda.** Eliminar os dados ou o histórico deste site, usar uma janela privada ou desinstalar a aplicação remove a agenda ali guardada.
- **Os contactos do dispositivo são à parte.** O BlackBook não acrescenta nada, não altera nem sincroniza com a agenda integrada do seu telemóvel.

## Ter uma cópia

Como a agenda no seu dispositivo pode ser a única cópia, vale a pena ter outra:

1. Guarde de vez em quando um ficheiro de cópia de segurança (Avançado, depois Cópia de segurança, importação e exportação) e mantenha-o num local seguro. Contém tudo, incluindo as tarefas, e pode ter uma palavra-passe.
2. Ou exporte um ficheiro CSV, que qualquer folha de cálculo ou agenda consegue ler, mas que deixa de fora as suas tarefas.

## Ajustar esta aplicação

As escolhas sobre o aspeto e o comportamento da aplicação neste dispositivo, como os separadores apresentados, ficam guardadas neste dispositivo. Um ficheiro de cópia de segurança também as leva, mas só Substituir tudo as repõe.`,
  },
  {
    id: 'importing-and-exporting',
    title: 'Trazer contactos para dentro e levá-los para fora',
    summary: 'Importar e exportar CSV, e escolher pessoas dos contactos do telemóvel.',
    group: 'Como funciona',
    body: `## Exportar

A exportação guarda toda a sua agenda num ficheiro CSV com a data de hoje no nome. Tem uma coluna para o nome, o email, as etiquetas, as notas, o aniversário, o telefone, a empresa e para indicar se o aniversário ou o cartão de uma pessoa está oculto, pelo que voltar a importá-lo repõe os seus contactos tal como os deixou. O ficheiro abre em qualquer programa de folha de cálculo. Deixa de fora as suas tarefas: para uma cópia completa, guarde antes um ficheiro de cópia de segurança (consulte O seu ficheiro de cópia de segurança).

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
    body: `Pode definir um PIN de 4 dígitos para que o BlackBook o peça sempre que for aberto nesse dispositivo. Serve para impedir a entrada a quem pegue no seu telemóvel ou computador.

## O que protege

- Impede qualquer pessoa de abrir a aplicação neste dispositivo sem o PIN.
- Após cinco tentativas erradas seguidas, o teclado obriga-o a esperar antes de tentar de novo, e a espera duplica de cada vez.
- O PIN em si nunca é guardado. O BlackBook guarda apenas uma impressão baralhada dele, propositadamente lenta de verificar, o que torna dispendioso tentar adivinhá-lo.
- O bloqueio pertence apenas a este dispositivo e nunca é incluído num ficheiro de cópia de segurança.

## O que não faz

O PIN bloqueia a aplicação, não os dados. A sua agenda continua no armazenamento do dispositivo tal como antes, por isso não substitui o bloqueio de ecrã e o código do seu dispositivo. Quatro dígitos permitem apenas 10 000 combinações, muito poucas para uma chave de encriptação segura.

## Se se esquecer do PIN

Ninguém lhe pode dizer o seu PIN nem retirar o bloqueio por si. A única forma de ultrapassar um PIN esquecido é o botão "Forgotten your PIN?" no ecrã de bloqueio, que **apaga a agenda deste dispositivo** e recomeça do zero, sem bloqueio. É isso que torna seguro oferecê-lo: um estranho poderia esvaziar a aplicação, mas nunca lê-la.

Se tiver um ficheiro de cópia de segurança, esquecer o PIN é apenas um incómodo: depois da reposição, abra a cópia de segurança e a sua agenda volta. Sem ele não há nada a partir do qual repor, por isso guarde uma cópia de segurança antes de definir um PIN.`,
  },
  {
    id: 'backup-file',
    title: 'O seu ficheiro de cópia de segurança',
    summary: 'Um ficheiro com tudo o que está na sua agenda, uma palavra-passe opcional e como voltar a abri-lo.',
    group: 'Privacidade e segurança',
    body: `Um ficheiro de cópia de segurança é uma cópia completa da sua agenda num único ficheiro. Para guardar um, abra Ações, depois Avançado, depois Cópia de segurança, importação e exportação, e escolha Guardar uma cópia de segurança. No telemóvel abre-se o menu de partilha, para que possa guardar o ficheiro em Ficheiros, num serviço de armazenamento na nuvem ou num email para si próprio; num navegador, o ficheiro é transferido.

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

Escolha Abrir uma cópia de segurança e selecione o ficheiro, ou arraste-o para a janela num navegador. Se tiver palavra-passe, ser-lhe-á pedida. Depois escolha:

- **Acrescentar ao que já existe.** Tudo o que já está neste dispositivo mantém-se. As pessoas e tarefas do ficheiro são acrescentadas e, se uma estiver em ambos, fica a cópia editada mais recentemente. Quem já cá estiver com o mesmo nome e o mesmo email ou número de telefone não é acrescentado duas vezes, e as etiquetas com o mesmo nome passam a ser uma só.
- **Substituir tudo.** A agenda deste dispositivo é trocada pela do ficheiro, depois de confirmar.

O BlackBook verifica cada campo de um ficheiro antes de o usar, por isso um ficheiro danificado ou editado não consegue avariar a aplicação.`,
  },
  {
    id: 'using-two-devices',
    title: 'Usar o BlackBook em mais do que um dispositivo',
    summary: 'Passar a sua agenda de um dispositivo para outro com um ficheiro de cópia de segurança.',
    group: 'Privacidade e segurança',
    body: `O BlackBook não tem conta nem cópia online, por isso cada dispositivo guarda a sua própria agenda e nada as liga sem que saiba. Para levar a sua agenda para outro dispositivo, use um ficheiro de cópia de segurança.

## Passar a sua agenda

1. No dispositivo que tem a sua agenda, guarde um ficheiro de cópia de segurança. Uma palavra-passe é boa ideia se o ficheiro for passar por email ou por um serviço de armazenamento na nuvem.
2. Faça chegar o ficheiro ao outro dispositivo, por exemplo por AirDrop, por um serviço de armazenamento na nuvem ou por email.
3. No outro dispositivo, abra o BlackBook, escolha Abrir uma cópia de segurança e selecione o ficheiro.

Se o outro dispositivo for novo, escolha Substituir tudo. Se já tiver pessoas próprias, escolha Acrescentar ao que já existe e as duas agendas são fundidas.

## Manter dois dispositivos em dia

Não há sincronização automática. Se acrescentar pessoas nos dois dispositivos, guarde uma cópia de segurança num deles e abra-a no outro com Acrescentar ao que já existe: ninguém é acrescentado duas vezes, e prevalece a cópia editada mais recentemente. Fundir apenas acrescenta, por isso alguém que tenha eliminado num dispositivo pode voltar a partir de uma cópia de segurança que ainda o tenha.

## Porque não há início de sessão

Uma agenda contém nomes e números de outras pessoas, e as suas notas sobre elas. Mantê-la apenas nos seus próprios dispositivos, e levá-la num ficheiro que controla, significa que não existe nenhuma cópia dela no servidor de ninguém.`,
  },
]

export default articles
