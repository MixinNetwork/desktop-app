import api from '@/api/base.js'

export default {
  getUserById(id) {
    return api.get('/users/' + id)
  },
  getUsers(body) {
    return api.post('/users/fetch', body)
  }
}
