import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-a-csv-file',
    title: 'O que é um arquivo CSV?',
    summary: 'O arquivo de texto simples, em forma de planilha, que o BlackBook usa para importar e exportar.',
    group: 'O básico',
    body: `CSV quer dizer "comma-separated values", ou seja, "valores separados por vírgulas". É praticamente a forma mais simples de guardar uma tabela: um arquivo de texto em que cada linha é uma linha da tabela e as vírgulas separam as colunas.

Uma agenda minúscula em formato CSV fica assim em um editor de texto:

- Name,Email,Phone
- Sam Okonkwo,sam@example.com,07700 900123
- Priya Shah,priya@example.com,

A primeira linha traz os nomes das colunas. Cada linha seguinte é uma pessoa. Se não há nada entre duas vírgulas, aquela célula está vazia. Se um valor tiver uma vírgula própria, ele fica entre aspas duplas para não ser confundido com o início de uma nova coluna.

## Por que é útil

- **Quase tudo consegue ler.** Excel, Numbers, Google Sheets e LibreOffice abrem arquivos CSV como planilha, e a maioria das agendas consegue exportar um.
- **Uma pessoa consegue ler.** Não há formatação escondida: você pode abrir o arquivo e ver exatamente o que ele contém.
- **Não prende você a nada.** Uma exportação CSV é sua para guardar, mover ou abrir em outro lugar, com ou sem o BlackBook.

## O que ele não faz

Um arquivo CSV guarda apenas texto. Não tem imagens, senha nem criptografia, então qualquer pessoa que obtenha o arquivo pode ler cada nome, número e anotação. Guarde as exportações em um lugar de confiança e apague as cópias de que não precisa mais.

## Datas e planilhas

Programas de planilha às vezes mudam o formato do que abrem, transformando um aniversário ou um número de telefone longo em outra coisa. Se você editar uma exportação em uma planilha antes de importá-la de novo, confira essas colunas antes de salvar.`,
  },
  {
    id: 'where-your-book-lives',
    title: 'Onde sua agenda fica guardada',
    summary: 'Neste aparelho, sem precisar de conta, e o que isso significa para você.',
    group: 'O básico',
    body: `O BlackBook guarda sua agenda no aparelho que você está usando. No navegador, ela fica no armazenamento que esse navegador reserva para este site; no aplicativo do celular, fica no armazenamento do próprio aplicativo. Nada sobre seus contatos é enviado a lugar nenhum, nunca.

Não há conta nem nada em que fazer login.

## O que isso significa na prática

- **Cada aparelho tem sua própria agenda.** Contatos adicionados no notebook não aparecem sozinhos no celular. Um arquivo de backup é o jeito de levá-los de um para o outro.
- **Limpar o navegador pode apagar a agenda.** Apagar os dados ou o histórico deste site, usar uma janela anônima ou desinstalar o aplicativo remove a agenda guardada ali.
- **Os contatos do aparelho são separados.** O BlackBook não adiciona nada, não altera e não sincroniza com a agenda embutida do seu celular.

## Tendo uma cópia

Como a agenda do seu aparelho pode ser a única cópia, vale a pena ter outra:

1. Salve um arquivo de backup de vez em quando (Avançado, depois Backup, importação e exportação) e guarde em um lugar seguro. Ele tem tudo, inclusive as tarefas, e pode ter senha.
2. Ou exporte um arquivo CSV, que qualquer planilha ou agenda consegue ler, mas que deixa as tarefas de fora.

## Ajustar este app

As escolhas sobre a aparência e o comportamento do aplicativo neste aparelho, como quais abas aparecem, ficam guardadas neste aparelho. Um arquivo de backup também as leva, mas só Substituir tudo as traz de volta.`,
  },
  {
    id: 'importing-and-exporting',
    title: 'Colocando contatos para dentro e para fora',
    summary: 'Importar e exportar CSV, e escolher pessoas dos contatos do celular.',
    group: 'Como funciona',
    body: `## Exportar

A exportação salva toda a sua agenda em um arquivo CSV com a data de hoje no nome. Ele tem uma coluna para nome, e-mail, etiquetas, anotações, aniversário, telefone, empresa e para indicar se o aniversário ou o cartão de uma pessoa está oculto, então importá-lo de volta restaura seus contatos como você os deixou. O arquivo abre em qualquer programa de planilha. Ele deixa suas tarefas de fora: para uma cópia completa, salve um arquivo de backup (veja Seu arquivo de backup).

## Importar um arquivo CSV

Você pode importar um arquivo CSV exportado do BlackBook ou de outra agenda. Você escolhe se quer **adicionar** as pessoas do arquivo à sua agenda ou **substituir** a agenda por elas.

O BlackBook entende os nomes de coluna usados pelo Google Contacts e pelo Outlook. Por exemplo:

- Uma coluna "Categories", "Groups" ou "Labels" é lida como etiquetas.
- "Mobile", "Telephone" ou as colunas numeradas de telefone do Google são lidas como o número de telefone.
- "Organisation" e a coluna de organização do Google são lidas como a empresa.

Linhas sem nome e sem e-mail são ignoradas.

## Aniversários em um arquivo

Os aniversários são aceitos como 1990-06-04, 4 June 1990, June 4 ou --06-04 (um aniversário sem ano). Uma data escrita como 04/06/1990 é recusada de propósito: no Reino Unido é 4 de junho, nos Estados Unidos é 6 de abril, e adivinhar estaria errado para metade dos usuários.

## Dos contatos do seu celular

No aplicativo do celular, você pode escolher uma pessoa dos contatos do celular para preencher um novo cartão ou importar toda a agenda do celular de uma vez. A importação completa pula quem já está na sua agenda, então você pode repeti-la depois sem problema. No Chrome para Android, o seletor de contatos do navegador oferece o mesmo para um nome, um e-mail e um número.

O BlackBook só lê os contatos do celular quando você pede e nunca grava nada neles. A anotação do cartão de contato do celular não é copiada.`,
  },
  {
    id: 'tags-lists-and-hiding',
    title: 'Etiquetas, listas de e-mail e pessoas ocultas',
    summary: 'Formas de organizar sua agenda sem apagar ninguém.',
    group: 'Como funciona',
    body: `## Etiquetas

Etiquetas são rótulos seus, como Família, Trabalho ou Clube do livro. Uma agenda nova começa sem nenhuma, porque a forma de organizar as pessoas é decisão sua. Você pode criar quantas quiser, dar uma cor a cada uma e colocar uma pessoa em quantas etiquetas fizerem sentido. O filtro mostra todos que tenham qualquer uma das etiquetas escolhidas.

## Listas de e-mail

Se você ativar as listas de e-mail em **Ajustar este app**, pode manter grupos de pessoas para quem escreve juntas. Uma lista é um tipo de etiqueta. Copiar uma lista gera uma linha de nomes e endereços pronta para colar no campo Para do Gmail, do Outlook ou do Apple Mail. Pessoas sem e-mail ficam de fora, e um endereço repetido entra uma vez só.

## Ocultar alguém da lista

Deslize um cartão para a direita no celular, ou use o botão redondo no canto dele, para tirar alguém da lista principal. A pessoa fica oculta na navegação, nunca na busca: digite o nome e ela aparece, esmaecida, com o mesmo botão para trazê-la de volta. Uma gaveta no fim da lista mostra todos os ocultos.

## Ocultar um lembrete de aniversário

A tela de aniversários mostra todas as pessoas com aniversário registrado, do mais próximo ao mais distante. Você pode ocultar uma pessoa dessa tela sem apagar a data. Ocultar alguém da lista principal e ocultar o aniversário são escolhas independentes.

## Apagar

Apagar sempre pede confirmação e diz quem será apagado. No celular, deslizar um cartão para a esquerda só revela o botão de apagar; o gesto sozinho não apaga nada. Você também pode selecionar várias pessoas para apagar, etiquetar ou ocultar de uma vez.`,
  },
  {
    id: 'the-pin-lock',
    title: 'O que o PIN faz e o que não faz',
    summary: 'Um bloqueio de 4 dígitos no aplicativo, não uma criptografia da agenda.',
    group: 'Privacidade e segurança',
    body: `Você pode definir um PIN de 4 dígitos para que o BlackBook o peça sempre que for aberto naquele aparelho. Ele serve para barrar alguém que pegue seu celular ou computador.

## O que ele protege

- Impede que qualquer pessoa abra o aplicativo neste aparelho sem o PIN.
- Depois de cinco tentativas erradas seguidas, o teclado faz você esperar antes de tentar de novo, e a espera dobra a cada vez.
- O PIN em si nunca é guardado. O BlackBook guarda apenas uma impressão embaralhada dele, que é propositalmente lenta de conferir, o que torna caro tentar adivinhar.
- O bloqueio pertence só a este aparelho e nunca entra em um arquivo de backup.

## O que ele não faz

O PIN bloqueia o aplicativo, não os dados. Sua agenda continua no armazenamento do aparelho exatamente como antes, então ele não substitui o bloqueio de tela e a senha do seu aparelho. Quatro dígitos permitem só 10.000 combinações, pouquíssimo para uma chave de criptografia segura.

## Se você esquecer o PIN

Ninguém pode dizer seu PIN nem tirar o bloqueio por você. A única forma de passar por um PIN esquecido é o botão "Forgotten your PIN?" na tela de bloqueio, que **apaga a agenda deste aparelho** e recomeça do zero, sem bloqueio. É isso que torna seguro oferecê-lo: um estranho poderia esvaziar o aplicativo, mas nunca lê-lo.

Se você tem um arquivo de backup, esquecer o PIN é só um incômodo: depois de recomeçar, abra o backup e sua agenda volta. Sem ele, não há de onde restaurar, então salve um backup antes de definir um PIN.`,
  },
  {
    id: 'backup-file',
    title: 'Seu arquivo de backup',
    summary: 'Um arquivo com tudo o que está na sua agenda, uma senha opcional e como abri-lo de novo.',
    group: 'Privacidade e segurança',
    body: `Um arquivo de backup é uma cópia completa da sua agenda em um único arquivo. Para salvar um, abra Ações, depois Avançado, depois Backup, importação e exportação, e escolha Salvar um backup. No celular, abre-se o menu de compartilhamento para você guardar o arquivo em Arquivos, em um serviço de nuvem ou em um e-mail para você mesmo; no navegador, ele é baixado.

## O que tem nele

- Todos os contatos, com todos os campos: nome, e-mail, telefone, empresa, endereço, aniversário, anotações, etiquetas, fixados e quem está oculto.
- Suas etiquetas e listas de e-mail.
- Sua lista de tarefas.
- Suas escolhas em Ajustar este app e a visualização com que a lista abre.

Seu PIN não vai no arquivo. O PIN pertence ao aparelho.

## Protegendo com senha

Sua agenda fala de outras pessoas, que nunca se cadastraram em nada, então você pode trancar o arquivo com uma senha. Marque Proteger com senha antes de salvar.

- O arquivo é criptografado com **AES-GCM e chave de 256 bits**, um padrão amplamente usado.
- A chave é gerada a partir da sua senha com PBKDF2, SHA-256 e 600.000 rodadas, o que torna cada tentativa de adivinhar lenta e cara.
- A senha nunca é guardada nem enviada a lugar nenhum. Ninguém, nem a UNI·SIM, consegue abrir o arquivo sem ela, e não há como redefini-la.

Sem senha, o arquivo é texto simples, como uma exportação CSV: qualquer pessoa que o obtenha consegue lê-lo.

## Abrindo um backup

Escolha Abrir um backup e selecione o arquivo, ou arraste-o para a janela no navegador. Se ele tiver senha, ela será pedida. Depois escolha:

- **Adicionar ao que já existe.** Tudo o que já está neste aparelho continua. As pessoas e tarefas do arquivo são adicionadas e, se uma estiver nos dois, fica a cópia editada por último. Quem já está aqui com o mesmo nome e o mesmo e-mail ou telefone não é adicionado duas vezes, e etiquetas com o mesmo nome viram uma só.
- **Substituir tudo.** A agenda deste aparelho é trocada pela do arquivo, depois que você confirma.

O BlackBook confere cada campo de um arquivo antes de usá-lo, então um arquivo danificado ou editado não consegue quebrar o aplicativo.`,
  },
  {
    id: 'using-two-devices',
    title: 'Usando o BlackBook em mais de um aparelho',
    summary: 'Levando sua agenda de um aparelho para outro com um arquivo de backup.',
    group: 'Privacidade e segurança',
    body: `O BlackBook não tem conta nem cópia on-line, então cada aparelho guarda sua própria agenda e nada as junta sem você saber. Para levar sua agenda para outro aparelho, use um arquivo de backup.

## Levando sua agenda

1. No aparelho que tem sua agenda, salve um arquivo de backup. Uma senha é uma boa ideia se o arquivo for passar por e-mail ou por um serviço de nuvem.
2. Coloque o arquivo no outro aparelho, por exemplo com AirDrop, um serviço de nuvem ou e-mail.
3. No outro aparelho, abra o BlackBook, escolha Abrir um backup e selecione o arquivo.

Se o outro aparelho for novo, escolha Substituir tudo. Se ele já tiver pessoas próprias, escolha Adicionar ao que já existe e as duas agendas são mescladas.

## Mantendo dois aparelhos em dia

Não há sincronização automática. Se você adicionar pessoas nos dois aparelhos, salve um backup em um deles e abra no outro com Adicionar ao que já existe: ninguém é adicionado duas vezes, e vale a cópia editada por último. Mesclar só adiciona, então alguém que você apagou em um aparelho pode voltar de um backup que ainda o tenha.

## Por que não há login

Uma agenda guarda nomes e números de outras pessoas, e suas anotações sobre elas. Mantê-la só nos seus próprios aparelhos, e levá-la em um arquivo que você controla, significa que não existe cópia dela no servidor de ninguém.`,
  },
]

export default articles
