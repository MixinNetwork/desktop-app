import api from '@/api/base.js'

export default {
  postSignalKeys(body) {
    return api.post('/signal/keys', body)
  }
}
