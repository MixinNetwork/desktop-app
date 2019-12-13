import api from '@/api/base.js'

export default {
  getSnapshots(id) {
    return api.get(`/snapshots/${id}`)
  },
  getAssets(id) {
    return api.get(`/assets/${id}`)
  }
}
