import moment from 'moment'
import messageDao from '@/dao/message_dao'
import { PerPageMessageCount } from '@/utils/constants'

class MessageBox {
  conversationId: any
  messagePositionIndex: any
  oldLastMessages: any
  scrollAction: any
  messages: any
  pageDown: any
  tempCount: any
  newCount: any
  page: any
  callback: any
  count: any
  // @ts-ignore
  account: any = JSON.parse(localStorage.getItem('account'))

  async setConversationId(conversationId: string, messagePositionIndex: number) {
    if (conversationId) {
      this.conversationId = conversationId
      this.messagePositionIndex = messagePositionIndex
      let page = 0
      if (messagePositionIndex >= PerPageMessageCount) {
        page = Math.floor(messagePositionIndex / PerPageMessageCount)
      }
      this.messages = messageDao.getMessages(conversationId, page)
      this.oldLastMessages = messageDao.getMessages(conversationId, 0)
      this.page = page
      this.pageDown = page
      this.tempCount = 0
      this.newCount = 0
      let posMessage = null
      if (messagePositionIndex > 0) {
        posMessage = this.messages[this.messages.length - (messagePositionIndex % PerPageMessageCount) - 1]
      }
      let newMessages: any = await this.nextPage('up')
      this.messages.unshift(...newMessages)

      if (this.page > 0) {
        newMessages = await this.nextPage('down')
        this.messages.push(...newMessages)
      }

      this.callback(this.messages)
      this.scrollAction(true, posMessage)
    }
  }
  clearMessagePositionIndex(index: any) {
    this.messagePositionIndex = index
  }
  clearUnreadNum(index: any) {
    this.newCount = index
  }
  isMine(findMessage: any) {
    return findMessage.userId === this.account.user_id
  }
  refreshConversation(conversationId: any) {
    this.page = 0
    this.pageDown = 0
    this.tempCount = 0
    this.messages = messageDao.getMessages(conversationId, 0)
    this.callback(this.messages)
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
          for (let i = 0; i < messageIds.length; i++) {
            const id = messageIds[i]

            if (matchIds.indexOf(id) < 0) {
              const findMessage = messageDao.getConversationMessageById(conversationId, id)
              findMessage.lt = moment(findMessage.createdAt).format('HH:mm')

              if (this.isMine(findMessage)) {
                this.setConversationId(conversationId, 0)
                this.scrollAction(true)
              } else {
                this.newCount++
                if (this.pageDown === 0) {
                  this.messages.push(findMessage)
                  this.callback(this.messages, this.newCount)
                  this.scrollAction(false)
                } else {
                  this.callback(null, this.newCount)
                }
                this.tempCount = this.newCount % PerPageMessageCount
                const lastCount = this.messagePositionIndex % PerPageMessageCount
                this.pageDown += Math.floor((this.newCount + lastCount) / PerPageMessageCount)
              }
            }
          }
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
    return new Promise(resolve => {
      let data: unknown = []
      if (direction === 'down') {
        if (this.pageDown > 0) {
          data = messageDao.getMessages(this.conversationId, --this.pageDown, -this.tempCount)
        }
      } else {
        data = messageDao.getMessages(this.conversationId, ++this.page, this.tempCount)
      }
      setTimeout(() => {
        resolve(data)
      })
    })
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
