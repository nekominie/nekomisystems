import type {
  ChapterMeta,
  ReaderChapter,
  ReaderPage,
  ReaderVolume,
  VolumeMeta,
} from '../types/manga'

const pageModules = import.meta.glob('../../pages/**/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const thumbnailModules = import.meta.glob('../../thumbs/**/*.{png,jpg,jpeg,webp,avif}', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const chapterMeta: Record<string, Record<string, ChapterMeta>> = {
  tomo1: {
    cap1: {
      title: 'Capitulo 1',
      subtitle: 'La papeleria',
      publishDate: '2013',
      summary: 'Hana quiere ser una adulta, pero cosas muy extrañas empiezan a ocurrir.',
    },
    cap2: {
      title: 'Capitulo 2',
      subtitle: 'El enviado de la compañia',
      publishDate: '2026-03-24',
      summary: 'Una persona cae desde el cielo?! Quien es y porque busca desesperadamente a Hana?!',
    },
    cap3: {
      title: 'Capitulo 3',
      subtitle: 'Terrorismo',
      publishDate: '2026-03-24',
      summary: 'El misterio ahora se apodera de la escuela: una pandilla de mafiosos secuestró el gimnasio!!',
    },
    cap4: {
      title: 'Capitulo 4',
      subtitle: 'Los Kruger',
      publishDate: '2026-03-24',
      summary: 'Parece que todos buscan lo mismo.',
    },
  },
}

const volumeMeta: Record<string, VolumeMeta> = {
  tomo1: {
    title: 'Tomo 01',
    era: 'El principio del fin',
    publishDate: '2026-03-24',
    summary: 'El primer tomo de la historia comienza! Veremos como Hana inicia su etapa de adulta luchando contra carteles, mafias y el bajo mundo magico de los manipuladores de particulas. Gente muy poderosa y con malas intenciones la busca todo el tiempo ya que parece que ella es la clave para algo enorme!!',
  },
}

const slugToLabel = (slug: string) =>
  slug
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const numericIndex = (value: string) => {
  const match = value.match(/(\d+)/)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

const parsePageSide = (fileName: string) => {
  const normalized = fileName.toLowerCase()

  if (normalized.includes('izq')) {
    return 'left' as const
  }

  if (normalized.includes('der')) {
    return 'right' as const
  }

  if (normalized.includes('-')) {
    return 'spread' as const
  }

  return 'single' as const
}

const pageRecords = Object.entries(pageModules).map(([path, image]) => {
  const normalized = path.replace(/\\/g, '/')
  const parts = normalized.split('/')
  const volumeFolder = parts[3]
  const isChapterAsset = parts.length >= 6
  const chapterFolder = isChapterAsset ? parts[4] : undefined
  const fileName = isChapterAsset ? parts[5] : parts[4]

  return {
    path: normalized,
    image,
    volumeFolder,
    chapterFolder,
    fileName,
  }
})

const thumbnailMap = Object.fromEntries(
  Object.entries(thumbnailModules).map(([path, image]) => [
    path.replace(/\\/g, '/').replace('/thumbs/', '/pages/'),
    image,
  ])
)

const volumeFolders = [...new Set(pageRecords.map((record) => record.volumeFolder).filter(Boolean))].sort(
  (left, right) => numericIndex(left) - numericIndex(right)
)

export const libraryVolumes: ReaderVolume[] = volumeFolders.map((volumeFolder) => {
  const recordsForVolume = pageRecords.filter((record) => record.volumeFolder === volumeFolder)
  const coverRecord = recordsForVolume.find((record) => !record.chapterFolder && record.fileName)
  const chapterFolders = [
    ...new Set(
      recordsForVolume
        .map((record) => record.chapterFolder)
        .filter((chapterFolder): chapterFolder is string => Boolean(chapterFolder))
    ),
  ].sort((left, right) => numericIndex(left) - numericIndex(right))

  const chapters: ReaderChapter[] = chapterFolders.map((chapterFolder) => {
    const chapterRecords = recordsForVolume
      .filter((record) => record.chapterFolder === chapterFolder)
      .sort((left, right) => numericIndex(left.fileName) - numericIndex(right.fileName))

    const pages: ReaderPage[] = chapterRecords.map((record, pageIndex) => ({
      id: `${volumeFolder}-${chapterFolder}-${pageIndex + 1}`,
      index: numericIndex(record.fileName),
      title: record.fileName.replace(/\.[^.]+$/, ''),
      image: record.image,
      thumbnail: thumbnailMap[record.path] ?? record.image,
      side: parsePageSide(record.fileName),
    }))

    const meta = chapterMeta[volumeFolder]?.[chapterFolder]

    return {
      id: chapterFolder,
      title: meta?.title ?? slugToLabel(chapterFolder),
      subtitle: meta?.subtitle ?? 'Archivo visual',
      publishDate: meta?.publishDate ?? '2026-03-24',
      summary: meta?.summary ?? 'Capitulo cargado desde la biblioteca local del manga.',
      pages,
    }
  })

  const meta = volumeMeta[volumeFolder]

  return {
    id: volumeFolder,
    title: meta?.title ?? slugToLabel(volumeFolder),
    era: meta?.era ?? 'Archive set',
    publishDate: meta?.publishDate ?? '2026-03-24',
    summary: meta?.summary ?? 'Volumen generado a partir de la carpeta pages.',
    cover: coverRecord?.image ?? chapters[0]?.pages[0]?.image ?? '',
    chapters,
  }
})
