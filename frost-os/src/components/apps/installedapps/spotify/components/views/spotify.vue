<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { spotifyMockSeed } from "./spotify.mock.data";

type ContextMode = "playlist" | "album" | "artist";
type RightTab = "queue" | "lyrics" | "about";

const data = reactive(spotifyMockSeed);

const libraryQuery = ref("");
const trackQuery = ref("");
const showSettings = ref(false);
const showUserMenu = ref(false);
const rightTab = ref<RightTab>("queue");
const contextMode = ref<ContextMode>("playlist");
const contextId = ref(data.playlists[0]?.id ?? "");

const isPlaying = ref(false);
const isShuffle = ref(false);
const repeatMode = ref<"off" | "context" | "track">("off");
const progress = ref(0);
const volume = ref(72);
const currentTrackId = ref(data.playlists[0]?.trackIds[0] ?? data.tracks[0]?.id ?? "");

const trackById = computed(() => Object.fromEntries(data.tracks.map((t) => [t.id, t])));
const artistById = computed(() => Object.fromEntries(data.artists.map((a) => [a.id, a])));
const albumById = computed(() => Object.fromEntries(data.albums.map((a) => [a.id, a])));

const filteredLibrary = computed(() => {
  const q = libraryQuery.value.trim().toLowerCase();
  if (!q) return data.playlists;
  return data.playlists.filter((p) => `${p.name} ${p.description} ${p.owner}`.toLowerCase().includes(q));
});

const contextTracks = computed(() => {
  if (contextMode.value === "playlist") {
    const pl = data.playlists.find((p) => p.id === contextId.value) ?? data.playlists[0];
    return (pl?.trackIds ?? []).map((id) => trackById.value[id]).filter(Boolean);
  }
  if (contextMode.value === "album") {
    return data.tracks.filter((t) => t.albumId === contextId.value);
  }
  return data.tracks.filter((t) => t.artistId === contextId.value);
});

const filteredTracks = computed(() => {
  const q = trackQuery.value.trim().toLowerCase();
  if (!q) return contextTracks.value;
  return contextTracks.value.filter((t) => {
    const ar = artistById.value[t.artistId];
    const al = albumById.value[t.albumId];
    return `${t.title} ${ar?.name ?? ""} ${al?.title ?? ""}`.toLowerCase().includes(q);
  });
});

const contextTitle = computed(() => {
  if (contextMode.value === "playlist") return data.playlists.find((p) => p.id === contextId.value)?.name ?? "Playlist";
  if (contextMode.value === "album") return albumById.value[contextId.value]?.title ?? "Album";
  return artistById.value[contextId.value]?.name ?? "Artist";
});

const contextSubtitle = computed(() => {
  if (contextMode.value === "playlist") {
    const pl = data.playlists.find((p) => p.id === contextId.value);
    return `${pl?.description ?? ""} - ${pl?.owner ?? "Spotify"}`;
  }
  if (contextMode.value === "album") {
    const al = albumById.value[contextId.value];
    const ar = artistById.value[al?.artistId ?? ""];
    return `${al?.type?.toUpperCase() ?? "ALBUM"} - ${al?.year ?? ""} - ${ar?.name ?? ""}`;
  }
  const ar = artistById.value[contextId.value];
  return `${ar?.monthlyListeners ?? "0"} monthly listeners`;
});

const contextCover = computed(() => {
  if (contextMode.value === "playlist") return data.playlists.find((p) => p.id === contextId.value)?.cover ?? "";
  if (contextMode.value === "album") return albumById.value[contextId.value]?.cover ?? "";
  return artistById.value[contextId.value]?.image ?? "";
});

const contextColor = computed(() => {
  if (contextMode.value === "playlist") return data.playlists.find((p) => p.id === contextId.value)?.color ?? "linear-gradient(145deg,#1f2937,#065f46)";
  if (contextMode.value === "album") return albumById.value[contextId.value]?.color ?? "linear-gradient(145deg,#1f2937,#065f46)";
  return "linear-gradient(145deg,#18181b,#166534)";
});

const currentTrack = computed(() => trackById.value[currentTrackId.value] ?? null);
const currentArtist = computed(() => artistById.value[currentTrack.value?.artistId ?? ""] ?? null);
const isLiked = computed(() => data.library.likedTrackIds.includes(currentTrack.value?.id ?? ""));
const isFollowingCurrentArtist = computed(() => data.library.followedArtistIds.includes(currentArtist.value?.id ?? ""));

const nextQueueTracks = computed(() => data.library.queueTrackIds.map((id) => trackById.value[id]).filter(Boolean));

function formatTime(totalSec: number) {
  const n = Math.max(0, Math.floor(totalSec || 0));
  const m = Math.floor(n / 60);
  const s = String(n % 60).padStart(2, "0");
  return `${m}:${s}`;
}

function playContext(mode: ContextMode, id: string) {
  if (!id) return;
  contextMode.value = mode;
  contextId.value = id;
  const first = contextTracks.value[0];
  if (first) {
    currentTrackId.value = first.id;
    progress.value = 0;
    isPlaying.value = true;
  }
}

function playTrack(trackId: string) {
  currentTrackId.value = trackId;
  progress.value = 0;
  isPlaying.value = true;
}

function toggleLike() {
  const id = currentTrack.value?.id;
  if (!id) return;
  if (data.library.likedTrackIds.includes(id)) {
    data.library.likedTrackIds = data.library.likedTrackIds.filter((x) => x !== id);
  } else {
    data.library.likedTrackIds.push(id);
  }
}

function toggleFollowCurrentArtist() {
  const id = currentArtist.value?.id;
  if (!id) return;
  if (data.library.followedArtistIds.includes(id)) {
    data.library.followedArtistIds = data.library.followedArtistIds.filter((x) => x !== id);
  } else {
    data.library.followedArtistIds.push(id);
  }
}

function nextTrack() {
  if (repeatMode.value === "track" && currentTrack.value) {
    progress.value = 0;
    return;
  }
  if (data.library.queueTrackIds.length) {
    const next = data.library.queueTrackIds.shift() ?? "";
    if (next) {
      data.library.queueTrackIds.push(next);
      currentTrackId.value = next;
      progress.value = 0;
      return;
    }
  }
  const list = contextTracks.value;
  if (!list.length) return;
  const idx = list.findIndex((t) => t.id === currentTrackId.value);
  const nextIdx = isShuffle.value ? Math.floor(Math.random() * list.length) : (idx + 1 + list.length) % list.length;
  currentTrackId.value = list[nextIdx].id;
  progress.value = 0;
}

function prevTrack() {
  if (progress.value > 5) {
    progress.value = 0;
    return;
  }
  const list = contextTracks.value;
  if (!list.length) return;
  const idx = list.findIndex((t) => t.id === currentTrackId.value);
  const prevIdx = (idx - 1 + list.length) % list.length;
  currentTrackId.value = list[prevIdx].id;
  progress.value = 0;
}

function toggleRepeat() {
  if (repeatMode.value === "off") repeatMode.value = "context";
  else if (repeatMode.value === "context") repeatMode.value = "track";
  else repeatMode.value = "off";
}

let timer: number | undefined;
onMounted(() => {
  timer = window.setInterval(() => {
    if (!isPlaying.value || !currentTrack.value) return;
    progress.value += 1;
    if (progress.value >= currentTrack.value.duration) nextTrack();
  }, 1000);
});
onUnmounted(() => {
  if (timer) window.clearInterval(timer);
});
</script>

<template>
  <div class="spotify-app">
    <aside class="left">
      <div class="left-top card">
        <button class="nav-link"><i class="bi bi-house-door-fill"></i> Home</button>
        <button class="nav-link"><i class="bi bi-search"></i> Search</button>
      </div>

      <div class="library card">
        <div class="library-header">
          <button class="nav-link"><i class="bi bi-collection-fill"></i> Your Library</button>
          <div class="library-actions">
            <button><i class="bi bi-plus-lg"></i></button>
            <button><i class="bi bi-arrow-down-up"></i></button>
          </div>
        </div>

        <input v-model="libraryQuery" class="search-input" placeholder="Search in your library" />

        <div class="chips">
          <span>Playlists</span>
          <span>Artists</span>
          <span>Albums</span>
        </div>

        <div class="playlist-list">
          <button
            v-for="pl in filteredLibrary"
            :key="pl.id"
            class="playlist-row"
            :class="{ active: contextMode === 'playlist' && contextId === pl.id }"
            @click="playContext('playlist', pl.id)"
          >
            <img :src="pl.cover" alt="" />
            <div>
              <strong>{{ pl.name }}</strong>
              <small>{{ pl.owner }} - Playlist</small>
            </div>
            <i v-if="pl.pinned" class="bi bi-pin-angle-fill pin"></i>
          </button>
        </div>
      </div>
    </aside>

    <main class="center">
      <header class="topbar">
        <div class="history">
          <button><i class="bi bi-chevron-left"></i></button>
          <button><i class="bi bi-chevron-right"></i></button>
        </div>
        <div class="search-global">
          <i class="bi bi-search"></i>
          <input v-model="trackQuery" placeholder="What do you want to play?" />
        </div>
        <div class="user-zone">
          <button class="upgrade">Explore Premium</button>
          <button class="notify"><i class="bi bi-bell-fill"></i></button>
          <button class="avatar-btn" @click="showUserMenu = !showUserMenu">
            <img :src="data.user.avatar" alt="" />
            <span>{{ data.user.name }}</span>
            <i class="bi bi-caret-down-fill"></i>
          </button>
          <div v-if="showUserMenu" class="user-menu">
            <button><i class="bi bi-person-circle"></i> Profile</button>
            <button><i class="bi bi-lightning-charge-fill"></i> {{ data.user.plan }}</button>
            <button @click="showSettings = !showSettings"><i class="bi bi-gear-fill"></i> Settings</button>
            <button><i class="bi bi-box-arrow-right"></i> Log out</button>
          </div>
        </div>
      </header>

      <section class="hero" :style="{ background: contextColor }">
        <img :src="contextCover" alt="" />
        <div>
          <small>{{ contextMode.toUpperCase() }}</small>
          <h1>{{ contextTitle }}</h1>
          <p>{{ contextSubtitle }}</p>
        </div>
      </section>

      <section class="controls-row">
        <button class="play-big" @click="isPlaying = !isPlaying">
          <i :class="isPlaying ? 'bi bi-pause-fill' : 'bi bi-play-fill'"></i>
        </button>
        <button class="ghost" @click="toggleLike"><i class="bi bi-heart-fill" :class="{ green: isLiked }"></i></button>
        <button class="ghost"><i class="bi bi-three-dots"></i></button>
      </section>
      <section class="track-table">
        <div class="thead">
          <span>#</span>
          <span>Title</span>
          <span>Album</span>
          <span><i class="bi bi-clock"></i></span>
        </div>
        <button
          v-for="(track, idx) in filteredTracks"
          :key="track.id"
          class="tr"
          :class="{ active: currentTrack?.id === track.id }"
          @click="playTrack(track.id)"
        >
          <span>{{ idx + 1 }}</span>
          <span class="title-cell">
            <img :src="track.cover" alt="" />
            <span>
              <strong>{{ track.title }}</strong>
              <small>{{ artistById[track.artistId]?.name }} <i v-if="track.explicit" class="bi bi-explicit-fill"></i></small>
            </span>
          </span>
          <span class="album-link" @click.stop="playContext('album', track.albumId)">
            {{ albumById[track.albumId]?.title }}
          </span>
          <span>{{ formatTime(track.duration) }}</span>
        </button>
      </section>
    </main>

    <aside class="right">
      <div class="right-tabs">
        <button :class="{ active: rightTab === 'queue' }" @click="rightTab = 'queue'">Queue</button>
        <button :class="{ active: rightTab === 'lyrics' }" @click="rightTab = 'lyrics'">Lyrics</button>
        <button :class="{ active: rightTab === 'about' }" @click="rightTab = 'about'">About</button>
      </div>

      <div class="now-card card">
        <img :src="currentTrack?.cover || contextCover" alt="" />
        <h4>{{ currentTrack?.title || "No track selected" }}</h4>
        <p>{{ currentArtist?.name || "Unknown artist" }}</p>
        <button class="follow-btn" @click="toggleFollowCurrentArtist">
          <i class="bi bi-person-plus-fill"></i>
          {{ isFollowingCurrentArtist ? "Following" : "Follow Artist" }}
        </button>
      </div>

      <div v-if="rightTab === 'queue'" class="panel card">
        <h5>Up next</h5>
        <button v-for="track in nextQueueTracks" :key="`q_${track.id}`" class="queue-row" @click="playTrack(track.id)">
          <img :src="track.cover" alt="" />
          <span>
            <strong>{{ track.title }}</strong>
            <small>{{ artistById[track.artistId]?.name }}</small>
          </span>
        </button>
      </div>

      <div v-else-if="rightTab === 'lyrics'" class="panel card">
        <h5>Lyrics</h5>
        <p v-for="line in currentTrack?.lyrics || []" :key="line">{{ line }}</p>
      </div>

      <div v-else class="panel card">
        <h5>{{ currentArtist?.name }}</h5>
        <img class="artist-photo" :src="currentArtist?.image || contextCover" alt="" />
        <p>{{ currentArtist?.bio }}</p>
        <small>{{ currentArtist?.monthlyListeners }} monthly listeners</small>
        <button class="ghost wide" @click="playContext('artist', currentArtist?.id || '')">Open Artist Profile</button>
      </div>
    </aside>

    <footer class="player">
      <div class="player-song">
        <img :src="currentTrack?.cover || contextCover" alt="" />
        <div>
          <strong>{{ currentTrack?.title || "No track" }}</strong>
          <small>{{ currentArtist?.name || "Unknown" }}</small>
        </div>
        <button class="icon" @click="toggleLike"><i class="bi bi-heart-fill" :class="{ green: isLiked }"></i></button>
      </div>

      <div class="player-center">
        <div class="controls-main">
          <button class="icon" :class="{ on: isShuffle }" @click="isShuffle = !isShuffle"><i class="bi bi-shuffle"></i></button>
          <button class="icon" @click="prevTrack"><i class="bi bi-skip-start-fill"></i></button>
          <button class="play-main" @click="isPlaying = !isPlaying"><i :class="isPlaying ? 'bi bi-pause-fill' : 'bi bi-play-fill'"></i></button>
          <button class="icon" @click="nextTrack"><i class="bi bi-skip-end-fill"></i></button>
          <button class="icon" :class="{ on: repeatMode !== 'off' }" @click="toggleRepeat"><i class="bi bi-repeat"></i></button>
        </div>
        <div class="seek">
          <small>{{ formatTime(progress) }}</small>
          <input v-if="currentTrack" v-model.number="progress" type="range" min="0" :max="currentTrack.duration" />
          <small>{{ formatTime(currentTrack?.duration || 0) }}</small>
        </div>
      </div>

      <div class="player-extra">
        <button class="icon"><i class="bi bi-mic-fill"></i></button>
        <button class="icon" @click="rightTab = 'queue'"><i class="bi bi-music-note-list"></i></button>
        <button class="icon"><i class="bi bi-laptop"></i></button>
        <i class="bi bi-volume-up-fill"></i>
        <input v-model.number="volume" type="range" min="0" max="100" />
      </div>
    </footer>

    <section v-if="showSettings" class="settings-modal">
      <div class="settings-panel">
        <header>
          <h3>Settings</h3>
          <button @click="showSettings = false"><i class="bi bi-x-lg"></i></button>
        </header>
        <label><span>Private session</span><input v-model="data.user.settings.privateSession" type="checkbox" /></label>
        <label><span>Allow explicit content</span><input v-model="data.user.settings.explicitFilter" type="checkbox" /></label>
        <label><span>Autoplay similar content</span><input v-model="data.user.settings.autoplay" type="checkbox" /></label>
        <label><span>High quality audio</span><input v-model="data.user.settings.highQualityAudio" type="checkbox" /></label>
        <label><span>Normalize volume</span><input v-model="data.user.settings.normalizeVolume" type="checkbox" /></label>
        <label>
          <span>Crossfade (seconds): {{ data.user.settings.crossfade }}</span>
          <input v-model.number="data.user.settings.crossfade" type="range" min="0" max="12" />
        </label>
      </div>
    </section>
  </div>
</template>

<style scoped>
.spotify-app {
  height: 100%;
  width: 100%;
  background: #000;
  color: #fff;
  display: grid;
  grid-template-columns: 290px 1fr 300px;
  grid-template-rows: 1fr 92px;
  gap: 8px;
  padding: 8px;
  box-sizing: border-box;
}

.card {
  background: #121212;
  border-radius: 10px;
}

.left {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 8px;
  min-height: 0;
}

.left-top, .library {
  padding: 12px;
}

.nav-link {
  width: 100%;
  border: 0;
  background: transparent;
  color: #fff;
  font-weight: 700;
  text-align: left;
  padding: 10px;
  border-radius: 8px;
  cursor: pointer;
}

.nav-link i {
  margin-right: 8px;
}

.nav-link:hover {
  background: #1e1e1e;
}

.library {
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 10px;
}

.library-header {
  display: flex;
  align-items: center;
}

.library-actions {
  margin-left: auto;
}

.library-actions button {
  border: 0;
  background: transparent;
  color: #a3a3a3;
  margin-left: 6px;
  cursor: pointer;
}

.search-input {
  border: 1px solid #2d2d2d;
  background: #1a1a1a;
  color: #fff;
  border-radius: 8px;
  padding: 8px 10px;
}

.chips span {
  display: inline-block;
  background: #2a2a2a;
  color: #d3d3d3;
  padding: 5px 9px;
  border-radius: 999px;
  margin-right: 6px;
  font-size: 12px;
}

.playlist-list {
  overflow: auto;
}

.playlist-row {
  width: 100%;
  border: 0;
  background: transparent;
  color: #fff;
  display: grid;
  grid-template-columns: 46px 1fr auto;
  gap: 10px;
  align-items: center;
  text-align: left;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
}

.playlist-row img {
  width: 46px;
  height: 46px;
  object-fit: cover;
  border-radius: 6px;
}

.playlist-row strong,
.playlist-row small {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-row small {
  color: #b3b3b3;
}

.playlist-row.active,
.playlist-row:hover {
  background: #1d1d1d;
}

.pin {
  color: #1ed760;
}

.center {
  background: linear-gradient(#1a1a1a, #121212 28%);
  border-radius: 10px;
  overflow: auto;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgba(15, 15, 15, 0.86);
  backdrop-filter: blur(6px);
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 12px;
  padding: 12px 18px;
  align-items: center;
}

.history button,
.notify {
  border: 0;
  background: #0a0a0a;
  color: #fff;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  margin-right: 6px;
}

.search-global {
  background: #fff;
  border-radius: 999px;
  color: #111;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  max-width: 480px;
}

.search-global input {
  border: 0;
  outline: 0;
  width: 100%;
  height: 36px;
}

.user-zone {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.upgrade {
  border: 0;
  background: #fff;
  color: #000;
  padding: 7px 13px;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
}

.avatar-btn {
  border: 0;
  background: #000;
  color: #fff;
  border-radius: 999px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 12px 3px 4px;
  cursor: pointer;
}

.avatar-btn img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.user-menu {
  position: absolute;
  right: 0;
  top: 44px;
  width: 210px;
  background: #282828;
  border-radius: 8px;
  padding: 6px;
}

.user-menu button {
  width: 100%;
  border: 0;
  background: transparent;
  color: #fff;
  text-align: left;
  border-radius: 6px;
  padding: 9px 10px;
  cursor: pointer;
}

.user-menu button:hover {
  background: #3e3e3e;
}

.hero {
  margin: 10px;
  border-radius: 12px;
  min-height: 200px;
  display: grid;
  grid-template-columns: 180px 1fr;
  gap: 16px;
  align-items: end;
  padding: 18px;
}

.hero img {
  width: 180px;
  height: 180px;
  object-fit: cover;
  border-radius: 8px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}

.hero small {
  font-weight: 700;
}

.hero h1 {
  margin: 6px 0;
  font-size: 42px;
  line-height: 1.04;
}

.hero p {
  color: #d1d5db;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 20px 12px;
}

.play-big {
  border: 0;
  background: #1ed760;
  color: #000;
  width: 55px;
  height: 55px;
  border-radius: 50%;
  font-size: 28px;
  cursor: pointer;
}

.ghost {
  border: 0;
  background: transparent;
  color: #b3b3b3;
  cursor: pointer;
}

.ghost i {
  font-size: 24px;
}

.green {
  color: #1ed760;
}

.track-table {
  padding: 0 20px 30px;
}

.thead, .tr {
  display: grid;
  grid-template-columns: 40px 1.4fr 1fr 80px;
  align-items: center;
  gap: 10px;
}

.thead {
  color: #a3a3a3;
  border-bottom: 1px solid #2b2b2b;
  padding: 0 0 10px;
  font-size: 13px;
}

.tr {
  width: 100%;
  border: 0;
  background: transparent;
  color: #fff;
  text-align: left;
  border-radius: 6px;
  padding: 8px 0;
  cursor: pointer;
}

.tr:hover,
.tr.active {
  background: #1d1d1d;
}

.title-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-cell img {
  width: 42px;
  height: 42px;
  border-radius: 4px;
  object-fit: cover;
}

.title-cell strong,
.title-cell small {
  display: block;
}

.title-cell small {
  color: #9ca3af;
}

.album-link {
  color: #c7c7c7;
}

.album-link:hover {
  text-decoration: underline;
}

.right {
  background: #121212;
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.right-tabs button {
  border: 0;
  background: transparent;
  color: #a3a3a3;
  margin-right: 8px;
  cursor: pointer;
}

.right-tabs button.active {
  color: #fff;
  font-weight: 700;
}

.now-card,
.panel {
  padding: 12px;
}

.now-card img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 8px;
}

.follow-btn {
  border: 1px solid #3f3f3f;
  background: transparent;
  color: #fff;
  border-radius: 999px;
  padding: 7px 10px;
  cursor: pointer;
}

.panel {
  overflow: auto;
}

.queue-row {
  width: 100%;
  border: 0;
  background: transparent;
  color: #fff;
  display: grid;
  grid-template-columns: 46px 1fr;
  gap: 10px;
  text-align: left;
  align-items: center;
  padding: 7px 0;
  cursor: pointer;
}

.queue-row img {
  width: 46px;
  height: 46px;
  border-radius: 6px;
  object-fit: cover;
}

.queue-row small {
  color: #a3a3a3;
}

.artist-photo {
  width: 100%;
  border-radius: 8px;
  margin-bottom: 8px;
}

.wide {
  width: 100%;
  text-align: center;
  margin-top: 8px;
}

.player {
  grid-column: 1 / 4;
  background: #000;
  border-top: 1px solid #1e1e1e;
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  align-items: center;
  padding: 8px 16px;
  gap: 14px;
}

.player-song {
  display: flex;
  align-items: center;
  gap: 10px;
}

.player-song img {
  width: 56px;
  height: 56px;
  border-radius: 6px;
  object-fit: cover;
}

.player-song small {
  color: #9ca3af;
}

.controls-main {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}

.icon {
  border: 0;
  background: transparent;
  color: #bdbdbd;
  cursor: pointer;
}

.icon.on {
  color: #1ed760;
}

.play-main {
  border: 0;
  background: #fff;
  color: #000;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  cursor: pointer;
}

.seek {
  display: grid;
  grid-template-columns: 36px 1fr 36px;
  align-items: center;
  gap: 8px;
}

.seek small {
  color: #9ca3af;
  font-size: 11px;
}

input[type="range"] {
  width: 100%;
  accent-color: #fff;
}

.player-extra {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 9px;
}

.settings-modal {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: grid;
  place-items: center;
}

.settings-panel {
  width: min(460px, 90vw);
  background: #222;
  border-radius: 12px;
  padding: 16px;
}

.settings-panel header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.settings-panel header h3 {
  margin: 0;
}

.settings-panel header button {
  margin-left: auto;
}

.settings-panel label {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
}

@media (max-width: 1280px) {
  .spotify-app {
    grid-template-columns: 250px 1fr;
  }
  .right {
    display: none;
  }
  .player {
    grid-column: 1 / 3;
  }
}

@media (max-width: 880px) {
  .spotify-app {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr 98px;
    padding: 4px;
  }
  .left {
    display: none;
  }
  .player {
    grid-column: 1 / 2;
  }
  .hero {
    grid-template-columns: 1fr;
  }
  .hero img {
    width: 130px;
    height: 130px;
  }
  .hero h1 {
    font-size: 30px;
  }
  .topbar {
    grid-template-columns: 1fr;
  }
  .player {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .player-song,
  .player-extra {
    justify-content: center;
  }
}
</style>
