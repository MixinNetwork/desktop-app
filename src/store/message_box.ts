import moment from 'moment'
import messageDao from '@/dao/message_dao'
import { PerPageMessageCount, MessageStatus } from '@/utils/constants'
import store from '@/store/store'

class MessageBox {
  conversationId: any
  messagePositionIndex: any
  scrollAction: any
  messages: any
  pageDown: any
  tempCount: any
  newCount: any
  page: any
  callback: any
  count: any

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
      this.newCount = 0

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
        if (type.endsWith('_POST') || type.endsWith('_IMAGE') || type.endsWith('_STICKER')) {
          this.messages[i].fastLoad = true
          markdownCount--
        }
        if (markdownCount < 0) {
          break
        }
      }

      store.dispatch('setCurrentMessages', this.messages)
      this.scrollAction({ goBottom: this.messages.length, message: posMessage, isInit })
      this.callback({ unreadNum: 0 })
    }
  }

  clearMessagePositionIndex(index: any) {
    this.messagePositionIndex = index
  }
  clearUnreadNum(count: any) {
    this.newCount = count
  }
  isMine(findMessage: any) {
    // @ts-ignore
    const account: any = JSON.parse(localStorage.getItem('account'))
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
    if (conversationId === this.conversationId && this.conversationId) {
      if (messageIds && messageIds.length > 0) {
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
            if (matchIds.indexOf(id) < 0) {
              const findMessage = messageDao.getConversationMessageById(conversationId, id)
              if (!findMessage) return
              if (this.messages[0] && findMessage.createdAt < this.messages[0].createdAt) return
              findMessage.lt = moment(findMessage.createdAt).format('HH:mm')

              const isMyMsg = this.isMine(findMessage)

              if (this.pageDown === 0) {
                this.newCount++
                this.messages.push(findMessage)
                let newCount = this.newCount
                if (isMyMsg) {
                  newCount = 0
                }
                store.dispatch('setCurrentMessages', this.messages)
                this.callback({ unreadNum: newCount })
                this.scrollAction({ isMyMsg })
              } else {
                if (isMyMsg) {
                  if (findMessage.status === MessageStatus.SENT) {
                    this.setConversationId(conversationId, -1, false)
                  }
                } else {
                  this.newCount++
                  this.callback({ unreadNum: this.newCount })
                  this.tempCount = this.newCount % PerPageMessageCount
                  const lastCount = this.messagePositionIndex % PerPageMessageCount
                  this.pageDown += Math.floor((this.newCount + lastCount) / PerPageMessageCount)
                }
              }
            }
          })
        } else {
          store.dispatch('setCurrentMessages', this.messages)
          this.callback({ messages: this.messages })
        }
      }
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
        data = messageDao.getMessages(this.conversationId, --this.pageDown, -this.tempCount)
      } else {
        this.newCount = 0
        this.callback({ unreadNum: this.newCount })
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
  infiniteUpLock: boolean = false
  infiniteUp() {
    if (!this.infiniteUpLock) {
      this.infiniteUpLock = true
      this.infiniteScroll('up')
      this.infiniteUpLock = false
    } else {
      setTimeout(() => {
        this.infiniteDown()
      }, 10)
    }
  }
  infiniteDownLock: boolean = false
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
      this.newCount = 0
    }
  }
}

export default new MessageBox()
