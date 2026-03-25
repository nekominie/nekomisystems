export type AppView = 'overview' | 'volumes' | 'characters' | 'lore' | 'reader'

export interface NavItem {
  id: AppView
  label: string
  icon: string
  caption: string
}

export interface FactPill {
  label: string
  value: string
}

export interface CharacterProfile {
  id: string
  name: string
  displayName: string
  fullName: string
  role: string
  tagline: string
  bio: string
  accent: string
  portrait: string | null
  slotPortrait: string | null
  facts: FactPill[]
}

export interface LoreEntry {
  id: string
  title: string
  summary: string
  detail: string
  accent: string
}

export interface ArtifactNote {
  id: string
  label: string
  title: string
  body: string
}

export interface ChapterMeta {
  title: string
  subtitle: string
  publishDate: string
  summary: string
}

export interface VolumeMeta {
  title: string
  era: string
  publishDate: string
  summary: string
}

export type PageSide = 'left' | 'right' | 'spread' | 'single'

export interface ReaderPage {
  id: string
  index: number
  title: string
  image: string
  thumbnail: string
  side: PageSide
}

export interface ReaderChapter {
  id: string
  title: string
  subtitle: string
  publishDate: string
  summary: string
  pages: ReaderPage[]
}

export interface ReaderVolume {
  id: string
  title: string
  era: string
  publishDate: string
  summary: string
  cover: string
  chapters: ReaderChapter[]
}

export interface ReadingUnit {
  id: string
  left?: ReaderPage
  right?: ReaderPage
  full?: ReaderPage
}

export interface MangaProject {
  title: string
  subtitle: string
  shortPitch: string
  experienceLabel: string
  status: string
  readingDirection: string
  logo: string
  cover: string
  tags: string[]
  nav: NavItem[]
  spotlight: FactPill[]
  overviewMoments: ArtifactNote[]
  characters: CharacterProfile[]
  loreEntries: LoreEntry[]
  archiveNotes: ArtifactNote[]
  volumes: ReaderVolume[]
}
