import { getToken, readArrayBuffer, getAccount, safeParse } from '@/utils/util'
import { MessageStatus, LinkStatus, API_URL } from '@/utils/constants'
import { clearDb } from '@/persistence/db_util'
import { v4 as uuidv4 } from 'uuid'
import pako from 'pako'
import store from '@/store/store'
import messageDao from '@/dao/message_dao'
import jobDao from '@/dao/job_dao'
import floodMessageDao from '@/dao/flood_message_dao'
import accountApi from '@/api/account'
import router from '@/router'

import { ipcRenderer } from 'electron'

class Blaze {
  constructor() {
    this.transactions = {}
    this.ws = null
    this.wsBaseUrl = API_URL.WS[0]
    this.account = getAccount()
    this.TIMEOUT = 'Time out'
    this.timeoutTimer = null
    this.pingInterval = null
    this.wsInitialLock = false
    this.systemSleep = false
    ipcRenderer.on('system-sleep', () => {
      if (!this.systemSleep) {
        clearInterval(this.pingInterval)
        this.pingInterval = null
        this.systemSleep = true
        console.log('The system is sleep')
      }
    })
    ipcRenderer.on('system-resume', () => {
      if (this.systemSleep) {
        this.systemSleep = false
        console.log('The system is resume')
        this.connect(true)
      }
    })
  }

  connect(force) {
    if (!force) {
      if (this.wsInitialLock || store.state.linkStatus === LinkStatus.CONNECTING) return
    }

    store.dispatch('setLinkStatus', LinkStatus.CONNECTING)

    if (this.ws) {
      this.ws.close(1000, 'Normal close')
      this.ws = null
    }

    clearInterval(this.pingInterval)
    this.pingInterval = setInterval(() => {
      if (!this.systemSleep && store.state.linkStatus !== LinkStatus.CONNECTING) {
        this.setTimeoutTimer()
        this._sendGzip({ id: uuidv4().toLowerCase(), action: 'PING' }, () => {
          this.clearTimeoutTimer()
        })
      }
    }, 15000)

    if (this.systemSleep) return

    this.account = getAccount()
    const token = getToken('GET', '/', '')
    if (!token) return

    this.setTimeoutTimer()
    this.ws = new WebSocket(this.wsBaseUrl + '?access_token=' + token, 'Mixin-Blaze-1')
    this.ws.onmessage = this._onMessage.bind(this)
    this.ws.onerror = this._onError.bind(this)
    this.ws.onclose = this._onClose.bind(this)
    this.ws.onopen = () => {
      this.clearTimeoutTimer()
      this._sendGzip({ id: uuidv4().toLowerCase(), action: 'LIST_PENDING_MESSAGES' }, resp => {
        console.log(resp)
        store.dispatch('setLinkStatus', LinkStatus.CONNECTED)
      })
    }
  }

  async _onMessage(event) {
    const content = await readArrayBuffer(event.data)
    const data = pako.ungzip(new Uint8Array(content), { to: 'string' })
    if (data.error) {
      return
    }
    this.clearTimeoutTimer()
    this.handleMessage(data)
  }
  _onClose(event) {
    console.log('---onclose--', event.code, store.state.linkStatus)
    this.wsInitialLock = false
    if (event.code !== 1000) {
      setTimeout(() => {
        this.resetStatus()
        this.connect()
      }, 200)
    }
  }
  _onError(event) {
    console.log('-------onerrror--')
    console.log(event)
  }
  _sendGzip(data, result) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.transactions[data.id] = result
      this.ws.send(pako.gzip(JSON.stringify(data)))
    } else {
      result({ error: 'ws not open' })
    }
  }
  closeBlaze() {
    if (this.ws) {
      this.ws.close(3001, 'Unauthorized')
      clearDb()
      router.push('/sign_in')
    }
  }
  handleMessage(data) {
    var blazeMsg = safeParse(data)
    if (!blazeMsg.error) {
      const transaction = this.transactions[blazeMsg.id]
      if (transaction) {
        transaction(blazeMsg)
        delete this.transactions[blazeMsg.id]
      }
      if (
        blazeMsg.data &&
        (blazeMsg.action === 'CREATE_MESSAGE' ||
          blazeMsg.action === 'ACKNOWLEDGE_MESSAGE_RECEIPT' ||
          blazeMsg.action === 'CREATE_CALL')
      ) {
        this.handleReceiveMessage(blazeMsg)
      }
    } else {
      if (blazeMsg.action === 'ERROR' && blazeMsg.error.code === 401) {
        accountApi.checkPing().then(
          _ => {
            store.dispatch('setLinkStatus', LinkStatus.NOT_CONNECTED)
            this.connect()
          },
          err => {
            console.log(err)
          }
        )
      } else {
        const transaction = this.transactions[blazeMsg.id]
        if (transaction) {
          transaction(blazeMsg)
          delete this.transactions[blazeMsg.id]
        }
        console.log(blazeMsg)
      }
    }
  }

  handleReceiveMessage(msg) {
    if (msg.action === 'CREATE_MESSAGE') {
      if (msg.data.user_id === this.account.user_id && msg.data.category === '') {
        this.makeMessageStatus(msg.data.status, msg.data.message_id)
      } else {
        floodMessageDao.insert(msg.data.message_id, JSON.stringify(msg.data), msg.data.created_at)
      }
    } else if (msg.action === 'ACKNOWLEDGE_MESSAGE_RECEIPT') {
      this.makeMessageStatus(msg.data.status, msg.data.message_id)
    } else {
      this.updateRemoteMessageStatus(msg.data.message_id, MessageStatus.DELIVERED)
    }
  }

  resetStatus() {
    const beforeIndex = API_URL.WS.indexOf(this.wsBaseUrl) || 0
    this.wsBaseUrl = API_URL.WS[(beforeIndex + 1) % API_URL.WS.length]
    this.wsInitialLock = false
  }

  setTimeoutTimer() {
    this.wsInitialLock = true
    clearTimeout(this.timeoutTimer)
    this.timeoutTimer = setTimeout(() => {
      this.resetStatus()
      if (store.state.linkStatus !== LinkStatus.NOT_CONNECTED) {
        store.dispatch('setLinkStatus', LinkStatus.ERROR)
        this.connect()
      }
    }, 5000)
  }

  clearTimeoutTimer() {
    clearTimeout(this.timeoutTimer)
    this.wsInitialLock = false
  }

  sendMessagePromise(message) {
    return new Promise((resolve, reject) => {
      let _timeout = setTimeout(() => {
        reject(new Error('sendMessagePromise Timeout'))
      }, 5000)
      this._sendGzip(message, resp => {
        clearTimeout(_timeout)
        if (resp.data) {
          resolve(resp.data)
        } else if (resp.error) {
          reject(resp.error)
        } else {
          resolve(resp)
        }
      })
    })
  }

  makeMessageStatus(status, messageId) {
    const currentStatus = messageDao.findMessageStatusById(messageId)
    if (currentStatus && currentStatus !== MessageStatus.READ) {
      store.dispatch('makeMessageStatus', { messageId, status })
    }
  }

  updateRemoteMessageStatus(messageId, status) {
    const blazeMessage = { message_id: messageId, status: status }
    jobDao.insert({
      job_id: uuidv4(),
      action: 'ACKNOWLEDGE_MESSAGE_RECEIPTS',
      created_at: new Date().toISOString(),
      order_id: null,
      priority: 5,
      user_id: null,
      blaze_message: JSON.stringify(blazeMessage),
      conversation_id: null,
      resend_message_id: null,
      run_count: 0
    })
  }
}

export default new Blaze()
