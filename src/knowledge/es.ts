import type { Article } from './types'

const articles: Article[] = [
  {
    id: 'what-is-a-csv-file',
    title: '¿Qué es un archivo CSV?',
    summary: 'El archivo de texto, con forma de hoja de cálculo, que BlackBook usa para importar y exportar.',
    group: 'Lo básico',
    body: `CSV significa «comma-separated values», es decir, «valores separados por comas». Es casi la forma más sencilla que existe de guardar una tabla: un archivo de texto en el que cada línea es una fila y las comas separan las columnas.

Una libreta de direcciones diminuta en formato CSV se ve así en un editor de texto:

- Name,Email,Phone
- Sam Okonkwo,sam@example.com,07700 900123
- Priya Shah,priya@example.com,

La primera línea contiene los nombres de las columnas. Cada línea posterior es una persona. Si no hay nada entre dos comas, esa celda está vacía. Si un valor contiene una coma propia, se escribe entre comillas dobles para que no se confunda con el comienzo de una nueva columna.

## Por qué es útil

- **Casi todo puede leerlo.** Excel, Numbers, Google Sheets y LibreOffice abren los archivos CSV como una hoja de cálculo, y la mayoría de las libretas de direcciones pueden exportar uno.
- **Una persona puede leerlo.** No tiene formato oculto: puede abrir el archivo y ver exactamente lo que contiene.
- **No le ata a nada.** Una exportación CSV es suya: puede guardarla, moverla o abrirla en otro sitio, con BlackBook o sin él.

## Lo que no puede hacer

Un archivo CSV solo contiene texto. No tiene imágenes, ni contraseña, ni cifrado, así que cualquiera que consiga el archivo puede leer todos los nombres, números y notas. Guarde los archivos exportados en un lugar de confianza y borre las copias que ya no necesite.

## Fechas y hojas de cálculo

Las hojas de cálculo a veces cambian el formato de lo que abren y convierten un cumpleaños o un número de teléfono largo en otra cosa. Si edita una exportación en una hoja de cálculo antes de volver a importarla, revise esas columnas antes de guardar.`,
  },
  {
    id: 'where-your-book-lives',
    title: 'Dónde se guarda su libreta',
    summary: 'En este dispositivo, sin necesidad de cuenta, y lo que eso significa para usted.',
    group: 'Lo básico',
    body: `BlackBook guarda su libreta de direcciones en el dispositivo que está usando. En un navegador, vive en el almacenamiento que ese navegador reserva para este sitio; en la aplicación del teléfono, vive en el almacenamiento propio de la aplicación. Nada sobre sus contactos se envía a ningún sitio, salvo que active la copia de seguridad en línea.

No necesita una cuenta para usar BlackBook. Todo funciona sin iniciar sesión.

## Qué significa en la práctica

- **Cada dispositivo tiene su propia libreta.** Los contactos que añade en el portátil no aparecen solos en el teléfono. La copia de seguridad en línea es lo que los une.
- **Borrar el navegador puede borrar la libreta.** Eliminar los datos o el historial de este sitio, usar una ventana privada o desinstalar la aplicación elimina la libreta guardada allí.
- **Los contactos del dispositivo son aparte.** BlackBook no añade nada, no modifica ni se sincroniza con la libreta de direcciones integrada en su teléfono.

## Tener una copia

Como la libreta de su dispositivo puede ser la única copia, conviene tener otra:

1. Exporte de vez en cuando un archivo CSV y guárdelo en un lugar seguro, o
2. Inicie sesión con su Universal ID y active la copia de seguridad en línea cifrada.

## Ajustar esta app

Las opciones sobre el aspecto y el funcionamiento de la aplicación en este dispositivo, como las pestañas que se muestran, se quedan solo en este dispositivo y no forman parte de la copia de seguridad.`,
  },
  {
    id: 'importing-and-exporting',
    title: 'Añadir contactos y sacarlos',
    summary: 'Importar y exportar CSV, y elegir personas de los contactos de su teléfono.',
    group: 'Cómo funciona',
    body: `## Exportar

La exportación guarda toda su libreta en un archivo CSV con la fecha de hoy en el nombre. Tiene una columna para el nombre, el correo, las etiquetas, las notas, el cumpleaños, el teléfono, la empresa y para indicar si el cumpleaños o la ficha de una persona están ocultos, de modo que una copia restaura la libreta tal como la dejó. El archivo se abre en cualquier hoja de cálculo.

## Importar un archivo CSV

Puede importar un archivo CSV exportado desde BlackBook o desde otra libreta de direcciones. Usted elige si **añadir** las personas del archivo a su libreta o **sustituir** su libreta por ellas.

BlackBook entiende los nombres de columna que usan Google Contacts y Outlook. Por ejemplo:

- Una columna «Categories», «Groups» o «Labels» se lee como etiquetas.
- «Mobile», «Telephone» o las columnas de teléfono numeradas de Google se leen como el número de teléfono.
- «Organisation» y la columna de organización de Google se leen como la empresa.

Las filas sin nombre ni correo electrónico se omiten.

## Cumpleaños en un archivo

Los cumpleaños se aceptan como 1990-06-04, 4 June 1990, June 4 o --06-04 (un cumpleaños sin año). Una fecha escrita como 04/06/1990 se rechaza a propósito: en el Reino Unido es el 4 de junio y en Estados Unidos el 6 de abril, y adivinar sería un error para la mitad de los usuarios.

## Desde los contactos de su teléfono

En la aplicación del teléfono, puede elegir a una persona de los contactos del teléfono para rellenar una ficha nueva, o importar toda la libreta del teléfono de una vez. La importación completa omite a quien ya está en su libreta, así que puede repetirla más adelante sin problema. En Chrome para Android, el selector de contactos del navegador ofrece lo mismo para un nombre, un correo y un número.

BlackBook solo lee los contactos de su teléfono cuando usted lo pide y nunca escribe nada en ellos. La nota de la ficha de contacto del teléfono no se copia.`,
  },
  {
    id: 'tags-lists-and-hiding',
    title: 'Etiquetas, listas de correo y personas ocultas',
    summary: 'Formas de organizar su libreta sin borrar a nadie.',
    group: 'Cómo funciona',
    body: `## Etiquetas

Las etiquetas son sus propios rótulos, como Familia, Trabajo o Club de lectura. Una libreta nueva empieza sin ninguna, porque la forma de clasificar a las personas es cosa suya. Puede crear tantas como quiera, dar un color a cada una y poner a una persona en todas las etiquetas que correspondan. El filtro muestra a todas las personas que tengan alguna de las etiquetas elegidas.

## Listas de correo

Si activa las listas de correo en **Ajustar esta app**, puede guardar grupos de personas a las que escribe a la vez. Una lista es un tipo de etiqueta. Al copiar una lista obtiene una línea de nombres y direcciones lista para pegar en el campo Para de Gmail, Outlook o Apple Mail. Las personas sin correo quedan fuera, y una dirección repetida se incluye una sola vez.

## Ocultar a alguien de la lista

Deslice una ficha hacia la derecha en el teléfono, o use el botón redondo de su esquina, para quitar a alguien de la lista principal. Queda oculto al navegar, nunca al buscar: escriba su nombre y aparecerá atenuado, con el mismo botón para devolverlo. Un cajón al final de la lista muestra a todas las personas ocultas.

## Ocultar un recordatorio de cumpleaños

La vista de cumpleaños muestra a todas las personas con un cumpleaños registrado, del más cercano al más lejano. Puede ocultar a una persona de esa vista sin borrar la fecha. Ocultar a alguien de la lista principal y ocultar su cumpleaños son decisiones independientes.

## Borrar

Borrar siempre pide confirmación y nombra a quién se va a borrar. En el teléfono, deslizar una ficha hacia la izquierda solo descubre el botón Borrar; el gesto por sí solo no borra nada. También puede seleccionar a varias personas para borrarlas, etiquetarlas u ocultarlas a la vez.`,
  },
  {
    id: 'the-pin-lock',
    title: 'Lo que hace el PIN y lo que no hace',
    summary: 'Un bloqueo de 4 dígitos para la aplicación, no un cifrado de la libreta.',
    group: 'Privacidad y seguridad',
    body: `Puede establecer un PIN de 4 dígitos para que BlackBook lo pida cada vez que se abra en ese dispositivo. Sirve para impedir el paso a alguien que coja su teléfono u ordenador.

## Lo que protege

- Impide que nadie abra la aplicación en este dispositivo sin el PIN.
- Tras cinco intentos fallidos seguidos, el teclado le hace esperar antes de volver a intentarlo, y la espera se duplica cada vez.
- Su PIN nunca se guarda. BlackBook solo conserva una huella codificada, deliberadamente lenta de comprobar, lo que encarece los intentos de adivinarlo.
- El bloqueo pertenece solo a este dispositivo y nunca se sube a internet.

## Lo que no hace

El PIN bloquea la aplicación, no los datos. Su libreta sigue en el almacenamiento del dispositivo igual que antes, así que no sustituye al bloqueo de pantalla ni al código de su dispositivo. Cuatro dígitos solo permiten 10 000 combinaciones, muy pocas para ser una clave de cifrado segura.

## Si olvida su PIN

Nadie puede decirle su PIN ni quitar el bloqueo por usted. La única forma de pasar un PIN olvidado es el botón «Forgotten your PIN?» de la pantalla de bloqueo, que **borra la libreta de este dispositivo** y empieza de nuevo, sin bloqueo. Eso es lo que hace que sea seguro ofrecerlo: un desconocido podría vaciar la aplicación, pero nunca leerla.

Si usa la copia de seguridad en línea cifrada, olvidar el PIN es solo una molestia: vuelva a iniciar sesión, introduzca su frase de contraseña de la copia y su libreta volverá. Sin copia no hay nada que restaurar, así que actívela, o exporte un archivo CSV, antes de establecer un PIN.`,
  },
  {
    id: 'encrypted-online-backup',
    title: 'La copia de seguridad en línea cifrada',
    summary: 'Cómo se cifra su libreta antes de salir del dispositivo y por qué nadie más puede leerla.',
    group: 'Privacidad y seguridad',
    body: `La copia de seguridad en línea es opcional y está desactivada hasta que inicie sesión con su Universal ID. Una vez activada, BlackBook guarda una copia de su libreta en los servidores de UNI·SIM, para que sobreviva a la pérdida de un dispositivo y pueda abrirse en otro.

## Cifrada antes de salir

Su libreta se cifra en su dispositivo antes de enviar nada. El servidor solo recibe y guarda datos codificados para los que no tiene clave, así que UNI·SIM no puede leer sus contactos, notas, etiquetas ni tareas.

- El cifrado es **AES-GCM con una clave de 256 bits**, un estándar muy extendido.
- La clave se obtiene a partir de una **frase de contraseña que usted elige**, mediante PBKDF2 con SHA-256 y 600 000 rondas, lo que hace que cada intento de adivinarla sea lento y costoso.
- Su frase de contraseña nunca sale de su dispositivo. **No** es la contraseña de su Universal ID, y cambiar esa contraseña no la afecta.

Esto importa porque las personas de su libreta no se han registrado en nada. Sus nombres, direcciones y sus notas privadas sobre ellas merecen el mismo cuidado que sus propios datos.

## No hay recuperación

UNI·SIM no guarda ninguna copia de su clave ni tiene forma de restablecer su frase de contraseña. Si la olvida, nadie podrá abrir la copia en línea. La libreta de su dispositivo no se ve afectada, y por eso la copia en línea es una copia de seguridad y no la copia principal.

## Recordar un dispositivo

Puede pedir a un dispositivo que recuerde la clave para no tener que escribir la frase cada vez. La clave se guarda de forma que la aplicación puede usarla pero no extraerla. Cerrar sesión, o elegir olvidar este dispositivo, la elimina.

## Cambiarla o borrarla

Cambiar la frase de contraseña exige la actual, incluso en un dispositivo que la recuerda, y vuelve a cifrar la copia en un solo paso. Desactivar la copia de seguridad borra por completo la copia en línea y deja la libreta de su dispositivo tal como está. Si elimina su Universal ID, la copia en línea se elimina con él.

La copia de seguridad tiene un límite de unos 2 MB de datos cifrados, lo que equivale a muchos miles de contactos. Las notas muy largas suelen ser la causa cuando una libreta lo alcanza.`,
  },
  {
    id: 'using-two-devices',
    title: 'Usar BlackBook en más de un dispositivo',
    summary: 'La fusión al iniciar sesión, el guardado automático y qué pasa cuando dos dispositivos no coinciden.',
    group: 'Privacidad y seguridad',
    body: `Con la copia de seguridad en línea activada, puede abrir la misma libreta en su teléfono, su tableta y su ordenador. Cada dispositivo guarda su propia copia y la copia en línea los mantiene al día.

## Iniciar sesión en un dispositivo nuevo

1. Inicie sesión con su Universal ID.
2. Introduzca su frase de contraseña de la copia.
3. Si este dispositivo ya tiene contactos propios, BlackBook le pregunta si quiere fusionarlos o usar solo la copia en línea.

Al fusionar, la copia en línea es el punto de partida y se le añaden los contactos de este dispositivo. Quien ya esté allí, reconocido como la misma ficha o por el mismo nombre con el mismo correo o teléfono, no se añade dos veces. Las etiquetas con el mismo nombre se convierten en una sola.

## Guardado

Mientras la copia está activa, cada cambio se cifra y se guarda en línea unos segundos después de hacerlo. El aviso de sincronización junto al título indica que un guardado está en camino. Cuando abre BlackBook en otro dispositivo, este descarga la copia más reciente.

## Cuando dos dispositivos no coinciden

La copia en línea se guarda como una libreta completa. Si dos dispositivos han cambiado la libreta desde su último guardado, BlackBook no elige en silencio. Se detiene y le pregunta cuál conservar: la copia en línea más reciente o la versión de este dispositivo. La que no elija se sustituye, así que exporte antes un archivo CSV si tiene dudas.

## Después de cambiar la frase de contraseña

Cuando cambia la frase de contraseña en un dispositivo, los demás dejan de guardar y piden la nueva. No se pierde nada en ellos, y al desbloquearlos ofrecen volver a fusionar sus contactos. Un dispositivo que todavía tenga la clave antigua no puede sobrescribir el cambio.`,
  },
]

export default articles
