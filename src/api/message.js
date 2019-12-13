import api from '@/api/base.js'

export default {
  acknowledgements(body) {
    return api.post('/acknowledgements', body)
  }
}
