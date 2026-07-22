import { IPTV_API } from '../constants.js'

export const endpoints = {
  channels: `${IPTV_API}/channels.json`,
  streams: `${IPTV_API}/streams.json`,
  categories: `${IPTV_API}/categories.json`,
  countries: `${IPTV_API}/countries.json`,
}
