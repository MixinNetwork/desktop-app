import uuidv4 from 'uuid/v4'
import conversationDao from '@/dao/conversation_dao'
import floodMessageDao from '@/dao/flood_message_dao'
import messageDao from '@/dao/message_dao'
import userDao from '@/dao/user_dao'
import participantDao from '@/dao/participant_dao'
import jobDao from '@/dao/job_dao'
import stickerDao from '@/dao/sticker_dao'
import BaseWorker from './base_worker'
import store from '@/store/store'
import signalProtocol from '@/crypto/signal.js'
import i18n from '@/utils/i18n.js'
import moment from 'moment'
import { sendNotification } from '@/utils/util.js'
import { remote } from 'electron'

import { downloadAttachment, downloadQueue } from '@/utils/attachment_util.js'

import {
  MessageStatus,
  MediaStatus,
  ConversationStatus,
  SystemUser,
  SystemConversationAction,
  ConversationCategory
} from '@/utils/constants.js'
class ReceiveWroker extends BaseWorker {
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
      await this.processReCallMessage(data)
    }
    this.updateRemoteMessageStatus(floodMessage.message_id, MessageStatus.DELIVERED)
  }

  async processSignalMessage(data) {
    if (data.session_id !== localStorage.primarySessionId) {
      return
    }
    const plaintext = signalProtocol.decryptMessage(data.conversation_id, data.user_id, 1, data.data, data.category)
    if (plaintext) {
      await this.processDecryptSuccess(data, plaintext)
    } else {
      console.log(data)
    }
  }
  processApp(data) {
    if (data.primitive_id) {
      data.user_id = data.primitive_id
    }
    if (data.primitive_message_id) {
      data.message_id = data.primitive_message_id
    }
    var status
    if (store.state.currentConversationId === data.conversation_id) {
      status = MessageStatus.READ
    } else {
      status = MessageStatus.DELIVERED
    }
    const decoded = decodeURIComponent(escape(window.atob(data.data)))
    const message = {
      message_id: data.message_id,
      conversation_id: data.conversation_id,
      user_id: data.primitive_id,
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
      quote_content: null
    }
    messageDao.insertMessage(message)
    this.makeMessageRead(data.conversation_id, data.message_id, data.user_id, MessageStatus.READ)
    store.dispatch('refreshMessage', data.conversation_id)
  }

  processReCallMessage(data) {
    if (data.primitive_id) {
      data.user_id = data.primitive_id
    }
    if (data.primitive_message_id) {
      data.message_id = data.primitive_message_id
    }
    const reCallMassage = JSON.parse(decodeURIComponent(escape(window.atob(data.data))))
    let message = messageDao.getMessageById(reCallMassage.message_id)
    if (message) {
      messageDao.reCallMessage(reCallMassage.message_id)
    }

    this.makeMessageRead(data.conversation_id, data.message_id, data.user_id, MessageStatus.READ)
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

  processSystemSnapshotMessage(data) {
    if (data.primitive_id) {
      data.user_id = data.primitive_id
    }
    if (data.primitive_message_id) {
      data.message_id = data.primitive_message_id
    }
    var status
    if (store.state.currentConversationId === data.conversation_id) {
      status = MessageStatus.READ
    } else {
      status = MessageStatus.DELIVERED
    }
    const decoded = decodeURIComponent(escape(window.atob(data.data)))
    const message = {
      message_id: data.message_id,
      conversation_id: data.conversation_id,
      user_id: data.primitive_id,
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
      quote_content: null
    }
    messageDao.insertMessage(message)
    this.makeMessageRead(data.conversation_id, data.message_id, data.user_id, MessageStatus.READ)
  }

  async processSystemConversationMessage(data, systemMessage) {
    if (data.primitive_id) {
      data.user_id = data.primitive_id
    }
    if (data.primitive_message_id) {
      data.message_id = data.primitive_message_id
    }
    let userId = data.user_id
    if (systemMessage.user_id) {
      userId = systemMessage.user_id
    }
    let status = MessageStatus.DELIVERED
    if (store.state.currentConversationId === data.conversation_id) {
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
      quote_content: null
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
        await this.syncUser(systemMessage.participant_id)
      }
    } else if (
      systemMessage.action === SystemConversationAction.REMOVE ||
      systemMessage.action === SystemConversationAction.EXIT
    ) {
      if (systemMessage.participant_id === accountId) {
        participantDao.deleteAll(data.conversation_id, [accountId])
        conversationDao.updateConversationStatusById(data.conversation_id, ConversationStatus.QUIT)
        store.dispatch('refreshParticipants', data.conversation_id)
      } else {
        await this.refreshConversation(data.conversation_id)
      }
      await this.syncUser(systemMessage.participant_id)
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
    this.makeMessageRead(data.conversation_id, data.message_id, data.user_id, MessageStatus.READ)
  }

  async processPlainMessage(data) {
    if (data.category === 'PLAIN_JSON') {
      const plain = window.atob(data.data)
      const plainData = JSON.parse(plain)
      if (plainData.action === 'ACKNOWLEDGE_MESSAGE_RECEIPTS' && plainData.messages.length > 0) {
        plainData.messages.forEach(item => {
          this.makeMessageStatus(item.status, item.message_id)
        })
      }
    } else if (
      data.category === 'PLAIN_TEXT' ||
      data.category === 'PLAIN_IMAGE' ||
      data.category === 'PLAIN_VIDEO' ||
      data.category === 'PLAIN_DATA' ||
      data.category === 'PLAIN_AUDIO' ||
      data.category === 'PLAIN_STICKER' ||
      data.category === 'PLAIN_CONTACT'
    ) {
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
    downloadAttachment(message)
      .then(([message, filePath]) => {
        messageDao.updateMediaMessage('file://' + filePath, MediaStatus.DONE, message.message_id)
        store.dispatch('stopLoading', message.message_id)
        store.dispatch('refreshMessage', message.conversation_id)
      })
      .catch(e => {
        console.log(e)
        messageDao.updateMediaMessage(null, MediaStatus.CANCELED, message.message_id)
        store.dispatch('stopLoading', message.message_id)
        store.dispatch('refreshMessage', message.conversation_id)
      })
  }

  async processDecryptSuccess(data, plaintext) {
    if (data.primitive_id) {
      data.user_id = data.primitive_id
    }
    if (data.primitive_message_id) {
      data.message_id = data.primitive_message_id
    }
    if (data.representative_id) {
      data.user_id = data.representative_id
    }
    const accountId = JSON.parse(localStorage.getItem('account')).user_id
    const user = await this.syncUser(data.user_id)

    var status = MessageStatus.PENDING
    if (data.user_id !== accountId) {
      if (store.state.currentConversationId === data.conversation_id) {
        status = MessageStatus.READ
      } else {
        status = MessageStatus.DELIVERED
      }
    }
    if (data.category.endsWith('_TEXT')) {
      var plain = null
      if (data.category === 'PLAIN_TEXT') {
        plain = decodeURIComponent(escape(window.atob(plaintext)))
      } else {
        plain = plaintext
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
        quote_content: quoteContent
      }
      messageDao.insertMessage(message)
      this.showNotification(data.conversation_id, user.user_id, user.full_name, plain, data.source)
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
        quote_content: null
      }
      messageDao.insertMessage(message)
      store.dispatch('startLoading', message.message_id)
      downloadQueue.push(this.download, { args: message })
      const body = i18n.t('notification.sendPhoto')
      this.showNotification(data.conversation_id, user.user_id, user.full_name, body, data.source)
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
        quote_content: null
      }
      store.dispatch('startLoading', message.message_id)
      downloadQueue.push(this.download, { args: message })
      messageDao.insertMessage(message)
      const body = i18n.t('notification.sendVideo')
      this.showNotification(data.conversation_id, user.user_id, user.full_name, body, data.source)
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
        quote_content: null
      }
      store.dispatch('startLoading', message.message_id)
      downloadQueue.push(this.download, { args: message })
      messageDao.insertMessage(message)
      const body = i18n.t('notification.sendFile')
      this.showNotification(data.conversation_id, user.user_id, user.full_name, body, data.source)
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
        quote_content: null
      }
      store.dispatch('startLoading', message.message_id)
      downloadQueue.push(this.download, { args: message })
      messageDao.insertMessage(message)
      const body = i18n.t('notification.sendAudio')
      this.showNotification(data.conversation_id, user.user_id, user.full_name, body, data.source)
    } else if (data.category.endsWith('_STICKER')) {
      const decoded = window.atob(plaintext)
      const stickerData = JSON.parse(decoded)
      var message = null
      const sticker = stickerDao.getStickerByUnique(stickerData.sticker_id)
      if (!sticker) {
        await this.refreshSticker(stickerData.sticker_id)
      }
      message = {
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
        quote_content: null
      }
      messageDao.insertMessage(message)
      const body = i18n.t('notification.sendSticker')
      this.showNotification(data.conversation_id, user.user_id, user.full_name, body, data.source)
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
        quote_content: null
      }
      messageDao.insertMessage(message)
      await this.syncUser(contactData.user_id)
      const body = i18n.t('notification.sendContact')
      this.showNotification(data.conversation_id, user.user_id, user.full_name, body, data.source)
    }
    this.makeMessageRead(data.conversation_id, data.message_id, data.user_id, MessageStatus.READ)
    store.dispatch('refreshMessage', data.conversation_id)
  }

  showNotification(conversationId, userId, fullName, content, source) {
    if (source === 'LIST_PENDING_SESSION_MESSAGES') {
      return
    }
    if (remote.getCurrentWindow().isFocused()) {
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
    const blazeMessage = {
      message_id: messageId,
      status: status
    }
    jobDao.insert({
      job_id: uuidv4(),
      action: 'ACKNOWLEDGE_SESSION_MESSAGE_RECEIPTS',
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
    if (store.state.currentConversationId !== conversationId || status !== MessageStatus.READ) {
      return
    }
    if (userId === JSON.parse(localStorage.getItem('account')).user_id) {
      return
    }
    const blazeMessage = {
      message_id: messageId,
      status: status
    }
    jobDao.insert({
      job_id: uuidv4(),
      action: 'CREATE_SESSION_MESSAGE',
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

export default new ReceiveWroker()
