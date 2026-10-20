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
    body: `BlackBook guarda su libreta de direcciones en el dispositivo que está usando. En un navegador, vive en el almacenamiento que ese navegador reserva para este sitio; en la aplicación del teléfono, vive en el almacenamiento propio de la aplicación. Nada sobre sus contactos se envía nunca a ningún sitio.

No hay ninguna cuenta ni nada en lo que iniciar sesión.

## Qué significa en la práctica

- **Cada dispositivo tiene su propia libreta.** Los contactos que añade en el portátil no aparecen solos en el teléfono. Un archivo de copia de seguridad es la forma de pasarlos de uno a otro.
- **Borrar el navegador puede borrar la libreta.** Eliminar los datos o el historial de este sitio, usar una ventana privada o desinstalar la aplicación elimina la libreta guardada allí.
- **Los contactos del dispositivo son aparte.** BlackBook no añade nada, no modifica ni se sincroniza con la libreta de direcciones integrada en su teléfono.

## Tener una copia

Como la libreta de su dispositivo puede ser la única copia, conviene tener otra:

1. Guarde de vez en cuando un archivo de copia de seguridad (Avanzado y luego Copia de seguridad, importar y exportar) y consérvelo en un lugar seguro. Lo contiene todo, tareas incluidas, y puede llevar contraseña.
2. O exporte un archivo CSV, que cualquier hoja de cálculo o libreta de direcciones puede leer, pero que deja fuera sus tareas.

## Ajustar esta app

Las opciones sobre el aspecto y el funcionamiento de la aplicación en este dispositivo, como las pestañas que se muestran, se guardan en este dispositivo. Un archivo de copia de seguridad también las incluye, pero solo Sustituir todo las recupera.`,
  },
  {
    id: 'importing-and-exporting',
    title: 'Añadir contactos y sacarlos',
    summary: 'Importar y exportar CSV, y elegir personas de los contactos de su teléfono.',
    group: 'Cómo funciona',
    body: `## Exportar

La exportación guarda toda su libreta en un archivo CSV con la fecha de hoy en el nombre. Tiene una columna para el nombre, el correo, las etiquetas, las notas, el cumpleaños, el teléfono, la empresa y para indicar si el cumpleaños o la ficha de una persona están ocultos, de modo que volver a importarlo restaura sus contactos tal como los dejó. El archivo se abre en cualquier hoja de cálculo. Deja fuera sus tareas: para una copia completa, guarde mejor un archivo de copia de seguridad (consulte Su archivo de copia de seguridad).

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
- El bloqueo pertenece solo a este dispositivo y nunca se incluye en un archivo de copia de seguridad.

## Lo que no hace

El PIN bloquea la aplicación, no los datos. Su libreta sigue en el almacenamiento del dispositivo igual que antes, así que no sustituye al bloqueo de pantalla ni al código de su dispositivo. Cuatro dígitos solo permiten 10 000 combinaciones, muy pocas para ser una clave de cifrado segura.

## Si olvida su PIN

Nadie puede decirle su PIN ni quitar el bloqueo por usted. La única forma de pasar un PIN olvidado es el botón «Forgotten your PIN?» de la pantalla de bloqueo, que **borra la libreta de este dispositivo** y empieza de nuevo, sin bloqueo. Eso es lo que hace que sea seguro ofrecerlo: un desconocido podría vaciar la aplicación, pero nunca leerla.

Si tiene un archivo de copia de seguridad, olvidar el PIN es solo una molestia: después del restablecimiento, abra la copia y su libreta volverá. Sin ella no hay nada que restaurar, así que guarde una copia de seguridad antes de establecer un PIN.`,
  },
  {
    id: 'backup-file',
    title: 'Su archivo de copia de seguridad',
    summary: 'Un solo archivo con todo lo que hay en su libreta, una contraseña opcional y cómo volver a abrirlo.',
    group: 'Privacidad y seguridad',
    body: `Un archivo de copia de seguridad es una copia completa de su libreta en un solo archivo. Para guardar uno, abra Acciones, luego Avanzado, luego Copia de seguridad, importar y exportar, y elija Guardar una copia de seguridad. En un teléfono se abre el menú de compartir, para que pueda guardar el archivo en Archivos, en una nube o en un correo a sí mismo; en un navegador, se descarga.

## Qué contiene

- Cada contacto, con todos sus campos: nombre, correo, teléfono, empresa, dirección, cumpleaños, notas, etiquetas, fijados y quién está oculto.
- Sus etiquetas y listas de correo.
- Su lista de tareas.
- Sus opciones en Ajustar esta app y la vista con la que se abre la lista.

Su PIN no está incluido. El PIN pertenece al dispositivo.

## Protegerlo con contraseña

Su libreta trata de otras personas, que no se han registrado en nada, así que puede bloquear el archivo con una contraseña. Marque Proteger con contraseña antes de guardar.

- El archivo se cifra con **AES-GCM y una clave de 256 bits**, un estándar muy extendido.
- La clave se obtiene de su contraseña mediante PBKDF2, SHA-256 y 600 000 rondas, lo que hace que cada intento de adivinarla sea lento y costoso.
- La contraseña nunca se guarda ni se envía a ningún sitio. Nadie, ni siquiera UNI·SIM, puede abrir el archivo sin ella, y no hay forma de restablecerla.

Sin contraseña, el archivo es texto sin cifrar, como una exportación CSV: cualquiera que se haga con él puede leerlo.

## Abrir una copia de seguridad

Elija Abrir una copia de seguridad y seleccione el archivo, o suéltelo sobre la ventana en un navegador. Si tiene contraseña, se le pedirá. Después elija:

- **Añadir a lo que hay.** Todo lo que ya está en este dispositivo se queda. Se añaden las personas y tareas del archivo y, si alguna está en ambos, se conserva la copia editada más recientemente. Quien ya esté aquí con el mismo nombre y el mismo correo o teléfono no se añade dos veces, y las etiquetas con el mismo nombre se convierten en una sola.
- **Sustituir todo.** La libreta de este dispositivo se cambia por la del archivo, después de que usted lo confirme.

BlackBook comprueba cada campo de un archivo antes de usarlo, así que un archivo dañado o modificado no puede estropear la aplicación.`,
  },
  {
    id: 'using-two-devices',
    title: 'Usar BlackBook en más de un dispositivo',
    summary: 'Pasar su libreta de un dispositivo a otro con un archivo de copia de seguridad.',
    group: 'Privacidad y seguridad',
    body: `BlackBook no tiene cuenta ni copia en línea, así que cada dispositivo guarda su propia libreta y nada las une sin que usted lo sepa. Para llevar su libreta a otro dispositivo, use un archivo de copia de seguridad.

## Pasar su libreta

1. En el dispositivo que tiene su libreta, guarde un archivo de copia de seguridad. Conviene ponerle contraseña si el archivo va a pasar por el correo o por una nube.
2. Lleve el archivo al otro dispositivo, por ejemplo con AirDrop, una nube o el correo.
3. En el otro dispositivo, abra BlackBook, elija Abrir una copia de seguridad y seleccione el archivo.

Si el otro dispositivo es nuevo, elija Sustituir todo. Si ya tiene contactos propios, elija Añadir a lo que hay y las dos libretas se fusionarán.

## Mantener dos dispositivos al día

No hay sincronización automática. Si añade personas en los dos dispositivos, guarde una copia de seguridad en uno y ábrala en el otro con Añadir a lo que hay: nadie se añade dos veces y gana la copia editada más recientemente. La fusión solo añade, así que alguien a quien borró en un dispositivo puede volver desde una copia que todavía lo tenga.

## Por qué no hay inicio de sesión

Una libreta de direcciones contiene nombres y números de otras personas, y sus notas sobre ellas. Guardarla solo en sus propios dispositivos, y moverla en un archivo que usted controla, significa que no hay ninguna copia en el servidor de nadie.`,
  },
]

export default articles
