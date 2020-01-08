import api from '@/api/base'

export default {
  getSnapshots(id: any) {
    return api.get(`/snapshots/${id}`)
  },
  getAssets(id: string) {
    return api.get(`/assets/${id}`)
  }
}
