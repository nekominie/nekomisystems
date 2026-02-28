// data.ts  ✅ listo para copiar/pegar

import { image } from "html2canvas/dist/types/css/types/image";

export type MsgTag = "" | "mod" | "bot";
export type UserStatus = "online" | "idle" | "dnd" | "offline";

export type ActivityKind = "playing" | "listening" | "watching" | "custom";

export type Activity = {
  kind: ActivityKind;
  emoji?: string;
  name: string;       // juego / canción / etc
  details?: string;   // subtítulo
  sinceMins?: number; // para UI: “00:14” verde (minutos desde que inició)
};

export type User = {
  id: string;
  name: string;
  avatar?: string;          // url absoluta (recomendado /public)
  color?: string;           // acento / fallback
  status: UserStatus;
  role?: "owner" | "mod" | "bot" | "member";
  activity?: Activity;

  /** Respuestas “bot-like” por usuario (UI-only). */
  replyMessages?: string[];
};

export type Reaction = { emoji: string; count: number };

export type Message = {
  id: string;
  authorId: string;
  tag?: MsgTag;
  time: string;
  text: string;
  reactions?: Reaction[];
  images?: string[];
  image?: string;
};

export type Channel = {
  id: string;
  label: string;
  kind?: "text" | "voice";
  unread?: number;
  topic?: string;
  messages: Message[];
  pinned?: string[];

  /** Solo voice: ids de usuarios que “están” en ese canal (simulado). */
  voiceUsers?: string[];
};

export type Server = {
  id: string;
  name: string;
  meta: string;
  badge?: string;
  icon?: string;
  channels: Channel[];
  users: User[];
  friendIds?: string[];
  dmThreads?: Record<string, Message[]>;
};

// ✅ ejemplo base (tú puedes editar a gusto)
export const server_list: Server[] = [
  {
    id: "wildfucks",
    name: "►Ϣilḋ ░ Fûҫks◄",
    meta: "12 online • 2 en voice",
    badge: "WF",
    icon: "/discord/wildfucks-icon.webp",
    users: [
      {
        id: "me",
        name: "nekominie❤️",
        avatar: "/discord/users/nekominie.webp",
        status: "online",
        role: "owner",
        color: "#5865F2",
        activity: { kind: "custom", emoji: "✨", name: "vibing", details: "sin molestar", sinceMins: 14 },
        replyMessages: ["jsjs", "okok", "👀", "ya quedó", "XD", "no fui yo"],
      },
      {
        id: "don",
        name: "DonBurritos",
        avatar: "/discord/users/donburritos.webp",
        status: "online",
        role: "member",
        color: "#23A55A",
        activity: { kind: "playing", emoji: "👀", name: "League of Legends", details: "Abismo de los lamentos", sinceMins: 38 },
        replyMessages: ["wey sí", "JAJA", "eso suena a bug", "no le muevas", "ship it", "deja lo pruebo"],
      },
      {
        id: "yeyo",
        name: "Yeyo",
        avatar: "/discord/users/yeyo.webp",
        status: "online",
        role: "member",
        color: "#57F287",
        activity: { kind: "listening", emoji: "🎵", name: "lofi beats", details: "focus mode", sinceMins: 5 },
        replyMessages: ["bruh", "ok", "jaja", "a ver", "manda screenshot"],
      },
      {
        id: "meme",
        name: "Andrixx",
        avatar: "/discord/users/andrixx.webp",
        status: "idle",
        role: "member",
        color: "#F0B232",
        activity: { kind: "watching", emoji: "📺", name: "YouTube", details: "CSS crimes compilation", sinceMins: 72 },
        replyMessages: ["💀", "yo no fui", "JAJAJA", "eso es cursed", "amé", "😭"],
      },
      {
        id: "Maki",
        name: "Maki",
        avatar: "/discord/users/maki.webp",
        status: "online",
        role: "bot",
        color: "#23A55A",
        replyMessages: ["✅ anotado", "👀 revisando logs (mentira)", "tip: reinicia (broma)", "eso es z-index", "plot twist: era el padding"],
      },
      {
        id: "dani",
        name: "DaniiBoi",
        avatar: "/discord/users/daniiboi.webp",
        status: "online",
        role: "mod",
        activity: { kind: "playing", name: "League of Legends", details: "Clasificatoria", sinceMins: 12 },
        replyMessages: ["mod aquí", "tranqui", "🔥", "ban al bug", "okok"],
      },
            {
        id: "artmiza",
        name: "Artmiza",
        avatar: "/discord/users/artmiza.webp",
        status: "online",
        role: "member",
        color: "#5865F2",
        activity: { kind: "custom", emoji: "✨", name: "vibing", details: "sin molestar", sinceMins: 14 },
        replyMessages: ["jsjs", "okok", "👀", "ya quedó", "XD", "no fui yo"],
      },
            {
        id: "josh",
        name: "Josh",
        avatar: "/discord/users/josh.webp",
        status: "online",
        role: "member",
        color: "#5865F2",
        activity: { kind: "custom", emoji: "✨", name: "vibing", details: "sin molestar", sinceMins: 14 },
        replyMessages: ["jsjs", "okok", "👀", "ya quedó", "XD", "no fui yo"],
      },
        {
            id: "antihero",
            name: "Anti-Hero",
            avatar: "/discord/users/antihero.webp",
            status: "online",
            role: "member",
            color: "#5865F2",
            activity: { kind: "custom", emoji: "✨", name: "vibing", details: "sin molestar", sinceMins: 14 },
            replyMessages: ["jsjs", "okok", "👀", "ya quedó", "XD", "no fui yo"],
        },
        {
            id: "dobleematutino",
            name: "Doble E Matutino",
            avatar: "/discord/users/dobleematutino.webp",
            status: "online",
            role: "member",
            color: "#5865F2",
            activity: { kind: "playing", emoji: "✨", name: "Stardew Valley", details: "", sinceMins: 1500 },
            replyMessages: ["jsjs", "okok", "👀", "ya quedó", "XD", "no fui yo"],
        },

    ],
    channels: [
      {
        id: "bienvenida",
        label: "🚪┋𝔹𝕚𝕖𝕟𝕧𝕖𝕟𝕚𝕕𝕒",
        kind: "text",
        unread: 3,
        topic: "Reglas falsas, vibes reales. Postea algo 😄",
        pinned: [],
        messages: [
          {
            id: "m1",
            authorId: "don",
            tag: "mod",
            time: "hoy 11:59",
            text: "Bienvenido al server.\nNo hay reglas… pero sí *vibra* ✨",
            reactions: [{ emoji: "✨", count: 7 }, { emoji: "🔥", count: 4 }],
          },
        ],
        
      },
      {
        id: "todxs",
        label: "todxs",
        kind: "text",
        unread: 0,
        topic: "Como cuando when a but pero.",
        pinned: [],
        messages: [{ id: "t1", authorId: "meme", time: "hoy 12:09", text: "cuando el css funciona a la primera: sospechoso", image: "/discord/maikra-icon.webp" }],
      },
      { id: "voice-1", label: "chill room", kind: "voice", unread: 0, topic: "", pinned: [], messages: [], voiceUsers: ["dani", "antihero"] },
      { id: "voice-2", label: "standup rápido", kind: "voice", unread: 0, topic: "", pinned: [], messages: [], voiceUsers: ["josh"] },
    ],
  },

  {
    id: "maikra",
    name: "maikra xd",
    meta: "8 online • 1 en voice",
    badge: "M",
    icon: "/discord/maikra-icon.webp",
    users: [
      {
        id: "me",
        name: "nekominie❤️",
        avatar: "/discord/users/nekominie.webp",
        status: "online",
        role: "member",
        activity: { kind: "playing", name: "Fortnite", details: "en lobby", sinceMins: 2 },
        replyMessages: ["ya llegué", "XD", "ok", "gg", "a ver", "👀"],
      },
      {
        id: "trebolina",
        name: "Trebolina",
        avatar: "/discord/users/trebolina.webp",
        status: "online",
        role: "mod",
        activity: { kind: "playing", name: "Fortnite", details: "Dúo (quedan 10)", sinceMins: 19 },
        replyMessages: ["vámonos", "gg", "no te caigas", "revive pls", "JAJA", "bien"],
      },
    ],
    channels: [
      { id: "general", label: "general", kind: "text", unread: 1, topic: "GGs, clips y drama sano.", pinned: [], messages: [] },
      { id: "voice-1", label: "party", kind: "voice", unread: 0, topic: "", pinned: [], messages: [], voiceUsers: ["trebolina"] },
    ],
  },
];
