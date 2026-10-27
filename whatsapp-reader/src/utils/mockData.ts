// Realistic sample chat data based on user prompt examples and real WhatsApp exports
export const MOCK_CHAT_TXT = `7/27/19, 8:33 PM - Messages and calls are end-to-end encrypted. Only people in this chat can read, listen to, or share them. *Learn more*
7/27/19, 8:33 PM - Carlos created group "K/ND"
7/27/19, 8:33 PM - Carlos added you
7/27/19, 8:33 PM - Carlos: :’v
7/27/19, 8:33 PM - Carlos: Agreguen al Esteban
7/27/19, 8:34 PM - David: no soi admim
7/27/19, 8:34 PM - David: Esteban.vcf (file attached)
7/27/19, 8:36 PM - Carlos added Esteban
7/27/19, 8:36 PM - Carlos: There
7/27/19, 8:36 PM - Esteban: Omaiga, que no para eso estaba el del server del maincra?
7/27/19, 8:36 PM - David: STK-20190224-WA0022.webp (file attached)
7/27/19, 8:37 PM - Carlos: No ese server ya murio bro
Ayer el host cerro la sesion y perdimos la base de diamantes :'c
7/27/19, 8:38 PM - David: F en el chat
7/27/19, 8:39 PM - Esteban: No digas mmdas meri yein jajaja
7/27/19, 8:40 PM - Carlos: IMG-20190727-WA0015.jpg (file attached)
Miren el meme que encontre
7/27/19, 8:41 PM - David: Jajajaja 10/10
7/27/19, 8:42 PM - Esteban: PTT-20190727-WA0034.opus (file attached)
7/27/19, 8:43 PM - Carlos: JAJAJA esa voz
7/27/19, 8:45 PM - David: Bueno gente quien para un lolcito o que?
7/27/19, 8:46 PM - Esteban: Sale lolcito a las 9
7/27/19, 8:47 PM - Carlos: Jalo!`

// Sample base64 demo assets for mock mode
export const MOCK_ASSETS = {
  'Esteban.vcf': `BEGIN:VCARD
VERSION:3.0
N:Gómez;Esteban;;;
FN:Esteban Gómez
TEL;TYPE=CELL:+52 55 9876 5432
EMAIL:esteban.craft@example.com
ORG:K/ND Gaming Squad
END:VCARD`,

  // SVG Data URL for meme image
  'IMG-20190727-WA0015.jpg': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%231e293b"/><stop offset="100%" stop-color="%230f172a"/></linearGradient></defs><rect width="600" height="400" fill="url(%23g)" rx="20"/><circle cx="300" cy="180" r="70" fill="%23f59e0b"/><circle cx="275" cy="165" r="10" fill="%230f172a"/><circle cx="325" cy="165" r="10" fill="%230f172a"/><path d="M 265 210 Q 300 240 335 210" stroke="%230f172a" stroke-width="8" fill="none" stroke-linecap="round"/><text x="300" y="310" font-family="sans-serif" font-weight="bold" font-size="24" fill="%23ffffff" text-anchor="middle">CUANDO EL SERVER DE MAINCRA SE CAE</text><text x="300" y="345" font-family="sans-serif" font-size="16" fill="%2394a3b8" text-anchor="middle">K/ND Squad Meme Export</text></svg>`,

  // SVG Data URL for sticker
  'STK-20190224-WA0022.webp': `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><g transform="translate(10, 10)"><circle cx="90" cy="90" r="80" fill="%2322c55e"/><circle cx="65" cy="75" r="12" fill="%23ffffff"/><circle cx="65" cy="75" r="6" fill="%23000000"/><circle cx="115" cy="75" r="12" fill="%23ffffff"/><circle cx="115" cy="75" r="6" fill="%23000000"/><path d="M 55 110 Q 90 145 125 110" stroke="%23ffffff" stroke-width="10" fill="none" stroke-linecap="round"/><text x="90" y="175" font-family="sans-serif" font-weight="bold" font-size="14" fill="%23ffffff" text-anchor="middle">STK WA</text></g></svg>`,

  // A tiny beep data URL for audio
  'PTT-20190727-WA0034.opus': 'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YRAAAAAAAACAgICAgICAgICAgICA'
}
