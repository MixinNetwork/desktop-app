import moment from 'moment'
import messageDao from '@/dao/message_dao'
import { PerPageMessageCount, MessageStatus, messageType } from '@/utils/constants'
import store from '@/store/store'
import { getAccount } from '@/utils/util'

class MessageBox {
  conversationId: any
  messagePositionIndex: any
  scrollAction: any
  messages: any
  pageDown: any
  tempCount: any
  offsetPageDown: number = 0
  newMessageMap: any = {}
  page: any
  callback: any
  count: any
  infiniteUpLock: boolean = false
  infiniteDownLock: boolean = false

  setConversationId(conversationId: string, messagePositionIndex: number, isInit: boolean) {
    if (conversationId) {
      this.conversationId = conversationId
      this.messagePositionIndex = messagePositionIndex > 0 ? messagePositionIndex : 0
      let page = 0
      if (messagePositionIndex >= PerPageMessageCount) {
        page = Math.floor(messagePositionIndex / PerPageMessageCount)
      }
      this.messages = messageDao.getMessages(conversationId, page)
      this.page = page
      this.pageDown = page
      this.tempCount = 0
      this.offsetPageDown = 0
      this.newMessageMap = {}
      this.infiniteDownLock = false
      this.infiniteUpLock = false

      let posMessage: any = null
      if (messagePositionIndex >= 0) {
        posMessage = this.messages[this.messages.length - (messagePositionIndex % PerPageMessageCount) - 1]
        if (messagePositionIndex % PerPageMessageCount < 10) {
          this.infiniteDown()
        } else {
          this.infiniteUp()
        }
      }

      let markdownCount = 5
      for (let i = this.messages.length - 1; i >= 0; i--) {
        const type = this.messages[i].type
        if (['post', 'image', 'sticker'].indexOf(messageType(type)) > -1) {
          this.messages[i].fastLoad = true
          markdownCount--
        }
        if (markdownCount < 0) {
          break
        }
      }

      store.dispatch('setCurrentMessages', this.messages)
      this.scrollAction({ goBottom: this.messages.length, message: posMessage, isInit })
      let getLastMessage = false
      if (this.pageDown === 0) {
        getLastMessage = true
      }
      this.callback({ unreadNum: 0, getLastMessage })
    }
  }

  clearMessagePositionIndex(index: any) {
    this.messagePositionIndex = index
  }
  clearUnreadNum() {
    this.newMessageMap = {}
  }
  isMine(findMessage: any) {
    const account: any = getAccount()
    return findMessage.userId === account.user_id
  }
  refreshConversation(conversationId: any) {
    this.page = 0
    this.pageDown = 0
    this.tempCount = 0
    this.messages = messageDao.getMessages(conversationId, 0)
    store.dispatch('setCurrentMessages', this.messages)
  }

  refreshMessage(payload: any) {
    const { conversationId, messageIds } = payload

    if (!this.conversationId || conversationId !== this.conversationId) return

    if (this.infiniteDownLock || this.infiniteUpLock) return

    if (!messageIds || messageIds.length === 0) return

    const matchIds: any = []
    let count: number = messageIds.length

    for (let i = this.messages.length - 1; i >= 0; i--) {
      const item = this.messages[i]
      if (count <= 0) {
        break
      }
      if (messageIds.indexOf(item.messageId) > -1) {
        count--
        matchIds.push(item.messageId)
        const findMessage = messageDao.getConversationMessageById(conversationId, item.messageId)
        if (findMessage) {
          findMessage.lt = moment(findMessage.createdAt).format('HH:mm')
          this.messages[i] = findMessage
        }
      }
    }

    if (matchIds.length !== messageIds.length) {
      messageIds.forEach((id: string) => {
        if (matchIds.indexOf(id) > -1) return
        const findMessage = messageDao.getConversationMessageById(conversationId, id)
        if (!findMessage || (this.messages[0] && findMessage.createdAt < this.messages[0].createdAt)) return
        findMessage.lt = moment(findMessage.createdAt).format('HH:mm')
        const isMyMsg = this.isMine(findMessage)
        if (this.pageDown === 0) {
          this.messages.push(findMessage)
          if (!isMyMsg) {
            this.newMessageMap[id] = true
          }
          let newCount = Object.keys(this.newMessageMap).length
          store.dispatch('setCurrentMessages', this.messages)
          this.callback({ unreadNum: newCount })
          this.scrollAction({ isMyMsg })
        } else {
          if (isMyMsg) {
            if (findMessage.status === MessageStatus.SENT) {
              this.setConversationId(conversationId, -1, false)
            }
          } else if (!this.newMessageMap[id]) {
            this.newMessageMap[id] = true
            const newCount = Object.keys(this.newMessageMap).length
            this.callback({ unreadNum: newCount })
            this.tempCount = newCount % PerPageMessageCount
            const lastCount = this.messagePositionIndex % PerPageMessageCount
            const offset = Math.ceil((newCount + lastCount) / PerPageMessageCount) - this.offsetPageDown
            this.pageDown += offset
            this.offsetPageDown += offset
          }
        }
      })
    } else {
      store.dispatch('setCurrentMessages', this.messages)
      this.callback({ messages: this.messages })
    }
  }
  deleteMessages(messageIds: any[]) {
    messageDao.deleteMessagesById(messageIds)
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (messageIds[0] === this.messages[i].messageId) {
        this.messages.splice(i, 1)
        break
      }
    }
  }
  nextPage(direction: string): any {
    let data: unknown = []
    if (direction === 'down') {
      if (this.pageDown > 0) {
        let tempCount = 0
        if (this.tempCount > 0) {
          tempCount = this.tempCount - PerPageMessageCount
        }
        data = messageDao.getMessages(this.conversationId, --this.pageDown, tempCount)
      } else {
        this.newMessageMap = {}
        this.callback({ unreadNum: 0, getLastMessage: true })
      }
    } else {
      data = messageDao.getMessages(this.conversationId, ++this.page, this.tempCount)
    }
    return data
  }

  infiniteScroll(direction: any) {
    const messages = this.nextPage(direction)
    if (messages.length) {
      if (direction === 'down') {
        const newMessages = []
        const lastMessageId = this.messages[this.messages.length - 1].messageId
        for (let i = messages.length - 1; i >= 0; i--) {
          const temp = messages[i]
          if (temp.messageId === lastMessageId) {
            break
          }
          newMessages.unshift(temp)
        }
        this.messages.push(...newMessages)
        store.dispatch('setCurrentMessages', this.messages)
        this.callback({ messages: this.messages })
        setTimeout(() => {
          this.callback({ infiniteDownLock: false })
        }, 100)
      } else {
        const newMessages = []
        const firstMessageId = this.messages[0].messageId
        for (let i = 0; i < messages.length; i++) {
          const temp = messages[i]
          if (temp.messageId === firstMessageId) {
            break
          }
          newMessages.push(temp)
        }
        this.messages.unshift(...newMessages)
        store.dispatch('setCurrentMessages', this.messages)
        this.callback({ messages: this.messages })
        setTimeout(() => {
          this.callback({ infiniteUpLock: false })
        }, 100)
      }
    }
  }
  infiniteUp() {
    if (!this.infiniteUpLock) {
      this.infiniteUpLock = true
      this.infiniteScroll('up')
      this.infiniteUpLock = false
    } else {
      setTimeout(() => {
        this.infiniteUp()
      }, 10)
    }
  }
  infiniteDown() {
    if (!this.infiniteDownLock) {
      this.infiniteDownLock = true
      this.infiniteScroll('down')
      this.infiniteDownLock = false
    } else {
      setTimeout(() => {
        this.infiniteDown()
      }, 10)
    }
  }
  bindData(callback: any, scrollAction: any) {
    this.callback = callback
    this.scrollAction = scrollAction
  }
  clearData(conversationId: string) {
    if (conversationId === this.conversationId && this.conversationId) {
      this.page = 0
      this.messages = []
      this.newMessageMap = {}
    }
  }
}

export default new MessageBox()
