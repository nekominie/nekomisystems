import logo from "../../images/Nuevo_Logo_2022.png"
import { libraryVolumes } from './library'
import type { CharacterProfile, MangaProject } from '../types/manga'

const coverImage = libraryVolumes[0]?.cover ?? logo

// 1. Capturamos todas las imágenes de la carpeta de personajes
// El eager: true hace que se importen de inmediato (útil para logos/portadas)
const characterImages = import.meta.glob('../../images/characters/*.{png,jpg,webp}', {
  eager: true,
  import: 'default',
})

// 2. Función ayudante para obtener la imagen por ID o devolver un fallback
const getCharacterImage = (assetId: string) => {
  const normalizedId = assetId.trim().toLowerCase()
  const match = Object.entries(characterImages).find(([path]) =>
    path
      .replace(/\\/g, '/')
      .toLowerCase()
      .match(new RegExp(`/` + normalizedId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + `\\.(png|jpg|webp)$`))
  )

  return (match?.[1] as string | undefined) ?? null
}

const getCharacterPortrait = (id: string) => getCharacterImage(id) ?? logo

type CharacterSeed = Omit<CharacterProfile, 'displayName' | 'fullName' | 'slotPortrait'> &
  Partial<Pick<CharacterProfile, 'displayName' | 'fullName' | 'slotPortrait'>>

const createCharacter = (character: CharacterSeed): CharacterProfile => {
  const portrait = character.portrait ?? getCharacterImage(character.id) ?? logo
  const slotPortrait =
    character.slotPortrait ??
    getCharacterImage(`${character.id}-slot`) ??
    getCharacterImage(`${character.id}_slot`) ??
    portrait

  return {
    ...character,
    displayName: character.displayName ?? character.name,
    fullName: character.fullName ?? character.name,
    portrait,
    slotPortrait,
  }
}

export const mangaProject: MangaProject = {
  title: 'Katana Of Hell',
  subtitle: 'Jigoku no Katana',
  shortPitch:
    `En un mundo donde todo parece ser cotidiano y normal, se desarrolla una constante guerra que pasa escondida
      y desapercibida por toda la humanidad. Demonios contra "manipuladores", unos humanos que han logrado aprender 
      a distorcionar su entorno, creando armas para poder defenderse y mantener un control. Se crearon asociaciones
      gubernamentales, compañias y empresas que se dedican a esta constante batalla en secreto.
      Buscando el progreso y la mejoria de sus artillerias, la compañia lider a nivel mundial de proteccion contra demonios A.S.P.E
      crea por accidente una de las peores armas de doble filo.
      Nuestra protagonista, Hana Karunyotsi, con ayuda de uno de los puestos mas altos de dicha compañia, 
      Kento Ikeda, se veran involucrados en la dura tarea de evitar que esta arma caiga en las manos de unos de 
      los seres mas poderosos del inframundo. Una mafia magica, moderna y juvenil.`,

  experienceLabel: 'Escrita, dirigida, diseñada e ilustrada por David A. Zepeda, "nekominie"',
  status: 'Capitulo 4 ya disponible!! 😁',
  readingDirection: '',
  logo,
  cover: coverImage,
  tags: ['Manga', 'Archivo', 'Tomo interactivo', 'Visual first'],
  nav: [
    { id: 'overview', label: 'Inicio', icon: 'bi bi-stars', caption: 'Conoce la obra' },
    { id: 'volumes', label: 'Leer', icon: 'bi bi-journals', caption: 'Ver el manga >' },
    { id: 'characters', label: 'Personajes', icon: 'bi bi-person-bounding-box', caption: '' },
    { id: 'lore', label: 'Lore', icon: 'bi bi-moon-stars', caption: 'Conoce la historia y su mundo' },
    { id: 'reader', label: 'Leer', icon: 'bi bi-book-half', caption: 'Ver el manga >' },
  ],
  spotlight: [
    { label: 'Direccion de lectura', value: 'RTL con doble pagina' },
    { label: 'Volteo', value: 'Animacion 3D estilo libro' },
    { label: 'Fuente real', value: 'Carga imagenes desde /pages' },
  ],
  overviewMoments: [
    {
      id: 'tone',
      label: 'Atmosfera',
      title: 'No entra como sitio web, entra como objeto.',
      body: 'La interfaz se comporta como una sala de observacion del manga: paneles profundos, brillos suaves, ruido visual y capas que recuerdan celuloide, tinta y cristal.',
    },
    {
      id: 'entry',
      label: 'Entrada',
      title: 'Cada vista funciona como pagina independiente.',
      body: 'En lugar de una sola landing larga, la navegacion separa portal, tomos, personajes, lore y lector en escenas propias dentro de la app.',
    },
    {
      id: 'reader',
      label: 'Reader',
      title: 'El lector ocupa toda la experiencia cuando lo abres.',
      body: 'Incluye modo simple, libro abierto, miniaturas, barra de progreso y transiciones con profundidad para el paso de pagina.',
    },
  ],
  characters: [
    {
      id: '1',
      name: 'Hana Karunyotsi ',
      role: 'Protagonista',
      tagline: 'Carga la luz como si tambien fuera una herida.',
      bio: 'Su presencia define el tono del proyecto. La ficha esta pensada para que luego conectes imagen real, simbolos, playlist, relaciones y anotaciones de guion sin tocar la vista.',
      accent: '#a85be7',
      portrait: null,
      facts: [
        { label: 'Estado', value: 'En escritura' },
        { label: 'Clave visual', value: 'Contrastes calidos y vacio azul' },
        { label: 'Uso sugerido', value: 'Ficha expandible con galeria' },
      ],
    },
    {
      id: '2',
      displayName: 'Kento',
      role: 'Presidente del departamento de vigilancia y protección civil de la A.S.P.E',
      tagline: 'Habita fuera de cuadro incluso cuando aparece.',
      bio: 'Placeholder curado para representar personajes secundarios o antagonistas. Puedes reemplazar el arte y mantener la misma estructura de datos para escalar el cast.',
      accent: '#969696',
      portrait: null,
      facts: [
        { label: 'Funcion', value: 'Tension y contraste' },
        { label: 'Entrada', value: 'Presentacion gradual' },
        { label: 'Nota', value: 'Ideal para añadir relaciones' },
      ],
    },
    {
      id: '3',
      displayName: 'Nozomi',
      fullName: "Nozomi Yamada Saito",
      role: 'Mejor amiga de Hana',
      tagline: 'Mejor amiga de Hana.',
      bio: 'Tercera ficha de ejemplo con enfoque mas abstracto para que la interfaz se vea rica aunque todavia no tengas todo el material final.',
      accent: '#f8e265',
      portrait: null,
      facts: [
        { label: 'Arquetipo', value: 'Presagio' },
        { label: 'Ritmo', value: 'Apariciones intermitentes' },
        { label: 'Potencial', value: 'Notas, citas, extras' },
      ],
    },
    {
      id: '4',
      name: 'Nicktelai Kruger',
      role: 'Aparenta ser una estudiante normal',
      tagline: 'Mejor amiga de Hana.',
      bio: 'Tercera ficha de ejemplo con enfoque mas abstracto para que la interfaz se vea rica aunque todavia no tengas todo el material final.',
      accent: '#f8e265',
      portrait: getCharacterPortrait('4'),
      facts: [
        { label: 'Arquetipo', value: 'Presagio' },
        { label: 'Ritmo', value: 'Apariciones intermitentes' },
        { label: 'Potencial', value: 'Notas, citas, extras' },
      ],
    },
    {
      id: '6',
      name: 'Ryusei Harrsh',
      role: 'Aparenta ser una estudiante normal',
      tagline: 'Mejor amiga de Hana.',
      bio: 'Tercera ficha de ejemplo con enfoque mas abstracto para que la interfaz se vea rica aunque todavia no tengas todo el material final.',
      accent: '#f8e265',
      portrait: null,
      facts: [
        { label: 'Arquetipo', value: 'Presagio' },
        { label: 'Ritmo', value: 'Apariciones intermitentes' },
        { label: 'Potencial', value: 'Notas, citas, extras' },
      ],
    },
    {
      id: '7',
      name: 'Koransai Fréun',
      role: 'Aparenta ser una estudiante normal',
      tagline: 'Mejor amiga de Hana.',
      bio: 'Tercera ficha de ejemplo con enfoque mas abstracto para que la interfaz se vea rica aunque todavia no tengas todo el material final.',
      accent: '#f8e265',
      portrait: getCharacterPortrait('7'),
      facts: [
        { label: 'Arquetipo', value: 'Presagio' },
        { label: 'Ritmo', value: 'Apariciones intermitentes' },
        { label: 'Potencial', value: 'Notas, citas, extras' },
      ],
    },
    {
      id: '8',
      name: 'Fred Hideman',
      role: 'Aparenta ser una estudiante normal',
      tagline: 'Mejor amiga de Hana.',
      bio: 'Tercera ficha de ejemplo con enfoque mas abstracto para que la interfaz se vea rica aunque todavia no tengas todo el material final.',
      accent: '#f8e265',
      portrait: null,
      facts: [
        { label: 'Arquetipo', value: 'Presagio' },
        { label: 'Ritmo', value: 'Apariciones intermitentes' },
        { label: 'Potencial', value: 'Notas, citas, extras' },
      ],
    },
    {
      id: '9',
      name: 'Hiroshi Abe Miyamoto',
      role: 'Aparenta ser una estudiante normal',
      tagline: 'Mejor amiga de Hana.',
      bio: 'Tercera ficha de ejemplo con enfoque mas abstracto para que la interfaz se vea rica aunque todavia no tengas todo el material final.',
      accent: '#f8e265',
      portrait: null,
      facts: [
        { label: 'Arquetipo', value: 'Presagio' },
        { label: 'Ritmo', value: 'Apariciones intermitentes' },
        { label: 'Potencial', value: 'Notas, citas, extras' },
      ],
    },
    {
      id: '10',
      name: 'Yemy Karunyosti Hayashi',
      role: 'Aparenta ser una estudiante normal',
      tagline: 'Mejor amiga de Hana.',
      bio: 'Tercera ficha de ejemplo con enfoque mas abstracto para que la interfaz se vea rica aunque todavia no tengas todo el material final.',
      accent: '#f8e265',
      portrait: null,
      facts: [
        { label: 'Arquetipo', value: 'Presagio' },
        { label: 'Ritmo', value: 'Apariciones intermitentes' },
        { label: 'Potencial', value: 'Notas, citas, extras' },
      ],
    },
    {
      id: '11',
      name: 'Midori Karunyotsi Hayashi',
      role: 'Aparenta ser una estudiante normal',
      tagline: 'Mejor amiga de Hana.',
      bio: 'Tercera ficha de ejemplo con enfoque mas abstracto para que la interfaz se vea rica aunque todavia no tengas todo el material final.',
      accent: '#f8e265',
      portrait: null,
      facts: [
        { label: 'Arquetipo', value: 'Presagio' },
        { label: 'Ritmo', value: 'Apariciones intermitentes' },
        { label: 'Potencial', value: 'Notas, citas, extras' },
      ],
    },
    {
      id: '12',
      name: 'Revv Ramirez',
      role: 'Aparenta ser una estudiante normal',
      tagline: 'Mejor amiga de Hana.',
      bio: 'Tercera ficha de ejemplo con enfoque mas abstracto para que la interfaz se vea rica aunque todavia no tengas todo el material final.',
      accent: '#f8e265',
      portrait: null,
      facts: [
        { label: 'Arquetipo', value: 'Presagio' },
        { label: 'Ritmo', value: 'Apariciones intermitentes' },
        { label: 'Potencial', value: 'Notas, citas, extras' },
      ],
    },
    {
      id: '13',
      name: 'Fernanda Yukino',
      role: 'Aparenta ser una estudiante normal',
      tagline: 'Mejor amiga de Hana.',
      bio: 'Tercera ficha de ejemplo con enfoque mas abstracto para que la interfaz se vea rica aunque todavia no tengas todo el material final.',
      accent: '#f8e265',
      portrait: null,
      facts: [
        { label: 'Arquetipo', value: 'Presagio' },
        { label: 'Ritmo', value: 'Apariciones intermitentes' },
        { label: 'Potencial', value: 'Notas, citas, extras' },
      ],
    },

    {
      id: '14',
      name: 'Ayame Hayashi',
      role: 'Aparenta ser una estudiante normal',
      tagline: 'Mejor amiga de Hana.',
      bio: 'Tercera ficha de ejemplo con enfoque mas abstracto para que la interfaz se vea rica aunque todavia no tengas todo el material final.',
      accent: '#f8e265',
      portrait: null,
      facts: [
        { label: 'Arquetipo', value: 'Presagio' },
        { label: 'Ritmo', value: 'Apariciones intermitentes' },
        { label: 'Potencial', value: 'Notas, citas, extras' },
      ],
    },
    {
      id: '15',
      name: 'Ayame Hayashi',
      role: 'Aparenta ser una estudiante normal',
      tagline: 'Mejor amiga de Hana.',
      bio: 'Tercera ficha de ejemplo con enfoque mas abstracto para que la interfaz se vea rica aunque todavia no tengas todo el material final.',
      accent: '#f8e265',
      portrait: null,
      facts: [
        { label: 'Arquetipo', value: 'Presagio' },
        { label: 'Ritmo', value: 'Apariciones intermitentes' },
        { label: 'Potencial', value: 'Notas, citas, extras' },
      ],
    },
    {
      id: '16',
      name: 'Daz Karunyotsi',
      role: 'Aparenta ser una estudiante normal',
      tagline: 'Mejor amiga de Hana.',
      bio: 'Tercera ficha de ejemplo con enfoque mas abstracto para que la interfaz se vea rica aunque todavia no tengas todo el material final.',
      accent: '#f8e265',
      portrait: null,
      facts: [
        { label: 'Arquetipo', value: 'Presagio' },
        { label: 'Ritmo', value: 'Apariciones intermitentes' },
        { label: 'Potencial', value: 'Notas, citas, extras' },
      ],
    },
    {
      id: '17',
      name: 'Sousuke',
      role: 'Aparenta ser una estudiante normal',
      tagline: 'Mejor amiga de Hana.',
      bio: 'Tercera ficha de ejemplo con enfoque mas abstracto para que la interfaz se vea rica aunque todavia no tengas todo el material final.',
      accent: '#f8e265',
      portrait: null,
      facts: [
        { label: 'Arquetipo', value: 'Presagio' },
        { label: 'Ritmo', value: 'Apariciones intermitentes' },
        { label: 'Potencial', value: 'Notas, citas, extras' },
      ],
    },
    {
      id: '18',
      name: 'Big D',
      role: 'Aparenta ser una estudiante normal',
      tagline: 'Mejor amiga de Hana.',
      bio: 'Tercera ficha de ejemplo con enfoque mas abstracto para que la interfaz se vea rica aunque todavia no tengas todo el material final.',
      accent: '#f8e265',
      portrait: null,
      facts: [
        { label: 'Arquetipo', value: 'Presagio' },
        { label: 'Ritmo', value: 'Apariciones intermitentes' },
        { label: 'Potencial', value: 'Notas, citas, extras' },
      ],
    },
    {
      id: '19',
      name: 'Lil Wave',
      role: 'Aparenta ser una estudiante normal',
      tagline: 'Mejor amiga de Hana.',
      bio: 'Tercera ficha de ejemplo con enfoque mas abstracto para que la interfaz se vea rica aunque todavia no tengas todo el material final.',
      accent: '#f8e265',
      portrait: null,
      facts: [
        { label: 'Arquetipo', value: 'Presagio' },
        { label: 'Ritmo', value: 'Apariciones intermitentes' },
        { label: 'Potencial', value: 'Notas, citas, extras' },
      ],
    },
    {
      id: '20',
      name: 'Kaiyo',
      role: 'CEO y fundadora de la empresa KyotoGroup Ltd',
      tagline: 'Mejor amiga de Hana.',
      bio: 'Tercera ficha de ejemplo con enfoque mas abstracto para que la interfaz se vea rica aunque todavia no tengas todo el material final.',
      accent: '#f8e265',
      portrait: null,
      facts: [
        { label: 'Arquetipo', value: 'Presagio' },
        { label: 'Ritmo', value: 'Apariciones intermitentes' },
        { label: 'Potencial', value: 'Notas, citas, extras' },
      ],
    },

  ].map(createCharacter),
  loreEntries: [
    {
      id: 'cathedral',
      title: 'Arquitectura de tinta',
      summary: 'El espacio parece construido para contener emociones en lugar de personas.',
      detail: 'Usa esta area para explicar reglas del mundo, sistemas espirituales, ciudades, facciones o simbolos recurrentes del manga.',
      accent: '#ff8d5d',
    },
    {
      id: 'memory',
      title: 'Memoria en fragmentos',
      summary: 'Las escenas pueden registrarse como restos visuales, no como hechos cerrados.',
      detail: 'Tambien funciona para incluir glosarios, cronologias, notas del autor o explicaciones sobre tomos especiales y extras.',
      accent: '#77f2d5',
    },
    {
      id: 'ritual',
      title: 'Ritual de lectura',
      summary: 'El lector no solo muestra paginas: enmarca el acto de pasar de una a otra.',
      detail: 'Por eso la navegacion y la puesta en escena del reader son parte del lenguaje de la obra, no un contenedor neutro.',
      accent: '#c78cff',
    },
  ],
  archiveNotes: [
    {
      id: 'n1',
      label: 'Curiosidad 01',
      title: 'El lector ya usa tus archivos reales',
      body: 'Las imagenes de la carpeta pages se convierten en paginas automaticamente y se agrupan por tomo/capitulo segun la estructura de carpetas.',
    },
    {
      id: 'n2',
      label: 'Curiosidad 02',
      title: 'El logo ya esta conectado',
      body: 'La identidad visual del submodulo toma tu logotipo local como sello principal para que el portal se sienta propio desde esta version inicial.',
    },
    {
      id: 'n3',
      label: 'Curiosidad 03',
      title: 'La metadata puede crecer',
      body: 'Si luego quieres sinopsis por tomo, openings, OST, citas o fichas de relacion, la estructura ya quedo lista para extenderse sin rehacer vistas.',
    },
  ],
  volumes: libraryVolumes,
}
