import api from '@/api/base'

export default {
  getCircles() {
    return api.get('/circles')
  },
  createCircle(body: any) {
    return api.post('/circles', body)
  },
  updateCircle(id: string) {
    return api.post(`/circles/${id}`)
  },
  deleteCircle(id: string) {
    return api.post(`/circles/${id}/delete`)
  },
  getCircle(id: string) {
    return api.post(`/circles/${id}/conversations`)
  }
}
