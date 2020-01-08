import api from '@/api/base'

export default {
  postSignalKeys(body) {
    return api.post('/signal/keys', body)
  },
  getSignalKeyCount() {
    return api.get('/signal/keys/count')
  }
}
