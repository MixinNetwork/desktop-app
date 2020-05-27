import RobustWebSocket from 'robust-websocket'
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
class Blaze {
  constructor() {
    this.transactions = {}
    this.ws = null
    this.retryCount = 0
    this.account = getAccount()
    this.TIMEOUT = 'Time out'
    this.connecting = false
    this.connectInterval = null
    this.sendGzipQueue = []
  }

  connect() {
    if (this.connecting) return
    this.connecting = true
    clearInterval(this.connectInterval)
    this.connectInterval = setInterval(() => {
      this.connecting = false
      if (store.state.linkStatus !== LinkStatus.CONNECTED || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.log('--- connect interval --', this.ws && this.ws.readyState, store.state.linkStatus)
        if (this.ws && this.ws.readyState !== WebSocket.CONNECTING) {
          this.ws.close(1000, 'Normal close')
          this.ws = null
        }
        store.dispatch('setLinkStatus', LinkStatus.CONNECTING)
        this.connect()
      }
    }, 5000)

    if (store.state.linkStatus === LinkStatus.ERROR) return

    if (this.ws && this.ws.readyState === WebSocket.CONNECTING) return

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close(1000, 'Normal close, should reconnect')
      this.ws = null
    }

    this.account = getAccount()
    const token = getToken('GET', '/', '')
    setTimeout(() => {
      store.dispatch('setLinkStatus', LinkStatus.CONNECTING)
    })
    if (!token) return
    this.ws = new RobustWebSocket(
      API_URL.WS[this.retryCount % API_URL.WS.length] + '?access_token=' + token,
      'Mixin-Blaze-1',
      {
        timeout: 15000,
        shouldReconnect: function() {
          return false
        }
      }
    )
    this.retryCount += 1
    this.ws.onmessage = this._onMessage.bind(this)
    this.ws.onerror = this._onError.bind(this)
    this.ws.onclose = this._onClose.bind(this)
    this.ws.onopen = () => {
      this._sendGzip({ id: uuidv4().toLowerCase(), action: 'LIST_PENDING_MESSAGES' }, resp => {
        console.log(resp)
        this.connecting = false
        store.dispatch('setLinkStatus', LinkStatus.CONNECTED)
      })
    }
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
    console.log('---onclose--')
    this.connecting = false
    if (event.code === 1008 || event.code === 1000) return
    console.log('---should reconnect--')
  }
  _onError(event) {
    console.log('-------onerrror--')
    this.connecting = false
    console.log(event)
    store.dispatch('setLinkStatus', LinkStatus.ERROR)
  }
  _clearSendGzipQueue() {
    const pendingTask = this.sendGzipQueue.shift()
    if (pendingTask) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.transactions[pendingTask[0].id] = pendingTask[1]
        this.ws.send(pako.gzip(JSON.stringify(pendingTask[0])))
      } else {
        this.sendGzipQueue.unshift(pendingTask)
      }
    }
    if (this.sendGzipQueue.length > 0) {
      setTimeout(() => {
        this._clearSendGzipQueue()
      }, 300)
    }
  }
  _sendGzip(data, result) {
    this.sendGzipQueue.push([data, result])
    this._clearSendGzipQueue()
  }
  closeBlaze() {
    if (this.ws) {
      this.ws.close(3001, 'Unauthorized')
      clearDb()
      router.push('/sign_in')
    }
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

  sendMessage(message) {
    this._sendGzip(message, function(resp) {})
  }

  sendMessagePromise(message) {
    return new Promise((resolve, reject) => {
      const sendMessageTimer = setTimeout(() => {
        this.connect()
        reject(this.TIMEOUT)
      }, 5000)
      this._sendGzip(message, resp => {
        if (resp.data) {
          resolve(resp.data)
        } else if (resp.error) {
          reject(resp.error)
        } else {
          resolve(resp)
        }
        clearTimeout(sendMessageTimer)
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
