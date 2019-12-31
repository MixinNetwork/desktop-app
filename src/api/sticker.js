import api from '@/api/base.js'

export default {
  getStickers() {
    return api.get('/stickers/albums')
  },
  getStickersById(id) {
    return api.get('/stickers/albums/' + id)
  }
}
