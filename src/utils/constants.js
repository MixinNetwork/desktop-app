export const API_URL = {
  HTTP: 'https://api.mixin.one/',
  WS: 'wss://blaze.mixin.one'
}

export const ConversationStatus = {
  START: 0,
  FAILURE: 1,
  SUCCESS: 2,
  QUIT: 3
}

export const AvatarColors = [
  '#8ED4B6',
  '#91E07D',
  '#ADCA7A',
  '#BDCF41',
  '#7CE4D1',
  '#56D7E7',
  '#7DD0FB',
  '#6AABF1',
  '#A27BB1',
  '#9F97E8',
  '#879ACB',
  '#7099C9',
  '#FB96A9',
  '#E89BD8',
  '#F4806F',
  '#FBA66E',
  '#C58CAF',
  '#D9858A',
  '#F6A786',
  '#F8CE5E',
  '#92C4D4',
  '#B4AE7A',
  '#A67F6F',
  '#E7A653'
]

export const NameColors = [
  '#AA4848',
  '#B0665E',
  '#EF8A44',
  '#A09555',
  '#727234',
  '#9CAD23',
  '#AA9100',
  '#C49B4B',
  '#A47758',
  '#DF694C',
  '#D65859',
  '#C2405A',
  '#A75C96',
  '#BD637C',
  '#8F7AC5',
  '#7983C2',
  '#728DB8',
  '#5977C2',
  '#5E6DA2',
  '#3D98D0',
  '#5E97A1',
  '#4EABAA',
  '#63A082',
  '#877C9B',
  '#AA66C3',
  '#BB5334',
  '#667355',
  '#668899',
  '#83BE44',
  '#BBA600',
  '#429AB6',
  '#75856F',
  '#88A299',
  '#B3798E',
  '#447899',
  '#D79200',
  '#728DB8',
  '#DD637C',
  '#887C66',
  '#BE6C2C',
  '#9B6D77',
  '#B69370',
  '#976236',
  '#9D77A5',
  '#8A660E',
  '#5E935E',
  '#9B8484',
  '#92B288'
]

export const ConversationCategory = {
  CONTACT: 'CONTACT',
  GROUP: 'GROUP'
}

export const ParticipantRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN'
}

export const MessageStatus = {
  SENDING: 'SENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED'
}

export function canReply(type) {
  return (
    type === MessageCategories.SIGNAL_TEXT ||
    type === MessageCategories.SIGNAL_IMAGE ||
    type === MessageCategories.SIGNAL_TEXT ||
    type === MessageCategories.SIGNAL_VIDEO ||
    type === MessageCategories.SIGNAL_AUDIO ||
    type === MessageCategories.SIGNAL_DATA ||
    type === MessageCategories.SIGNAL_STICKER ||
    type === MessageCategories.SIGNAL_CONTACT ||
    type === MessageCategories.SIGNAL_LIVE ||
    type === MessageCategories.PLAIN_TEXT ||
    type === MessageCategories.PLAIN_IMAGE ||
    type === MessageCategories.PLAIN_VIDEO ||
    type === MessageCategories.PLAIN_AUDIO ||
    type === MessageCategories.PLAIN_DATA ||
    type === MessageCategories.PLAIN_STICKER ||
    type === MessageCategories.PLAIN_CONTACT ||
    type === MessageCategories.PLAIN_LIVE
  )
}

export function canRecall(message, userId) {
  let offset = new Date().valueOf() - new Date(message.createdAt).valueOf()
  if (offset > 3600000) {
    return false
  }
  return (
    message.userId === userId &&
    canReply(message.type) &&
    message.status !== MessageStatus.SENDING
  )
}

export const MessageCategories = {
  SIGNAL_KEY: 'SIGNAL_KEY',
  SIGNAL_TEXT: 'SIGNAL_TEXT',
  SIGNAL_IMAGE: 'SIGNAL_IMAGE',
  SIGNAL_VIDEO: 'SIGNAL_VIDEO',
  SIGNAL_AUDIO: 'SIGNAL_AUDIO',
  SIGNAL_DATA: 'SIGNAL_DATA',
  SIGNAL_STICKER: 'SIGNAL_STICKER',
  SIGNAL_CONTACT: 'SIGNAL_CONTACT',
  SIGNAL_LIVE: 'SIGNAL_LIVE',
  PLAIN_TEXT: 'PLAIN_TEXT',
  PLAIN_IMAGE: 'PLAIN_IMAGE',
  PLAIN_VIDEO: 'PLAIN_VIDEO',
  PLAIN_AUDIO: 'PLAIN_AUDIO',
  PLAIN_DATA: 'PLAIN_DATA',
  PLAIN_STICKER: 'PLAIN_STICKER',
  PLAIN_CONTACT: 'PLAIN_CONTACT',
  PLAIN_LIVE: 'PLAIN_LIVE',
  PLAIN_JSON: 'PLAIN_JSON',
  SYSTEM_CONVERSATION: 'SYSTEM_CONVERSATION',
  SYSTEM_ACCOUNT_SNAPSHOT: 'SYSTEM_ACCOUNT_SNAPSHOT',
  APP_BUTTON_GROUP: 'APP_BUTTON_GROUP',
  APP_CARD: 'APP_CARD',
  WEBRTC_AUDIO_OFFER: 'WEBRTC_AUDIO_OFFER',
  WEBRTC_ICE_CANDIDATE: 'WEBRTC_ICE_CANDIDATE',
  WEBRTC_AUDIO_ANSWER: 'WEBRTC_AUDIO_ANSWER',
  WEBRTC_AUDIO_CANCEL: 'WEBRTC_AUDIO_CANCEL',
  WEBRTC_AUDIO_DECLINE: 'WEBRTC_AUDIO_DECLINE',
  WEBRTC_AUDIO_BUSY: 'WEBRTC_AUDIO_BUSY',
  WEBRTC_AUDIO_END: 'WEBRTC_AUDIO_END',
  WEBRTC_AUDIO_FAILED: 'WEBRTC_AUDIO_FAILED'
}

export const MediaStatus = {
  PENDING: 'PENDING',
  DONE: 'DONE',
  CANCELED: 'CANCELED',
  EXPIRED: 'EXPIRED'
}

export const SystemUser = '00000000-0000-0000-0000-000000000000'

export const SystemConversationAction = {
  JOIN: 'JOIN',
  EXIT: 'EXIT',
  ADD: 'ADD',
  REMOVE: 'REMOVE',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  ROLE: 'ROLE'
}

export const MimeType = {
  // ============== images ==============
  JPEG: { name: 'image/jpeg', extension: 'jpeg' },
  PNG: { name: 'image/png', extension: 'png' },
  GIF: { name: 'image/gif', extension: 'gif' },
  BMP: { name: 'image/x-ms-bmp', extension: 'bmp' },
  WEBP: { name: 'image/webp', extension: 'webp' },
  // ============== videos ==============
  MPEG: { name: 'video/mpeg', extension: 'mpeg' },
  MP4: { name: 'video/mp4', extension: 'mp4' },
  QUICKTIME: { name: 'video/quicktime', extension: 'mov' },
  THREEGPP: { name: 'video/3gpp', extension: '3gp' },
  THREEGPP2: { name: 'video/3gpp2', extension: '3g2' },
  MKV: { name: 'video/x-matroska', extension: 'mkv' },
  WEBM: { name: 'video/webm', extension: 'webm' },
  TS: { name: 'video/mp2ts', extension: 'ts' },
  AVI: { name: 'video/avi', extension: 'avi' }
}

export const LinkStatus = {
  NOT_CONNECTED: 0,
  CONNECTED: 1,
  LOSE: 2
}

export const MuteDuration = {
  HOURS: 8 * 60 * 60,
  WEEK: 7 * 24 * 60 * 60,
  YEAR: 365 * 24 * 60 * 60
}
