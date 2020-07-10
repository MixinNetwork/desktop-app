import moment from 'moment'
import messageDao from '@/dao/message_dao'
import { delMedia, getAccount } from '@/utils/util'
import { PerPageMessageCount, MessageStatus, messageType } from '@/utils/constants'
import store from '@/store/store'

class MessageBox {
  conversationId: any
  messagePositionIndex: any
  scrollAction: any
  pageDown: any
  tempCount: any
  offsetPageDown: number = 0
  newMessageMap: any = {}
  page: any
  callback: any
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
      const messages = messageDao.getMessages(conversationId, page)
      this.page = page
      this.pageDown = page
      this.tempCount = 0
      this.offsetPageDown = 0
      this.newMessageMap = {}
      this.infiniteDownLock = false
      this.infiniteUpLock = false

      let posMessage: any = null
      if (messagePositionIndex >= 0) {
        posMessage = messages[messages.length - (messagePositionIndex % PerPageMessageCount) - 1]
        if (messagePositionIndex % PerPageMessageCount < PerPageMessageCount / 2) {
          this.infiniteDown()
        } else {
          this.infiniteUp()
        }
      }

      let markdownCount = 5
      for (let i = messages.length - 1; i >= 0; i--) {
        const type = messages[i].type
        if (['post', 'image', 'sticker'].indexOf(messageType(type)) > -1) {
          messages[i].fastLoad = true
          markdownCount--
        }
        if (markdownCount < 0) {
          break
        }
      }

      store.dispatch('setCurrentMessages', messages)
      this.scrollAction({ goBottom: messages.length, message: posMessage, isInit })
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
    const messages = messageDao.getMessages(conversationId, 0)
    store.dispatch('setCurrentMessages', messages)
  }

  refreshMessage(payload: any) {
    const { conversationId, messageIds } = payload

    if (!this.conversationId || conversationId !== this.conversationId) return

    if (this.infiniteDownLock || this.infiniteUpLock) return

    if (!messageIds || messageIds.length === 0) return

    const matchIds: any = []

    const messages: any = store.state.currentMessages

    for (let i = messages.length - 1; i >= 0; i--) {
      const item = messages[i]
      const isQuote = messageIds.indexOf(item.quoteId) > -1
      if (messageIds.indexOf(item.messageId) > -1 || isQuote) {
        const findMessage = messageDao.getConversationMessageById(conversationId, item.messageId)
        if (findMessage) {
          findMessage.lt = moment(findMessage.createdAt).format('HH:mm')
          if (isQuote) {
            let quoteContent = JSON.parse(item.quoteContent)
            const findQuoteMessage = messageDao.getConversationMessageById(conversationId, quoteContent.messageId)
            if (!findQuoteMessage) {
              quoteContent.type = 'MESSAGE_RECALL'
            } else {
              quoteContent = findQuoteMessage
            }
            messages[i].quoteContent = JSON.stringify(quoteContent)
          } else {
            matchIds.push(item.messageId)
            messages[i] = findMessage
          }
        }
      }
    }

    if (matchIds.length !== messageIds.length) {
      messageIds.forEach((id: string) => {
        if (matchIds.indexOf(id) > -1) return
        const findMessage = messageDao.getConversationMessageById(conversationId, id)
        if (!findMessage || (messages[0] && findMessage.createdAt < messages[0].createdAt)) return
        findMessage.lt = moment(findMessage.createdAt).format('HH:mm')
        const isMyMsg = this.isMine(findMessage)
        if (this.pageDown === 0) {
          messages.push(findMessage)
          if (!isMyMsg) {
            this.newMessageMap[id] = true
          }
          let newCount = Object.keys(this.newMessageMap).length
          store.dispatch('setCurrentMessages', messages)
          this.page = Math.floor(messages.length / PerPageMessageCount) - 1
          this.callback({ unreadNum: newCount, getLastMessage: true })
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
      store.dispatch('setCurrentMessages', messages)
      this.callback({ updateMessages: true })
    }
  }
  deleteMessages(messageIds: any[]) {
    const messages = messageDao.getMessagesByIds(messageIds)
    delMedia(messages)
    messageDao.deleteMessageByIds(messageIds)
    const curMessages: any = store.state.currentMessages
    for (let i = curMessages.length - 1; i >= 0; i--) {
      if (messageIds[0] === curMessages[i].messageId) {
        curMessages.splice(i, 1)
        break
      }
    }
    store.dispatch('setCurrentMessages', curMessages)
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
    const messageIds: any = []
    const curMessages: any = store.state.currentMessages
    curMessages.forEach((item: any) => {
      messageIds.push(item.messageId)
    })
    if (direction === 'down') {
      if (!messages.length) {
        setTimeout(() => {
          this.callback({ infiniteDownLock: true })
        }, 100)
        return
      }
      const newMessages = []
      const lastMessageId = curMessages[curMessages.length - 1].messageId
      for (let i = messages.length - 1; i >= 0; i--) {
        const temp = messages[i]
        if (temp.messageId === lastMessageId) {
          break
        }
        if (messageIds.indexOf(temp.messageId) < 0) {
          newMessages.unshift(temp)
        }
      }
      curMessages.push(...newMessages)
      store.dispatch('setCurrentMessages', curMessages)
      this.callback({ updateMessages: true })
    } else {
      if (!messages.length) {
        setTimeout(() => {
          this.callback({ infiniteUpLock: true })
        }, 100)
        return
      }
      const newMessages = []
      const firstMessageId = curMessages[0].messageId
      for (let i = 0; i < messages.length; i++) {
        const temp = messages[i]
        if (temp.messageId === firstMessageId) {
          break
        }
        if (messageIds.indexOf(temp.messageId) < 0) {
          newMessages.push(temp)
        }
      }
      curMessages.unshift(...newMessages)
      store.dispatch('setCurrentMessages', curMessages)
      this.callback({ updateMessages: true })
    }
  }
  infiniteUp() {
    if (!this.infiniteUpLock) {
      this.infiniteUpLock = true
      this.infiniteScroll('up')
      this.infiniteUpLock = false
    }
  }
  infiniteDown() {
    if (!this.infiniteDownLock) {
      this.infiniteDownLock = true
      this.infiniteScroll('down')
      this.infiniteDownLock = false
    }
  }
  bindData(callback: any, scrollAction: any) {
    this.callback = callback
    this.scrollAction = scrollAction
  }
  clearData(conversationId: string) {
    if (conversationId === this.conversationId && this.conversationId) {
      this.page = 0
      store.dispatch('setCurrentMessages', [])
      this.newMessageMap = {}
    }
  }
}

export default new MessageBox()
