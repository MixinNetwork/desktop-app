import api from '@/api/base'

export default {
  getStickerAlbums() {
    return api.get('/stickers/albums')
  },
  getStickersByAlbumId(id: string) {
    return api.get('/stickers/albums/' + id)
  },
  getStickerById(id: string) {
    return api.get('/stickers/' + id)
  }
}
