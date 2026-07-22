import { IPTV_API, IPTV_PLAYLIST } from '../constants.js'

export const endpoints = {
  // Playlist-ul canonic „toate canalele" (canal + URL + logo + categorie).
  playlist: IPTV_PLAYLIST,
  // Doar pentru mapare cod țară -> nume + steag (fișier mic, opțional).
  countries: `${IPTV_API}/countries.json`,
}
