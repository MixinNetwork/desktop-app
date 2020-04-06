import api from '@/api/base'

export default {
  getCircles() {
    return api.get('/circles')
  },
  getCircleById(id: string) {
    return api.get(`/circles/${id}`)
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
  updateCircleConversations(id: string) {
    return api.post(`/circles/${id}/conversations`)
  }
}
