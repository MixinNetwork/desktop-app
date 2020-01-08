import api from '@/api/base'

export default {
  getProvisioningId(deviceId: any) {
    return api.post('/provisionings', { device: deviceId })
  },
  getProvisioning(id: string) {
    return api.get('/provisionings/' + id)
  },
  verifyProvisioning(body: any) {
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
  logout() {
    return api.post('/logout', {})
  },
  checkPing() {
    return api.get('/me')
  }
}
