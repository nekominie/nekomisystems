/**
 * Diccionario de iconos vectoriales SVG detallados para armas, arrojadizos y estado del jugador.
 * Diseñados con estética táctica/militar para slots de HUD flotantes.
 */

export const HUD_ICONS: Record<string, string> = {
  // --- Cuerpo a Cuerpo ---
  baseball_bat: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <defs>
        <linearGradient id="batWood" x1="12" y1="52" x2="56" y2="12" gradientUnits="userSpaceOnUse">
          <stop stop-color="#92400e"/><stop offset="0.45" stop-color="#d97706"/><stop offset="1" stop-color="#fbbf24"/>
        </linearGradient>
      </defs>
      <ellipse cx="13" cy="53" rx="4" ry="3.2" fill="#451a03" stroke="#78350f" stroke-width="1"/>
      <path d="M14 51 L22 43" stroke="#78350f" stroke-width="5" stroke-linecap="round"/>
      <path d="M14 51 L22 43" stroke="#a16207" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M20 44 C28 34 40 20 54 12 C58 16 56 24 48 30 C40 38 28 46 22 48 Z" fill="url(#batWood)" stroke="#78350f" stroke-width="1.4"/>
      <path d="M24 42 C32 34 42 22 52 15" stroke="#fde68a" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
      <path d="M18 48 L20 46" stroke="#f59e0b" stroke-width="1" opacity="0.5"/>
      <circle cx="52" cy="14" r="1.5" fill="#fef3c7" opacity="0.8"/>
    </svg>
  `,

  pipe_wrench: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M14 50L36 28L40 32L18 54L14 50Z" fill="#dc2626" stroke="#991b1b" stroke-width="1.5"/>
      <path d="M34 26L44 16L48 20L38 30L34 26Z" fill="#64748b" stroke="#334155" stroke-width="1.5"/>
      <path d="M42 14L46 10L56 20L52 24L42 14Z" fill="#94a3b8" stroke="#475569" stroke-width="1.5"/>
      <circle cx="16" cy="52" r="2.5" fill="#1e293b"/>
    </svg>
  `,

  fire_axe: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <line x1="14" y1="52" x2="44" y2="22" stroke="#d97706" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M38 16L48 10C52 14 52 22 46 28L40 22L42 14L38 16Z" fill="#ef4444" stroke="#991b1b" stroke-width="1.5"/>
      <path d="M48 10L50 8L52 10L50 12L48 10Z" fill="#f87171"/>
      <path d="M36 26L32 30L30 28L34 24L36 26Z" fill="#334155"/>
    </svg>
  `,

  katana: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M12 52L20 44" stroke="#1e293b" stroke-width="4.5" stroke-linecap="round"/>
      <circle cx="21" cy="43" r="3" fill="#f59e0b" stroke="#78350f" stroke-width="1"/>
      <path d="M22 42C30 32 40 20 54 10C50 14 36 30 24 44" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.5"/>
      <path d="M54 10L52 14L50 13L54 10Z" fill="#f8fafc"/>
    </svg>
  `,

  combat_knife: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M14 50L24 40L27 43L17 53L14 50Z" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="23" y="37" width="8" height="3" transform="rotate(-45 23 37)" fill="#475569"/>
      <path d="M26 38L48 16C50 18 52 24 42 32L30 42L26 38Z" fill="#cbd5e1" stroke="#64748b" stroke-width="1.5"/>
      <line x1="32" y1="32" x2="44" y2="20" stroke="#f1f5f9" stroke-width="1"/>
    </svg>
  `,

  // --- Pistolas ---
  pistol_9mm: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <defs>
        <linearGradient id="p9slide" x1="18" y1="22" x2="50" y2="30" gradientUnits="userSpaceOnUse">
          <stop stop-color="#475569"/><stop offset="1" stop-color="#1e293b"/>
        </linearGradient>
      </defs>
      <rect x="16" y="21" width="32" height="11" rx="1.5" fill="url(#p9slide)" stroke="#0f172a" stroke-width="1.4"/>
      <rect x="18" y="23" width="26" height="2" fill="#64748b" opacity="0.5"/>
      <rect x="46" y="23" width="10" height="6" rx="0.5" fill="#334155" stroke="#0f172a" stroke-width="1"/>
      <path d="M21 32 L18 46 C17.2 49.5 24.5 50.5 25.5 47 L28 32 Z" fill="#1e293b" stroke="#020617" stroke-width="1.3"/>
      <path d="M22 36 H26 M22 40 H25.5" stroke="#475569" stroke-width="1"/>
      <path d="M28 34 C31.5 34 33 37.5 30.5 39 H28" stroke="#94a3b8" stroke-width="1.4" fill="none"/>
      <rect x="20" y="19" width="3" height="2.5" fill="#94a3b8"/>
      <rect x="48" y="19" width="2.5" height="2.5" fill="#cbd5e1"/>
      <circle cx="24" cy="27" r="1.2" fill="#0f172a"/>
    </svg>
  `,

  revolver_357: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <rect x="30" y="23" width="24" height="6" fill="#475569" stroke="#1e293b" stroke-width="1.5"/>
      <circle cx="28" cy="27" r="6" fill="#334155" stroke="#1e293b" stroke-width="1.5"/>
      <path d="M22 28L18 43C17 47 23 48 24 45L26 31" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
      <path d="M26 33C29 33 29 37 27 38" stroke="#94a3b8" stroke-width="1.5"/>
      <rect x="52" y="21" width="2" height="2" fill="#cbd5e1"/>
    </svg>
  `,

  pistol_suppressed: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <rect x="16" y="24" width="24" height="8" rx="1" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="40" y="25" width="16" height="6" rx="2" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <path d="M19 32L17 44C16.5 47 22 48 23 45L25 32H19Z" fill="#0f172a" stroke="#000000" stroke-width="1.5"/>
      <path d="M25 35C28 35 29 38 27 39H25" stroke="#475569" stroke-width="1.5"/>
    </svg>
  `,

  pistol_desert: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <rect x="18" y="20" width="32" height="11" rx="1.5" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
      <path d="M23 31L20 46C19.5 49 26 50 27 47L29 31H23Z" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
      <line x1="24" y1="23" x2="46" y2="23" stroke="#94a3b8" stroke-width="1.5"/>
      <rect x="46" y="18" width="3" height="3" fill="#64748b"/>
    </svg>
  `,

  // --- Subfusiles ---
  smg_mac10: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <rect x="22" y="22" width="26" height="12" fill="#334155" stroke="#1e293b" stroke-width="1.5"/>
      <rect x="48" y="26" width="6" height="4" fill="#64748b"/>
      <rect x="30" y="34" width="7" height="18" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
      <path d="M18 28L14 34L18 36" stroke="#475569" stroke-width="2" fill="none"/>
    </svg>
  `,

  smg_p90: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M12 36C12 30 18 24 26 24H48C52 24 54 28 50 32L46 36C44 42 36 46 30 46H20C14 46 12 42 12 36Z" fill="#334155" stroke="#1e293b" stroke-width="1.5"/>
      <rect x="24" y="22" width="22" height="4" fill="#0ea5e9" opacity="0.6"/>
      <circle cx="26" cy="36" r="4" fill="#0f172a"/>
      <circle cx="38" cy="38" r="3" fill="#0f172a"/>
      <rect x="50" y="30" width="6" height="3" fill="#64748b"/>
    </svg>
  `,

  smg_tommy: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <rect x="20" y="24" width="34" height="7" fill="#334155" stroke="#1e293b" stroke-width="1.5"/>
      <circle cx="32" cy="35" r="6" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
      <path d="M20 31L12 40L14 44L22 33Z" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
      <path d="M40 31L42 37L44 37L43 31Z" fill="#78350f"/>
    </svg>
  `,

  // --- Escopetas ---
  pump_shotgun: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M10 33L18 30L26 30L26 35L18 36L10 33Z" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
      <rect x="26" y="28" width="28" height="5" fill="#334155" stroke="#1e293b" stroke-width="1.5"/>
      <rect x="36" y="33" width="9" height="3" fill="#64748b" stroke="#1e293b" stroke-width="1"/>
      <line x1="26" y1="30" x2="54" y2="30" stroke="#0f172a" stroke-width="1"/>
    </svg>
  `,

  shotgun_double: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M10 33L18 29L24 29L24 35L18 37L10 33Z" fill="#92400e" stroke="#451a03" stroke-width="1.5"/>
      <rect x="24" y="27" width="30" height="3.5" fill="#475569" stroke="#1e293b" stroke-width="1.2"/>
      <rect x="24" y="30.5" width="30" height="3.5" fill="#334155" stroke="#1e293b" stroke-width="1.2"/>
    </svg>
  `,

  shotgun_spas: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <rect x="22" y="27" width="32" height="7" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
      <path d="M14 27L22 27L22 34L17 44L14 43L18 34L14 27Z" fill="#334155" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="34" y="32" width="10" height="4" fill="#475569"/>
      <line x1="22" y1="24" x2="38" y2="24" stroke="#64748b" stroke-width="2"/>
    </svg>
  `,

  shotgun_sawed: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M16 35L22 30L26 30L26 36L20 40L16 35Z" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
      <rect x="26" y="29" width="18" height="6" fill="#475569" stroke="#1e293b" stroke-width="1.5"/>
    </svg>
  `,

  // --- Rifles de Asalto ---
  assault_rifle: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M10 34 L18 29 H24 V36 L18 39 Z" fill="#1e293b" stroke="#020617" stroke-width="1.2"/>
      <rect x="22" y="27" width="26" height="7" rx="0.5" fill="#334155" stroke="#0f172a" stroke-width="1.3"/>
      <rect x="24" y="28.5" width="20" height="1.5" fill="#64748b" opacity="0.45"/>
      <rect x="48" y="28" width="10" height="4" fill="#475569" stroke="#1e293b" stroke-width="1"/>
      <rect x="56" y="27" width="3" height="6" fill="#1e293b"/>
      <path d="M30 34 L32 48 H27 L26 34 Z" fill="#0f172a" stroke="#000" stroke-width="1"/>
      <path d="M22 34 L19 43 H23 L24 34 Z" fill="#1e293b"/>
      <path d="M34 34 L36 40 H33 L32 34 Z" fill="#334155"/>
      <line x1="26" y1="24" x2="40" y2="24" stroke="#64748b" stroke-width="2" stroke-linecap="round"/>
      <rect x="28" y="22" width="8" height="2.5" rx="0.5" fill="#1e293b" stroke="#475569" stroke-width="0.8"/>
      <circle cx="50" cy="30" r="1" fill="#94a3b8"/>
    </svg>
  `,

  rifle_scar: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M12 32L18 29L24 29L24 36L18 38L12 32Z" fill="#b45309" stroke="#78350f" stroke-width="1.5"/>
      <rect x="24" y="27" width="22" height="7" fill="#d97706" stroke="#92400e" stroke-width="1.5"/>
      <rect x="46" y="29" width="10" height="3.5" fill="#1e293b"/>
      <path d="M30 34L31 46L27 46L27 34" fill="#1e293b"/>
    </svg>
  `,

  rifle_burst: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <rect x="20" y="27" width="26" height="6.5" fill="#334155" stroke="#1e293b" stroke-width="1.5"/>
      <rect x="46" y="28.5" width="8" height="3" fill="#475569"/>
      <path d="M29 33.5L30 45L26 45L25 33.5" fill="#0f172a"/>
      <line x1="12" y1="34" x2="20" y2="30" stroke="#64748b" stroke-width="2.5"/>
    </svg>
  `,

  rifle_carbine: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <rect x="22" y="27" width="24" height="6" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="46" y="28.5" width="10" height="3" fill="#475569"/>
      <path d="M14 34L22 30V34L17 40H14L16 34Z" fill="#334155"/>
      <path d="M30 33L31 44L28 44L27 33" fill="#475569"/>
    </svg>
  `,

  // --- Rifles de Francotirador ---
  hunting_rifle: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M10 33L18 29L26 29L26 34L18 36L10 33Z" fill="#78350f" stroke="#451a03" stroke-width="1.5"/>
      <rect x="26" y="28" width="30" height="3.5" fill="#475569" stroke="#1e293b" stroke-width="1.2"/>
      <rect x="28" y="23" width="12" height="3.5" rx="1" fill="#1e293b" stroke="#0f172a" stroke-width="1"/>
      <line x1="31" y1="26.5" x2="31" y2="28" stroke="#000000" stroke-width="1.5"/>
      <line x1="37" y1="26.5" x2="37" y2="28" stroke="#000000" stroke-width="1.5"/>
    </svg>
  `,

  sniper_marksman: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M12 32L18 29L24 29L24 35L18 37L12 32Z" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="24" y="28" width="30" height="4.5" fill="#334155" stroke="#1e293b" stroke-width="1.5"/>
      <rect x="28" y="22" width="14" height="4" rx="1" fill="#0f172a" stroke="#0284c7" stroke-width="1"/>
      <path d="M32 32.5L33 42L29 42L29 32.5" fill="#475569"/>
    </svg>
  `,

  sniper_heavy50: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <rect x="18" y="27" width="24" height="6.5" fill="#1e293b" stroke="#0f172a" stroke-width="1.5"/>
      <rect x="42" y="28" width="16" height="4" fill="#334155"/>
      <rect x="58" y="27" width="4" height="6" fill="#475569"/>
      <rect x="24" y="20" width="16" height="5" rx="1" fill="#0f172a" stroke="#f59e0b" stroke-width="1"/>
      <line x1="46" y1="32" x2="48" y2="40" stroke="#64748b" stroke-width="1.5"/>
      <line x1="46" y1="32" x2="44" y2="40" stroke="#64748b" stroke-width="1.5"/>
    </svg>
  `,

  // --- Explosivos y Arrojadizos ---
  frag_grenade: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M22 28C22 22 26 18 32 18C38 18 42 22 42 28V40C42 46 38 50 32 50C26 50 22 46 22 40V28Z" fill="#3f4f24" stroke="#253114" stroke-width="2"/>
      <rect x="28" y="12" width="8" height="6" fill="#9ca3af" stroke="#4b5563" stroke-width="1.2"/>
      <path d="M28 14H24C22 14 20 16 20 18V26" stroke="#d1d5db" stroke-width="2" fill="none"/>
      <circle cx="20" cy="18" r="2.5" fill="#e5e7eb" stroke="#374151" stroke-width="1"/>
      <line x1="22" y1="32" x2="42" y2="32" stroke="#253114" stroke-width="1.5"/>
      <line x1="22" y1="38" x2="42" y2="38" stroke="#253114" stroke-width="1.5"/>
      <line x1="32" y1="22" x2="32" y2="48" stroke="#253114" stroke-width="1.5"/>
    </svg>
  `,

  molotov: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M26 24V18H38V24L42 28V48C42 51 39 54 36 54H28C25 54 22 51 22 48V28L26 24Z" fill="#b45309" stroke="#78350f" stroke-width="1.8"/>
      <rect x="24" y="32" width="16" height="18" fill="#d97706" opacity="0.8"/>
      <path d="M30 18L32 12C32 12 36 10 34 15L34 18" stroke="#f1f5f9" stroke-width="2" fill="none"/>
      <!-- Llama ardiente -->
      <path d="M32 12C34 10 35 6 32 4C30 7 28 8 29 11C29 12 31 13 32 12Z" fill="#ef4444"/>
      <path d="M32 11C33 10 33 8 32 7C31 8 30 9 31 10Z" fill="#facc15"/>
    </svg>
  `,

  pipe_bomb: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <rect x="18" y="26" width="28" height="12" rx="2" fill="#64748b" stroke="#334155" stroke-width="2"/>
      <rect x="14" y="24" width="6" height="16" rx="2" fill="#475569" stroke="#1e293b" stroke-width="1.5"/>
      <rect x="44" y="24" width="6" height="16" rx="2" fill="#475569" stroke="#1e293b" stroke-width="1.5"/>
      <!-- Mecha encendida -->
      <path d="M32 26C32 20 38 18 36 14" stroke="#d97706" stroke-width="2" stroke-linecap="round" fill="none"/>
      <circle cx="36" cy="14" r="2.5" fill="#ef4444"/>
      <circle cx="36" cy="14" r="1.5" fill="#facc15"/>
    </svg>
  `,

  landmine: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <ellipse cx="32" cy="36" rx="20" ry="10" fill="#3f4f24" stroke="#1f2913" stroke-width="2"/>
      <ellipse cx="32" cy="33" rx="12" ry="5.5" fill="#4d5f2d" stroke="#253114" stroke-width="1.5"/>
      <circle cx="32" cy="31" r="3.5" fill="#dc2626" stroke="#991b1b" stroke-width="1"/>
      <line x1="22" y1="35" x2="26" y2="38" stroke="#eab308" stroke-width="1.5"/>
      <line x1="38" y1="38" x2="42" y2="35" stroke="#eab308" stroke-width="1.5"/>
    </svg>
  `,

  c4_charge: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <rect x="16" y="24" width="32" height="18" rx="2" fill="#9ca3af" stroke="#4b5563" stroke-width="2"/>
      <line x1="16" y1="33" x2="48" y2="33" stroke="#d1d5db" stroke-width="1.5"/>
      <!-- Receptor / temporizador -->
      <rect x="24" y="20" width="16" height="10" rx="1.5" fill="#1e293b" stroke="#0284c7" stroke-width="1.2"/>
      <circle cx="28" cy="25" r="1.5" fill="#ef4444"/>
      <circle cx="36" cy="25" r="1.5" fill="#22c55e"/>
      <path d="M22 28C19 28 19 24 24 24" stroke="#ef4444" stroke-width="1.5" fill="none"/>
      <path d="M42 28C45 28 45 24 40 24" stroke="#3b82f6" stroke-width="1.5" fill="none"/>
    </svg>
  `,

  // --- Mochila / Inventario General ---
  backpack: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M20 20C20 16 25 14 32 14C39 14 44 16 44 20V48C44 51 41 54 38 54H26C23 54 20 51 20 48V20Z" fill="#3f4f24" stroke="#253114" stroke-width="2"/>
      <!-- Bolsillo frontal -->
      <rect x="24" y="32" width="16" height="16" rx="2" fill="#4d5f2d" stroke="#1f2913" stroke-width="1.5"/>
      <line x1="24" y1="36" x2="40" y2="36" stroke="#a1a1aa" stroke-width="1.5"/>
      <!-- Asa superior -->
      <path d="M26 14V10C26 8 38 8 38 10V14" stroke="#253114" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <!-- Correas laterales -->
      <rect x="16" y="26" width="4" height="18" rx="1.5" fill="#2d371e"/>
      <rect x="44" y="26" width="4" height="18" rx="1.5" fill="#2d371e"/>
    </svg>
  `,

  // --- Vehículos ---
  vehicle_compact: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M14 36 L18 28 H30 L36 22 H48 L54 28 V40 H50 C50 43 47 45 44 45 C41 45 38 43 38 40 H26 C26 43 23 45 20 45 C17 45 14 43 14 40 Z" fill="#38bdf8" stroke="#0369a1" stroke-width="1.5"/>
      <path d="M30 28 L35 23 H46 L50 28 H30 Z" fill="#bae6fd" opacity="0.85"/>
      <circle cx="20" cy="40" r="4.5" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
      <circle cx="44" cy="40" r="4.5" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
      <circle cx="20" cy="40" r="1.5" fill="#94a3b8"/>
      <circle cx="44" cy="40" r="1.5" fill="#94a3b8"/>
      <rect x="16" y="32" width="4" height="2" rx="0.5" fill="#fef08a"/>
    </svg>
  `,
  vehicle_sedan: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M10 38 L14 30 H24 L30 22 H46 L54 30 V42 H50 C50 45 47 47 44 47 C41 47 38 45 38 42 H26 C26 45 23 47 20 47 C17 47 14 45 14 42 H10 Z" fill="#64748b" stroke="#1e293b" stroke-width="1.5"/>
      <path d="M25 30 L30 23 H44 L50 30 H25 Z" fill="#cbd5e1" opacity="0.9"/>
      <line x1="37" y1="23" x2="37" y2="30" stroke="#475569" stroke-width="1"/>
      <circle cx="20" cy="42" r="5" fill="#0f172a" stroke="#94a3b8" stroke-width="1.5"/>
      <circle cx="44" cy="42" r="5" fill="#0f172a" stroke="#94a3b8" stroke-width="1.5"/>
      <circle cx="20" cy="42" r="1.8" fill="#e2e8f0"/>
      <circle cx="44" cy="42" r="1.8" fill="#e2e8f0"/>
      <rect x="12" y="34" width="5" height="2.5" rx="0.5" fill="#fde68a"/>
      <rect x="49" y="34" width="4" height="2.5" rx="0.5" fill="#fca5a5"/>
    </svg>
  `,
  vehicle_offroad: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M8 36 L12 28 H26 L30 22 H42 L50 28 V36 H56 V42 H52 C52 46 48 49 44 49 C40 49 36 46 36 42 H28 C28 46 24 49 20 49 C16 49 12 46 12 42 H8 Z" fill="#166534" stroke="#14532d" stroke-width="1.5"/>
      <path d="M26 28 L30 23 H40 L46 28 H26 Z" fill="#86efac" opacity="0.7"/>
      <rect x="42" y="28" width="12" height="8" fill="#3f6212" stroke="#14532d" stroke-width="1"/>
      <circle cx="20" cy="42" r="6" fill="#1c1917" stroke="#a8a29e" stroke-width="1.8"/>
      <circle cx="44" cy="42" r="6" fill="#1c1917" stroke="#a8a29e" stroke-width="1.8"/>
      <circle cx="20" cy="42" r="2" fill="#d6d3d1"/>
      <circle cx="44" cy="42" r="2" fill="#d6d3d1"/>
    </svg>
  `,
  vehicle_truck: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <rect x="8" y="26" width="28" height="16" rx="1" fill="#78716c" stroke="#44403c" stroke-width="1.5"/>
      <path d="M36 30 H48 L54 36 V42 H36 V30 Z" fill="#a8a29e" stroke="#57534e" stroke-width="1.5"/>
      <path d="M40 30 L46 30 L50 36 H40 V30 Z" fill="#e7e5e4" opacity="0.85"/>
      <circle cx="16" cy="44" r="5" fill="#0f172a" stroke="#a8a29e" stroke-width="1.5"/>
      <circle cx="30" cy="44" r="5" fill="#0f172a" stroke="#a8a29e" stroke-width="1.5"/>
      <circle cx="46" cy="44" r="5" fill="#0f172a" stroke="#a8a29e" stroke-width="1.5"/>
      <rect x="50" y="36" width="4" height="3" fill="#fde68a"/>
    </svg>
  `,
  vehicle_sport: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <path d="M8 38 L16 30 H24 L32 22 H48 L58 30 V40 H52 C52 43 49 45 46 45 C43 45 40 43 40 40 H24 C24 43 21 45 18 45 C15 45 12 43 12 40 H8 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="1.5"/>
      <path d="M26 30 L33 23 H46 L54 30 H26 Z" fill="#1e293b" opacity="0.9"/>
      <path d="M12 34 H20" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
      <circle cx="18" cy="40" r="4.5" fill="#0f172a" stroke="#f87171" stroke-width="1.5"/>
      <circle cx="46" cy="40" r="4.5" fill="#0f172a" stroke="#f87171" stroke-width="1.5"/>
      <path d="M30 22 L48 22" stroke="#fca5a5" stroke-width="1" opacity="0.6"/>
    </svg>
  `,
  vehicle_emergency: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <rect x="10" y="26" width="44" height="16" rx="2" fill="#f8fafc" stroke="#94a3b8" stroke-width="1.5"/>
      <rect x="14" y="20" width="18" height="8" rx="1" fill="#e2e8f0" stroke="#64748b" stroke-width="1"/>
      <rect x="22" y="14" width="14" height="6" rx="1" fill="#ef4444"/>
      <rect x="24" y="15" width="4" height="4" fill="#3b82f6"/>
      <rect x="32" y="15" width="4" height="4" fill="#ef4444"/>
      <path d="M28 30 h8 v8 h-8 z" fill="#ef4444"/>
      <path d="M30 28 v12 M24 34 h12" stroke="#fff" stroke-width="2"/>
      <circle cx="18" cy="44" r="5" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
      <circle cx="46" cy="44" r="5" fill="#0f172a" stroke="#64748b" stroke-width="1.5"/>
    </svg>
  `,

  // --- Zombis ---
  zombie: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <ellipse cx="32" cy="54" rx="12" ry="3" fill="#000" opacity="0.25"/>
      <path d="M24 28 C24 18 40 18 40 28 V44 H24 Z" fill="#3f6212" stroke="#14532d" stroke-width="1.5"/>
      <circle cx="32" cy="18" r="10" fill="#4d7c0f" stroke="#365314" stroke-width="1.5"/>
      <circle cx="28" cy="17" r="2.2" fill="#ef4444"/>
      <circle cx="36" cy="17" r="2.2" fill="#ef4444"/>
      <circle cx="28" cy="17" r="0.8" fill="#450a0a"/>
      <circle cx="36" cy="17" r="0.8" fill="#450a0a"/>
      <path d="M27 23 Q32 27 37 23" stroke="#1a2e05" stroke-width="1.5" fill="none"/>
      <path d="M20 32 L14 40" stroke="#4d7c0f" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M44 32 L50 38" stroke="#4d7c0f" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M26 44 L24 54" stroke="#365314" stroke-width="4" stroke-linecap="round"/>
      <path d="M38 44 L42 54" stroke="#365314" stroke-width="4" stroke-linecap="round"/>
      <path d="M30 12 L34 8 L36 12" fill="#365314"/>
    </svg>
  `,
  zombie_extreme: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <ellipse cx="32" cy="56" rx="14" ry="3" fill="#000" opacity="0.3"/>
      <path d="M22 26 C22 14 42 14 42 26 V46 H22 Z" fill="#7f1d1d" stroke="#450a0a" stroke-width="1.5"/>
      <circle cx="32" cy="16" r="11" fill="#991b1b" stroke="#450a0a" stroke-width="1.5"/>
      <circle cx="27" cy="15" r="2.5" fill="#facc15"/>
      <circle cx="37" cy="15" r="2.5" fill="#facc15"/>
      <circle cx="27" cy="15" r="1" fill="#000"/>
      <circle cx="37" cy="15" r="1" fill="#000"/>
      <path d="M26 22 L30 25 L34 22 L38 25" stroke="#fef2f2" stroke-width="1.5" fill="none"/>
      <path d="M18 30 L10 28" stroke="#991b1b" stroke-width="4" stroke-linecap="round"/>
      <path d="M46 30 L54 24" stroke="#991b1b" stroke-width="4" stroke-linecap="round"/>
      <path d="M26 46 L22 56" stroke="#450a0a" stroke-width="5" stroke-linecap="round"/>
      <path d="M38 46 L44 56" stroke="#450a0a" stroke-width="5" stroke-linecap="round"/>
      <path d="M24 8 L28 14 L32 6 L36 14 L40 8" stroke="#f97316" stroke-width="1.5" fill="none"/>
    </svg>
  `,
  zombie_clear: `
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow">
      <circle cx="32" cy="32" r="18" fill="#1c1917" stroke="#57534e" stroke-width="2"/>
      <path d="M22 22 L42 42 M42 22 L22 42" stroke="#f87171" stroke-width="3.5" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="22" stroke="#78716c" stroke-width="1" stroke-dasharray="3 3" opacity="0.5"/>
    </svg>
  `,

  // --- Iconos de Estado (Barras) ---
  heart: `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-[0_0_8px_rgba(74,222,128,0.8)]">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="#22c55e" stroke="#86efac" stroke-width="1.5"/>
    </svg>
  `,

  shield: `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]">
      <path d="M12 2L4 5V11C4 16.55 7.42 21.74 12 23C16.58 21.74 20 16.55 20 11V5L12 2Z" fill="#0284c7" stroke="#38bdf8" stroke-width="1.5"/>
      <path d="M12 4.5L6 6.8V11C6 15.2 8.6 19.2 12 20.3C15.4 19.2 18 15.2 18 11V6.8L12 4.5Z" fill="#0369a1"/>
    </svg>
  `,

  sprint: `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]">
      <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7z" fill="#eab308"/>
      <path d="M4 14l-2 2h4l-2-2zM3 18l-2 2h4l-2-2z" fill="#facc15" opacity="0.7"/>
    </svg>
  `,
};

export const WEAPON_SHORT_NAMES: Record<string, string> = {
  baseball_bat: 'BATE',
  pipe_wrench: 'LLAVE',
  fire_axe: 'HACHA',
  katana: 'KATANA',
  combat_knife: 'CUCHILLO',
  pistol_9mm: 'PISTOLA',
  revolver_357: 'MAGNUM',
  pistol_suppressed: 'SILENC.',
  pistol_desert: 'D-EAGLE',
  smg_mac10: 'MAC-10',
  smg_p90: 'P90',
  smg_tommy: 'TOMMY',
  pump_shotgun: 'ESCOPETA',
  shotgun_double: 'DOBLE',
  shotgun_spas: 'SPAS-12',
  shotgun_sawed: 'RECORT.',
  assault_rifle: 'M4A1',
  rifle_scar: 'SCAR-H',
  rifle_burst: 'RÁFAGA',
  rifle_carbine: 'CARABINA',
  hunting_rifle: 'CAZA',
  sniper_marksman: 'DMR',
  sniper_heavy50: '.50 CAL',
  frag_grenade: 'M67',
  molotov: 'MOLOTOV',
  pipe_bomb: 'BOMBA',
  landmine: 'MINA',
  c4_charge: 'C4',
};
