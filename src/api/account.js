import api from '@/api/base.js'

export default {
  getProvisioningId(deviceId) {
    return api.post('/provisionings', { device: deviceId })
  },
  getProvisioning(id) {
    return api.get('/provisionings/' + id)
  },
  verifyProvisioning(body) {
    return api.post('/provisionings/verify', body)
  },
  getMe() {
    return api.get('/me')
  },
  getFriends() {
    return api.get('/friends')
  },
  getSignalKeyCount() {
    return api.get('/signal/keys/count')
  },
  getStickerById(id) {
    return api.get('/stickers/' + id)
  },
  logout() {
    return api.post('/logout', {})
  },
  checkPing() {
    return api.get('/me')
  }
}
