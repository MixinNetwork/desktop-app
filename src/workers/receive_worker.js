import uuidv4 from 'uuid/v4'
import conversationDao from '@/dao/conversation_dao'
import floodMessageDao from '@/dao/flood_message_dao'
import messageDao from '@/dao/message_dao'
import userDao from '@/dao/user_dao'
import participantDao from '@/dao/participant_dao'
import participantSessionDao from '@/dao/participant_session_dao'
import jobDao from '@/dao/job_dao'
import stickerDao from '@/dao/sticker_dao'
import resendMessageDao from '@/dao/resend_message_dao'
import BaseWorker from './base_worker'
import store from '@/store/store'
import signalProtocol from '@/crypto/signal.js'
import i18n from '@/utils/i18n.js'
import moment from 'moment'
import { sendNotification } from '@/utils/util.js'
import { remote } from 'electron'
import messageApi from '@/api/message'

import { downloadAttachment, downloadQueue } from '@/utils/attachment_util.js'

import {
  MessageStatus,
  MediaStatus,
  ConversationStatus,
  SystemUser,
  SystemConversationAction,
  ConversationCategory
} from '@/utils/constants.js'
class ReceiveWorker extends BaseWorker {
  async doWork() {
    const fms = floodMessageDao.findFloodMessage()
    if (!fms) {
      return
    }
    for (const fm of fms) {
      await this.process(fm)
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
      media_url: null,
      media_mime_type: null,
      media_size: null,
      media_duration: null,
      media_width: null,
      media_height: null,
      media_hash: null,
      thumb_image: null,
      media_key: null,
      media_digest: null,
      media_status: null,
      status: status,
      created_at: data.created_at,
      action: null,
      participant_id: null,
      snapshot_id: null,
      hyperlink: null,
      name: null,
      album_id: null,
      sticker_id: null,
      shared_user_id: null,
      media_waveform: null,
      quote_message_id: null,
      quote_content: null,
      thumb_url: null
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
      const resp = await messageApi.snapshots(decodedData.snapshot_id)
      if (resp.data.data) {
        const asset = resp.data.data.asset
        Object.keys(asset).forEach(key => {
          decodedData[key] = asset[key]
        })
      }
    }

    const message = {
      message_id: data.message_id,
      conversation_id: data.conversation_id,
      user_id: data.user_id,
      category: data.category,
      content: JSON.stringify(decodedData),
      media_url: null,
      media_mime_type: null,
      media_size: null,
      media_duration: null,
      media_width: null,
      media_height: null,
      media_hash: null,
      thumb_image: null,
      media_key: null,
      media_digest: null,
      media_status: null,
      status: status,
      created_at: data.created_at,
      action: null,
      participant_id: null,
      snapshot_id: decodedData.snapshot_id,
      hyperlink: null,
      name: null,
      album_id: null,
      sticker_id: null,
      shared_user_id: null,
      media_waveform: null,
      quote_message_id: null,
      quote_content: null,
      thumb_url: null
    }
    messageDao.insertMessage(message)
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
      media_url: null,
      media_mime_type: null,
      media_size: null,
      media_duration: null,
      media_width: null,
      media_height: null,
      media_hash: null,
      thumb_image: null,
      media_key: null,
      media_digest: null,
      media_status: null,
      status: status,
      created_at: data.created_at,
      action: systemMessage.action,
      participant_id: systemMessage.participant_id,
      snapshot_id: null,
      hyperlink: null,
      name: null,
      album_id: null,
      sticker_id: null,
      shared_user_id: null,
      media_waveform: null,
      quote_message_id: null,
      quote_content: null,
      thumb_url: null
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
      if (plainData.action === 'ACKNOWLEDGE_MESSAGE_RECEIPTS' && plainData.ack_messages && plainData.ack_messages.length > 0) {
        plainData.ack_messages.forEach(item => {
          this.makeMessageStatus(item.status, item.message_id)
        })
      } else if (plainData.action === 'RESEND_MESSAGES') {
        plainData.messages.forEach(msg => {
          const resendMessage = resendMessageDao.findResendMessage(data.user_id, msg.message_id)
          if (!resendMessage) {
            return
          }
          const needResendMessage = messageDao.findMessageById(msg.message_id)
          if (needResendMessage && needResendMessage.category !== 'MESSAGE_RECALL') {
            resendMessageDao.insertMessage(msg.message_id, data.user_id, data.session_id, 1)
          } else {
            resendMessageDao.insertMessage(msg.message_id, data.user_id, data.session_id, 0)
          }
        })
      } else if (plainData.action === 'RESEND_KEY') {
        if (signalProtocol.containsUserSession(data.user_id)) {
          await this.sendSenderKey(data.conversation_id, data.user_id, data.session_id)
        }
      }
    } else if (
      data.category === 'PLAIN_TEXT' ||
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

  makeMessageStatus(status, messageId) {
    const currentStatus = messageDao.findMessageStatusById(messageId)
    if (currentStatus && currentStatus !== MessageStatus.READ) {
      store.dispatch('makeMessageStatus', { messageId, status })
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
    if (data.category.endsWith('_TEXT')) {
      let plain = plaintext
      if (data.category === 'PLAIN_TEXT') {
        plain = decodeURIComponent(escape(window.atob(plaintext)))
      }
      let quoteMessage = messageDao.findMessageItemById(data.conversation_id, data.quote_message_id)
      let quoteContent = null
      if (quoteMessage) {
        quoteContent = JSON.stringify(quoteMessage)
      }
      const message = {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        user_id: data.user_id,
        category: data.category,
        content: plain,
        media_url: null,
        media_mime_type: null,
        media_size: null,
        media_duration: null,
        media_width: null,
        media_height: null,
        media_hash: null,
        thumb_image: null,
        media_key: null,
        media_digest: null,
        media_status: null,
        status: status,
        created_at: data.created_at,
        action: null,
        participant_id: null,
        snapshot_id: null,
        hyperlink: null,
        name: null,
        album_id: null,
        sticker_id: null,
        shared_user_id: null,
        media_waveform: null,
        quote_message_id: data.quote_message_id,
        quote_content: quoteContent,
        thumb_url: null
      }
      messageDao.insertMessage(message)
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
        media_url: null,
        media_mime_type: mediaData.mime_type,
        media_size: mediaData.size,
        media_duration: mediaData.duration,
        media_width: mediaData.width,
        media_height: mediaData.height,
        media_hash: null,
        thumb_image: mediaData.thumbnail,
        media_key: mediaData.key,
        media_digest: mediaData.digest,
        media_status: MediaStatus.CANCELED,
        status: status,
        created_at: data.created_at,
        action: null,
        participant_id: null,
        snapshot_id: null,
        hyperlink: null,
        name: null,
        album_id: null,
        sticker_id: null,
        shared_user_id: null,
        media_waveform: null,
        quote_message_id: null,
        quote_content: null,
        thumb_url: null
      }
      messageDao.insertMessage(message)
      store.dispatch('startLoading', message.message_id)
      downloadQueue.push(this.download, { args: message })
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
        media_url: null,
        media_mime_type: mediaData.mime_type,
        media_size: mediaData.size,
        media_duration: mediaData.duration,
        media_width: mediaData.width,
        media_height: mediaData.height,
        media_hash: null,
        thumb_image: mediaData.thumbnail,
        media_key: mediaData.key,
        media_digest: mediaData.digest,
        media_status: MediaStatus.CANCELED,
        status: status,
        created_at: data.created_at,
        action: null,
        participant_id: null,
        snapshot_id: null,
        hyperlink: null,
        name: data.name,
        album_id: null,
        sticker_id: null,
        shared_user_id: null,
        media_waveform: null,
        quote_message_id: null,
        quote_content: null,
        thumb_url: null
      }
      store.dispatch('startLoading', message.message_id)
      downloadQueue.push(this.download, { args: message })
      messageDao.insertMessage(message)
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
        media_url: null,
        media_mime_type: mediaData.mime_type,
        media_size: mediaData.size,
        media_duration: null,
        media_width: null,
        media_height: null,
        media_hash: null,
        thumb_image: null,
        media_key: mediaData.key,
        media_digest: mediaData.digest,
        media_status: MediaStatus.CANCELED,
        status: status,
        created_at: data.created_at,
        action: null,
        participant_id: null,
        snapshot_id: null,
        hyperlink: null,
        name: mediaData.name,
        album_id: null,
        sticker_id: null,
        shared_user_id: null,
        media_waveform: null,
        quote_message_id: null,
        quote_content: null,
        thumb_url: null
      }
      store.dispatch('startLoading', message.message_id)
      downloadQueue.push(this.download, { args: message })
      messageDao.insertMessage(message)
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
        media_url: null,
        media_mime_type: null,
        media_size: mediaData.size,
        media_duration: mediaData.duration,
        media_width: null,
        media_height: null,
        media_hash: null,
        thumb_image: null,
        media_key: mediaData.key,
        media_digest: mediaData.digest,
        media_status: MediaStatus.CANCELED,
        status: status,
        created_at: new Date().toISOString(),
        action: null,
        participant_id: null,
        snapshot_id: null,
        hyperlink: null,
        name: null,
        album_id: null,
        sticker_id: null,
        shared_user_id: null,
        media_waveform: mediaData.waveform,
        quote_message_id: null,
        quote_content: null,
        thumb_url: null
      }
      store.dispatch('startLoading', message.message_id)
      downloadQueue.push(this.download, { args: message })
      messageDao.insertMessage(message)
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
        content: null,
        media_url: null,
        media_mime_type: null,
        media_size: null,
        media_duration: null,
        media_width: null,
        media_height: null,
        media_hash: null,
        thumb_image: null,
        media_key: null,
        media_digest: null,
        media_status: null,
        status: status,
        created_at: data.created_at,
        action: null,
        participant_id: null,
        snapshot_id: null,
        hyperlink: null,
        name: stickerData.name,
        album_id: stickerData.album_id,
        sticker_id: stickerData.sticker_id,
        shared_user_id: null,
        media_waveform: null,
        quote_message_id: null,
        quote_content: null,
        thumb_url: null
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
        media_url: null,
        media_mime_type: null,
        media_size: null,
        media_duration: null,
        media_width: null,
        media_height: null,
        media_hash: null,
        thumb_image: null,
        media_key: null,
        media_digest: null,
        media_status: null,
        status: status,
        created_at: data.created_at,
        action: null,
        participant_id: null,
        snapshot_id: null,
        hyperlink: null,
        name: null,
        album_id: null,
        sticker_id: null,
        shared_user_id: contactData.user_id,
        media_waveform: null,
        quote_message_id: null,
        quote_content: null,
        thumb_url: null
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
        media_mime_type: null,
        media_size: null,
        media_duration: null,
        media_width: liveData.width,
        media_height: liveData.height,
        media_hash: null,
        thumb_image: null,
        media_key: null,
        media_digest: null,
        media_status: null,
        status: status,
        created_at: data.created_at,
        action: null,
        participant_id: null,
        snapshot_id: null,
        hyperlink: null,
        name: null,
        album_id: null,
        sticker_id: null,
        shared_user_id: null,
        media_waveform: null,
        quote_message_id: null,
        quote_content: null,
        thumb_url: liveData.thumb_url
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
      sendNotification(conversation.groupName, body, conversationId)
    } else if (conversation.category === ConversationCategory.CONTACT && conversation.ownerId !== userId) {
      const body = fullName + ': ' + content
      const user = userDao.findUserById(conversation.ownerId)
      sendNotification(user.full_name, body, conversationId)
    } else {
      sendNotification(fullName, content, conversationId)
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
