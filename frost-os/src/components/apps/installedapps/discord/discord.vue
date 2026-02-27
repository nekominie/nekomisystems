<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";

type ServerKey = "F" | "G" | "D" | "M";
type MsgTag = "" | "mod" | "bot";

type Channel = {
  id: string;
  label: string;
  unread?: number;
  topic?: string;
};

type Server = {
  badge: string;
  name: string;
  meta: string;
  channels: Channel[];
};

type Message = {
  id: string;
  user: string;
  tag: MsgTag;
  time: string;
  text: string;
  reactions?: { emoji: string; count: number }[];
};

const servers: Record<ServerKey, Server> = {
  F: {
    badge: "FLK",
    name: "Flaquito Lounge",
    meta: "12 online • 3 en voice",
    channels: [
      { id: "general", label: "general", unread: 3, topic: "Escribe un mensaje, cambia de canal y mira el “unread” moverse 👀" },
      { id: "dev-log", label: "dev-log", unread: 0, topic: "Notas de cambios, commits y caos controlado." },
      { id: "memes", label: "memes", unread: 9, topic: "Memes, bugs y energía de viernes." },
      { id: "bug-tracker", label: "bug-tracker", unread: 0, topic: "Si lo puedes reproducir, lo puedes arreglar 😄" },
    ],
  },
  G: {
    badge: "G",
    name: "Gamers del Averno",
    meta: "8 online • 1 en voice",
    channels: [
      { id: "general", label: "general", unread: 1, topic: "GGs, clips y drama sano." },
      { id: "lfg", label: "lfg", unread: 2, topic: "Busco squad: no tóxicos pls." },
      { id: "patch-notes", label: "patch-notes", unread: 0, topic: "Actualizaciones que nerfean tu diversión." },
    ],
  },
  D: {
    badge: "DD",
    name: "Dev Dungeon",
    meta: "15 online • 0 en voice",
    channels: [
      { id: "general", label: "general", unread: 0, topic: "¿Build roto? Bienvenido." },
      { id: "frontend", label: "frontend", unread: 4, topic: "CSS: amor/odio diario." },
      { id: "backend", label: "backend", unread: 2, topic: "Logs, logs y más logs." },
    ],
  },
  M: {
    badge: "MB",
    name: "Memes & Bugs",
    meta: "20 online • 5 en voice",
    channels: [
      { id: "general", label: "general", unread: 6, topic: "Postea un meme, gana un bug." },
      { id: "cursed-ui", label: "cursed-ui", unread: 7, topic: "UI maldita pero estética." },
      { id: "ship-it", label: "ship-it", unread: 0, topic: "Todo está bien (no lo está)." },
    ],
  },
};

const activeServer = ref<ServerKey>("F");
const activeChan = ref<string>("general");
const chanSearch = ref("");
const msgInput = ref("");

const toastText = ref("✨");
const toastShow = ref(false);
let toastTimer: number | undefined;

const msgPaneRef = ref<HTMLElement | null>(null);

const emojis = ["🔥", "✨", "😂", "🧠", "🧃", "🧯", "🪟", "🧊", "⚡", "🧩", "🚀", "🫠", "💾", "🫶", "👀", "✅"];

function randInt(n: number) {
  return Math.floor(Math.random() * n);
}
function hhmm() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}
function showToast(msg: string) {
  toastText.value = msg;
  toastShow.value = true;
  if (toastTimer) window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toastShow.value = false), 1200);
}

const serverData = computed(() => servers[activeServer.value]);

const filteredChannels = computed(() => {
  const q = chanSearch.value.trim().toLowerCase();
  const ch = serverData.value.channels;
  if (!q) return ch;
  return ch.filter((c) => c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
});

const activeChannelObj = computed(() => {
  const s = serverData.value;
  return s.channels.find((c) => c.id === activeChan.value) ?? s.channels[0];
});

const messages = ref<Message[]>([
  {
    id: crypto.randomUUID(),
    user: "Flaquito",
    tag: "mod",
    time: `hoy a las ${hhmm()}`,
    text: "Bienvenido a la mini-mock de Discord 😄\nCambia de canal, escribe mensajes y verás reacciones random.",
    reactions: [
      { emoji: "🔥", count: 12 },
      { emoji: "✨", count: 7 },
      { emoji: "🧠", count: 3 },
    ],
  },
  {
    id: crypto.randomUUID(),
    user: "BugBot",
    tag: "bot",
    time: `hoy a las ${hhmm()}`,
    text: "Tip: si tu app debe ser opaca, pinta el fondo en el root.\nY evita `:root` dentro de `<style scoped>` 😄",
  },
  {
    id: crypto.randomUUID(),
    user: "MemeLord",
    tag: "",
    time: `hoy a las ${hhmm()}`,
    text: "Cuando el `memScore` sube infinito… pero era el smoothing desde 0 🫠",
    reactions: [
      { emoji: "😂", count: 21 },
      { emoji: "🧃", count: 4 },
      { emoji: "🧯", count: 1 },
    ],
  },
]);

function setServer(k: ServerKey) {
  activeServer.value = k;
  activeChan.value = "general";
  chanSearch.value = "";
  showToast(`🧭 ${servers[k].name}`);
}

function setChannel(id: string) {
  activeChan.value = id;
  showToast(`📌 #${id}`);
}

async function scrollToBottom() {
  await nextTick();
  const el = msgPaneRef.value;
  if (!el) return;
  el.scrollTop = el.scrollHeight;
}

function maybeReactions(): Message["reactions"] | undefined {
  if (Math.random() > 0.6) return undefined;
  const count = 1 + randInt(3);
  const picks = new Set<string>();
  while (picks.size < count) picks.add(emojis[randInt(emojis.length)]);
  return Array.from(picks).map((e) => ({ emoji: e, count: 1 + randInt(12) }));
}

async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  messages.value.push({
    id: crypto.randomUUID(),
    user: "David Z.",
    tag: "",
    time: `hoy a las ${hhmm()}`,
    text,
    reactions: maybeReactions(),
  });

  msgInput.value = "";
  await scrollToBottom();

  // bot reply sometimes
  if (Math.random() < 0.45) {
    const replies = [
      "Anotado ✅",
      "Eso suena a `z-index` peleándose otra vez 😅",
      "¿Ya estás usando `surface.mode = app-solid`? 👀",
      "Plot twist: era el rounding a 0 🫠",
      "Ese bug merece un meme en #memes.",
    ];
    window.setTimeout(async () => {
      messages.value.push({
        id: crypto.randomUUID(),
        user: "BugBot",
        tag: "bot",
        time: `hoy a las ${hhmm()}`,
        text: replies[randInt(replies.length)],
        reactions: maybeReactions(),
      });
      await scrollToBottom();
    }, 420 + randInt(520));
  }
}

function pingRandom() {
  const pings = ["🔔 *Ping!*", "📣 alguien dijo 'deploy'?", "🧨 cuidado con prod", "🧠 CPU: 0ms (mentira)", "💾 memoria: subiendo (falso)"];
  showToast(pings[randInt(pings.length)]);
}

const typing = ref(false);
let typingTimer: number | undefined;

function simulateTyping() {
  typing.value = true;
  if (typingTimer) window.clearTimeout(typingTimer);
  typingTimer = window.setTimeout(() => (typing.value = false), 1200 + randInt(1200));
}

let simTimer: number | undefined;
onMounted(() => {
  scrollToBottom();

  // pequeño “vida”: a veces aparece typing
  simTimer = window.setInterval(() => {
    if (Math.random() < 0.22) simulateTyping();
  }, 1600);
});

onUnmounted(() => {
  if (simTimer) window.clearInterval(simTimer);
  if (typingTimer) window.clearTimeout(typingTimer);
});
</script>

<template>
  <div class="discord-root">
    <div class="app">
      <!-- Servers rail -->
      <aside class="rail">
        <button class="srv" :class="{ active: activeServer === 'F' }" @click="setServer('F')" title="Flaquito Server" type="button">
          <span class="pill"></span>
          <span class="abbr">FLK</span>
          <span class="dot"></span>
        </button>

        <button class="srv" :class="{ active: activeServer === 'G' }" @click="setServer('G')" title="Gamers del Averno" type="button">
          <span class="pill"></span>
          <span class="abbr">G</span>
        </button>

        <button class="srv" :class="{ active: activeServer === 'D' }" @click="setServer('D')" title="Dev Dungeon" type="button">
          <span class="pill"></span>
          <span class="abbr">DD</span>
        </button>

        <button class="srv" :class="{ active: activeServer === 'M' }" @click="setServer('M')" title="Memes & Bugs" type="button">
          <span class="pill"></span>
          <span class="abbr">MB</span>
        </button>

        <button class="srv add" @click="showToast('➕ crear servidor: premium imaginario')" title="Crear servidor" type="button">
          <span class="pill"></span>
          <span class="abbr">+</span>
        </button>

        <div class="rail-foot">mini<br />discord</div>
      </aside>

      <!-- Channels -->
      <aside class="channels">
        <div class="topbar">
          <div class="serverName">
            <div class="serverBadge">{{ serverData.badge }}</div>
            <div class="serverTitle">
              <div class="name">{{ serverData.name }}</div>
              <div class="meta">{{ serverData.meta }}</div>
            </div>
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
              v-for="c in filteredChannels"
              :key="c.id"
              class="chan"
              :class="{ active: c.id === activeChan }"
              @click="setChannel(c.id)"
              type="button"
            >
              <span class="hash">#</span>
              <span class="label">{{ c.label }}</span>
              <span v-if="c.unread" class="pillCount">{{ c.unread }}</span>
            </button>
          </div>

          <div class="section">
            <div class="hdr">
              <span>Voice Channels</span>
              <span class="muted">⋯</span>
            </div>

            <div class="chan voice" @click="showToast('🔊 entrando a voice (falso)')">
              <span class="hash">🔊</span>
              <span class="label">chill room</span>
            </div>
            <div class="chan voice" @click="showToast('🔊 entrando a voice (falso)')">
              <span class="hash">🔊</span>
              <span class="label">standup rápido</span>
            </div>
          </div>
        </div>

        <div class="userCard">
          <div class="me">
            <div class="avatar"></div>
            <div class="meTxt">
              <div class="u">David Z.</div>
              <div class="s">vibing • no molestar</div>
            </div>
          </div>

          <div class="meBtns">
            <button class="iconBtn" type="button" title="Mic" @click="showToast('🎙️ mic: muted (falso)')">
              <svg class="svg mini" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z"></path>
                <path d="M19 11a7 7 0 0 1-14 0"></path>
                <path d="M12 18v3"></path>
                <path d="M8 21h8"></path>
              </svg>
            </button>

            <button class="iconBtn" type="button" title="Headset" @click="showToast('🎧 audio: ok (falso)')">
              <svg class="svg mini" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                <path d="M21 19a2 2 0 0 1-2 2h-1v-6h1a2 2 0 0 1 2 2z"></path>
                <path d="M3 19a2 2 0 0 0 2 2h1v-6H5a2 2 0 0 0-2 2z"></path>
              </svg>
            </button>

            <button class="iconBtn" type="button" title="Settings" @click="showToast('⚙️ settings: próximamente™')">
              <svg class="svg mini" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"></path>
                <path
                  d="M19.4 15a7.9 7.9 0 0 0 .1-2l2-1.5-2-3.5-2.4.9a8 8 0 0 0-1.7-1l-.4-2.5H9l-.4 2.5a8 8 0 0 0-1.7 1L4.5 8l-2 3.5L4.5 13a7.9 7.9 0 0 0 .1 2l-2 1.5 2 3.5 2.4-.9a8 8 0 0 0 1.7 1l.4 2.5h6l.4-2.5a8 8 0 0 0 1.7-1l2.4.9 2-3.5-2-1.5z"
                ></path>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <!-- Chat -->
      <main class="chat">
        <div class="chatTop">
          <div class="chanTitle">
            <div class="hash">#</div>
            <div class="t">{{ activeChan }}</div>
            <div class="topic">{{ activeChannelObj?.topic }}</div>
          </div>

          <div class="chatBtns">
            <button class="iconBtn" type="button" title="Ping random" @click="pingRandom">
              <svg class="svg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2z"></path>
                <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2z"></path>
              </svg>
            </button>

            <button class="iconBtn" type="button" title="Inbox" @click="showToast('📥 inbox: vacío (falso)')">
              <svg class="svg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22 12h-6l-2 3h-4l-2-3H2"></path>
                <path d="M5 7l2-3h10l2 3"></path>
                <path d="M5 7v11h14V7"></path>
              </svg>
            </button>

            <button class="iconBtn" type="button" title="Help" @click="showToast('❓ tip: evita :root en scoped')">
              <svg class="svg" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 18h.01"></path>
                <path d="M12 14a4 4 0 1 0-4-4"></path>
                <path d="M12 14v-1"></path>
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path>
              </svg>
            </button>
          </div>
        </div>

        <div ref="msgPaneRef" class="msgPane" aria-label="Chat messages">
          <div v-for="m in messages" :key="m.id" class="msg">
            <div class="av"></div>

            <div class="body">
              <div class="head">
                <div class="user">{{ m.user }}</div>
                <div v-if="m.tag" class="badge" :class="m.tag">{{ m.tag.toUpperCase() }}</div>
                <div class="time">{{ m.time }}</div>
              </div>

              <div class="text">{{ m.text }}</div>

              <div v-if="m.reactions?.length" class="reactions">
                <div v-for="r in m.reactions" :key="r.emoji" class="react" @click="showToast(`${r.emoji} +1 (falso)`)">
                  {{ r.emoji }} {{ r.count }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="typing" v-if="typing">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          <span class="typingTxt">BugBot está escribiendo…</span>
        </div>

        <div class="composer">
          <button class="plus" type="button" title="Adjuntar (falso)" @click="showToast('📎 adjuntar: próximamente™')">+</button>
          <input
            v-model="msgInput"
            :placeholder="`Enviar mensaje en #${activeChan}`"
            autocomplete="off"
            @keydown.enter.prevent="sendMessage"
          />
          <button class="send" type="button" @click="sendMessage">Enviar</button>
        </div>
      </main>

      <!-- Members -->
      <aside class="members">
        <div class="title">
          <div class="h">Miembros</div>
          <div class="badgeCount">12 online</div>
        </div>

        <div class="list">
          <div class="role">Moderadores <span class="muted">2</span></div>
          <div class="member" @click="showToast('👑 Flaquito')">
            <div class="mav"></div>
            <div class="name">Flaquito</div>
            <div class="status online">online</div>
          </div>
          <div class="member" @click="showToast('🧙 DevWizard')">
            <div class="mav"></div>
            <div class="name">DevWizard</div>
            <div class="status idle">idle</div>
          </div>

          <div class="role">Bots <span class="muted">1</span></div>
          <div class="member" @click="showToast('🤖 BugBot')">
            <div class="mav"></div>
            <div class="name">BugBot</div>
            <div class="status online">online</div>
          </div>

          <div class="role">Usuarios <span class="muted">9</span></div>
          <div
            class="member"
            v-for="n in ['PixelPanda','StackSnacker','CoffeeLoop','CSSGremlin','SplineRider','NullPointer','GradientGoblin','ZIndexWarrior','DockShuffler']"
            :key="n"
            @click="showToast(`👋 ${n}`)"
          >
            <div class="mav"></div>
            <div class="name">{{ n }}</div>
            <div
              class="status"
              :class="n.includes('Gremlin') || n.includes('Warrior') ? 'dnd' : (n.includes('Snacker') || n.includes('Null') ? 'idle' : 'online')"
            >
              {{ n.includes('Gremlin') || n.includes('Warrior') ? 'dnd' : (n.includes('Snacker') || n.includes('Null') ? 'idle' : 'online') }}
            </div>
          </div>
        </div>
      </aside>
    </div>

    <div class="toast" :class="{ show: toastShow }">{{ toastText }}</div>
  </div>
</template>

<style scoped>
/* IMPORTANTE: NO uses :root en scoped. Define variables en el root del componente */
.discord-root{
  /* Paleta “discord-ish” (gris azulado) */
  --bg: #313338;         /* main background */
  --bg2:#2b2d31;         /* side panels */
  --bg3:#1e1f22;         /* rail + deepest */
  --panel:#2b2d31;
  --panel2:#232428;
  --border: rgba(255,255,255,.06);

  --text: rgba(255,255,255,.92);
  --muted: rgba(255,255,255,.62);
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

  /* fondo opaco (para surface.mode = app-solid) */
  background: var(--bg);
}

.app{
  height: 100%;
  display: grid;
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
}
.srv:hover{
  transform: translateY(-1px);
  border-color: rgba(255,255,255,.14);
  background: rgba(255,255,255,.08);
  border-radius: 16px;
}
.srv.active{
  border-color: rgba(88,101,242,.55);
  background: rgba(88,101,242,.20);
  box-shadow: 0 10px 24px rgba(88,101,242,.16);
  border-radius: 16px;
}
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
.abbr{
  font-weight: 900;
  letter-spacing: .3px;
  font-size: 14px;
  color: rgba(255,255,255,.95);
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
.srv.add{
  background: rgba(35,165,90,.10);
  border-color: rgba(35,165,90,.25);
}
.srv.add .abbr{ color: rgba(35,165,90,.95); font-size: 22px; }

.rail-foot{
  margin-top: auto;
  opacity: .6;
  font-size: 11px;
  text-align: center;
  padding: 8px 0;
  color: rgba(255,255,255,.60);
}

/* channels */
.channels{
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--bg2);
}

.topbar{
  padding: 12px 12px 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid var(--border);
  background: var(--bg2);
}

.serverName{ display: flex; align-items: center; gap: 10px; min-width: 0; }
.serverBadge{
  width: 34px; height: 34px;
  border-radius: 12px;
  background: rgba(88,101,242,.20);
  border: 1px solid rgba(88,101,242,.35);
  display: grid; place-items: center;
  font-weight: 900;
  letter-spacing: .5px;
  flex: 0 0 auto;
}
.serverTitle{ display: flex; flex-direction: column; min-width: 0; }
.serverTitle .name{
  font-weight: 800;
  font-size: 13.5px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.serverTitle .meta{
  color: var(--muted2);
  font-size: 12px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.search{ flex: 1; display: flex; justify-content: flex-end; }
.search input{
  width: 100%;
  max-width: 170px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.08);
  background: var(--panel2);
  color: var(--text);
  padding: 8px 10px;
  outline: none;
}
.search input::placeholder{ color: rgba(255,255,255,.35); }

.chanList{
  padding: 10px 10px 12px;
  overflow: auto;
  min-height: 0;
}

.section{ margin-top: 12px; }
.hdr{
  display: flex; align-items: center; justify-content: space-between;
  color: rgba(255,255,255,.55);
  text-transform: uppercase;
  font-size: 11px;
  letter-spacing: 1.1px;
  padding: 8px 8px 6px;
}
.muted{ color: rgba(255,255,255,.55); }

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
  transition: background .12s ease, border-color .12s ease;
  text-align: left;
}
.chan:hover{
  background: rgba(255,255,255,.06);
}
.chan.active{
  background: rgba(255,255,255,.10);
  color: rgba(255,255,255,.95);
}
.chan.voice{ cursor: pointer; opacity: .9; }
.hash{
  width: 18px; height: 18px;
  border-radius: 6px;
  display: grid; place-items: center;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,255,255,.08);
  font-weight: 900;
  font-size: 12px;
  color: rgba(255,255,255,.72);
  flex: 0 0 auto;
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

/* user card */
.userCard{
  margin-top: auto;
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
  width: 34px; height: 34px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(88,101,242,.35), rgba(255,255,255,.06));
  border: 1px solid rgba(255,255,255,.10);
  position: relative;
  flex: 0 0 auto;
}
.avatar::after{
  content:"";
  position:absolute;
  bottom:-2px; right:-2px;
  width: 12px; height: 12px;
  border-radius: 50%;
  background: var(--green);
  border: 2px solid var(--bg2);
  box-shadow: 0 0 0 1px rgba(255,255,255,.10);
}
.meTxt{ min-width: 0; }
.meTxt .u{
  font-weight: 800;
  font-size: 13px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.meTxt .s{
  color: var(--muted2);
  font-size: 12px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.meBtns{ display:flex; gap:6px; }
.iconBtn{
  width: 34px; height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.08);
  background: rgba(255,255,255,.06);
  display: grid; place-items: center;
  cursor: pointer;
  transition: background .12s ease, border-color .12s ease;
  user-select: none;
  padding: 0;
}
.iconBtn:hover{
  background: rgba(255,255,255,.10);
  border-color: rgba(255,255,255,.12);
}

/* chat */
.chat{
  display:flex;
  flex-direction:column;
  min-width:0;
  background: var(--bg);
}
.chatTop{
  padding: 12px 14px 10px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap: 10px;
}
.chanTitle{ display:flex; align-items:center; gap:10px; min-width:0; }
.chanTitle .hash{
  background: rgba(255,255,255,.06);
  border-color: rgba(255,255,255,.08);
  color: rgba(255,255,255,.80);
}
.chanTitle .t{
  font-weight: 900;
  letter-spacing: .2px;
  white-space:nowrap;
}
.topic{
  color: rgba(255,255,255,.50);
  font-size: 12.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-left: 6px;
  max-width: 55vw;
}
.chatBtns{ display:flex; gap:8px; align-items:center; flex:0 0 auto; }

.msgPane{
  padding: 14px;
  overflow: auto;
  min-height: 0;
  flex: 1;
}
.msg{
  display:flex;
  gap: 12px;
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid transparent;
  transition: background .12s ease;
}
.msg:hover{ background: rgba(255,255,255,.04); }
.av{
  width: 38px; height: 38px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  flex: 0 0 auto;
}
.body{ min-width:0; }
.head{ display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; }
.user{ font-weight: 900; font-size: 13.5px; }
.badge{
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.78);
}
.badge.mod{
  border-color: rgba(88,101,242,.35);
  background: rgba(88,101,242,.18);
  color: rgba(235,238,255,.98);
}
.badge.bot{
  border-color: rgba(35,165,90,.30);
  background: rgba(35,165,90,.14);
  color: rgba(220,255,236,.95);
}
.time{ color: rgba(255,255,255,.45); font-size: 12px; }
.text{
  margin-top: 4px;
  color: rgba(255,255,255,.82);
  line-height: 1.45;
  font-size: 13.5px;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.reactions{
  margin-top: 8px;
  display:flex;
  gap: 8px;
  flex-wrap: wrap;
}
.react{
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.78);
  cursor:pointer;
  user-select:none;
  transition: background .12s ease, border-color .12s ease;
}
.react:hover{
  background: rgba(255,255,255,.10);
  border-color: rgba(255,255,255,.14);
}

.typing{
  display:flex;
  align-items:center;
  gap: 10px;
  padding: 8px 14px;
  color: rgba(255,255,255,.60);
  font-size: 12.5px;
}
.typing .dot{
  width: 6px; height: 6px;
  border-radius: 50%;
  background: rgba(255,255,255,.55);
  animation: bounce 0.9s infinite ease-in-out;
}
.typing .dot:nth-child(2){ animation-delay: .12s; opacity: .8; }
.typing .dot:nth-child(3){ animation-delay: .24s; opacity: .6; }
.typingTxt{ margin-left: 2px; }

@keyframes bounce{
  0%, 80%, 100%{ transform: translateY(0); }
  40%{ transform: translateY(-4px); }
}

.composer{
  padding: 12px 14px;
  border-top: 1px solid var(--border);
  background: var(--bg);
  display:flex;
  gap: 10px;
  align-items:center;
}
.plus{
  width: 38px; height: 38px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  display:grid; place-items:center;
  cursor:pointer;
  user-select:none;
  transition: background .12s ease, border-color .12s ease;
  flex: 0 0 auto;
}
.plus:hover{
  background: rgba(255,255,255,.10);
  border-color: rgba(255,255,255,.14);
}
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
  font-weight: 850;
  user-select:none;
  transition: background .12s ease, border-color .12s ease;
  flex: 0 0 auto;
}
.send:hover{
  background: rgba(88,101,242,.28);
  border-color: rgba(88,101,242,.55);
}

/* members */
.members{
  border-left: 1px solid var(--border);
  display:flex;
  flex-direction:column;
  min-width:0;
  background: var(--bg2);
}
.members .title{
  padding: 12px 12px 10px;
  border-bottom: 1px solid var(--border);
  background: var(--bg2);
  display:flex;
  align-items:center;
  justify-content:space-between;
}
.members .title .h{
  font-weight: 900;
  letter-spacing:.2px;
  font-size: 13.5px;
}
.badgeCount{
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.78);
}
.members .list{
  padding: 10px;
  overflow:auto;
  min-height:0;
  flex: 1;
}
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
  border: 1px solid transparent;
  cursor:pointer;
  user-select:none;
  transition: background .12s ease;
}
.member:hover{ background: rgba(255,255,255,.06); }
.mav{
  width: 30px; height: 30px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  flex:0 0 auto;
}
.member .name{
  font-weight: 800;
  font-size: 13px;
  min-width:0;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.status{
  margin-left:auto;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.06);
  color: rgba(255,255,255,.75);
  flex:0 0 auto;
}
.status.online{ border-color: rgba(35,165,90,.30); background: rgba(35,165,90,.14); color: rgba(220,255,236,.95); }
.status.dnd{ border-color: rgba(242,63,67,.30); background: rgba(242,63,67,.14); color: rgba(255,225,225,.95); }
.status.idle{ border-color: rgba(240,178,50,.30); background: rgba(240,178,50,.14); color: rgba(255,250,210,.95); }

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
.toast.show{
  opacity: 1;
  transform: translateX(-50%) translateY(-2px);
}

/* icons */
.svg{
  width: 18px; height: 18px;
  fill: none;
  stroke: rgba(255,255,255,.78);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.svg.mini{ width: 16px; height: 16px; }

@media (max-width: 980px){
  .app{ grid-template-columns: 70px 1fr; }
  .channels, .members{ display:none; }
  .topic{ display:none; }
}
</style>