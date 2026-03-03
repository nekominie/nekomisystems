<!-- MiniDiscord.vue ✅ listo para copiar/pegar -->
<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from "vue";
import { server_list, type Server, type Channel, type Message, type User, type UserStatus, type Activity } from "./server_list.ts";
import { playSound } from "../../../../shared"

// ---------- constants ----------
const LOGGED_USER_ID = "me"; // ✅ SIEMPRE nekominie
const emojis = ["🔥","✨","😂","🧠","🧃","🧯","🪟","🧊","⚡","🧩","🚀","🫠","💾","🫶","👀","✅","📌","🥶","💥","🧨"];

// ---------- utils ----------
function randInt(n: number) { return Math.floor(Math.random() * n); }
function hhmm() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
function uid() {
  return (globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(16).slice(2)}_${Date.now()}`);
}
function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }

// ---------- toast ----------
const toast = reactive({ show: false, text: "✨" });
let toastTimer: number | undefined;
function showToast(msg: string) {
  toast.text = msg;
  toast.show = true;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.show = false), 1200);
}

// ---------- state ----------
const servers = ref<Server[]>(server_list);
const activeServerId = ref<string>(servers.value[0]?.id ?? "");
const activeChanId = ref<string>("");
const chanSearch = ref("");
const dmSearch = ref("");
const msgInput = ref("");
const viewMode = ref<"server" | "dm" | "friends">("server");
const activeDmUserId = ref("");

const typing = ref(false);
let typingTimer: number | undefined;
let simTimer: number | undefined;
const msgPaneRef = ref<HTMLElement | null>(null);
const friendIdsGlobal = ref<string[]>([]);
const dmThreadsGlobal = reactive<Record<string, Message[]>>({});

// ---------- derived ----------
const server = computed(() => servers.value.find(s => s.id === activeServerId.value) ?? servers.value[0]);

const textChannels = computed(() => server.value.channels.filter(c => (c.kind ?? "text") === "text"));
const voiceChannels = computed(() => server.value.channels.filter(c => c.kind === "voice"));

const activeChannel = computed<Channel>(() => {
  const ch = server.value.channels.find(c => c.id === activeChanId.value);
  return ch ?? server.value.channels[0];
});

const filteredTextChannels = computed(() => {
  const q = chanSearch.value.trim().toLowerCase();
  if (!q) return textChannels.value;
  return textChannels.value.filter(c => `${c.label} ${c.id}`.toLowerCase().includes(q));
});

function ensureUiStateForServer(s: Server) {
  const rawFriendIds = ((s as any).friendIds ?? []) as string[];
  const allowed = new Set(s.users.map(u => u.id).filter(id => id !== LOGGED_USER_ID));
  const deduped = Array.from(new Set(rawFriendIds.filter(id => allowed.has(id))));
  for (const id of deduped) {
    if (!friendIdsGlobal.value.includes(id)) friendIdsGlobal.value.push(id);
  }

  const rawDmThreads = ((s as any).dmThreads ?? {}) as Record<string, Message[]>;
  for (const [userId, msgs] of Object.entries(rawDmThreads)) {
    if (!allowed.has(userId) || !Array.isArray(msgs)) continue;
    if (!dmThreadsGlobal[userId]) dmThreadsGlobal[userId] = msgs.map(m => ({ ...m }));
  }
}
for (const s of servers.value) ensureUiStateForServer(s);

// ✅ user loggeado fijo
const me = computed<User>(() => {
  const cur = server.value.users.find(u => u.id === LOGGED_USER_ID);
  if (cur) return cur;

  const anyServerMe = servers.value.flatMap(s => s.users).find(u => u.id === LOGGED_USER_ID);
  if (anyServerMe) return anyServerMe;

  return server.value.users[0];
});

function getUser(id: string) {
  return server.value.users.find(u => u.id === id);
}
function getUserAny(id: string) {
  for (const s of servers.value) {
    const found = s.users.find(u => u.id === id);
    if (found) return found;
  }
  return undefined;
}
function getMessageUser(id: string) {
  return getUser(id) ?? getUserAny(id);
}
function getUserInServer(serverId: string, userId: string) {
  const s = servers.value.find(x => x.id === serverId);
  return s?.users.find(u => u.id === userId);
}
function statusLabel(s: UserStatus) { return s; }

function isFriend(userId: string) {
  return friendIdsGlobal.value.includes(userId);
}

const friends = computed<User[]>(() => {
  return friendIdsGlobal.value
    .map(id => getUserAny(id))
    .filter(Boolean) as User[];
});

const filteredFriends = computed(() => {
  const q = dmSearch.value.trim().toLowerCase();
  if (!q) return friends.value;
  return friends.value.filter(u => `${u.name} ${u.id}`.toLowerCase().includes(q));
});

const activeDmUser = computed<User | null>(() => {
  if (viewMode.value !== "dm" || !activeDmUserId.value) return null;
  return getUserAny(activeDmUserId.value) ?? null;
});

const activeDmMessages = computed<Message[]>(() => {
  if (!activeDmUserId.value) return [];
  return dmThreadsGlobal[activeDmUserId.value] ?? [];
});

const currentMessages = computed<Message[]>(() => {
  if (viewMode.value === "dm") return activeDmMessages.value;
  return activeChannel.value?.messages ?? [];
});

const chatIcon = computed(() => {
  if (viewMode.value === "dm") return "💬";
  if (viewMode.value === "friends") return "👥";
  return "<i class='bi bi-hash'></i>";
});

const chatTitle = computed(() => {
  if (viewMode.value === "dm") return activeDmUser.value?.name ?? "DM";
  if (viewMode.value === "friends") return "Friends";
  return activeChannel?.value?.label ?? activeChanId.value;
});

const chatSubline = computed(() => {
  if (viewMode.value === "dm") {
    const u = activeDmUser.value;
    if (!u) return "Selecciona un contacto";
    return `${u.status}${u.activity ? ` • ${activityLine(u)}` : ""}`;
  }
  if (viewMode.value === "friends") return `${friends.value.length} amigos`;
  return activeChannel?.value?.topic || "Sin topic (pero con vibes)";
});

const messageInputPlaceholder = computed(() => {
  if (viewMode.value === "dm") return `Enviar mensaje a @${activeDmUser.value?.name ?? "usuario"}`;
  return `Enviar mensaje en #${activeChannel?.value?.label ?? activeChanId.value}`;
});

// groups
const usersGrouped = computed(() => {
  const list = server.value.users.slice();
  const order = (u: User) => {
    if (u.role === "owner") return 0;
    if (u.role === "mod") return 1;
    if (u.role === "bot") return 2;
    return 3;
  };
  list.sort((a, b) => order(a) - order(b));

  const groups: { title: string; users: User[] }[] = [];
  const pushGroup = (title: string, pred: (u: User) => boolean) => {
    const u = list.filter(pred);
    if (u.length) groups.push({ title, users: u });
  };
  pushGroup("Owner", (u) => u.role === "owner");
  pushGroup("Moderadores", (u) => u.role === "mod");
  pushGroup("Bots", (u) => u.role === "bot");
  pushGroup("Usuarios", (u) => !u.role || u.role === "member");
  return groups;
});

// ---------- lifecycle ----------
onMounted(() => {
  activeChanId.value = textChannels.value[0]?.id ?? server.value.channels[0]?.id ?? "";
  scrollToBottom();
  simTimer = window.setInterval(() => {
    if (Math.random() < 0.18) simulateTyping();
    tickActivities();
  }, 2500);
});
onUnmounted(() => {
  if (simTimer) window.clearInterval(simTimer);
  if (typingTimer) window.clearTimeout(typingTimer);
  if (toastTimer) window.clearTimeout(toastTimer);
  if (hoverHideTimer) window.clearTimeout(hoverHideTimer);

  // cleanup attachments objectURLs
  for (const a of pendingAttachments.value) {
    try { URL.revokeObjectURL(a.url); } catch {}
  }
});

// ---------- scroll ----------
async function scrollToBottom() {
  await nextTick();
  const el = msgPaneRef.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

// ---------- activity UI helpers ----------
function activityLabel(a: Activity) {
  if (a.kind === "playing") return "Playing";
  if (a.kind === "listening") return "Listening";
  if (a.kind === "watching") return "Watching";
  return "Status";
}
function formatSince(mins?: number) {
  const m = Math.max(0, mins ?? 0);
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}
function activityLine(u: User | null) {
  const a = u?.activity;
  if (!a) return "";
  const prefix = a.kind === "custom" ? (a.emoji ?? "💬") : `${a.emoji ?? ""}`.trim();
  const head = a.kind === "custom" ? `${prefix} ${a.name}` : `${activityLabel(a)} ${a.name}`;
  return `${head}${a.details ? ` • ${a.details}` : ""}`;
}
function tickActivities() {
  for (const s of servers.value) {
    for (const u of s.users) {
      if (u.activity?.sinceMins != null && u.status !== "offline") {
        u.activity.sinceMins += 1;
        u.activity.sinceMins = clamp(u.activity.sinceMins, 0, 9999);
      }
    }
  }
}

// ---------- reactions / typing / messages ----------
function maybeReactions(): { emoji: string; count: number }[] | undefined {
  if (Math.random() > 0.1) return undefined;
  const count = 1 + randInt(3);
  const picks = new Set<string>();
  while (picks.size < count) picks.add(emojis[randInt(emojis.length)]);
  return Array.from(picks).map(e => ({ emoji: e, count: 1 + randInt(12) }));
}

function simulateTyping() {
  typing.value = true;
  if (typingTimer) window.clearTimeout(typingTimer);
  typingTimer = window.setTimeout(() => (typing.value = false), 1200 + randInt(1200));
}

function pushMessage(chId: string, msg: Message) {
  const ch = server.value.channels.find(c => c.id === chId);
  if (!ch) return;
  ch.messages.push(msg);

  if (activeChanId.value !== chId) ch.unread = (ch.unread ?? 0) + 1;
}

function dmReplyCandidates(userId: string): User[] {
  return servers.value
    .flatMap(s => s.users)
    .filter((u, idx, arr) => arr.findIndex(x => x.id === u.id) === idx)
    .filter(u => u.id === userId)
    .filter(u => u.status !== "offline")
    .filter(u => (u.replyMessages?.length ?? 0) > 0);
}

function ensureDmThread(userId: string) {
  if (!dmThreadsGlobal[userId]) {
    const u = getUserAny(userId);
    const line = (u?.replyMessages?.[0] ?? "Qué onda 👀");
    dmThreadsGlobal[userId] = [
      {
        id: uid(),
        authorId: userId,
        time: `hoy ${hhmm()}`,
        text: line,
        reactions: maybeReactions(),
      },
    ];
  }
  return dmThreadsGlobal[userId];
}

function pushDirectMessage(userId: string, msg: Message) {
  const thread = ensureDmThread(userId);
  thread.push(msg);
}

function maybeDirectReply(userId: string) {
  const candidates = dmReplyCandidates(userId);
  if (!candidates.length) return;
  if (Math.random() < 0.28) return;

  const u = candidates[0];
  const lines = u.replyMessages ?? [];
  const text = lines[randInt(lines.length)] ?? "ok";

  window.setTimeout(() => {
    pushDirectMessage(userId, {
      id: uid(),
      authorId: u.id,
      tag: u.role === "bot" ? "bot" : (u.role === "mod" ? "mod" : ""),
      time: `hoy ${hhmm()}`,
      text,
      reactions: maybeReactions(),
    });
    if (viewMode.value === "dm" && activeDmUserId.value === userId) scrollToBottom();
  }, 260 + randInt(900));
}

// ✅ replies multi-user
function maybeMultiReplies(chId: string) {
  const candidates = server.value.users
    .filter(u => u.id !== me.value.id)
    .filter(u => u.status !== "offline")
    .filter(u => (u.replyMessages?.length ?? 0) > 0);

  if (!candidates.length) return;
  if (Math.random() < 0.35) return; // nadie responde

  const max = Math.min(3, candidates.length);
  const n = 1 + randInt(max);

  const picks = new Set<number>();
  while (picks.size < n) picks.add(randInt(candidates.length));

  const selected = Array.from(picks).map(i => candidates[i]);

  for (const u of selected) {
    const lines = u.replyMessages ?? [];
    const text = lines[randInt(lines.length)] ?? "ok";
    const delay = 240 + randInt(900);

    window.setTimeout(() => {
      pushMessage(chId, {
        id: uid(),
        authorId: u.id,
        tag: u.role === "bot" ? "bot" : (u.role === "mod" ? "mod" : ""),
        time: `hoy ${hhmm()}`,
        text,
        reactions: maybeReactions(),
      });
      scrollToBottom();
    }, delay);
  }
}

async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  if (viewMode.value === "dm") {
    const to = activeDmUser.value;
    if (!to) return showToast("💬 selecciona un chat directo");

    pushDirectMessage(to.id, {
      id: uid(),
      authorId: me.value.id,
      tag: "",
      time: `hoy ${hhmm()}`,
      text,
      reactions: maybeReactions(),
    });

    msgInput.value = "";
    await scrollToBottom();
    maybeDirectReply(to.id);
    return;
  }

  const chId = activeChannel.value.id;
  const ch = server.value.channels.find(c => c.id === chId);

  if (ch?.kind === "voice") {
    showToast("🔇 ese es voice (mock). Escribe en un canal de texto.");
    return;
  }

  pushMessage(chId, {
    id: uid(),
    authorId: me.value.id,
    tag: "",
    time: `hoy ${hhmm()}`,
    text,
    reactions: maybeReactions(),
  });

  msgInput.value = "";
  await scrollToBottom();

  maybeMultiReplies(chId);
}

function pingRandom() {
  const pings = [
    "🔔 *Ping!*",
    "📣 alguien dijo 'deploy'?",
    "🧨 cuidado con prod",
    "🧠 CPU: 0ms (mentira)",
    "💾 memoria: subiendo (falso)",
    "🧊 freeze detected (broma)",
  ];
  showToast(pings[randInt(pings.length)]);
}

function pinRandom() {
  const ch = activeChannel.value;
  const last = ch.messages[ch.messages.length - 1];
  if (!last) return showToast("📌 nada que pinnear");
  ch.pinned ??= [];
  if (!ch.pinned.includes(last.id)) ch.pinned.push(last.id);
  showToast("📌 mensaje pinneado (mock)");
}

function reactToMessage(m: Message) {
  const r = (m.reactions ??= []);
  const e = emojis[randInt(emojis.length)];
  const found = r.find(x => x.emoji === e);
  if (found) found.count += 1;
  else r.push({ emoji: e, count: 1 });
  showToast(`${e} +1 (mock)`);
}

// ---------- navigation ----------
function setServer(id: string) {
  activeServerId.value = id;
  chanSearch.value = "";
  dmSearch.value = "";
  viewMode.value = "server";
  activeDmUserId.value = "";

  if (voiceConn.value && voiceConn.value.serverId !== id) voiceConn.value = null;

  const firstText = server.value.channels.find(c => (c.kind ?? "text") === "text");
  activeChanId.value = firstText?.id ?? server.value.channels[0]?.id ?? "";
  showToast(`🧭 ${server.value.name}`);
  scrollToBottom();
}

function openGlobalDiscordHome() {
  openFriendsView();
}

function setChannel(id: string) {
  viewMode.value = "server";
  activeChanId.value = id;

  const ch = server.value.channels.find(c => c.id === id);
  if (ch) ch.unread = 0;

  showToast(`📌 #${ch?.label ?? id}`);
  scrollToBottom();
}

// ---------- voice simulation ----------
type VoiceConn = {
  serverId: string;
  channelId: string;
  joinedAt: number;
  muted: boolean;
  deafened: boolean;
};
const voiceConn = ref<VoiceConn | null>(null);

const isInVoice = computed(() => !!voiceConn.value && voiceConn.value.serverId === server.value.id);

const activeVoiceChannel = computed(() => {
  if (!isInVoice.value) return null;
  return server.value.channels.find(c => c.id === voiceConn.value!.channelId) ?? null;
});

function isChannelActiveVoice(ch: Channel) {
  return !!voiceConn.value && voiceConn.value.serverId === server.value.id && voiceConn.value.channelId === ch.id;
}

// ✅ voice members desde channel.voiceUsers
function voiceMembersFor(channelId: string): User[] {
  const ch = server.value.channels.find(c => c.id === channelId);
  const ids = (ch?.voiceUsers ?? []).slice();

  if (isChannelActiveVoice({ id: channelId } as any) && !ids.includes(me.value.id)) ids.unshift(me.value.id);

  const list = ids
    .map(id => server.value.users.find(u => u.id === id))
    .filter(Boolean) as User[];

  const seen = new Set<string>();
  return list.filter(u => (seen.has(u.id) ? false : (seen.add(u.id), true)));
}

function connectToVoice(channelId: string) {
  voiceConn.value = {
    serverId: server.value.id,
    channelId,
    joinedAt: Date.now(),
    muted: false,
    deafened: false,
  };

  playSound("/discord/sounds/join.mp3")

  showToast(`🔊 conectado a ${server.value.channels.find(c => c.id === channelId)?.label ?? channelId}`);
}

function disconnectVoice() {
  if (!voiceConn.value) return;
  const was = voiceConn.value.channelId;
  voiceConn.value = null;
  showToast(`📴 desconectado (${was})`);

  playSound("/discord/sounds/leave.mp3")
}

function toggleMute() {
  if (!voiceConn.value) return;
  voiceConn.value.muted = !voiceConn.value.muted;
  showToast(voiceConn.value.muted ? "🎙️ mute ON" : "🎙️ mute OFF");

  playSound(voiceConn.value.muted ? "/discord/sounds/mute.mp3" : "/discord/sounds/unmute.mp3")
}

function toggleDeafen() {
  if (!voiceConn.value) return;
  voiceConn.value.deafened = !voiceConn.value.deafened;
  showToast(voiceConn.value.deafened ? "🎧 deafen ON" : "🎧 deafen OFF");
}

// ---------- user card modal (click) ----------
const userCard = reactive({ open: false, userId: "" });
const selectedUser = computed(() => userCard.userId ? (getUserAny(userCard.userId) ?? null) : null);
function openUserCard(userId: string) {
  userCard.userId = userId;
  userCard.open = true;
  // si abres modal, ocultamos tooltip
  hoverCard.show = false;
  hoverCard.userId = "";
}
function closeUserCard() {
  userCard.open = false;
}

function openFriendsView() {
  viewMode.value = "friends";
  activeDmUserId.value = "";
  showToast(`👥 friends: ${friends.value.length}`);
}

function addFriend(userId: string) {
  if (!userId || userId === LOGGED_USER_ID) return showToast("🙃 no puedes agregarte");
  const exists = getUserAny(userId);
  if (!exists) return showToast("⚠️ usuario no disponible en este server");
  if (friendIdsGlobal.value.includes(userId)) return showToast("✅ ya es tu amigo");
  friendIdsGlobal.value.push(userId);
  showToast(`➕ ${exists.name} agregado`);
}

function openDirectMessage(userId: string) {
  if (!userId || userId === LOGGED_USER_ID) return showToast("🙃 DM contigo mismo no aplica");
  if (!isFriend(userId)) addFriend(userId);
  ensureDmThread(userId);
  viewMode.value = "dm";
  activeDmUserId.value = userId;
  closeUserCard();
  showToast(`💬 DM con ${getUserAny(userId)?.name ?? userId}`);
  scrollToBottom();
}

// ---------- hover profile tooltip (bootstrap-ish) ----------
const hoverCard = reactive({
  show: false,
  userId: "",
  left: 0,
  top: 0,
  hoveringTooltip: false,
});
let hoverHideTimer: number | undefined;

const hoverUser = computed(() => hoverCard.userId ? (server.value.users.find(u => u.id === hoverCard.userId) ?? null) : null);

function positionHoverCardFromEl(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const width = 280; // match CSS
  const gap = 12;

  // aparece a la izquierda del elemento (como tooltip)
  const left = rect.left - width - gap;
  // alineamos con el top del row, pero clamp a viewport
  const desiredTop = rect.top - 10;
  const maxTop = window.innerHeight - 20 - 190; // aprox alto del tooltip
  const top = clamp(desiredTop, 12, Math.max(12, maxTop));

  hoverCard.left = Math.max(12, left);
  hoverCard.top = top;
}

function onUserHoverEnter(e: MouseEvent, userId: string) {
  if (hoverHideTimer) window.clearTimeout(hoverHideTimer);

  hoverCard.userId = userId;
  hoverCard.show = true;

  const el = e.currentTarget as HTMLElement | null;
  if (el) positionHoverCardFromEl(el);
}

function onUserHoverLeave() {
  if (hoverHideTimer) window.clearTimeout(hoverHideTimer);
  hoverHideTimer = window.setTimeout(() => {
    if (!hoverCard.hoveringTooltip) {
      hoverCard.show = false;
      hoverCard.userId = "";
    }
  }, 120);
}

function onTooltipEnter() {
  hoverCard.hoveringTooltip = true;
  if (hoverHideTimer) window.clearTimeout(hoverHideTimer);
}
function onTooltipLeave() {
  hoverCard.hoveringTooltip = false;
  hoverCard.show = false;
  hoverCard.userId = "";
}

function openFromTooltip() {
  if (!hoverCard.userId) return;
  openUserCard(hoverCard.userId);
}

// ---------- settings modal (UI only) ----------
const settings = reactive({
  open: false,
  section: "myAccount" as "myAccount" | "appearance" | "voice" | "privacy" | "about",
});
function openSettings() {
  settings.open = true;
  settings.section = "myAccount";
  showToast("⚙️ Ajustes (mock)");
}
function closeSettings() {
  settings.open = false;
}

// =======================
// ✅ MEDIA (attachments)
// =======================
type PendingAttachment = { id: string; url: string; name: string; size: number; type: string };

const fileInputRef = ref<HTMLInputElement | null>(null);
const pendingAttachments = ref<PendingAttachment[]>([]);

function openFilePicker() {
  fileInputRef.value?.click();
}

function humanSize(bytes: number) {
  const u = ["B", "KB", "MB", "GB"];
  let b = Math.max(0, bytes);
  let i = 0;
  while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
  const n = i === 0 ? String(Math.round(b)) : b.toFixed(1);
  return `${n} ${u[i]}`;
}

function addFiles(filesLike: FileList | File[]) {
  const files = Array.from(filesLike);
  const imgs = files.filter(f => f.type.startsWith("image/"));
  if (!imgs.length) return showToast("🖼️ solo imágenes (mock)");

  // limite UI suave
  const room = Math.max(0, 6 - pendingAttachments.value.length);
  const sliced = imgs.slice(0, room);
  if (!sliced.length) return showToast("🧱 máximo 6 adjuntos (mock)");

  for (const f of sliced) {
    const url = URL.createObjectURL(f);
    pendingAttachments.value.push({ id: uid(), url, name: f.name, size: f.size, type: f.type });
  }
  showToast(`📎 adjuntado x${sliced.length}`);
}

function onFilePicked(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files) return;
  addFiles(input.files);
  // reset para poder seleccionar el mismo archivo otra vez
  input.value = "";
}

function removeAttachment(id: string) {
  const idx = pendingAttachments.value.findIndex(a => a.id === id);
  if (idx === -1) return;
  const [a] = pendingAttachments.value.splice(idx, 1);
  try { URL.revokeObjectURL(a.url); } catch {}
}

function clearAttachments() {
  for (const a of pendingAttachments.value) {
    try { URL.revokeObjectURL(a.url); } catch {}
  }
  pendingAttachments.value = [];
}

function messageImages(m: Message): string[] {
  // ✅ tú luego agregas a tipos (image?: string, images?: string[])
  const anyM = m as any;
  const imgs: string[] = [];
  if (typeof anyM.image === "string" && anyM.image) imgs.push(anyM.image);
  if (Array.isArray(anyM.images)) {
    for (const s of anyM.images) if (typeof s === "string" && s) imgs.push(s);
  }
  return imgs;
}

function sendComposed() {
  // si no hay adjuntos, usa la función original intacta
  if (!pendingAttachments.value.length) return sendMessage();

  const text = msgInput.value.trim();
  if (viewMode.value === "dm") {
    const to = activeDmUser.value;
    if (!to) return showToast("💬 selecciona un chat directo");

    const imgs = pendingAttachments.value.map(a => a.url);
    pushDirectMessage(to.id, {
      id: uid(),
      authorId: me.value.id,
      tag: "",
      time: `hoy ${hhmm()}`,
      text: text || " ",
      reactions: maybeReactions(),
      images: imgs,
    } as any);

    msgInput.value = "";
    pendingAttachments.value = [];
    scrollToBottom();
    maybeDirectReply(to.id);
    return;
  }

  const chId = activeChannel.value.id;
  const ch = server.value.channels.find(c => c.id === chId);

  if (ch?.kind === "voice") {
    showToast("🔇 ese es voice (mock). Escribe en un canal de texto.");
    return;
  }

  const imgs = pendingAttachments.value.map(a => a.url);

  // NOTE: casteo "as any" para que no truene TS hasta que actualices tus tipos.
  pushMessage(chId, {
    id: uid(),
    authorId: me.value.id,
    tag: "",
    time: `hoy ${hhmm()}`,
    text: text || " ",
    reactions: maybeReactions(),
    images: imgs,
  } as any);

  msgInput.value = "";
  pendingAttachments.value = [];
  scrollToBottom();

  // mantenemos respuestas fake
  maybeMultiReplies(chId);
  maybeMultiRepliesWithMedia(chId);
}

// fake media replies (opcional, sin tocar funciones existentes)
function maybeMultiRepliesWithMedia(chId: string) {
  // de vez en cuando, que alguien responda con "foto"
  if (Math.random() < 0.65) return;

  const candidates = server.value.users
    .filter(u => u.id !== me.value.id)
    .filter(u => u.status !== "offline");

  if (!candidates.length) return;
  const u = candidates[randInt(candidates.length)];

  const stock = [
    "https://images.unsplash.com/photo-1520975916090-3105956dac38?auto=format&fit=crop&w=1200&q=60",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=60",
    "https://images.unsplash.com/photo-1526481280695-3c687fd643ed?auto=format&fit=crop&w=1200&q=60",
    "https://images.unsplash.com/photo-1520975682030-44b4fffa06f0?auto=format&fit=crop&w=1200&q=60",
  ];
  const img = stock[randInt(stock.length)];

  const delay = 280 + randInt(900);
  window.setTimeout(() => {
    pushMessage(chId, {
      id: uid(),
      authorId: u.id,
      tag: u.role === "bot" ? "bot" : (u.role === "mod" ? "mod" : ""),
      time: `hoy ${hhmm()}`,
      text: "📸",
      reactions: maybeReactions(),
      image: img,
    } as any);
    scrollToBottom();
  }, delay);
}

// drag & drop en composer
const dragUI = reactive({ over: false });
function onComposerDragOver(e: DragEvent) {
  e.preventDefault();
  dragUI.over = true;
}
function onComposerDragLeave() {
  dragUI.over = false;
}
function onComposerDrop(e: DragEvent) {
  e.preventDefault();
  dragUI.over = false;
  if (!e.dataTransfer?.files?.length) return;
  addFiles(e.dataTransfer.files);
}

// ---------- image viewer (zoom) ----------
const viewer = reactive({
  open: false,
  src: "",
  idx: 0,
  list: [] as string[],
  scale: 1,
  panX: 0,
  panY: 0,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  basePanX: 0,
  basePanY: 0,
});

function openViewer(list: string[], idx: number) {
  viewer.list = list.slice();
  viewer.idx = clamp(idx, 0, viewer.list.length - 1);
  viewer.src = viewer.list[viewer.idx] ?? "";
  viewer.open = true;
  viewer.scale = 1;
  viewer.panX = 0;
  viewer.panY = 0;
}
function closeViewer() {
  viewer.open = false;
  viewer.src = "";
  viewer.list = [];
}
function viewerNext() {
  if (!viewer.list.length) return;
  viewer.idx = (viewer.idx + 1) % viewer.list.length;
  viewer.src = viewer.list[viewer.idx] ?? "";
  viewer.scale = 1;
  viewer.panX = 0;
  viewer.panY = 0;
}
function viewerPrev() {
  if (!viewer.list.length) return;
  viewer.idx = (viewer.idx - 1 + viewer.list.length) % viewer.list.length;
  viewer.src = viewer.list[viewer.idx] ?? "";
  viewer.scale = 1;
  viewer.panX = 0;
  viewer.panY = 0;
}
function viewerZoom(delta: number) {
  viewer.scale = clamp(Number((viewer.scale + delta).toFixed(2)), 0.5, 4);
}
function viewerReset() {
  viewer.scale = 1;
  viewer.panX = 0;
  viewer.panY = 0;
}
function onViewerWheel(e: WheelEvent) {
  e.preventDefault();
  const dir = e.deltaY > 0 ? -0.1 : 0.1;
  viewerZoom(dir);
}
function onViewerMouseDown(e: MouseEvent) {
  viewer.dragging = true;
  viewer.dragStartX = e.clientX;
  viewer.dragStartY = e.clientY;
  viewer.basePanX = viewer.panX;
  viewer.basePanY = viewer.panY;
}
function onViewerMouseMove(e: MouseEvent) {
  if (!viewer.dragging) return;
  viewer.panX = viewer.basePanX + (e.clientX - viewer.dragStartX);
  viewer.panY = viewer.basePanY + (e.clientY - viewer.dragStartY);
}
function onViewerMouseUp() {
  viewer.dragging = false;
}
</script>

<template>
  <div class="discord-root">
    <div class="app">
      <!-- Servers rail -->
      <aside class="rail">
        <button
          class="srv home"
          :class="{ active: viewMode !== 'server' }"
          @click="openGlobalDiscordHome"
          type="button"
          title="Discord Home"
        >
          <span class="pill"></span>
          <span class="discordLogo" aria-hidden="true">
            <i class="bi bi-discord"></i>
          </span>
        </button>

        <button
          v-for="(s, i) in servers"
          :key="s.id"
          class="srv"
          :class="{ active: viewMode === 'server' && s.id === activeServerId }"
          @click="setServer(s.id)"
          type="button"
          :title="s.name"
        >
          <!-- ✅ pills servidor seleccionado -->
          <span class="pill"></span>

          <template v-if="s.icon">
            <img class="srvIcon" :src="s.icon" :alt="s.name" />
          </template>
          <template v-else>
            <span class="abbr">{{ s.badge ?? s.name.slice(0, 2).toUpperCase() }}</span>
          </template>

          <!-- UI talacha: badge decorativo (no dinámico) -->
          <span v-if="i % 4 === 1 && s.id !== activeServerId" class="fakeNotif">•</span>

          <span v-if="s.id === activeServerId && (server.users.some(u => u.status === 'online'))" class="dot"></span>
        </button>

        <div class="railSep"></div>

        <button class="srv add" @click="showToast('➕ crear servidor: premium imaginario')" title="Crear servidor" type="button">
          <span class="pill"></span>
          <span class="abbr">+</span>
        </button>

        <div class="rail-foot">mini<br />discord</div>
      </aside>

      <!-- Channels -->
      <aside class="channels">
        <template v-if="viewMode === 'server'">
          <div class="topbar">
            <div class="serverTitle">
              <div class="name">{{ server.name }}</div>
              <div class="meta">{{ server.meta }}</div>
            </div>

            <div class="search">
              <input v-model="chanSearch" placeholder="Buscar canal…" />
            </div>
          </div>

          <div class="chanList">
            <div class="section">
              <div class="hdr">
                <span>Text Channels</span>
                <span class="muted">+</span>
              </div>

              <button
                v-for="c in filteredTextChannels"
                :key="c.id"
                class="chan"
                :class="{ active: c.id === activeChanId }"
                @click="setChannel(c.id)"
                type="button"
              >
                <span class="hash"><i class="bi bi-hash"></i></span>
                <span class="label">{{ c.label }}</span>
                <span v-if="c.unread" class="pillCount">{{ c.unread }}</span>
                <span class="chanGear" title="Opciones (mock)">⚙️</span>
              </button>
            </div>

            <div class="section" v-if="voiceChannels.length">
              <div class="hdr">
                <span>Voice Channels</span>
                <span class="muted">⋯</span>
              </div>

              <div v-for="v in voiceChannels" :key="v.id" class="voiceWrap">
                <div
                  class="chan voice"
                  :class="{ active: isChannelActiveVoice(v) }"
                  @click="connectToVoice(v.id)"
                  title="Conectar"
                >
                  
                  <span class="hash">
                    <i class="bi bi-volume-up-fill"></i>
                  </span>
                  
                  <span class="label">{{ v.label }}</span>
                  
                  <span v-if="isChannelActiveVoice(v)" class="voicePill"><i class="bi bi-soundwave"></i></span>
                  
                  <span class="chanGear" title="Opciones">⋯</span>
                </div>

                <div v-if="voiceMembersFor(v.id).length" class="voiceMembers">
                  <button
                    v-for="u in voiceMembersFor(v.id)"
                    :key="u.id"
                    class="voiceMember"
                    type="button"
                    @click.stop="openUserCard(u.id)"
                    :title="u.name"
                  >
                    <span class="vmAvatar">
                      <img v-if="u.avatar" :src="u.avatar" :alt="u.name" />
                      <span v-else class="vmFallback" :style="{ background: u.color ?? '#5865F2' }"></span>
                      <span class="statusDot tiny" :class="u.status"></span>
                    </span>
                    <span class="vmName">{{ u.name }}</span>

                    <span v-if="u.id === me.id && isInVoice && isChannelActiveVoice(v)" class="vmMeTag">
                      {{ voiceConn?.muted ? "Muted" : "Mic" }}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="topbar">
            <div class="serverTitle">
              <div class="name">Discord</div>
              <div class="meta">Direct messages</div>
            </div>

            <div class="search">
              <input v-model="dmSearch" placeholder="Buscar amigo..." />
            </div>
          </div>

          <div class="chanList">
            <div class="section">
              <div class="hdr">
                <span>Direct Messages</span>
              </div>

              <button
                class="chan"
                :class="{ active: viewMode === 'friends' }"
                @click="openFriendsView"
                type="button"
              >
                <span class="hash">👥</span>
                <span class="label">Friends</span>
                <span class="pillCount">{{ friends.length }}</span>
              </button>

              <button
                v-for="u in filteredFriends"
                :key="'dm_' + u.id"
                class="chan"
                :class="{ active: viewMode === 'dm' && activeDmUserId === u.id }"
                @click="openDirectMessage(u.id)"
                type="button"
              >
                <span class="hash">💬</span>
                <span class="label">{{ u.name }}</span>
                <span class="status" :class="u.status">{{ statusLabel(u.status) }}</span>
              </button>

              <div v-if="!filteredFriends.length" class="dmEmpty">Sin amigos todavía</div>
            </div>
          </div>
        </template>

        <!-- Voice connected bar -->
        <div v-if="viewMode === 'server' && isInVoice && activeVoiceChannel" class="voiceBar">

          <div class="vbLeft">
            <div style="display: flex; flex-direction: row;">
              <div class="vbIcon"><i class="bi bi-wifi"></i></div>
              <div class="vbTxt">
                <div class="vbChan">Voice Connected</div>
                <div class="vbMeta">{{ activeVoiceChannel.label }}/{{ server.name }}</div>
              </div>
            </div>
            <div>
              <button class="vbBtn disconnect-btn" type="button" @click="disconnectVoice" title="Disconnect"><i class="bi bi-telephone-fill"></i></button>            
            </div>
          </div>

          <div class="vbBtns">
            <button class="vbBtn" type="button" title="Video" @click="pingRandom"><i class="bi bi-camera-video-off-fill"></i></button>
            <button class="vbBtn" type="button" title="Compartir Pantalla" @click="pingRandom"><i class="bi bi-display-fill"></i></button>
            <button class="vbBtn" type="button" title="Actividades" @click="pinRandom"><i class="bi bi-grid"></i></button>
            <button class="vbBtn" type="button" title="Soundboard" @click="pinRandom"><i class="bi bi-volume-down"></i></button>
          </div>
        </div>        

        <!-- User card bottom -->
        <div class="userCard">
          <div class="me" style="cursor:pointer;">
            <div class="avatar" @click="openUserCard(me.id)">
              <img v-if="me.avatar" class="avatarImg" :src="me.avatar" :alt="me.name" />
              <div v-else class="avatarFallback" :style="{ background: me.color ?? '#5865F2' }"></div>
              <span class="statusDot" :class="me.status"></span>
            </div>

            <div class="meTxt">
              <div class="u">{{ me.name }}</div>

              <div class="s">
                <span v-if="me.activity">
                  {{ activityLine(me) }}
                  <span class="since" v-if="me.activity?.sinceMins != null">• {{ formatSince(me.activity.sinceMins) }}</span>
                </span>
                <span v-else>
                  {{ me.role === 'owner' ? 'Owner • vibing' : 'vibing' }} • {{ me.status }}
                </span>
              </div>
            </div>
          </div>

          <div class="meBtns">
            <button class="iconBtn" type="button" @click="toggleMute" :class="{ on: voiceConn?.muted }" title="Mute"><i class="bi bi-mic-fill"></i></button>
            <button class="iconBtn" type="button" @click="toggleDeafen" :class="{ on: voiceConn?.deafened }" title="Deafen"><i class="bi bi-headphones"></i></button>
            <!-- ✅ ahora abre ajustes -->
            <button class="iconBtn" type="button" title="Settings" @click="openSettings"><i class="bi bi-gear-fill"></i></button>
          </div>
        </div>


      </aside>

      <!-- Chat -->
      <main class="chat">
        <div class="chatTop">
          <div class="chanTitle">
            <div class="hash" v-html="chatIcon"></div>
            <div class="t">{{ chatTitle }}</div>
            <div class="topic">{{ chatSubline }}</div>
          </div>

          <div class="chatBtns">
            <button class="iconBtn" type="button" title="Inbox" @click="showToast('Inbox')"><i class="bi bi-inbox-fill"></i></button>
            <button class="iconBtn" type="button" title="Pinned" @click="showToast(`Mensajes Anclados: ${(activeChannel?.pinned?.length ?? 0)}`)"><i class="bi bi-pin-angle-fill"></i></button>
            <button class="iconBtn" type="button" title="Members" @click="showToast('Miembros')"><i class="bi bi-people-fill"></i></button>
            <button class="iconBtn" type="button" title="Help" @click="showToast('Ayuda')">?</button>
          </div>
        </div>

        <div v-if="viewMode === 'friends'" class="friendsPane">
          <div class="friendsHdr">
            <div class="friendsTitle">Tu lista de amigos</div>
            <div class="friendsMeta">{{ friends.length }} total</div>
          </div>

          <div v-if="friends.length" class="friendsList">
            <div v-for="u in friends" :key="'friend_view_' + u.id" class="friendRow">
              <div class="fAvatar" @click="openUserCard(u.id)">
                <img v-if="u.avatar" :src="u.avatar" :alt="u.name" />
                <div v-else class="fFallback" :style="{ background: u.color ?? '#5865F2' }"></div>
                <span class="statusDot small" :class="u.status"></span>
              </div>

              <div class="fInfo">
                <div class="fName">{{ u.name }}</div>
                <div class="fMeta">{{ u.status }} <span v-if="u.activity">• {{ activityLine(u) }}</span></div>
              </div>

              <button class="fBtn" type="button" @click="openDirectMessage(u.id)">Message</button>
            </div>
          </div>

          <div v-else class="friendsEmpty">
            Agrega amigos desde el perfil de usuario con el botón <b>Add</b>.
          </div>
        </div>

        <div v-else ref="msgPaneRef" class="msgPane" aria-label="Chat messages">
          <div v-if="viewMode === 'server' && (activeChannel?.pinned?.length ?? 0) > 0" class="pinnedBar">
            <span class="pinIcon">📌</span>
            <span class="pinTxt">{{ activeChannel.pinned?.length }} pinned</span>
            <button class="pinBtn" type="button" @click="showToast('📌 panel de pins: próximamente™')">ver</button>
          </div>

          <div v-for="m in currentMessages" :key="m.id" class="msg">
            <!-- UI talacha: opciones tipo Discord (decoración) -->
            <div class="msgOps" aria-hidden="true">
              <button class="msgOp" type="button" title="Add Reaction (mock)" @click="showToast('😀 add reaction (mock)')">😀</button>
              <button class="msgOp" type="button" title="Reply (mock)" @click="showToast('↩️ reply (mock)')">↩️</button>
              <button class="msgOp" type="button" title="More (mock)" @click="showToast('⋯ more (mock)')">⋯</button>
            </div>

            <div class="av" @click="openUserCard(m.authorId)" style="cursor:pointer;">
              <img v-if="getMessageUser(m.authorId)?.avatar" class="avImg" :src="getMessageUser(m.authorId)?.avatar" :alt="getMessageUser(m.authorId)?.name" />
              <div v-else class="avFallback" :style="{ background: getMessageUser(m.authorId)?.color ?? '#5865F2' }"></div>
              <span class="statusDot small" :class="getMessageUser(m.authorId)?.status ?? 'offline'"></span>
            </div>

            <div class="body">
              <div class="head">
                <button
                  class="userBtn"
                  type="button"
                  @click="openUserCard(m.authorId)"
                  :style="{ color: getMessageUser(m.authorId)?.color ?? 'rgba(255,255,255,.92)' }"
                >
                  {{ getMessageUser(m.authorId)?.name ?? m.authorId }}
                </button>

                <div v-if="(getMessageUser(m.authorId)?.role === 'owner')" class="badge owner">OWNER</div>
                <div v-else-if="(getMessageUser(m.authorId)?.role === 'mod')" class="badge mod">MOD</div>
                <div v-else-if="(getMessageUser(m.authorId)?.role === 'bot')" class="badge bot">BOT</div>

                <div v-if="m.tag" class="badge" :class="m.tag">{{ m.tag.toUpperCase() }}</div>
                <div class="time">{{ m.time }}</div>
              </div>

              <div class="text" v-if="(m.text ?? '').trim() !== ''">{{ m.text }}</div>

              <!-- ✅ MEDIA: imágenes del mensaje (si vienen en server_list o en adjuntos) -->
              <div v-if="messageImages(m).length" class="mediaGrid">
                <button
                  v-for="(src, i) in messageImages(m)"
                  :key="src + '_' + i"
                  class="mediaItem"
                  type="button"
                  @click="openViewer(messageImages(m), i)"
                  title="Abrir imagen"
                >
                  <img class="mediaImg" :src="src" alt="attachment" />
                  <span class="mediaCorner" aria-hidden="true">🔎</span>
                </button>
              </div>

              <div v-if="m.reactions?.length" class="reactions">
                <button v-for="r in m.reactions" :key="r.emoji" class="react" type="button" @click="reactToMessage(m)">
                  {{ r.emoji }} {{ r.count }}
                </button>
                <button class="react addReact" type="button" @click="reactToMessage(m)" title="Add reaction">＋</button>
              </div>
            </div>
          </div>
        </div>

        <div class="typing" v-if="viewMode !== 'friends' && typing">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          <span class="typingTxt">alguien está escribiendo…</span>
        </div>

        <!-- ✅ attachment tray -->
        <div v-if="viewMode !== 'friends' && pendingAttachments.length" class="attachTray">
          <div class="trayHdr">
            <div class="trayTitle">Adjuntos</div>
            <div class="trayMeta">{{ pendingAttachments.length }}/6</div>
            <button class="trayClear" type="button" @click="clearAttachments">Limpiar</button>
          </div>

          <div class="trayGrid">
            <div v-for="a in pendingAttachments" :key="a.id" class="trayItem">
              <button class="trayThumb" type="button" @click="openViewer([a.url], 0)" title="Preview">
                <img :src="a.url" alt="preview" />
              </button>
              <div class="trayInfo">
                <div class="trayName" :title="a.name">{{ a.name }}</div>
                <div class="traySize">{{ humanSize(a.size) }}</div>
              </div>
              <button class="trayX" type="button" @click="removeAttachment(a.id)" title="Quitar">✕</button>
            </div>
          </div>
        </div>

        <div
          v-if="viewMode !== 'friends'"
          class="composer"
          :class="{ over: dragUI.over }"
          @dragover="onComposerDragOver"
          @dragleave="onComposerDragLeave"
          @drop="onComposerDrop"
        >
          <!-- input file hidden -->
          <input
            ref="fileInputRef"
            class="fileHidden"
            type="file"
            accept="image/*"
            multiple
            @change="onFilePicked"
          />

          <button class="plus" type="button" title="Adjuntar (mock)" @click="openFilePicker"><i class="bi bi-plus-lg"></i></button>

          <input
            v-model="msgInput"
            :placeholder="messageInputPlaceholder"
            autocomplete="off"
            @input="simulateTyping()"
            @keydown.enter.prevent="sendComposed"
          />

          <button class="send" type="button" @click="sendComposed">Envia</button>

          <div v-if="dragUI.over" class="dropHint" aria-hidden="true">
            <div class="dropCard">
              <div class="dropIcon">📎</div>
              <div class="dropTxt">Suelta imágenes para adjuntar</div>
            </div>
          </div>
        </div>
      </main>

      <!-- Members -->
      <aside v-if="viewMode === 'server'" class="members">
        <div class="title">
          <div class="h">Miembros</div>
          <div class="badgeCount">{{ server.users.filter(u => u.status === 'online').length }} online</div>
        </div>

        <div class="list">
          <template v-for="g in usersGrouped" :key="g.title">
            <div class="role">{{ g.title }} <span class="muted">{{ g.users.length }}</span></div>

            <div
              class="member"
              v-for="u in g.users"
              :key="u.id"
              @mouseenter="onUserHoverEnter($event, u.id)"
              @mouseleave="onUserHoverLeave"
            >
              <!-- ✅ click SOLO en la foto abre la card grande -->
              <div class="mav" @click.stop="openUserCard(u.id)" style="cursor:pointer;">
                <img v-if="u.avatar" class="mavImg" :src="u.avatar" :alt="u.name" />
                <div v-else class="mavFallback" :style="{ background: u.color ?? '#5865F2' }"></div>
                <span class="statusDot small" :class="u.status"></span>
              </div>

              <div class="name" :style="{ color: u.color ?? 'rgba(255,255,255,.92)' }">
                {{ u.name }}
                <div v-if="u.activity" class="miniActivity">
                  <span class="actLine">{{ activityLine(u) }}</span>
                  <span class="since green" style="display:none;" v-if="u.activity?.sinceMins != null">{{ formatSince(u.activity.sinceMins) }}</span>
                </div>
              </div>

              <div class="status" :class="u.status">{{ statusLabel(u.status) }}</div>
            </div>
          </template>
        </div>
      </aside>
    </div>

    <div class="toast" :class="{ show: toast.show }">{{ toast.text }}</div>

    <!-- Hover profile tooltip (izquierda, no sigue al mouse) -->
    <div
      v-if="hoverCard.show && hoverUser"
      class="hoverProfile"
      :style="{ left: hoverCard.left + 'px', top: hoverCard.top + 'px' }"
      @mouseenter="onTooltipEnter"
      @mouseleave="onTooltipLeave"
    >
      <div class="hpTop" :style="{ background: hoverUser.color ?? 'var(--brand)' }"></div>
      <div class="hpBody">
        <div class="hpRow">
          <!-- ✅ aquí SI puedes meter el mouse y dar click -->
          <button class="hpAvBtn" type="button" @click="openFromTooltip" title="Abrir perfil">
            <div class="hpAv">
              <img v-if="hoverUser.avatar" :src="hoverUser.avatar" :alt="hoverUser.name" />
              <div v-else class="hpFallback" :style="{ background: hoverUser.color ?? 'var(--brand)' }"></div>
              <span class="statusDot" :class="hoverUser.status"></span>
            </div>
          </button>

          <div class="hpTxt">
            <div class="hpName">{{ hoverUser.name }}</div>
            <div class="hpStatus">{{ hoverUser.status }} <span v-if="hoverUser.role">• {{ hoverUser.role }}</span></div>
          </div>
        </div>

        <div v-if="hoverUser.activity" class="hpAct">
          <div class="hpActLine">{{ activityLine(hoverUser) }}</div>
          <div class="hpActSince" v-if="hoverUser.activity?.sinceMins != null">
            <span class="greenDot"></span> {{ formatSince(hoverUser.activity.sinceMins) }}
          </div>
        </div>

        <div class="hpHint">Click en el avatar para abrir perfil</div>
      </div>
    </div>

    <!-- Big user card modal -->
    <div v-if="userCard.open && selectedUser" class="userCardOverlay" @click="closeUserCard">
      <div class="userCardModal" @click.stop>
        <div class="ucBanner" :style="{ background: selectedUser.color ?? 'var(--brand)' }"></div>

        <div class="ucBody">
          <div class="ucTop">
            <div class="ucAvatar">
              <img v-if="selectedUser.avatar" :src="selectedUser.avatar" :alt="selectedUser.name" />
              <div v-else class="ucFallback" :style="{ background: selectedUser.color ?? 'var(--brand)' }"></div>
              <span class="statusDot" :class="selectedUser.status"></span>
            </div>

            <button class="ucClose" type="button" @click="closeUserCard">✕</button>
          </div>

          <div class="ucNameRow">
            <div class="ucName">{{ selectedUser.name }}</div>
            <div v-if="selectedUser.role" class="ucRole">{{ selectedUser.role.toUpperCase() }}</div>
          </div>

          <div class="ucStatus">{{ selectedUser.status }}</div>

          <div v-if="selectedUser.activity" class="ucActivity">
            <div class="ucActivityTitle">Actividad</div>
            <div class="ucActivityLine">{{ activityLine(selectedUser) }}</div>
            <div class="ucSince" v-if="selectedUser.activity?.sinceMins != null">
              <span class="greenDot"></span> {{ formatSince(selectedUser.activity.sinceMins) }}
            </div>
          </div>

          <div v-if="(selectedUser.replyMessages?.length ?? 0) > 0" class="ucReplies">
            <div class="ucActivityTitle">Reply messages</div>
            <div class="ucReplyList">
              <span v-for="(r, i) in selectedUser.replyMessages" :key="i" class="ucReplyChip">{{ r }}</span>
            </div>
          </div>

          <div class="ucActions">
            <button class="ucBtn" type="button" @click="openDirectMessage(selectedUser.id)">Message</button>
            <button class="ucBtn" type="button" @click="addFriend(selectedUser.id)">Add</button>
            <button class="ucBtn danger" type="button" @click="showToast('🚫 Block (mock)')">Block</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings modal (Discord-ish, UI only) -->
    <div v-if="settings.open" class="settingsOverlay" @click="closeSettings">
      <div class="settingsShell" @click.stop>
        <aside class="settingsNav">
          <div class="setTitle">Ajustes de usuario</div>

          <button class="setItem" :class="{ on: settings.section==='myAccount' }" type="button" @click="settings.section='myAccount'">
            <span class="setIcon">👤</span><span class="setTxt">Mi cuenta</span>
          </button>

          <button class="setItem" :class="{ on: settings.section==='appearance' }" type="button" @click="settings.section='appearance'">
            <span class="setIcon">🎨</span><span class="setTxt">Apariencia</span>
          </button>

          <button class="setItem" :class="{ on: settings.section==='voice' }" type="button" @click="settings.section='voice'">
            <span class="setIcon">🎙️</span><span class="setTxt">Voz y video</span>
          </button>

          <div class="setSep"></div>

          <button class="setItem" :class="{ on: settings.section==='privacy' }" type="button" @click="settings.section='privacy'">
            <span class="setIcon">🛡️</span><span class="setTxt">Privacidad</span>
          </button>

          <button class="setItem" :class="{ on: settings.section==='about' }" type="button" @click="settings.section='about'">
            <span class="setIcon">ℹ️</span><span class="setTxt">Acerca de</span>
          </button>

          <div class="setNavFoot">
            <div class="setMe">
              <div class="setMeAv">
                <img v-if="me.avatar" :src="me.avatar" :alt="me.name" />
                <span v-else class="setMeFallback" :style="{ background: me.color ?? 'var(--brand)' }"></span>
              </div>
              <div class="setMeTxt">
                <div class="setMeName">{{ me.name }}</div>
                <div class="setMeTag">@{{ me.id }}</div>
              </div>
            </div>
            <button class="setLogout" type="button" @click="showToast('🚪 logout (mock)')">Log Out</button>
          </div>
        </aside>

        <main class="settingsMain">
          <div class="settingsTop">
            <div class="settingsHdr">
              <div class="settingsHdrTitle">
                <span v-if="settings.section==='myAccount'">Mi cuenta</span>
                <span v-else-if="settings.section==='appearance'">Apariencia</span>
                <span v-else-if="settings.section==='voice'">Voz y video</span>
                <span v-else-if="settings.section==='privacy'">Privacidad</span>
                <span v-else>Acerca de</span>
              </div>
              <div class="settingsHdrSub">UI mock • deja claras las secciones para que agregues más después</div>
            </div>

            <button class="settingsClose" type="button" @click="closeSettings" title="Cerrar">✕</button>
          </div>

          <!-- Content panes -->
          <div class="settingsPane">
            <div v-if="settings.section==='myAccount'" class="setPanel">
              <div class="setCard">
                <div class="setCardTitle">Perfil</div>
                <div class="setRow">
                  <div class="setProfile">
                    <div class="setProfileAv">
                      <img v-if="me.avatar" :src="me.avatar" :alt="me.name" />
                      <span v-else class="setProfileFallback" :style="{ background: me.color ?? 'var(--brand)' }"></span>
                    </div>
                    <div class="setProfileTxt">
                      <div class="setProfileName">{{ me.name }}</div>
                      <div class="setProfileMeta">Estado: <span class="mono">{{ me.status }}</span></div>
                    </div>
                  </div>
                  <div class="setActions">
                    <button class="setBtn" type="button" @click="showToast('✏️ editar (mock)')">Editar perfil</button>
                    <button class="setBtn ghost" type="button" @click="showToast('📷 cambiar avatar (mock)')">Cambiar avatar</button>
                  </div>
                </div>
              </div>

              <div class="setCard">
                <div class="setCardTitle">Cuenta</div>
                <div class="setGrid">
                  <div class="setField">
                    <div class="setLabel">Nombre de usuario</div>
                    <div class="setValue mono">{{ me.name }}</div>
                  </div>
                  <div class="setField">
                    <div class="setLabel">ID</div>
                    <div class="setValue mono">{{ me.id }}</div>
                  </div>
                  <div class="setField">
                    <div class="setLabel">Email</div>
                    <div class="setValue mono">••••••@•••• (mock)</div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="settings.section==='appearance'" class="setPanel">
              <div class="setCard">
                <div class="setCardTitle">Tema</div>
                <div class="setChips">
                  <button class="chip on" type="button" @click="showToast('🌙 dark (mock)')">🌙 Oscuro</button>
                  <button class="chip" type="button" @click="showToast('☀️ light (mock)')">☀️ Claro</button>
                  <button class="chip" type="button" @click="showToast('🖥️ auto (mock)')">🖥️ Sistema</button>
                </div>
                <div class="setHint">Aquí luego puedes meter sliders, toggles, densidad, fuentes, etc.</div>
              </div>

              <div class="setCard">
                <div class="setCardTitle">Previsualización</div>
                <div class="previewBox">
                  <div class="pvTop"># general</div>
                  <div class="pvMsg"><span class="pvName">nekominie</span> <span class="pvTime">hoy 12:34</span></div>
                  <div class="pvLine">esto es un preview (mock)</div>
                </div>
              </div>
            </div>

            <div v-else-if="settings.section==='voice'" class="setPanel">
              <div class="setCard">
                <div class="setCardTitle">Entrada / Salida</div>
                <div class="setRow2">
                  <div class="setSelect">
                    <div class="setLabel">Dispositivo de entrada</div>
                    <button class="fakeSelect" type="button" @click="showToast('🎙️ input (mock)')">Micrófono (mock) ▾</button>
                  </div>
                  <div class="setSelect">
                    <div class="setLabel">Dispositivo de salida</div>
                    <button class="fakeSelect" type="button" @click="showToast('🔊 output (mock)')">Bocinas (mock) ▾</button>
                  </div>
                </div>
              </div>

              <div class="setCard">
                <div class="setCardTitle">Prueba</div>
                <div class="setRow2">
                  <button class="setBtn" type="button" @click="showToast('🧪 test mic (mock)')">Probar mic</button>
                  <button class="setBtn ghost" type="button" @click="showToast('🔈 test audio (mock)')">Probar audio</button>
                </div>
              </div>
            </div>

            <div v-else-if="settings.section==='privacy'" class="setPanel">
              <div class="setCard">
                <div class="setCardTitle">Seguridad</div>
                <div class="toggleRow">
                  <div class="toggleTxt">
                    <div class="toggleName">Mensajes directos</div>
                    <div class="toggleDesc">Permitir DMs de miembros del servidor (mock)</div>
                  </div>
                  <button class="toggle" type="button" @click="showToast('✅ toggle (mock)')"><span class="knob"></span></button>
                </div>

                <div class="toggleRow">
                  <div class="toggleTxt">
                    <div class="toggleName">Filtros</div>
                    <div class="toggleDesc">Filtrar contenido sensible (mock)</div>
                  </div>
                  <button class="toggle off" type="button" @click="showToast('✅ toggle (mock)')"><span class="knob"></span></button>
                </div>
              </div>

              <div class="setCard">
                <div class="setCardTitle">Bloqueos</div>
                <div class="setHint">Sección lista para que agregues lista de bloqueados, palabras, etc.</div>
              </div>
            </div>

            <div v-else class="setPanel">
              <div class="setCard">
                <div class="setCardTitle">Acerca de</div>
                <div class="aboutRow">
                  <div class="aboutBadge">mini discord</div>
                  <div class="aboutTxt">
                    <div class="aboutName">UI-only mock</div>
                    <div class="aboutMeta mono">v0.1 • sin backend</div>
                  </div>
                </div>
                <div class="setHint">Créditos / changelog / links (mock).</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>

    <!-- ✅ Image viewer modal -->
    <div
      v-if="viewer.open"
      class="viewerOverlay"
      @click="closeViewer"
      @mousemove="onViewerMouseMove"
      @mouseup="onViewerMouseUp"
      @mouseleave="onViewerMouseUp"
    >
      <div class="viewerShell" @click.stop>
        <div class="viewerTop">
          <div class="viewerLeft">
            <div class="viewerTitle">Imagen</div>
            <div class="viewerMeta mono">{{ viewer.idx + 1 }}/{{ viewer.list.length }} • zoom {{ Math.round(viewer.scale * 100) }}%</div>
          </div>

          <div class="viewerBtns">
            <button class="vBtn" type="button" title="Zoom -" @click="viewerZoom(-0.2)">−</button>
            <button class="vBtn" type="button" title="Reset" @click="viewerReset">⟲</button>
            <button class="vBtn" type="button" title="Zoom +" @click="viewerZoom(0.2)">+</button>
            <button class="vBtn ghost" style="display: none;" type="button" title="Abrir en pestaña" @click="">↗</button>
            <button class="vBtn danger" type="button" title="Cerrar" @click="closeViewer">✕</button>
          </div>
        </div>

        <div class="viewerStage" @wheel="onViewerWheel">
          <button v-if="viewer.list.length > 1" class="vNav left" type="button" @click="viewerPrev" title="Anterior">‹</button>

          <div
            class="viewerCanvas"
            @mousedown="onViewerMouseDown"
            :style="{ cursor: viewer.scale > 1 ? (viewer.dragging ? 'grabbing' : 'grab') : 'default' }"
          >
            <img
              class="viewerImg"
              :src="viewer.src"
              alt="full"
              draggable="false"
              :style="{
                transform: `translate(${viewer.panX}px, ${viewer.panY}px) scale(${viewer.scale})`
              }"
            />
          </div>

          <button v-if="viewer.list.length > 1" class="vNav right" type="button" @click="viewerNext" title="Siguiente">›</button>
        </div>

        <div class="viewerFoot">
          <div class="viewerHint">Scroll = zoom • Drag = mover (cuando zoom &gt; 100%)</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.discord-root{
  --bg: #313338;
  --bg2:#2b2d31;
  --bg3:#1e1f22;
  --panel2:#232428;
  --border: rgba(255,255,255,.06);

  --text: rgba(255,255,255,.92);
  --muted2: rgba(255,255,255,.45);

  --brand:#5865F2;
  --green:#23A55A;
  --yellow:#F0B232;
  --red:#F23F43;

  --shadow: 0 16px 38px rgba(0,0,0,.45);
  --font: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";

  height: 100%;
  width: 100%;
  overflow: hidden;
  font-family: var(--font);
  color: var(--text);
  background: var(--bg);
  position: relative;
}

.app{
  height: 100%;
  display: flex;
  grid-template-columns: 76px 260px 1fr 280px;
}

/* rail */
.rail{
  padding: 12px 10px;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--bg3);
}
.railSep{
  height: 2px;
  border-radius: 999px;
  background: rgba(255,255,255,.06);
  margin: 2px 8px 6px;
}
.srv{
  width: 52px; height: 52px;
  border-radius: 18px;
  display: grid; place-items: center;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.06);
  cursor: pointer;
  position: relative;
  transition: transform .12s ease, border-color .12s ease, background .12s ease, border-radius .12s ease;
  user-select: none;
  padding: 0;
  overflow: hidden;
}
.srv:hover{ transform: translateY(-1px); border-color: rgba(255,255,255,.14); background: rgba(255,255,255,.08); border-radius: 16px; }
.srv.active{ border-color: rgba(88,101,242,.55); background: rgba(88,101,242,.20); box-shadow: 0 10px 24px rgba(88,101,242,.16); border-radius: 16px; }
.srv.home{
  background: rgba(88,101,242,.24);
  border-color: rgba(88,101,242,.45);
}

.discordLogo{
  width: 27px;
  height: 27px;
  display: grid;
  place-items: center;
  font-size: 25px;
  color: white;
}

.discordLogo svg{
  width: 100%;
  height: 100%;
  fill: rgba(235,238,255,.98);
}

/* ✅ pills servidor seleccionado */
.pill{
  position: absolute;
  left: -8px;
  width: 4px;
  height: 12px;
  border-radius: 999px;
  background: rgba(255,255,255,.75);
  opacity: 0;
  transition: opacity .12s ease, height .12s ease;
}
.srv.active .pill{ opacity: 1; height: 28px; }

.abbr{ font-weight: 900; letter-spacing: .3px; font-size: 14px; color: rgba(255,255,255,.95); }
.srvIcon{ width: 100%; height: 100%; object-fit: cover; display:block; }

.fakeNotif{
  position:absolute;
  top: 6px;
  right: 8px;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--red);
  border: 2px solid var(--bg3);
  box-shadow: 0 0 0 1px rgba(255,255,255,.08);
}

.dot{
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 10px; height: 10px;
  border-radius: 50%;
  background: var(--green);
  border: 2px solid var(--bg3);
  box-shadow: 0 0 0 1px rgba(255,255,255,.10);
}
.srv.add{ background: rgba(35,165,90,.10); border-color: rgba(35,165,90,.25); }
.srv.add .abbr{ color: rgba(35,165,90,.95); font-size: 22px; }
.rail-foot{ margin-top: auto; opacity: .6; font-size: 11px; text-align: center; padding: 8px 0; color: rgba(255,255,255,.60); }

/* channels */
.channels{
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--bg2);
  width: 18rem;
}
.topbar{
  padding: 12px 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-bottom: 1px solid var(--border);
  background: var(--bg2);
}
.serverTitle .name{ font-weight: 900; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.serverTitle .meta{ color: var(--muted2); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.search{
  display: flex;
}

.search input{
  flex: 1;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.08);
  background: var(--panel2);
  color: var(--text);
  padding: 8px 10px;
  outline: none;
}

.search input::placeholder{ 
  color: rgba(255,255,255,.35); 
}

.chanList{ padding: 10px 10px 12px; overflow: auto; min-height: 0; flex: 1; }
.section{ margin-top: 12px; }
.hdr{
  display: flex; align-items: center; justify-content: space-between;
  color: rgba(255,255,255,.55);
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1.1px;
  padding: 8px 8px 6px;
}
.hdrBtn{
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.82);
  font-size: 10px;
  font-weight: 900;
  border-radius: 999px;
  padding: 4px 8px;
  cursor: pointer;
}
.hdrBtn:hover{ background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.14); }
.muted{ color: rgba(255,255,255,.55); }
.dmSearchInput{
  width: 100%;
  margin-top: 8px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(0,0,0,.20);
  color: rgba(255,255,255,.90);
  padding: 8px 10px;
  outline: none;
}
.dmSearchInput::placeholder{ color: rgba(255,255,255,.40); }
.dmEmpty{
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255,255,255,.50);
  padding: 6px 8px;
}

.chan{
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  color: rgba(255,255,255,.78);
  user-select: none;
  transition: background .12s ease;
  text-align: left;
  margin-bottom: 5px;
}

.chan:hover{ background: rgba(255,255,255,.06); }
.chan.active{ background: rgba(255,255,255,.10); color: rgba(255,255,255,.95); }
.chan.voice.active{ outline: 1px solid rgba(35,165,90,.22); }

.chanGear{
  margin-left:auto;
  font-size: 12px;
  opacity: .65;
  filter: grayscale(.1);
}
.chan:hover .chanGear{ opacity: .95; }

.hash{
  width: 18px; height: 18px;
  border-radius: 6px;
  display: flex; 
  place-items: center;
  background: transparent;
  border: 1px solid rgba(255,255,255,.08);
  font-weight: 900;
  font-size: 12px;
  color: rgba(255,255,255,.72);
  flex: 0 0 auto;
  border: 0;
  font-size: 20px;
}

.label{
  flex: 1;
  min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  font-weight: 650;
  font-size: 13px;
}
.pillCount{
  font-size: 12px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(242,63,67,.16);
  border: 1px solid rgba(242,63,67,.30);
  color: rgba(255,225,225,.95);
}

/* user bottom */
.userCard{
  padding: 10px;
  border-top: 1px solid var(--border);
  background: var(--bg2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.me{ display: flex; align-items: center; gap: 10px; min-width: 0; }

.avatar{
  width: 36px; height: 36px;
  border-radius: 50%/*12px*/;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  position: relative;
  /*overflow: hidden;*/
  flex: 0 0 auto;
}

.avatarImg{ 
  width: 100%; 
  height: 100%; 
  object-fit: cover; 
  display:block;
  border-radius: 50%;
}

.avatarFallback{ width: 100%; height: 100%; }
.statusDot{
  position:absolute;
  bottom:-2px; right:-2px;
  width: 12px; height: 12px;
  border-radius: 50%;
  border: 2px solid var(--bg2);
  box-shadow: 0 0 0 1px rgba(255,255,255,.10);
}
.statusDot.small{ width: 10px; height: 10px; bottom: -2px; right: -2px; }
.statusDot.tiny{ width: 8px; height: 8px; bottom: -2px; right: -2px; }
.statusDot.online{ background: var(--green); }
.statusDot.idle{ background: var(--yellow); }
.statusDot.dnd{ background: var(--red); }
.statusDot.offline{ background: rgba(255,255,255,.30); }

.meTxt{ min-width: 0; }
.meTxt .u{ font-weight: 900; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meTxt .s{ color: var(--muted2); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.since{ color: rgba(255,255,255,.55); font-weight: 800; margin-left: 6px; }
.green{ color: rgba(87,242,135,.95); }

.meBtns{ display:flex; gap:6px; }

.iconBtn{
  width: 34px; height: 34px;
  border-radius: 10px;
  /*border: 1px solid rgba(255,255,255,.08);*/
  /*background: rgba(255,255,255,.06);*/
  background: transparent;
  color: rgba(255, 255, 255, 0.699);
  border: none;
  font-size: 18px;
  display: grid; 
  place-items: center;
  cursor: pointer;
  transition: background .12s ease, border-color .12s ease;
  user-select: none;
  padding: 0;
}

.iconBtn:hover{ background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.12); }

/* chat */
.chat{ display:flex; flex-direction:column; min-width:0; background: var(--bg); flex: 1; }
.chatTop{
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--border);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 10px;
}
.chanTitle{ display:flex; align-items:center; gap:10px; min-width:0; }
.chanTitle .t{ font-weight: 900; white-space:nowrap; }
.topic{
  color: rgba(255,255,255,.50);
  font-size: 12.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: 6px;
  max-width: 55vw;
}

.chatBtns{ 
  display:flex; 
  gap:8px; 
  align-items:center; 
}

.friendsPane{
  padding: 14px;
  overflow: auto;
  min-height: 0;
  flex: 1;
}

.friendsHdr{
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.friendsTitle{ font-size: 16px; font-weight: 950; }
.friendsMeta{ color: rgba(255,255,255,.55); font-size: 12px; }
.friendsList{
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.friendRow{
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.04);
  padding: 8px;
}
.fAvatar{
  width: 42px;
  height: 42px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  position: relative;
  cursor: pointer;
  flex: 0 0 auto;
}
.fAvatar img{ width: 100%; height: 100%; object-fit: cover; display: block; }
.fFallback{ width: 100%; height: 100%; }
.fInfo{ min-width: 0; flex: 1; }
.fName{ font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fMeta{
  margin-top: 2px;
  color: rgba(255,255,255,.58);
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fBtn{
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(88,101,242,.45);
  background: rgba(88,101,242,.20);
  color: rgba(235,238,255,.98);
  cursor: pointer;
  font-weight: 900;
}
.fBtn:hover{ background: rgba(88,101,242,.28); border-color: rgba(88,101,242,.55); }
.friendsEmpty{
  border: 1px dashed rgba(255,255,255,.18);
  background: rgba(255,255,255,.03);
  color: rgba(255,255,255,.72);
  border-radius: 12px;
  padding: 14px;
  font-size: 13px;
}

.msgPane{ padding: 14px; overflow: auto; min-height: 0; flex: 1; }
.pinnedBar{
  display:flex; align-items:center; gap:10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.04);
  margin-bottom: 12px;
}
.pinTxt{ color: rgba(255,255,255,.75); font-weight: 800; }
.pinBtn{
  margin-left:auto;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.85);
  cursor:pointer;
}
.pinBtn:hover{ background: rgba(255,255,255,.10); }

.msg{
  display:flex;
  gap: 12px;
  padding: 10px 10px;
  border-radius: 12px;
  transition: background .12s ease;
  position: relative;
}
.msg:hover{ background: rgba(255,255,255,.04); }

/* opciones mensaje (discord-like) */
.msgOps{
  position:absolute;
  right: 10px;
  top: -10px;
  display:flex;
  gap: 6px;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(35,36,40,.92);
  box-shadow: 0 10px 24px rgba(0,0,0,.28);
  opacity: 0;
  transform: translateY(4px);
  transition: opacity .12s ease, transform .12s ease;
  pointer-events: none;
}
.msg:hover .msgOps{
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
.msgOp{
  width: 30px; height: 30px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.88);
  cursor: pointer;
  display:grid;
  place-items:center;
  padding: 0;
  font-size: 13px;
}
.msgOp:hover{ background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.14); }

.av{
  width: 38px; height: 38px;
  border-radius: 50%/*14px*/;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  position: relative;
  overflow:hidden;
  flex: 0 0 auto;
}

.avImg{ 
  width: 100%; 
  height: 100%; 
  object-fit: cover; 
  display:block; 
}

.avFallback{ width: 100%; height: 100%; }

.body{ min-width:0; }
.head{ display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; }
.userBtn{
  padding: 0; border: 0; background: transparent;
  font-weight: 900; font-size: 13.5px; cursor: pointer;
}
.userBtn:hover{ text-decoration: underline; }

.badge{
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.78);
}
.badge.owner{ border-color: rgba(240,178,50,.35); background: rgba(240,178,50,.16); color: rgba(255,250,210,.95); }
.badge.mod{ border-color: rgba(88,101,242,.35); background: rgba(88,101,242,.18); color: rgba(235,238,255,.98); }
.badge.bot{ border-color: rgba(35,165,90,.30); background: rgba(35,165,90,.14); color: rgba(220,255,236,.95); }

.time{ color: rgba(255,255,255,.45); font-size: 12px; }
.text{ margin-top: 4px; color: rgba(255,255,255,.82); line-height: 1.45; font-size: 13.5px; white-space: pre-wrap; word-wrap: break-word; }

.reactions{ margin-top: 8px; display:flex; gap: 8px; flex-wrap: wrap; }
.react{
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.78);
  cursor:pointer;
}
.react:hover{ background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.14); }
.addReact{ padding: 4px 10px; }

.typing{ display:flex; align-items:center; gap: 10px; padding: 8px 14px; color: rgba(255,255,255,.60); font-size: 12.5px; }
.typing .dot{ width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.55); animation: bounce 0.9s infinite ease-in-out; }
.typing .dot:nth-child(2){ animation-delay: .12s; opacity: .8; }
.typing .dot:nth-child(3){ animation-delay: .24s; opacity: .6; }
@keyframes bounce{ 0%, 80%, 100%{ transform: translateY(0); } 40%{ transform: translateY(-4px); } }

/* ✅ media grid in message */
.mediaGrid{
  margin-top: 10px;
  display:grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  max-width: 520px;
}
.mediaItem{
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.18);
  border-radius: 14px;
  overflow:hidden;
  padding: 0;
  cursor: pointer;
  position: relative;
}
.mediaItem:hover{ border-color: rgba(255,255,255,.16); background: rgba(0,0,0,.22); }
.mediaImg{
  width: 100%;
  height: 180px;
  object-fit: cover;
  display:block;
}
.mediaCorner{
  position:absolute;
  right: 10px;
  bottom: 10px;
  padding: 6px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(35,36,40,.75);
  font-size: 12px;
}

/* ✅ attachment tray */
.attachTray{
  padding: 10px 14px 0;
}
.trayHdr{
  display:flex;
  align-items:center;
  gap: 10px;
  margin-bottom: 8px;
}
.trayTitle{ font-weight: 950; font-size: 12px; color: rgba(255,255,255,.70); letter-spacing: .6px; text-transform: uppercase; }
.trayMeta{ color: rgba(255,255,255,.50); font-size: 12px; }
.trayClear{
  margin-left:auto;
  padding: 7px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.86);
  cursor:pointer;
  font-weight: 900;
}
.trayClear:hover{ background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.14); }
.trayGrid{
  display:grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.trayItem{
  display:flex;
  gap: 10px;
  align-items:center;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.04);
  padding: 8px;
}
.trayThumb{
  width: 54px; height: 54px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.10);
  overflow:hidden;
  background: rgba(0,0,0,.18);
  padding: 0;
  cursor:pointer;
  flex: 0 0 auto;
}
.trayThumb img{ width:100%; height:100%; object-fit: cover; display:block; }
.trayInfo{ min-width:0; }
.trayName{ font-weight: 900; font-size: 12.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width: 220px; }
.traySize{ margin-top: 2px; font-size: 12px; color: rgba(255,255,255,.55); }
.trayX{
  margin-left:auto;
  width: 34px; height: 34px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.86);
  cursor:pointer;
}
.trayX:hover{ background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.14); }

.composer{
  padding: 12px 14px;
  border-top: 1px solid var(--border);
  background: var(--bg);
  display:flex;
  gap: 10px;
  align-items:center;
  position: relative;
}
.composer.over{
  outline: 2px dashed rgba(88,101,242,.55);
  outline-offset: -6px;
}
.fileHidden{ display:none; }

.plus{
  width: 38px; height: 38px;
  border-radius: 12px;
  /*border: 1px solid rgba(255,255,255,.10);*/
  /*background: rgba(255,255,255,.06);*/
  display:grid; 
  place-items:center;
  border: none;
  background-color: transparent;
  cursor:pointer;
  color:white;
  font-size: 20px;
}
.plus:hover{ background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.14); }
.composer input{
  flex: 1;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: var(--panel2);
  color: var(--text);
  padding: 10px 12px;
  outline:none;
}
.send{
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(88,101,242,.45);
  background: rgba(88,101,242,.22);
  color: rgba(235,238,255,.98);
  cursor:pointer;
  font-weight: 900;
}
.send:hover{ background: rgba(88,101,242,.28); border-color: rgba(88,101,242,.55); }

i.bi{
  display:flex
}

/* drop hint overlay */
.dropHint{
  position:absolute;
  inset: 0;
  display:flex;
  align-items:center;
  justify-content:center;
  pointer-events:none;
}
.dropCard{
  border-radius: 16px;
  border: 1px solid rgba(88,101,242,.45);
  background: rgba(88,101,242,.14);
  padding: 14px 16px;
  display:flex;
  align-items:center;
  gap: 10px;
  box-shadow: 0 14px 40px rgba(0,0,0,.45);
}
.dropIcon{ font-size: 18px; }
.dropTxt{ font-weight: 950; }

/* members */
.members{ border-left: 1px solid var(--border); display:flex; flex-direction:column; min-width:0; background: var(--bg2); width: 18rem; }
.members .title{
  padding: 12px 12px 10px;
  border-bottom: 1px solid var(--border);
  display:flex; align-items:center; justify-content:space-between;
}
.members .title .h{ font-weight: 900; font-size: 13.5px; }
.badgeCount{
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.78);
}
.members .list{ padding: 10px; overflow:auto; min-height:0; flex: 1; }
.role{
  margin-top: 10px;
  color: rgba(255,255,255,.55);
  font-size: 11px;
  letter-spacing: 1.1px;
  text-transform: uppercase;
  padding: 8px 8px 6px;
  display:flex;
  justify-content:space-between;
  align-items:center;
}
.member{
  display:flex;
  align-items:center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  user-select:none;
  transition: background .12s ease;
}
.member:hover{ background: rgba(255,255,255,.06); }

.mav{
  width: 30px; height: 30px;
  border-radius: 50%/*12px*/;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  position:relative;
  /*overflow:hidden;*/
  flex:0 0 auto;
}

.mavImg{ 
  width:100%; 
  height:100%; 
  object-fit:cover; 
  display:block; 
  border-radius: 50%;
}

.mavFallback{ width:100%; height:100%; }

.name{
  font-weight: 900;
  font-size: 13px;
  min-width:0;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.miniActivity{
  font-size: 11px;
  color: rgba(255,255,255,.55);
  font-weight: 700;
  margin-top: 2px;
  max-width: 190px;
  display:flex;
  gap: 8px;
  align-items:center;
}
.actLine{
  min-width: 0;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.status{
  margin-left:auto;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.75);
}
.status.online{ border-color: rgba(35,165,90,.30); background: rgba(35,165,90,.14); color: rgba(220,255,236,.95); }
.status.dnd{ border-color: rgba(242,63,67,.30); background: rgba(242,63,67,.14); color: rgba(255,225,225,.95); }
.status.idle{ border-color: rgba(240,178,50,.30); background: rgba(240,178,50,.14); color: rgba(255,250,210,.95); }
.status.offline{ border-color: rgba(255,255,255,.10); background: rgba(255,255,255,.06); color: rgba(255,255,255,.55); }

/* toast */
.toast{
  position: absolute;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.40);
  color: rgba(255,255,255,.90);
  box-shadow: var(--shadow);
  opacity: 0;
  pointer-events: none;
  transition: opacity .18s ease, transform .18s ease;
  font-size: 12.5px;
}
.toast.show{ opacity: 1; transform: translateX(-50%) translateY(-2px); }

/* voice extras */
.voiceWrap { display: flex; flex-direction: column; gap: 6px; }

.voicePill{
  margin-left: auto;
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .6px;
  padding: 2px 8px;
  border-radius: 999px;
  border: none/*1px solid rgba(35,165,90,.30)*/;
  background: transparent/*rgba(35,165,90,.14)*/;
  color: rgba(220,255,236,.95);
}

.voiceMembers{
  display:flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 8px 4px 34px;
}
.voiceMember{
  display:flex;
  align-items:center;
  gap: 8px;
  border: 1px solid transparent;
  background: transparent;
  padding: 6px 8px;
  border-radius: 10px;
  cursor: pointer;
  color: rgba(255,255,255,.82);
  text-align: left;
}
.voiceMember:hover{ background: rgba(255,255,255,.06); }
.vmAvatar{
  width: 22px; height: 22px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.10);
  overflow:hidden;
  position: relative;
  flex: 0 0 auto;
  background: rgba(255,255,255,.06);
}
.vmAvatar img{ width: 100%; height: 100%; object-fit: cover; display:block; }
.vmFallback{ display:block; width:100%; height:100%; }
.vmName{
  font-weight: 800;
  font-size: 12.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}
.vmMeTag{
  margin-left:auto;
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.78);
}

/* voice bar */
.voiceBar{
  border-top: 1px solid var(--border);
  background: rgba(35,165,90,.10);
  padding: 10px;
  display:flex;
  flex-direction: column;
  align-items: start;
  justify-content: space-between;
  gap: 10px;
}

.vbLeft{ 
  display:flex; 
  align-items:center; 
  gap: 10px; 
  min-width:0;
  width: 100%;
  justify-content: space-between;
}

.vbIcon{
  width: 34px; 
  height: 34px;
  border-radius: 12px;
  display: grid; 
  place-items: center;
  border: none/*1px solid rgba(35,165,90,.25)*/;
  background: transparent /*rgba(35,165,90,.12)*/;
  color: #469947;
  font-size: 26px;
}

.vbChan{ 
  font-weight: 900; 
  font-size: 13px; 
  white-space:nowrap; 
  overflow:hidden; 
  text-overflow:ellipsis; 
  color: #469947;

}

.vbMeta{ font-size: 12px; color: rgba(255,255,255,.55); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.vbBtns{ 
  display:flex; 
  gap: 6px;
  width: 100%;
}

.vbBtn{
  width: 34px; height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.85);
  cursor:pointer;
  flex: 1;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.vbBtn:hover{ background: rgba(255,255,255,.10); }
.vbBtn.on{ border-color: rgba(240,178,50,.35); background: rgba(240,178,50,.18); }
.vbBtn.danger{ border-color: rgba(242,63,67,.35); background: rgba(242,63,67,.18); }

/* hover profile tooltip (bootstrap-ish) */
.hoverProfile{
  position: fixed;
  width: 280px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(35,36,40,.95);
  box-shadow: var(--shadow);
  overflow:hidden;
  z-index: 60;
  pointer-events: auto;
}
.hpTop{ height: 54px; opacity: .92; }
.hpBody{ padding: 10px; }
.hpRow{ display:flex; gap: 10px; margin-top: -22px; align-items:center; }

.hpAvBtn{
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  border-radius: 18px;
}
.hpAvBtn:focus{ outline: none; }
.hpAv{
  width: 54px; height: 54px;
  border-radius: 18px;
  border: 3px solid rgba(35,36,40,.95);
  overflow:hidden;
  background: rgba(255,255,255,.06);
  position: relative;
}
.hpAv img{ width:100%; height:100%; object-fit:cover; display:block; }
.hpFallback{ width:100%; height:100%; }

.hpTxt{ min-width:0; }
.hpName{ font-weight: 900; font-size: 14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.hpStatus{ color: rgba(255,255,255,.65); font-size: 12px; margin-top: 2px; }
.hpAct{ margin-top: 10px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.04); border-radius: 12px; padding: 8px; }
.hpActLine{ font-weight: 800; font-size: 12.5px; color: rgba(255,255,255,.86); }
.hpActSince{ margin-top: 6px; font-size: 12px; color: rgba(87,242,135,.95); font-weight: 900; display:flex; align-items:center; gap:8px; }
.greenDot{ width: 8px; height: 8px; border-radius: 50%; background: rgba(87,242,135,.95); box-shadow: 0 0 0 2px rgba(35,165,90,.12); }
.hpHint{ margin-top: 8px; font-size: 11px; color: rgba(255,255,255,.55); font-weight: 700; }

/* big user card modal */
.userCardOverlay{
  position:absolute;
  inset: 0;
  background: rgba(0,0,0,.45);
  display:flex;
  align-items:center;
  justify-content:center;
  z-index: 80;
}
.userCardModal{
  width: 360px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(35,36,40,.95);
  box-shadow: var(--shadow);
  overflow:hidden;
}
.ucBanner{ height: 72px; opacity: .9; }
.ucBody{ padding: 12px; }
.ucTop{ display:flex; align-items:flex-start; justify-content:space-between; margin-top: -28px; }
.ucAvatar{
  width: 72px; height: 72px;
  border-radius: 22px;
  border: 4px solid rgba(35,36,40,.95);
  overflow:hidden;
  background: rgba(255,255,255,.06);
  position: relative;
}
.ucAvatar img{ width:100%; height:100%; object-fit:cover; display:block; }
.ucFallback{ width:100%; height:100%; }
.ucClose{
  width: 34px; height: 34px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.85);
  cursor:pointer;
}
.ucClose:hover{ background: rgba(255,255,255,.10); }
.ucNameRow{ display:flex; align-items:center; gap: 10px; margin-top: 10px; }
.ucName{ font-weight: 900; font-size: 16px; }
.ucRole{
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.78);
}
.ucStatus{ margin-top: 6px; color: rgba(255,255,255,.65); font-size: 12.5px; }
.ucActivity{
  margin-top: 12px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.04);
  border-radius: 14px;
  padding: 10px;
}
.ucActivityTitle{
  font-weight: 900;
  font-size: 12px;
  letter-spacing: .6px;
  text-transform: uppercase;
  color: rgba(255,255,255,.60);
}
.ucActivityLine{ margin-top: 6px; color: rgba(255,255,255,.85); font-size: 13px; font-weight: 800; }
.ucSince{ margin-top: 8px; font-size: 12px; color: rgba(87,242,135,.95); font-weight: 900; display:flex; align-items:center; gap:8px; }
.ucReplies{
  margin-top: 12px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.04);
  border-radius: 14px;
  padding: 10px;
}
.ucReplyList{ margin-top: 8px; display:flex; flex-wrap:wrap; gap: 6px; }
.ucReplyChip{
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.80);
}

.ucActions{ display:flex; gap: 8px; margin-top: 12px; }
.ucBtn{
  flex: 1;
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.90);
  cursor:pointer;
  font-weight: 900;
}
.ucBtn:hover{ background: rgba(255,255,255,.10); }
.ucBtn.danger{ border-color: rgba(242,63,67,.35); background: rgba(242,63,67,.18); }

/* settings (discord-ish) */
.settingsOverlay{
  position:absolute;
  inset: 0;
  background: rgba(0,0,0,.55);
  z-index: 120;
  display:flex;
  align-items:stretch;
  justify-content:center;
}
.settingsShell{
  width: min(1050px, 96vw);
  height: min(720px, 92vh);
  margin: auto;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(35,36,40,.98);
  box-shadow: 0 18px 50px rgba(0,0,0,.55);
  overflow:hidden;
  display:grid;
  grid-template-columns: 280px 1fr;
}
.settingsNav{
  background: rgba(30,31,34,.92);
  border-right: 1px solid rgba(255,255,255,.08);
  padding: 14px 10px;
  display:flex;
  flex-direction: column;
}
.setTitle{
  padding: 8px 10px 10px;
  font-weight: 900;
  font-size: 12px;
  letter-spacing: .6px;
  color: rgba(255,255,255,.60);
  text-transform: uppercase;
}
.setItem{
  width: 100%;
  display:flex;
  align-items:center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(255,255,255,.78);
  cursor:pointer;
  text-align:left;
}
.setItem:hover{ background: rgba(255,255,255,.06); }
.setItem.on{
  background: rgba(255,255,255,.10);
  color: rgba(255,255,255,.95);
  border-color: rgba(255,255,255,.08);
}
.setIcon{ width: 22px; display:grid; place-items:center; }
.setTxt{ font-weight: 850; font-size: 13px; }
.setSep{
  height: 1px;
  background: rgba(255,255,255,.08);
  margin: 12px 10px;
}
.setNavFoot{
  margin-top:auto;
  padding: 10px;
  border-top: 1px solid rgba(255,255,255,.08);
  display:flex;
  flex-direction: column;
  gap: 10px;
}
.setMe{ display:flex; align-items:center; gap: 10px; min-width:0; }
.setMeAv{
  width: 34px; height: 34px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  overflow:hidden;
  background: rgba(255,255,255,.06);
}
.setMeAv img{ width:100%; height:100%; object-fit: cover; display:block; }
.setMeFallback{ display:block; width:100%; height:100%; }
.setMeTxt{ min-width:0; }
.setMeName{ font-weight: 900; font-size: 13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.setMeTag{ color: rgba(255,255,255,.50); font-size: 12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.setLogout{
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid rgba(242,63,67,.35);
  background: rgba(242,63,67,.16);
  color: rgba(255,225,225,.95);
  cursor:pointer;
  font-weight: 900;
}
.setLogout:hover{ background: rgba(242,63,67,.22); border-color: rgba(242,63,67,.45); }

.settingsMain{
  background: rgba(49,51,56,.92);
  display:flex;
  flex-direction: column;
  min-width: 0;
}
.settingsTop{
  padding: 16px 16px 10px;
  border-bottom: 1px solid rgba(255,255,255,.08);
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap: 10px;
}
.settingsHdrTitle{ font-weight: 950; font-size: 16px; }
.settingsHdrSub{ margin-top: 4px; color: rgba(255,255,255,.50); font-size: 12.5px; }
.settingsClose{
  width: 38px; height: 38px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.90);
  cursor:pointer;
}
.settingsClose:hover{ background: rgba(255,255,255,.10); }

.settingsPane{
  padding: 16px;
  overflow:auto;
  min-height: 0;
  flex: 1;
}
.setPanel{ display:flex; flex-direction: column; gap: 14px; }
.setCard{
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.04);
  padding: 12px;
}
.setCardTitle{
  font-weight: 950;
  font-size: 12px;
  letter-spacing: .7px;
  text-transform: uppercase;
  color: rgba(255,255,255,.60);
}
.setRow{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.setProfile{ display:flex; align-items:center; gap: 12px; }
.setProfileAv{
  width: 52px; height: 52px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.10);
  overflow:hidden;
  background: rgba(255,255,255,.06);
}
.setProfileAv img{ width:100%; height:100%; object-fit: cover; display:block; }
.setProfileFallback{ display:block; width:100%; height:100%; }
.setProfileName{ font-weight: 950; font-size: 15px; }
.setProfileMeta{ color: rgba(255,255,255,.55); font-size: 12.5px; margin-top: 2px; }

.setActions{ display:flex; gap: 8px; }
.setBtn{
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(88,101,242,.45);
  background: rgba(88,101,242,.22);
  color: rgba(235,238,255,.98);
  cursor:pointer;
  font-weight: 950;
}
.setBtn:hover{ background: rgba(88,101,242,.28); border-color: rgba(88,101,242,.55); }
.setBtn.ghost{
  border-color: rgba(255,255,255,.12);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.90);
}
.setBtn.ghost:hover{ background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.16); }

.setGrid{
  display:grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 10px;
}
.setField{
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(0,0,0,.18);
  padding: 10px;
}
.setLabel{ color: rgba(255,255,255,.55); font-weight: 850; font-size: 11px; letter-spacing: .6px; text-transform: uppercase; }
.setValue{ margin-top: 6px; font-weight: 900; color: rgba(255,255,255,.90); }

.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

.setHint{
  margin-top: 10px;
  color: rgba(255,255,255,.55);
  font-size: 12.5px;
  line-height: 1.4;
}

.setChips{ display:flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
.chip{
  padding: 9px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.86);
  cursor:pointer;
  font-weight: 900;
}
.chip:hover{ background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.14); }
.chip.on{
  border-color: rgba(88,101,242,.55);
  background: rgba(88,101,242,.22);
  color: rgba(235,238,255,.98);
}

.previewBox{
  margin-top: 10px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(0,0,0,.18);
  padding: 10px;
}
.pvTop{ color: rgba(255,255,255,.60); font-weight: 900; font-size: 12px; }
.pvMsg{ margin-top: 10px; font-size: 12.5px; }
.pvName{ font-weight: 950; color: rgba(235,238,255,.98); }
.pvTime{ color: rgba(255,255,255,.45); margin-left: 6px; }
.pvLine{ margin-top: 6px; color: rgba(255,255,255,.80); font-size: 13px; }

.setRow2{
  display:flex;
  gap: 12px;
  align-items:flex-end;
  margin-top: 10px;
  flex-wrap: wrap;
}
.setSelect{ flex: 1; min-width: 240px; }
.fakeSelect{
  width: 100%;
  margin-top: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(0,0,0,.18);
  color: rgba(255,255,255,.88);
  cursor:pointer;
  text-align:left;
  font-weight: 900;
}
.fakeSelect:hover{ background: rgba(0,0,0,.22); border-color: rgba(255,255,255,.14); }

.toggleRow{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 12px;
  padding: 10px 0;
  border-top: 1px solid rgba(255,255,255,.08);
}
.toggleRow:first-of-type{ border-top: 0; padding-top: 0; }
.toggleName{ font-weight: 950; }
.toggleDesc{ margin-top: 2px; color: rgba(255,255,255,.55); font-size: 12.5px; }
.toggle{
  width: 52px; height: 28px;
  border-radius: 999px;
  border: 1px solid rgba(35,165,90,.35);
  background: rgba(35,165,90,.20);
  cursor:pointer;
  position: relative;
}
.toggle.off{
  border-color: rgba(255,255,255,.14);
  background: rgba(255,255,255,.08);
}
.knob{
  position:absolute;
  top: 3px;
  left: 26px;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: rgba(255,255,255,.92);
  box-shadow: 0 8px 18px rgba(0,0,0,.28);
}
.toggle.off .knob{ left: 4px; background: rgba(255,255,255,.75); }

.aboutRow{
  display:flex;
  align-items:center;
  gap: 10px;
  margin-top: 10px;
}
.aboutBadge{
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid rgba(88,101,242,.35);
  background: rgba(88,101,242,.18);
  font-weight: 950;
}
.aboutName{ font-weight: 950; }
.aboutMeta{ margin-top: 2px; color: rgba(255,255,255,.55); font-size: 12.5px; }

/* ✅ viewer */
.viewerOverlay{
  position:absolute;
  inset: 0;
  background: rgba(0,0,0,.72);
  z-index: 160;
  display:flex;
  align-items:center;
  justify-content:center;
}
.viewerShell{
  width: min(1100px, 96vw);
  height: min(760px, 92vh);
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(35,36,40,.98);
  box-shadow: 0 20px 60px rgba(0,0,0,.60);
  overflow:hidden;
  display:flex;
  flex-direction: column;
}
.viewerTop{
  padding: 12px 12px;
  border-bottom: 1px solid rgba(255,255,255,.08);
  display:flex;
  justify-content:space-between;
  gap: 10px;
  align-items:center;
}
.viewerTitle{ font-weight: 950; }
.viewerMeta{ margin-top: 2px; color: rgba(255,255,255,.50); font-size: 12px; }
.viewerBtns{ display:flex; gap: 8px; align-items:center; }
.vBtn{
  width: 38px; height: 38px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.90);
  cursor:pointer;
  font-weight: 950;
}
.vBtn:hover{ background: rgba(255,255,255,.10); border-color: rgba(255,255,255,.14); }
.vBtn.ghost{ width: 44px; }
.vBtn.danger{
  border-color: rgba(242,63,67,.35);
  background: rgba(242,63,67,.16);
}
.vBtn.danger:hover{ background: rgba(242,63,67,.22); border-color: rgba(242,63,67,.45); }

.viewerStage{
  position: relative;
  flex: 1;
  min-height:0;
  background: radial-gradient(circle at 20% 10%, rgba(88,101,242,.10), transparent 45%),
              radial-gradient(circle at 70% 80%, rgba(35,165,90,.10), transparent 45%),
              rgba(0,0,0,.22);
  display:flex;
  align-items:center;
  justify-content:center;
  overflow:hidden;
}
.viewerCanvas{
  width: 100%;
  height: 100%;
  display:flex;
  align-items:center;
  justify-content:center;
  user-select:none;
}
.viewerImg{
  max-width: 92%;
  max-height: 92%;
  transform-origin: center center;
  transition: transform .04s linear;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.10);
  box-shadow: 0 20px 60px rgba(0,0,0,.45);
}
.vNav{
  position:absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px; height: 88px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(35,36,40,.60);
  color: rgba(255,255,255,.90);
  cursor:pointer;
  font-size: 28px;
  display:grid;
  place-items:center;
}
.vNav:hover{ background: rgba(35,36,40,.78); border-color: rgba(255,255,255,.14); }
.vNav.left{ left: 14px; }
.vNav.right{ right: 14px; }

.viewerFoot{
  padding: 10px 12px;
  border-top: 1px solid rgba(255,255,255,.08);
}
.viewerHint{ color: rgba(255,255,255,.55); font-size: 12.5px; }

@media (max-width: 980px){
  .app{ grid-template-columns: 70px 1fr; }
  .channels, .members{ display:none; }
  .topic{ display:none; }
  .msgOps{ display:none; }
  .settingsShell{ grid-template-columns: 1fr; }
  .settingsNav{ display:none; }
  .mediaGrid{ grid-template-columns: 1fr; max-width: 100%; }
  .mediaImg{ height: 220px; }
  .trayGrid{ grid-template-columns: 1fr; }
  .vNav{ display:none; }
}

.disconnect-btn{
  border: 0;
  background: transparent;
  color: white;
  font-size: 20px;
}

.disconnect-btn i{
  rotate: 135deg;
}

.voiceWrap .chan{
  width: unset !important;
}

</style>
