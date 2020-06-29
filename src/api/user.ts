import api from '@/api/base'

export default {
  getUserById(id: string) {
    return api.get('/users/' + id)
  },
  getUsers(body: any) {
    return api.post('/users/fetch', body)
  },
  getSessions(body: any) {
    return api.post('/sessions/fetch', body)
  },
  updateProfile(body: any) {
    return api.post('/me', body)
  },
  updateSession(body: any) {
    return api.post('/session', body)
  },
  updateRelationship(body: any) {
    return api.post('/relationships', body)
  },
  report(body: any) {
    return api.post('/reports', body)
  },
  blockingUsers() {
    return api.get('/blocking_users')
  }
}
