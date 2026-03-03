export type SpotifyArtist = {
  id: string;
  name: string;
  image: string;
  monthlyListeners: string;
  bio: string;
  verified: boolean;
};

export type SpotifyAlbum = {
  id: string;
  title: string;
  artistId: string;
  year: number;
  cover: string;
  color: string;
  type: "album" | "ep" | "single";
};

export type SpotifyTrack = {
  id: string;
  title: string;
  artistId: string;
  albumId: string;
  duration: number;
  cover: string;
  explicit: boolean;
  popularity: number;
  lyrics: string[];
};

export type SpotifyPlaylist = {
  id: string;
  name: string;
  description: string;
  owner: string;
  cover: string;
  color: string;
  trackIds: string[];
  pinned?: boolean;
};

export type LoggedUser = {
  id: string;
  name: string;
  avatar: string;
  plan: "Free" | "Premium";
  country: string;
  settings: {
    privateSession: boolean;
    explicitFilter: boolean;
    autoplay: boolean;
    highQualityAudio: boolean;
    crossfade: number;
    normalizeVolume: boolean;
  };
};

export type SpotifyMockSeed = {
  user: LoggedUser;
  artists: SpotifyArtist[];
  albums: SpotifyAlbum[];
  tracks: SpotifyTrack[];
  playlists: SpotifyPlaylist[];
  library: {
    likedTrackIds: string[];
    followedArtistIds: string[];
    queueTrackIds: string[];
    recentTrackIds: string[];
  };
};

export const spotifyMockSeed: SpotifyMockSeed = {
  user: {
    id: "u-nekomi",
    name: "nekominie",
    avatar: "https://images.unsplash.com/photo-1542204625-de293a6b417c?auto=format&fit=crop&w=120&q=80",
    plan: "Premium",
    country: "MX",
    settings: {
      privateSession: false,
      explicitFilter: true,
      autoplay: true,
      highQualityAudio: true,
      crossfade: 6,
      normalizeVolume: true,
    },
  },
  artists: [
    {
      id: "a-neon",
      name: "Neon Harbor",
      image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=500&q=80",
      monthlyListeners: "12,405,223",
      bio: "Synth pop with chrome sunsets and tape hiss textures.",
      verified: true,
    },
    {
      id: "a-moon",
      name: "Moon Echo",
      image: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=500&q=80",
      monthlyListeners: "4,982,011",
      bio: "Dream pop duo blending soft guitars and neon drums.",
      verified: true,
    },
    {
      id: "a-kilo",
      name: "Kilo Hertz",
      image: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=500&q=80",
      monthlyListeners: "2,775,333",
      bio: "Lo-fi and focus beats for long coding sessions.",
      verified: false,
    },
  ],
  albums: [
    {
      id: "al-night",
      title: "Night Drive Protocol",
      artistId: "a-neon",
      year: 2025,
      cover: "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=600&q=80",
      color: "linear-gradient(140deg, #6d28d9 0%, #db2777 100%)",
      type: "album",
    },
    {
      id: "al-luna",
      title: "Luna Fragments",
      artistId: "a-moon",
      year: 2024,
      cover: "https://images.unsplash.com/photo-1458560871784-56d23406c091?auto=format&fit=crop&w=600&q=80",
      color: "linear-gradient(140deg, #2563eb 0%, #0f766e 100%)",
      type: "ep",
    },
    {
      id: "al-focus",
      title: "Focus Frames",
      artistId: "a-kilo",
      year: 2026,
      cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=600&q=80",
      color: "linear-gradient(140deg, #0f766e 0%, #059669 100%)",
      type: "album",
    },
  ],
  tracks: [
    {
      id: "t1",
      title: "Turbo Sunset",
      artistId: "a-neon",
      albumId: "al-night",
      duration: 206,
      cover: "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=320&q=80",
      explicit: false,
      popularity: 89,
      lyrics: [
        "Engine glow, skyline breathing.",
        "Mirrors bloom in ultraviolet.",
        "We run red lights like a memory.",
        "Hands up, no brakes tonight.",
      ],
    },
    {
      id: "t2",
      title: "Static Highway",
      artistId: "a-neon",
      albumId: "al-night",
      duration: 201,
      cover: "https://images.unsplash.com/photo-1470229538611-16ba8c7ffbd7?auto=format&fit=crop&w=320&q=80",
      explicit: false,
      popularity: 83,
      lyrics: [
        "Concrete pulse under our feet.",
        "Radio ghosts sing in repeat.",
        "Running circles through the heat.",
        "Static signs but your voice is clear.",
      ],
    },
    {
      id: "t3",
      title: "Falling Pixels",
      artistId: "a-moon",
      albumId: "al-luna",
      duration: 187,
      cover: "https://images.unsplash.com/photo-1458560871784-56d23406c091?auto=format&fit=crop&w=320&q=80",
      explicit: false,
      popularity: 75,
      lyrics: [
        "Glitching stars across your room.",
        "Every frame is me and you.",
        "Softly landing out of view.",
        "Falling pixels into blue.",
      ],
    },
    {
      id: "t4",
      title: "Runaway Bloom",
      artistId: "a-moon",
      albumId: "al-luna",
      duration: 236,
      cover: "https://images.unsplash.com/photo-1458560871784-56d23406c091?auto=format&fit=crop&w=320&q=80",
      explicit: true,
      popularity: 79,
      lyrics: [
        "Black coffee and silver rain.",
        "Petals caught in passing trains.",
        "City lights know all our names.",
        "We bloom wild, we fade the same.",
      ],
    },
    {
      id: "t5",
      title: "Silent Sprint",
      artistId: "a-kilo",
      albumId: "al-focus",
      duration: 194,
      cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=320&q=80",
      explicit: false,
      popularity: 68,
      lyrics: [
        "Keys click soft and steady.",
        "Tabs align, mind gets ready.",
        "Shallow breath, deep rhythm.",
        "Move quiet, move heavy.",
      ],
    },
    {
      id: "t6",
      title: "Night Shift",
      artistId: "a-kilo",
      albumId: "al-focus",
      duration: 215,
      cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=320&q=80",
      explicit: false,
      popularity: 70,
      lyrics: [
        "Street lamps hum in 4/4 time.",
        "Terminal green, midnight rhyme.",
        "Deadline fading into dawn.",
        "Night shift keeps us moving on.",
      ],
    },
  ],
  playlists: [
    {
      id: "p-discover",
      name: "Discover Weekly",
      description: "Your weekly mixtape of fresh finds.",
      owner: "Spotify",
      cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=500&q=80",
      color: "linear-gradient(145deg, #1f2937 0%, #16a34a 100%)",
      trackIds: ["t2", "t3", "t6", "t1"],
      pinned: true,
    },
    {
      id: "p-cyber",
      name: "Cyber Runner",
      description: "Fast synth and electric momentum.",
      owner: "nekominie",
      cover: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=500&q=80",
      color: "linear-gradient(145deg, #312e81 0%, #db2777 100%)",
      trackIds: ["t1", "t2", "t4"],
      pinned: true,
    },
    {
      id: "p-focus",
      name: "Debug Session",
      description: "No vocals, all concentration.",
      owner: "nekominie",
      cover: "https://images.unsplash.com/photo-1454923634634-bd1614719a7b?auto=format&fit=crop&w=500&q=80",
      color: "linear-gradient(145deg, #064e3b 0%, #0ea5e9 100%)",
      trackIds: ["t5", "t6", "t3"],
    },
  ],
  library: {
    likedTrackIds: ["t1", "t3"],
    followedArtistIds: ["a-neon", "a-moon"],
    queueTrackIds: ["t4", "t5", "t2", "t6"],
    recentTrackIds: ["t6", "t1", "t3", "t2"],
  },
};
