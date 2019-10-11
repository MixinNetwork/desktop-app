import api from '@/api/base.js'

export default {
  getAttachment(id) {
    return api.get('/attachments/' + id)
  }
}
