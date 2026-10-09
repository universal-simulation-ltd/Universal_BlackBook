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
    body: `O BlackBook guarda sua agenda no aparelho que você está usando. No navegador, ela fica no armazenamento que esse navegador reserva para este site; no aplicativo do celular, fica no armazenamento do próprio aplicativo. Nada sobre seus contatos é enviado a lugar nenhum, a menos que você ative o backup on-line.

Você não precisa de conta para usar o BlackBook. Tudo funciona sem fazer login.

## O que isso significa na prática

- **Cada aparelho tem sua própria agenda.** Contatos adicionados no notebook não aparecem sozinhos no celular. É o backup on-line que junta tudo.
- **Limpar o navegador pode apagar a agenda.** Apagar os dados ou o histórico deste site, usar uma janela anônima ou desinstalar o aplicativo remove a agenda guardada ali.
- **Os contatos do aparelho são separados.** O BlackBook não adiciona nada, não altera e não sincroniza com a agenda embutida do seu celular.

## Tendo uma cópia

Como a agenda do seu aparelho pode ser a única cópia, vale a pena ter outra:

1. Exporte um arquivo CSV de vez em quando e guarde em um lugar seguro, ou
2. Faça login com seu Universal ID e ative o backup on-line criptografado.

## Ajustar este app

As escolhas sobre a aparência e o comportamento do aplicativo neste aparelho, como quais abas aparecem, ficam só neste aparelho e não fazem parte do backup.`,
  },
  {
    id: 'importing-and-exporting',
    title: 'Colocando contatos para dentro e para fora',
    summary: 'Importar e exportar CSV, e escolher pessoas dos contatos do celular.',
    group: 'Como funciona',
    body: `## Exportar

A exportação salva toda a sua agenda em um arquivo CSV com a data de hoje no nome. Ele tem uma coluna para nome, e-mail, etiquetas, anotações, aniversário, telefone, empresa e para indicar se o aniversário ou o cartão de uma pessoa está oculto, então um backup restaura a agenda como você a deixou. O arquivo abre em qualquer programa de planilha.

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
- O bloqueio pertence só a este aparelho e nunca é enviado para a internet.

## O que ele não faz

O PIN bloqueia o aplicativo, não os dados. Sua agenda continua no armazenamento do aparelho exatamente como antes, então ele não substitui o bloqueio de tela e a senha do seu aparelho. Quatro dígitos permitem só 10.000 combinações, pouquíssimo para uma chave de criptografia segura.

## Se você esquecer o PIN

Ninguém pode dizer seu PIN nem tirar o bloqueio por você. A única forma de passar por um PIN esquecido é o botão "Forgotten your PIN?" na tela de bloqueio, que **apaga a agenda deste aparelho** e recomeça do zero, sem bloqueio. É isso que torna seguro oferecê-lo: um estranho poderia esvaziar o aplicativo, mas nunca lê-lo.

Se você usa o backup on-line criptografado, esquecer o PIN é só um incômodo: faça login de novo, digite a frase secreta do backup e sua agenda volta. Sem backup, não há de onde restaurar, então ative-o, ou exporte um arquivo CSV, antes de definir um PIN.`,
  },
  {
    id: 'encrypted-online-backup',
    title: 'O backup on-line criptografado',
    summary: 'Como sua agenda é criptografada antes de sair do aparelho e por que ninguém mais consegue lê-la.',
    group: 'Privacidade e segurança',
    body: `O backup on-line é opcional e fica desligado até você fazer login com seu Universal ID. Depois de ativado, o BlackBook guarda uma cópia da sua agenda nos servidores da UNI·SIM, para que ela sobreviva à perda de um aparelho e possa ser aberta em outro.

## Criptografado antes de sair

Sua agenda é criptografada no seu aparelho antes de qualquer envio. O servidor recebe e guarda apenas dados embaralhados para os quais não tem chave, então a UNI·SIM não consegue ler seus contatos, anotações, etiquetas ou tarefas.

- A criptografia é **AES-GCM com chave de 256 bits**, um padrão amplamente usado.
- A chave é gerada a partir de uma **frase secreta escolhida por você**, usando PBKDF2 com SHA-256 e 600.000 rodadas, o que torna cada tentativa de adivinhar a frase lenta e cara.
- Sua frase secreta nunca sai do seu aparelho. Ela **não** é a senha do seu Universal ID, e mudar essa senha não a afeta.

Isso importa porque as pessoas da sua agenda não se cadastraram em nada. Os nomes, os endereços e suas anotações particulares sobre elas merecem o mesmo cuidado que os seus próprios dados.

## Não há recuperação

A UNI·SIM não guarda nenhuma cópia da sua chave e não tem como redefinir sua frase secreta. Se você esquecê-la, ninguém consegue abrir a cópia on-line. A agenda no seu aparelho não é afetada, e é por isso que a cópia on-line é um backup, e não a cópia principal.

## Lembrar um aparelho

Você pode pedir que um aparelho lembre a chave, para não precisar digitar a frase secreta toda vez. A chave é guardada de um jeito que o aplicativo consegue usar, mas não consegue extrair. Sair da conta, ou escolher esquecer este aparelho, apaga a chave.

## Mudar ou apagar

Para mudar a frase secreta é preciso informar a atual, mesmo em um aparelho que a lembra, e o backup é criptografado de novo em uma única etapa. Desligar o backup apaga completamente a cópia on-line e deixa a agenda do seu aparelho como está. Excluir seu Universal ID exclui junto a cópia on-line.

O backup tem um limite de cerca de 2 MB de dados criptografados, o que equivale a muitos milhares de contatos. Anotações muito longas costumam ser o motivo quando uma agenda chega a esse limite.`,
  },
  {
    id: 'using-two-devices',
    title: 'Usando o BlackBook em mais de um aparelho',
    summary: 'Mesclar ao fazer login, salvamento automático e o que acontece quando dois aparelhos discordam.',
    group: 'Privacidade e segurança',
    body: `Com o backup on-line ativado, você pode abrir a mesma agenda no celular, no tablet e no computador. Cada aparelho guarda sua própria cópia, e o backup on-line mantém todas em dia.

## Fazendo login em um aparelho novo

1. Faça login com seu Universal ID.
2. Digite a frase secreta do backup.
3. Se este aparelho já tiver contatos próprios, o BlackBook pergunta se você quer mesclá-los ou usar apenas a cópia on-line.

Ao mesclar, a cópia on-line é o ponto de partida e os contatos deste aparelho são adicionados a ela. Quem já está lá, reconhecido como o mesmo cartão ou pelo mesmo nome com o mesmo e-mail ou telefone, não é adicionado duas vezes. Etiquetas com o mesmo nome viram uma só.

## Salvamento

Enquanto o backup está ativo, cada alteração é criptografada e salva on-line poucos segundos depois. O aviso de sincronização ao lado do título mostra que um salvamento está a caminho. Quando você abre o BlackBook em outro aparelho, ele baixa a cópia mais recente.

## Quando dois aparelhos discordam

A cópia on-line é salva como uma agenda inteira. Se dois aparelhos alteraram a agenda desde o último salvamento, o BlackBook não escolhe em silêncio. Ele para e pergunta qual manter: a cópia on-line mais recente ou a versão deste aparelho. A que você não escolher é substituída, então exporte um arquivo CSV antes se estiver em dúvida.

## Depois de mudar a frase secreta

Quando você muda a frase secreta em um aparelho, os outros param de salvar e pedem a nova. Nada se perde neles, e ao desbloqueá-los eles oferecem mesclar de novo seus contatos. Um aparelho que ainda tenha a chave antiga não consegue sobrescrever a mudança.`,
  },
]

export default articles
