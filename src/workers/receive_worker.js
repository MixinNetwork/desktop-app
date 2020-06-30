import { v4 as uuidv4 } from 'uuid'
import conversationDao from '@/dao/conversation_dao'
import floodMessageDao from '@/dao/flood_message_dao'
import messageDao from '@/dao/message_dao'
import userDao from '@/dao/user_dao'
import participantDao from '@/dao/participant_dao'
import participantSessionDao from '@/dao/participant_session_dao'
import jobDao from '@/dao/job_dao'
import assetDao from '@/dao/asset_dao'
import snapshotDao from '@/dao/snapshot_dao'
import stickerDao from '@/dao/sticker_dao'
import circleDao from '@/dao/circle_dao'
import circleConversationDao from '@/dao/circle_conversation_dao'
import resendMessageDao from '@/dao/resend_message_dao'
import BaseWorker from './base_worker'
import store from '@/store/store'
import signalProtocol from '@/crypto/signal'
import i18n from '@/utils/i18n'
import moment from 'moment'
import { sendNotification, generateConversationId } from '@/utils/util'
import contentUtil from '@/utils/content_util'
import { checkSignalKey } from '@/utils/signal_key_util'
import { remote } from 'electron'
import snapshotApi from '@/api/snapshot'
import messageMentionDao from '@/dao/message_mention_dao'
import {
  messageType,
  MessageCategories,
  MessageStatus,
  MediaStatus,
  ConversationStatus,
  SystemUser,
  SystemConversationAction,
  ConversationCategory,
  SystemUserMessageAction,
  SystemCircleMessageAction
} from '@/utils/constants'

import interval from 'interval-promise'
import { downloadAndRefresh, downloadSticker, downloadQueue } from '@/utils/attachment_util'
let { BrowserWindow } = remote

const insertMessageQueue = []
const makeMessageReadQueue = []

function insertMessageQueuePush(message, callback) {
  insertMessageQueue.push([message, callback])
}

function makeMessageReadQueuePush(blazeMessage, conversationId, messageId) {
  makeMessageReadQueue.push([blazeMessage, conversationId, messageId])
}

function refreshMessages(messageIdsMap) {
  Object.keys(messageIdsMap).forEach(conversationId => {
    const messageIds = messageIdsMap[conversationId]
    store.dispatch('refreshMessage', {
      conversationId,
      messageIds
    })
  })
}

interval(
  async(_, stop) => {
    if (insertMessageQueue.length) {
      let i = 20
      const messageList = []
      const callbackList = []
      const messageIdsMap = {}
      while (i > 0 && insertMessageQueue.length > 0) {
        i--
        const temp = insertMessageQueue.shift()
        if (temp) {
          messageList.push(temp[0])
          callbackList.push(temp[1])
          const conversationId = temp[0].conversation_id
          const messageId = temp[0].message_id
          messageIdsMap[conversationId] = messageIdsMap[conversationId] || []
          messageIdsMap[conversationId].push(messageId)
          if (store.state.currentConversationId === conversationId) {
            if (!BrowserWindow.getFocusedWindow() && !store.state.tempUnreadMessageId) {
              store.dispatch('setTempUnreadMessageId', messageId)
            }
            if (BrowserWindow.getFocusedWindow() && store.state.tempUnreadMessageId) {
              store.dispatch('setTempUnreadMessageId', '')
            }
          }
        }
      }
      // messageDao.insertMessages(messageList)
      const promiseList = []
      callbackList.forEach(callback => {
        if (callback) {
          const temp = new Promise((resolve, reject) => {
            callback()
            resolve(true)
          })
          promiseList.push(temp)
        }
      })
      Promise.all(promiseList).then(() => {
        refreshMessages(messageIdsMap)
      })
    }
    if (makeMessageReadQueue.length) {
      let i = 20
      const jobList = []
      const messageIdsMap = {}
      while (i > 0 && makeMessageReadQueue.length > 0) {
        i--
        const temp = makeMessageReadQueue.shift()
        if (temp) {
          jobList.push({
            job_id: uuidv4(),
            action: 'CREATE_MESSAGE',
            created_at: new Date().toISOString(),
            order_id: null,
            priority: 5,
            user_id: null,
            blaze_message: JSON.stringify(temp[0]),
            conversation_id: temp[1],
            resend_message_id: null,
            run_count: 0
          })
          messageIdsMap[temp[1]] = messageIdsMap[temp[1]] || []
          messageIdsMap[temp[1]].push(temp[2])
        }
      }
      jobDao.insertJobs(jobList)
      refreshMessages(messageIdsMap)
    }
  },
  70,
  { stopOnError: false }
)

let lastCheckSignalTime = 0

class ReceiveWorker extends BaseWorker {
  async doWork() {
    await wasmObject.then(result => {})
    const fms = floodMessageDao.findFloodMessage()
    if (!fms || !fms.length) {
      return
    }

    for (const fm of fms) {
      try {
        await this.process(fm)
      } catch (err) {
        console.log(err)
        this.updateRemoteMessageStatus(fm.message_id, MessageStatus.DELIVERED)
      }
      floodMessageDao.delete(fm.message_id)
    }
  }

  async process(floodMessage) {
    if (this.isExistMessage(floodMessage.message_id)) {
      this.updateRemoteMessageStatus(floodMessage.message_id, MessageStatus.DELIVERED)
      return
    }
    const data = JSON.parse(floodMessage.data)
    const conversation = conversationDao.getSimpleConversationItem(data.conversation_id)
    if (data.conversation_id && (!conversation || data.category !== MessageCategories.SYSTEM_CONVERSATION)) {
      await this.syncConversation(data)
    }
    if (data.category.startsWith('SIGNAL_')) {
      await this.processSignalMessage(data)
    } else if (data.category.startsWith('PLAIN_')) {
      await this.processPlainMessage(data)
    } else if (data.category.startsWith('SYSTEM_')) {
      await this.processSystemMessage(data)
    } else if (data.category === 'APP_BUTTON_GROUP' || data.category === 'APP_CARD') {
      await this.processApp(data)
    } else if (data.category === 'MESSAGE_RECALL') {
      await this.processRecallMessage(data)
    }
    this.updateRemoteMessageStatus(floodMessage.message_id, MessageStatus.DELIVERED)
  }

  async processSignalMessage(data) {
    const deviceId = signalProtocol.convertToDeviceId(data.session_id)
    const plaintext = signalProtocol.decryptMessage(
      data.conversation_id,
      data.user_id,
      deviceId,
      data.data,
      data.category
    )
    if (plaintext) {
      await this.processDecryptSuccess(data, plaintext)
    } else {
      console.log('decrypt failed: ' + data.category)
      console.log(JSON.stringify(data))

      const nowTime = new Date().getTime()
      if (nowTime - lastCheckSignalTime > 3600000) {
        lastCheckSignalTime = nowTime
        await wasmObject.then(() => {})
        await checkSignalKey()
      }

      if (data.category === MessageCategories.SIGNAL_KEY) {
        return
      }
      const message = {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        user_id: data.user_id,
        category: data.category,
        status: MessageStatus.FAILED,
        created_at: data.created_at,
        quote_message_id: data.quote_message_id
      }
      messageDao.insertMessage(message)
      insertMessageQueuePush(message, async() => {})
    }
  }
  async processApp(data) {
    let status = data.status
    if (store.state.currentConversationId === data.conversation_id && data.user_id !== this.getAccountId()) {
      status = MessageStatus.READ
    }
    const decoded = decodeURIComponent(escape(window.atob(data.data)))
    const message = {
      message_id: data.message_id,
      conversation_id: data.conversation_id,
      user_id: data.user_id,
      category: data.category,
      content: decoded,
      status: status,
      created_at: data.created_at
    }
    if (data.representative_id) {
      message.user_id = data.representative_id
    }
    messageDao.insertMessage(message)
    insertMessageQueuePush(message, async() => {
      this.makeMessageRead(data.conversation_id, data.message_id, data.user_id, status)
    })
  }

  async processRecallMessage(data) {
    const recallMassage = JSON.parse(decodeURIComponent(escape(window.atob(data.data))))
    let message = messageDao.getMessageById(recallMassage.message_id)
    if (message) {
      messageDao.recallMessage(recallMassage.message_id)
      let quoteItem = messageDao.findMessageItemById(data.conversation_id, recallMassage.message_id)
      if (quoteItem) {
        messageDao.updateQuoteContentByQuoteId(
          data.conversation_id,
          recallMassage.message_id,
          JSON.stringify(quoteItem)
        )
      }
      store.dispatch('refreshMessage', {
        conversationId: data.conversation_id,
        messageIds: [recallMassage.message_id]
      })
    }

    this.makeMessageRead(data.conversation_id, data.message_id, data.user_id, status)
  }

  async processSystemMessage(data) {
    const json = decodeURIComponent(escape(window.atob(data.data)))
    const systemMessage = JSON.parse(json)
    if (data.category === MessageCategories.SYSTEM_CONVERSATION) {
      if (systemMessage.action !== SystemConversationAction.UPDATE) {
        await this.syncConversation(systemMessage)
      }
      await this.processSystemConversationMessage(data, systemMessage)
    } else if (data.category === MessageCategories.SYSTEM_USER) {
      if (systemMessage.action === SystemUserMessageAction.UPDATE) {
        await this.syncUser(systemMessage.user_id)
      }
    } else if (data.category === MessageCategories.SYSTEM_CIRCLE) {
      this.processSystemCircleMessage(data, systemMessage)
    } else if (data.category === MessageCategories.SYSTEM_ACCOUNT_SNAPSHOT) {
      this.processSystemSnapshotMessage(data, systemMessage)
    }
    this.updateRemoteMessageStatus(data.message_id, MessageStatus.READ)
  }

  async processSystemSnapshotMessage(data, decodedData) {
    var status = data.status
    if (store.state.currentConversationId === data.conversation_id && data.user_id !== this.getAccountId()) {
      status = MessageStatus.READ
    }

    if (decodedData.snapshot_id) {
      const snapshotResp = await snapshotApi.getSnapshots(decodedData.snapshot_id)
      const snapshotData = snapshotResp.data.data
      if (snapshotData) {
        const snapshot = {
          snapshot_id: '',
          type: '',
          asset_id: '',
          amount: '',
          created_at: '',
          opponent_id: '',
          transaction_hash: '',
          sender: '',
          receiver: '',
          memo: '',
          confirmations: 0
        }
        Object.assign(snapshot, snapshotData)
        snapshotDao.insert(snapshot)

        const findAsset = assetDao.getAssetById(snapshot.asset_id)
        if (!findAsset) {
          const assetResp = await snapshotApi.getAssets(snapshot.asset_id)
          const assetData = assetResp.data.data
          if (assetData) {
            const asset = {
              asset_id: '',
              symbol: '',
              name: '',
              icon_url: '',
              balance: '',
              destination: '',
              tag: '',
              price_btc: '',
              price_usd: '',
              chain_id: '',
              change_usd: '',
              change_btc: '',
              confirmations: 0,
              asset_key: ''
            }
            Object.assign(asset, assetData)
            assetDao.insert(asset)
          }
        }
      }
    }

    const message = {
      message_id: data.message_id,
      conversation_id: data.conversation_id,
      user_id: data.user_id,
      category: data.category,
      content: JSON.stringify(decodedData),
      status: status,
      created_at: data.created_at,
      snapshot_id: decodedData.snapshot_id
    }
    messageDao.insertMessage(message)
    insertMessageQueuePush(message, async() => {
      this.makeMessageRead(data.conversation_id, data.message_id, data.user_id, status)
    })
  }

  async processSystemCircleMessage(data, systemMessage) {
    let conversationId = systemMessage.conversation_id
    switch (systemMessage.action) {
      case SystemCircleMessageAction.CREATE:
      case SystemCircleMessageAction.UPDATE:
        this.refreshCircleById(systemMessage.circle_id)
        break
      case SystemCircleMessageAction.ADD:
        if (circleDao.findCircleById(systemMessage.circle_id) == null) {
          this.refreshCircleById(systemMessage.circle_id)
        }
        if (systemMessage.user_id) {
          await this.syncUser(systemMessage.user_id)
          conversationId = generateConversationId(this.getAccountId(), systemMessage.user_id)
        }
        circleConversationDao.insertUpdate([
          {
            circle_id: systemMessage.circle_id,
            conversation_id: conversationId,
            user_id: systemMessage.user_id,
            created_at: data.updated_at,
            pin_time: ''
          }
        ])
        break
      case SystemCircleMessageAction.REMOVE:
        if (systemMessage.user_id) {
          conversationId = generateConversationId(this.getAccountId(), systemMessage.user_id)
        }
        circleConversationDao.deleteByIds(conversationId, systemMessage.circle_id)
        break
      case SystemCircleMessageAction.DELETE:
        circleDao.deleteCircleById(systemMessage.circle_id)
        circleConversationDao.deleteByCircleId(systemMessage.circle_id)
        break
      default:
    }
  }

  async processSystemConversationMessage(data, systemMessage) {
    let userId = data.user_id
    if (systemMessage.user_id) {
      userId = systemMessage.user_id
    }
    let status = data.status
    if (store.state.currentConversationId === data.conversation_id && data.user_id !== this.getAccountId()) {
      status = MessageStatus.READ
    }
    if (userId === SystemUser) {
      userDao.insertUser({
        user_id: SystemUser,
        full_name: '0',
        identity_number: 0,
        relationship: '',
        avatar_url: null,
        biography: '',
        mute_until: null,
        is_verified: 0,
        is_scam: 0,
        created_at: null
      })
    }
    const message = {
      message_id: data.message_id,
      conversation_id: data.conversation_id,
      user_id: userId,
      category: data.category,
      content: '',
      status: status,
      created_at: data.created_at,
      action: systemMessage.action,
      participant_id: systemMessage.participant_id
    }
    const accountId = this.getAccountId()
    if (
      systemMessage.action === SystemConversationAction.ADD ||
      systemMessage.action === SystemConversationAction.JOIN
    ) {
      participantDao.insert({
        conversation_id: data.conversation_id,
        user_id: systemMessage.participant_id,
        role: '',
        created_at: data.created_at
      })
      if (systemMessage.participant_id === accountId) {
        await this.refreshConversation(data.conversation_id)
      } else {
        await this.syncSession(data.conversation_id, [systemMessage.participant_id])
        await this.syncUser(systemMessage.participant_id)
      }
    } else if (
      systemMessage.action === SystemConversationAction.REMOVE ||
      systemMessage.action === SystemConversationAction.EXIT
    ) {
      if (systemMessage.participant_id === accountId) {
        conversationDao.updateConversationStatusById(data.conversation_id, ConversationStatus.QUIT)
      }
      store.dispatch('refreshParticipants', data.conversation_id)
      await this.syncUser(systemMessage.participant_id)
      participantDao.deleteAll(data.conversation_id, [systemMessage.participant_id])
      participantSessionDao.delete(data.conversation_id, systemMessage.participant_id)
      participantSessionDao.updateStatusByConversationId(data.conversation_id)
      signalProtocol.clearSenderKey(data.conversation_id, this.getAccountId(), this.getDeviceId())
    } else if (systemMessage.action === SystemConversationAction.CREATE) {
    } else if (systemMessage.action === SystemConversationAction.UPDATE) {
      if (systemMessage.participant_id) {
        await this.syncUser(systemMessage.participant_id)
      }
      await this.refreshConversation(data.conversation_id)
      return
    } else if (systemMessage.action === SystemConversationAction.ROLE) {
      participantDao.updateParticipantRole(data.conversation_id, systemMessage.participant_id, systemMessage.role || '')
      store.dispatch('refreshParticipants', data.conversation_id)
      if (message.participant_id !== accountId) {
        return
      }
    }
    messageDao.insertMessage(message)
    insertMessageQueuePush(message, async() => {
      this.makeMessageRead(data.conversation_id, data.message_id, data.user_id, status)
    })
  }

  async processPlainMessage(data) {
    if (data.category === 'PLAIN_JSON') {
      const plain = window.atob(data.data)
      const plainData = JSON.parse(plain)
      if (
        plainData.action === 'ACKNOWLEDGE_MESSAGE_RECEIPTS' &&
        plainData.ack_messages &&
        plainData.ack_messages.length > 0
      ) {
        this.makeMessageStatus(plainData.ack_messages)
      } else if (plainData.action === 'RESEND_MESSAGES') {
        const p = participantDao.findParticipantById(data.conversation_id, data.user_id)
        if (!p) {
          return
        }
        for (let messageId of plainData.messages) {
          const resendMessage = resendMessageDao.findResendMessage(data.user_id, messageId)
          if (resendMessage) {
            continue
          }
          const needResendMessage = messageDao.findMessageById(messageId, this.getAccountId())
          if (needResendMessage && needResendMessage.category !== 'MESSAGE_RECALL') {
            if (moment(p.createdAt).isAfter(needResendMessage.createdAt)) {
              continue
            }
            resendMessageDao.insertMessage(messageId, data.user_id, data.session_id, 1)
          } else {
            resendMessageDao.insertMessage(messageId, data.user_id, data.session_id, 0)
          }
          jobDao.insertSendingJob(messageId, data.conversation_id)
        }
      } else if (plainData.action === 'RESEND_KEY') {
        if (signalProtocol.containsUserSession(data.user_id)) {
          await this.sendSenderKey(data.conversation_id, data.user_id, data.session_id)
        }
      }
    } else if (
      data.category === 'PLAIN_TEXT' ||
      data.category === 'PLAIN_POST' ||
      data.category === 'PLAIN_LOCATION' ||
      data.category === 'PLAIN_IMAGE' ||
      data.category === 'PLAIN_VIDEO' ||
      data.category === 'PLAIN_DATA' ||
      data.category === 'PLAIN_AUDIO' ||
      data.category === 'PLAIN_STICKER' ||
      data.category === 'PLAIN_CONTACT' ||
      data.category === 'PLAIN_LIVE'
    ) {
      if (data.representative_id) {
        data.user_id = data.representative_id
      }
      await this.processDecryptSuccess(data, data.data)
    }
  }

  makeMessageStatus(messages) {
    const messageIds = []
    for (let m of messages) {
      if (m.status !== 'READ' && m.status !== 'MENTION_READ') {
        continue
      }
      if (m.status === 'MENTION_READ') {
        messageMentionDao.markMentionRead(m.message_id)
        store.dispatch('markMentionRead', {
          conversationId: '',
          messageId: m.message_id
        })
        continue
      }
      if (m.status === 'READ') {
        messageIds.push(m.message_id)
      }
    }
    if (messageIds.length > 0) {
      messageDao.markMessageRead(messageIds)
      const conversations = messageDao.findConversationsByMessages(messageIds)
      conversations.forEach(c => {
        messageDao.takeUnseen(this.getAccountId(), c.conversation_id)
        store.dispatch('refreshMessage', {
          conversationId: c.conversation_id,
          messageIds: messageIds
        })
      })
    }
  }

  insertDownloadMessage(message) {
    messageDao.insertMessage(message)
    insertMessageQueuePush(message, async() => {
      const offset = new Date().valueOf() - new Date(message.created_at).valueOf()
      if (offset <= 1800000 && store.state.currentConversationId === message.conversation_id) {
        downloadQueue.push(downloadAndRefresh, {
          args: message
        })
      }
    })
  }

  async processDecryptSuccess(data, plaintext) {
    const user = await this.syncUser(data.user_id)
    let status = data.status
    if (BrowserWindow.getFocusedWindow() && store.state.currentConversationId === data.conversation_id && data.user_id !== this.getAccountId()) {
      status = MessageStatus.READ
    }
    let quoteMessage = messageDao.findMessageItemById(data.conversation_id, data.quote_message_id)
    let quoteContent = null
    if (quoteMessage) {
      quoteContent = JSON.stringify(quoteMessage)
    }
    const curMessageType = messageType(data.category)
    if (curMessageType === 'text') {
      let plain = plaintext
      if (data.category === 'PLAIN_TEXT') {
        plain = decodeURIComponent(escape(window.atob(plaintext)))
      }
      const message = {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        user_id: data.user_id,
        category: data.category,
        content: plain,
        status: status,
        created_at: data.created_at,
        quote_message_id: data.quote_message_id,
        quote_content: quoteContent
      }
      let quoteMe = quoteMessage && quoteMessage.userId === this.getAccountId() && data.user_id !== this.getAccountId()
      contentUtil.parseMention(
        plain,
        data.conversation_id,
        data.message_id,
        messageMentionDao,
        this.getAccountId() === data.user_id,
        quoteMe
      )
      messageDao.insertMessage(message)
      const mentionIds = contentUtil.parseMentionIdentityNumber(plain)
      if (mentionIds.length > 0) {
        const users = userDao.findUsersByIdentityNumber(mentionIds)
        users.forEach(user => {
          if (user) {
            const id = user.identity_number
            const mentionName = `@${user.full_name}`
            const regx = new RegExp(`@${id}`, 'g')
            plain = plain.replace(regx, mentionName)
          }
        })
      }
      insertMessageQueuePush(message, async() => {
        this.showNotification(data.conversation_id, user.user_id, user.full_name, plain, data.source, data.created_at)
      })
    } else if (curMessageType === 'post') {
      let plain = plaintext
      if (data.category === 'PLAIN_POST') {
        plain = decodeURIComponent(escape(window.atob(plaintext)))
      }
      const message = {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        user_id: data.user_id,
        category: data.category,
        content: plain,
        status: status,
        created_at: data.created_at,
        quote_message_id: data.quote_message_id,
        quote_content: quoteContent
      }
      messageDao.insertMessage(message)
      insertMessageQueuePush(message, async() => {
        plain = contentUtil.renderMdToText(plain)
        this.showNotification(data.conversation_id, user.user_id, user.full_name, plain, data.source, data.created_at)
      })
    } else if (curMessageType === 'location') {
      let plain = plaintext
      if (data.category === 'PLAIN_LOCATION') {
        plain = decodeURIComponent(escape(window.atob(plaintext)))
      }
      const message = {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        user_id: data.user_id,
        category: data.category,
        content: plain,
        status: status,
        created_at: data.created_at,
        quote_message_id: data.quote_message_id,
        quote_content: quoteContent
      }
      messageDao.insertMessage(message)
      insertMessageQueuePush(message, async() => {
        const body = i18n.t('notification.sendLocation')
        this.showNotification(data.conversation_id, user.user_id, user.full_name, body, data.source, data.created_at)
      })
    } else if (curMessageType === 'image') {
      var decoded = window.atob(plaintext)
      var mediaData = JSON.parse(decoded)
      if (mediaData.width === null || mediaData.width === 0 || mediaData.height === null || mediaData.height === 0) {
        return
      }
      const message = {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        user_id: data.user_id,
        category: data.category,
        content: mediaData.attachment_id,
        media_mime_type: mediaData.mime_type,
        media_size: mediaData.size,
        media_duration: mediaData.duration,
        media_width: mediaData.width,
        media_height: mediaData.height,
        thumb_image: mediaData.thumbnail,
        media_key: mediaData.key,
        media_digest: mediaData.digest,
        media_status: MediaStatus.CANCELED,
        status: status,
        created_at: data.created_at,
        quote_message_id: data.quote_message_id,
        quote_content: quoteContent
      }
      this.insertDownloadMessage(message)
      const body = i18n.t('notification.sendPhoto')
      this.showNotification(data.conversation_id, user.user_id, user.full_name, body, data.source, data.created_at)
    } else if (curMessageType === 'video') {
      const decoded = decodeURIComponent(escape(window.atob(plaintext)))
      const mediaData = JSON.parse(decoded)
      if (mediaData.width === null || mediaData.width === 0 || mediaData.height === null || mediaData.height === 0) {
        return
      }
      const message = {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        user_id: data.user_id,
        category: data.category,
        content: mediaData.attachment_id,
        media_mime_type: mediaData.mime_type,
        media_size: mediaData.size,
        media_duration: mediaData.duration,
        media_width: mediaData.width,
        media_height: mediaData.height,
        thumb_image: mediaData.thumbnail,
        media_key: mediaData.key,
        media_digest: mediaData.digest,
        media_status: MediaStatus.CANCELED,
        status: status,
        created_at: data.created_at,
        name: data.name,
        quote_message_id: data.quote_message_id,
        quote_content: quoteContent
      }
      this.insertDownloadMessage(message)
      const body = i18n.t('notification.sendVideo')
      this.showNotification(data.conversation_id, user.user_id, user.full_name, body, data.source, data.created_at)
    } else if (curMessageType === 'file') {
      const decoded = decodeURIComponent(escape(window.atob(plaintext)))
      const mediaData = JSON.parse(decoded)
      const message = {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        user_id: data.user_id,
        category: data.category,
        content: mediaData.attachment_id,
        media_mime_type: mediaData.mime_type,
        media_size: mediaData.size,
        media_key: mediaData.key,
        media_digest: mediaData.digest,
        media_status: MediaStatus.CANCELED,
        status: status,
        created_at: data.created_at,
        name: mediaData.name,
        quote_message_id: data.quote_message_id,
        quote_content: quoteContent
      }
      this.insertDownloadMessage(message)
      const body = i18n.t('notification.sendFile')
      this.showNotification(data.conversation_id, user.user_id, user.full_name, body, data.source, data.created_at)
    } else if (curMessageType === 'audio') {
      const decoded = decodeURIComponent(escape(window.atob(plaintext)))
      const mediaData = JSON.parse(decoded)
      const message = {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        user_id: data.user_id,
        category: data.category,
        content: mediaData.attachment_id,
        media_size: mediaData.size,
        media_duration: mediaData.duration,
        media_key: mediaData.key,
        media_digest: mediaData.digest,
        media_status: MediaStatus.CANCELED,
        status: status,
        created_at: data.created_at,
        media_waveform: mediaData.waveform,
        quote_message_id: data.quote_message_id,
        quote_content: quoteContent
      }
      this.insertDownloadMessage(message)
      const body = i18n.t('notification.sendAudio')
      this.showNotification(data.conversation_id, user.user_id, user.full_name, body, data.source, data.created_at)
    } else if (curMessageType === 'sticker') {
      const decoded = window.atob(plaintext)
      const stickerData = JSON.parse(decoded)
      const stickerId = stickerData.sticker_id
      const message = {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        user_id: data.user_id,
        category: data.category,
        status: status,
        created_at: data.created_at,
        name: stickerData.name,
        album_id: stickerData.album_id,
        sticker_id: stickerId,
        quote_message_id: data.quote_message_id,
        quote_content: quoteContent
      }
      messageDao.insertMessage(message)
      const sticker = stickerDao.getStickerByUnique(stickerId)
      if (!sticker || !sticker.asset_url.startsWith('file://')) {
        await downloadSticker(stickerId)
      }
      insertMessageQueuePush(message, async() => {
        const body = i18n.t('notification.sendSticker')
        this.showNotification(data.conversation_id, user.user_id, user.full_name, body, data.source, data.created_at)
      })
    } else if (curMessageType === 'contact') {
      const decoded = decodeURIComponent(escape(window.atob(plaintext)))
      const contactData = JSON.parse(decoded)
      const message = {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        user_id: data.user_id,
        category: data.category,
        content: plaintext,
        status: status,
        created_at: data.created_at,
        shared_user_id: contactData.user_id,
        quote_message_id: data.quote_message_id,
        quote_content: quoteContent
      }
      messageDao.insertMessage(message)
      await this.syncUser(contactData.user_id)
      insertMessageQueuePush(message, async() => {
        const body = i18n.t('notification.sendContact')
        this.showNotification(data.conversation_id, user.user_id, user.full_name, body, data.source, data.created_at)
      })
    } else if (curMessageType === 'live') {
      const decoded = decodeURIComponent(escape(window.atob(plaintext)))
      const liveData = JSON.parse(decoded)
      const message = {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        user_id: data.user_id,
        category: data.category,
        content: plaintext,
        media_url: liveData.url,
        media_width: liveData.width,
        media_height: liveData.height,
        status: status,
        created_at: data.created_at,
        thumb_url: liveData.thumb_url,
        quote_message_id: data.quote_message_id,
        quote_content: quoteContent
      }
      messageDao.insertMessage(message)
      insertMessageQueuePush(message, async() => {
        const body = i18n.t('notification.sendLive')
        this.showNotification(data.conversation_id, user.user_id, user.full_name, body, data.source, data.created_at)
      })
    } else if (curMessageType === 'unknown' && data.category !== MessageCategories.SIGNAL_KEY) {
      const message = {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        user_id: data.user_id,
        category: data.category,
        status: MessageStatus.UNKNOWN,
        created_at: data.created_at,
        quote_message_id: data.quote_message_id
      }
      messageDao.insertMessage(message)
      insertMessageQueuePush(message, async() => {})
      return
    }
    this.makeMessageRead(data.conversation_id, data.message_id, data.user_id, status)
  }

  showNotification(conversationId, userId, fullName, content, source, createdAt) {
    if (source === 'LIST_PENDING_MESSAGES') {
      return
    }
    if (remote.getCurrentWindow().isFocused()) {
      return
    }
    if (
      moment()
        .subtract(1, 'minute')
        .isAfter(createdAt)
    ) {
      return
    }
    const accountId = this.getAccountId()
    if (accountId === userId) {
      return
    }

    const conversation = conversationDao.getSimpleConversationItem(conversationId)
    if (!conversation) {
      return
    }
    if (conversation.category === ConversationCategory.CONTACT && conversation.ownerMuteUntil) {
      if (moment().isBefore(conversation.ownerMuteUntil)) {
        return
      }
    }
    if (conversation.category === ConversationCategory.GROUP && conversation.muteUntil) {
      if (moment().isBefore(conversation.muteUntil)) {
        return
      }
    }
    if (conversation.category === ConversationCategory.GROUP) {
      const body = fullName + ': ' + content
      sendNotification(conversation.groupName, body, conversation)
    } else if (conversation.category === ConversationCategory.CONTACT && conversation.ownerId !== userId) {
      const body = fullName + ': ' + content
      const user = userDao.findUserById(conversation.ownerId)
      sendNotification(user.full_name, body, conversation)
    } else {
      sendNotification(fullName, content, conversation)
    }
  }

  isExistMessage(messageId) {
    const message = messageDao.findMessageIdById(messageId)
    return message
  }

  updateRemoteMessageStatus(messageId, status) {
    if (status !== MessageStatus.DELIVERED && status !== MessageStatus.READ) {
      return
    }
    const blazeMessage = {
      message_id: messageId,
      status: status
    }
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

  makeMessageRead(conversationId, messageId, userId, status) {
    if (store.state.currentConversationId !== conversationId) {
      return
    }
    if (userId === this.getAccountId()) {
      return
    }
    this.updateRemoteMessageStatus(messageId, status)
    if (status !== MessageStatus.READ) {
      return
    }
    const blazeMessage = {
      message_id: messageId,
      status: status
    }
    makeMessageReadQueuePush(blazeMessage, conversationId, messageId)
  }
}

export default new ReceiveWorker()
