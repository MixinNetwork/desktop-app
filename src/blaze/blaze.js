import RobustWebSocket from 'robust-websocket'
import { getToken, readArrayBuffer } from '@/utils/util'
import { MessageStatus, LinkStatus, API_URL } from '@/utils/constants'
import { clearDb } from '@/persistence/db_util'
import uuidv4 from 'uuid/v4'
import pako from 'pako'
import store from '@/store/store'
import messageDao from '@/dao/message_dao'
import jobDao from '@/dao/job_dao'
import floodMessageDao from '@/dao/flood_message_dao'
import accountApi from '@/api/account'
import router from '@/router'
class Blaze {
  constructor() {
    this.transactions = {}
    this.ws = null
    this.account = JSON.parse(localStorage.getItem('account'))
    this.TIMEOUT = 'Time out'
    this.reconnecting = false
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }
    if (this.ws) {
      this.ws.close(3001, 'Unauthorized')
      this.ws = null
    }

    this.account = JSON.parse(localStorage.getItem('account'))
    const token = getToken('GET', '/', '')
    this.ws = new RobustWebSocket(API_URL.WS + '?access_token=' + token, 'Mixin-Blaze-1')
    this.ws.onmessage = this._onMessage.bind(this)
    this.ws.onerror = this._onError.bind(this)
    this.ws.onclose = this._onClose.bind(this)
    var self = this
    return new Promise((resolve, reject) => {
      this.ws.addEventListener('open', function(event) {
        self._sendGzip({ id: uuidv4().toLowerCase(), action: 'LIST_PENDING_MESSAGES' }, function(resp) {
          console.log(resp)
        })
        resolve()
        store.dispatch('setLinkStatus', LinkStatus.CONNECTED)
      })
    })
  }

  async _onMessage(event) {
    try {
      const content = await readArrayBuffer(event.data)
      const data = pako.ungzip(new Uint8Array(content), { to: 'string' })
      if (data.error) {
        return
      }
      this.handleMessage(data)
    } catch (e) {
      console.warn(e.message)
    }
  }
  _onClose(event) {
    if (this.reconnecting) return
    console.log('---onclose--')
    this.reconnecting = true
    setTimeout(() => {
      this.reconnecting = false
    })
    if (event.code === 1008) return
    console.log('---should reconnect--')
    this.reconnectBlaze()
  }
  _onError(event) {
    console.log('-------onerrror--')
    console.log(event)
  }
  _sendGzip(data, result) {
    this.transactions[data.id] = result
    this.ws.send(pako.gzip(JSON.stringify(data)))
  }
  closeBlaze() {
    if (this.ws) {
      this.ws.close(3001, 'Unauthorized')
      clearDb()
      router.push('/sign_in')
    }
  }
  reconnectBlaze() {
    if (this.ws) {
      this.ws.close(1000, 'Normal close, should reconnect')
    }
    store.dispatch('setLinkStatus', LinkStatus.CONNECTING)
    this.connect()
  }
  isConnect() {
    if (this.ws) {
      console.log(this.ws.readyState)
      return this.ws.readyState === WebSocket.OPEN
    } else {
      return false
    }
  }
  handleMessage(data) {
    var blazeMsg = JSON.parse(data)
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
            this.reconnectBlaze()
          },
          err => {
            console.log(err.data)
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

  sendMessage(message) {
    if (this.ws) {
      this._sendGzip(message, function(resp) { })
    }
  }

  sendMessagePromise(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      var self = this
      return new Promise((resolve, reject) => {
        let timer
        let timeout = this.TIMEOUT
        this._sendGzip(message, function(resp) {
          if (resp.data) {
            resolve(resp.data)
          } else if (resp.error) {
            reject(resp.error)
          } else {
            resolve(resp)
          }
          clearTimeout(timer)
        })
        timer = setTimeout(function() {
          self.reconnectBlaze()
          reject(timeout)
        }, 5000)
      })
    } else if (this.ws && this.ws.readyState === WebSocket.CLOSED) {
      store.dispatch('setLinkStatus', LinkStatus.CONNECTING)
      this.connect()
    }
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
