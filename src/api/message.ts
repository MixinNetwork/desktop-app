import api from '@/api/base'

export default {
  acknowledgements(body: any) {
    return api.post('/acknowledgements', body)
  }
}
