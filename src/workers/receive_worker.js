import uuidv4 from 'uuid/v4'
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
import resendMessageDao from '@/dao/resend_message_dao'
import BaseWorker from './base_worker'
import store from '@/store/store'
import signalProtocol from '@/crypto/signal'
import i18n from '@/utils/i18n'
import moment from 'moment'
import { sendNotification } from '@/utils/util'
import contentUtil from '@/utils/content_util'
import { remote } from 'electron'
import snapshotApi from '@/api/snapshot'

import { downloadAttachment, downloadQueue } from '@/utils/attachment_util'

import {
  MessageStatus,
  MediaStatus,
  ConversationStatus,
  SystemUser,
  SystemConversationAction,
  ConversationCategory
} from '@/utils/constants'
class ReceiveWorker extends BaseWorker {
  async doWork() {
    const fms = floodMessageDao.findFloodMessage()
    if (!fms) {
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
    await this.syncConversation(data)
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
      console.log('decrypt failed')
      console.log(data)
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
    messageDao.insertMessage(message)
    this.makeMessageRead(data.conversation_id, data.message_id, data.user_id, status)
    store.dispatch('refreshMessage', data.conversation_id)
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
    }

    this.makeMessageRead(data.conversation_id, data.message_id, data.user_id, status)
    store.dispatch('refreshMessage', data.conversation_id)
  }

  async processSystemMessage(data) {
    if (data.category === 'SYSTEM_CONVERSATION') {
      const json = decodeURIComponent(escape(window.atob(data.data)))
      const systemMessage = JSON.parse(json)
      await this.processSystemConversationMessage(data, systemMessage)
    } else if (data.category === 'SYSTEM_ACCOUNT_SNAPSHOT') {
      this.processSystemSnapshotMessage(data)
    }
    store.dispatch('refreshMessage', data.conversation_id)
  }

  async processSystemSnapshotMessage(data) {
    var status = data.status
    if (store.state.currentConversationId === data.conversation_id && data.user_id !== this.getAccountId()) {
      status = MessageStatus.READ
    }
    const decoded = decodeURIComponent(escape(window.atob(data.data)))
    const decodedData = JSON.parse(decoded)

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
      content: decoded,
      status: status,
      created_at: data.created_at,
      snapshot_id: decodedData.snapshot_id
    }
    messageDao.insertMessage(message)
    store.dispatch('refreshMessage', data.conversation_id)
    this.makeMessageRead(data.conversation_id, data.message_id, data.user_id, status)
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
    const accountId = JSON.parse(localStorage.getItem('account')).user_id
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
      participantDao.deleteAll(data.conversation_id, [systemMessage.participant_id])
      store.dispatch('refreshParticipants', data.conversation_id)
      await this.syncUser(systemMessage.participant_id)
      participantSessionDao.delete(data.conversation_id, systemMessage.participant_id)
      participantSessionDao.updateStatusByConversationId(data.conversation_id)
    } else if (systemMessage.action === SystemConversationAction.CREATE) {
    } else if (systemMessage.action === SystemConversationAction.UPDATE) {
      await this.refreshConversation(data.conversation_id)
      return
    } else if (systemMessage.action === SystemConversationAction.ROLE) {
      participantDao.updateParticipantRole(data.conversation_id, systemMessage.participant_id, systemMessage.role)
      if (message.participant_id !== accountId) {
        return
      }
    }
    messageDao.insertMessage(message)
    this.makeMessageRead(data.conversation_id, data.message_id, data.user_id, status)
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
        plainData.messages.forEach(msg => {
          const resendMessage = resendMessageDao.findResendMessage(data.user_id, msg)
          if (resendMessage) {
            return
          }
          const needResendMessage = messageDao.getMessageById(msg)
          if (needResendMessage && needResendMessage.category !== 'MESSAGE_RECALL') {
            resendMessageDao.insertMessage(msg, data.user_id, data.session_id, 1)
          } else {
            resendMessageDao.insertMessage(msg, data.user_id, data.session_id, 0)
          }
        })
      } else if (plainData.action === 'RESEND_KEY') {
        if (signalProtocol.containsUserSession(data.user_id)) {
          await this.sendSenderKey(data.conversation_id, data.user_id, data.session_id)
        }
      }
    } else if (
      data.category === 'PLAIN_TEXT' ||
      data.category === 'PLAIN_POST' ||
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
    const conversationSet = new Set()
    messages.filter(message => {
      const messageId = message.message_id
      const simple = messageDao.findSimpleMessageById(messageId)
      if (simple && simple.status && simple.status !== MessageStatus.READ) {
        conversationSet.add(simple.conversation_id)
        return true
      } else {
        return false
      }
    }).forEach(msg => {
      messageDao.updateMessageStatusById(msg.status, msg.message_id)
    })
    conversationSet.forEach(conversationId => {
      messageDao.takeUnseen(this.getAccountId(), conversationId)
      store.dispatch('refreshMessage', conversationId)
    })
  }

  insertDownloadMessage(message) {
    messageDao.insertMessage(message)
    const offset = new Date().valueOf() - new Date(message.created_at).valueOf()
    if (offset <= 7200000) {
      store.dispatch('startLoading', message.message_id)
      downloadQueue.push(this.download, {
        args: message
      })
    }
  }

  async download(message) {
    try {
      const [m, filePath] = await downloadAttachment(message)
      messageDao.updateMediaMessage('file://' + filePath, MediaStatus.DONE, m.message_id)
      store.dispatch('stopLoading', m.message_id)
      store.dispatch('refreshMessage', m.conversation_id)
    } catch (e) {
      messageDao.updateMediaMessage(null, MediaStatus.CANCELED, message.message_id)
      store.dispatch('stopLoading', message.message_id)
      store.dispatch('refreshMessage', message.conversation_id)
    }
  }

  async processDecryptSuccess(data, plaintext) {
    const user = await this.syncUser(data.user_id)
    let status = data.status
    if (store.state.currentConversationId === data.conversation_id && data.user_id !== this.getAccountId()) {
      status = MessageStatus.READ
    }
    let quoteMessage = messageDao.findMessageItemById(data.conversation_id, data.quote_message_id)
    let quoteContent = null
    if (quoteMessage) {
      quoteContent = JSON.stringify(quoteMessage)
    }
    if (data.category.endsWith('_TEXT')) {
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
      messageDao.insertMessage(message)
      this.showNotification(data.conversation_id, user.user_id, user.full_name, plain, data.source, data.created_at)
    } else if (data.category.endsWith('_POST')) {
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
      plain = contentUtil.renderMdToText(plain)
      this.showNotification(data.conversation_id, user.user_id, user.full_name, plain, data.source, data.created_at)
    } else if (data.category.endsWith('_IMAGE')) {
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
    } else if (data.category.endsWith('_VIDEO')) {
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
    } else if (data.category.endsWith('_DATA')) {
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
    } else if (data.category.endsWith('_AUDIO')) {
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
    } else if (data.category.endsWith('_STICKER')) {
      const decoded = window.atob(plaintext)
      const stickerData = JSON.parse(decoded)
      const message = {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        user_id: data.user_id,
        category: data.category,
        status: status,
        created_at: data.created_at,
        name: stickerData.name,
        album_id: stickerData.album_id,
        sticker_id: stickerData.sticker_id,
        quote_message_id: data.quote_message_id,
        quote_content: quoteContent
      }
      messageDao.insertMessage(message)
      const sticker = stickerDao.getStickerByUnique(stickerData.sticker_id)
      if (!sticker) {
        await this.refreshSticker(stickerData.sticker_id)
      }
      const body = i18n.t('notification.sendSticker')
      this.showNotification(data.conversation_id, user.user_id, user.full_name, body, data.source, data.created_at)
    } else if (data.category.endsWith('_CONTACT')) {
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
      const body = i18n.t('notification.sendContact')
      this.showNotification(data.conversation_id, user.user_id, user.full_name, body, data.source, data.created_at)
    } else if (data.category.endsWith('_LIVE')) {
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
      const body = i18n.t('notification.sendLive')
      this.showNotification(data.conversation_id, user.user_id, user.full_name, body, data.source, data.created_at)
    }
    this.makeMessageRead(data.conversation_id, data.message_id, data.user_id, status)
    store.dispatch('refreshMessage', data.conversation_id)
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
    const accountId = JSON.parse(localStorage.getItem('account')).user_id
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
    if (userId === JSON.parse(localStorage.getItem('account')).user_id) {
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
    jobDao.insert({
      job_id: uuidv4(),
      action: 'CREATE_MESSAGE',
      created_at: new Date().toISOString(),
      order_id: null,
      priority: 5,
      user_id: null,
      blaze_message: JSON.stringify(blazeMessage),
      conversation_id: conversationId,
      resend_message_id: null,
      run_count: 0
    })
  }
}

export default new ReceiveWorker()
