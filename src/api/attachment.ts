import api from '@/api/base'

export default {
  getAttachment(id: string) {
    return api.get('/attachments/' + id)
  }
}
