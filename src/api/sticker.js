import api from '@/api/base.js'

export default {
  getStickerAlbums() {
    return api.get('/stickers/albums')
  },
  getStickersByAlbumId(id) {
    return api.get('/stickers/albums/' + id)
  },
  getStickerById(id) {
    return api.get('/stickers/' + id)
  }
}
