import Vue from 'vue'
import VueI18n from 'vue-i18n'
let transactions = {
  en: {
    ok: 'OK',
    cancel: 'Cancel',
    continue: 'Continue',
    encryption: 'Messages to this conversation are encrypted end-to-end.',
    time_wrong: 'System time is unusual, please continue to use again after correction',
    signal_no_title: 'Phone not connected',
    signal_no_content: 'Make sure your phone has an active Internet connection.',
    not_connected_title: 'Not connected',
    not_connected_content: 'Make sure has an active Internet connection.',
    drag_file: 'Drag and drop file into the here',
    version: 'Version',
    check_update: 'Check of Updates',
    privacy_policy: 'Privacy Policy',
    terms_service: 'Terms of Service',
    help_center: 'Help center',
    menu: {
      conversation: {
        0: 'Exit Group',
        1: 'Pin to top',
        2: 'Clear Pin',
        3: 'Clear',
        4: 'Mute',
        5: 'Cancel Mute'
      },
      chat: {
        0: 'Contact info',
        1: 'Exit group',
        2: 'Clear',
        3: 'Mute',
        4: 'Cancel Mute'
      },
      personal: ['New Group', 'Profile', 'Setting', 'Logout']
    },
    home: {
      input: 'Say something ...',
      removed: "You can't send messages to this group because you're no longer a participant."
    },
    conversation: {
      empty: 'No conversation'
    },
    group: {
      group_add: 'Add Participants',
      group_new_title: 'New Group',
      group_new_name: 'Group Name'
    },
    chat: {
      user_name: 'Your name',
      personal_info: 'Personal info',
      new_conversation: 'New conversation',
      title_participants: '{0} participants',
      keep_title: 'Keep your phone connected',
      keep_des: 'Mixin Messenger connects to your phone to sync messages.',
      mute_title: 'Mute notifications for…',
      mute_menu: ['8 Hours', '1 Week', '1 Year'],
      mute_hours: 'Mute 8 hours',
      mute_week: 'Mute 1 week',
      mute_year: 'Mute 1 year',
      mute_cancel: 'Cancel mute',
      chat_mute_cancel: 'Cancel mute?',
      chat_clear: 'Clear message ?',
      chat_group_create: '%{0} created group "{1}"',
      chat_group_add: '{0} added {1}',
      chat_group_remove: '{0} removed {1}',
      chat_group_exit: '{0} left',
      chat_group_join: "{0} joined using this group's invite link",
      chat_group_role: "You' re now an admin",
      chat_you_start: 'You',
      chat_you: 'you',
      chat_app_card: "[ You've received a card message. View on phone. ]",
      chat_app_button: "[ You've received a button message. View on phone. ]",
      chat_transfer_send: "[ You've made a transfer ]",
      chat_transfer_receive: "[ You've received a transfer. View on phone. ]",
      chat_transfer: '[ Transfer ]',
      chat_create_group: 'Create group',
      chat_sticker: 'Sticker',
      chat_pic: 'Photo',
      chat_contact: 'Contact',
      chat_file: 'File',
      chat_audio: 'Audio',
      chat_video: 'Video',
      chat_recall_delete: 'This message was deleted',
      chat_recall_me: 'You deleted this message',
      chat_file_invalid_size: 'Requires file size less than 30MB',
      chat_chats: 'Chats',
      preview: 'Preview'
    },
    loading: {
      initializing: 'Initializing...Please wait a moment'
    },
    sign_in: {
      title: 'To use Mixin Messenger on your PC',
      desc: 'Open Mixin Messenger on your phone, capture the code',
      reload: 'Reload code'
    },
    setting: {
      title: 'Setting'
    },
    profile: {
      title: 'Info'
    },
    unread_message: 'Unread messages',
    today: 'Today',
    yesterday: 'Yesterday',
    week: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    notification: {
      sendPhoto: 'send a photo',
      sendVideo: 'send a video',
      sendSticker: 'send a sticker',
      sendContact: 'shared a contact',
      sendFile: 'send a file',
      sendAudio: 'send a audio message'
    }
  },
  zh: {
    ok: '确定',
    cancel: '取消',
    continue: '继续',
    encryption: '此对话中的消息使用端对端加密。',
    time_wrong: '检测到系统时间异常，请校正后再继续使用',
    signal_no_title: '手机未连接',
    signal_no_content: '请确定手机有较好的网络讯号',
    not_connected_title: '未连接',
    not_connected_content: '请确定电脑的网络链接有效',
    drag_file: '拖放文件到此处',
    version: '版本',
    check_update: '检测更新',
    privacy_policy: '隐私政策',
    terms_service: '服务条款',
    help_center: '帮助中心',
    menu: {
      conversation: {
        0: '退出群组',
        1: '置顶对话',
        2: '取消置顶',
        3: '删除',
        4: '静音',
        5: '取消静音'
      },
      chat: {
        0: '联系人资料',
        1: '退出群组',
        2: '清除消息',
        3: '静音',
        4: '取消静音'
      },
      personal: ['新建群组', '个人信息', '设置', '登出']
    },
    home: {
      input: '内容输入 ...',
      removed: '您不能发送消息，因为您已经不再是此群组成员。'
    },
    conversation: {
      empty: '无对话'
    },
    group: {
      group_add: '添加成员',
      group_new_title: '新建群组',
      group_new_name: '群组名称'
    },
    chat: {
      user_name: '您的名字',
      personal_info: '个人信息',
      new_conversation: '新建对话',
      title_participants: '{0} 成员',
      keep_title: '请保持手机链接到网络',
      keep_des: 'Mixin Messenger 会连接到您的手机来同步消息。',
      mute_title: '静音通知',
      mute_menu: ['8 小时', '1 星期', '1 年'],
      mute_hours: '静音 8 小时',
      mute_week: '静音 1 周',
      mute_year: '静音 1 年',
      mute_cancel: '取消静音',
      chat_mute_cancel: '确认取消静音？',
      chat_clear: '确认清除消息？',
      chat_group_create: '%{0}创建了群组"{1}"',
      chat_group_add: '{0} 添加了 {1}',
      chat_group_remove: '{0} 移除了 {1}',
      chat_group_exit: '{0} 离开了群组',
      chat_group_join: '{0}通过邀请链接加入群组',
      chat_group_role: '您现在成为管理员',
      chat_you_start: '您',
      chat_you: '您',
      chat_app_card: '[你收到一条 card 消息，请在手机查看]',
      chat_app_button: '[你收到一条 button 消息，请在手机查看]',
      chat_transfer: '[转账]',
      chat_transfer_send: '[你发出一笔转账]',
      chat_transfer_receive: '[你收到一笔转账，请在手机查看]',
      chat_create_group: '创建群组',
      chat_sticker: '贴纸',
      chat_pic: '照片',
      chat_contact: '联系人',
      chat_file: '文件',
      chat_audio: '语音',
      chat_video: '视频',
      chat_recall_delete: '此消息已撤回',
      chat_recall_me: '你撤回了一条消息',
      chat_file_invalid_size: '不支持大于30MB的文件',
      chat_chats: '会话',
      preview: '预览'
    },
    loading: {
      initializing: '初始化中...'
    },
    sign_in: {
      title: '登录 Mixin Messenger 桌面端',
      desc: '在手机上打开 Mixin Messenger 扫描屏幕上方的二维码确认登录',
      reload: '点击重新载入二维码'
    },
    setting: {
      title: '设置'
    },
    profile: {
      title: '联系人资料'
    },
    unread_message: '未读消息',
    today: '今天',
    yesterday: '昨天',
    week: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
    notification: {
      sendPhoto: '发送了一个图片',
      sendVideo: '发送了一个视频',
      sendSticker: '发送了一个贴纸',
      sendContact: '分享了一个联系人',
      sendFile: '发送了一个文件',
      sendAudio: '发送了一条语音'
    }
  }
}

Vue.use(VueI18n)

let locale = navigator.language.split('-')[0]
if (locale === undefined || locale == null || locale === '') {
  locale = 'en'
}

const i18n = new VueI18n({
  locale: locale,
  messages: transactions
})

export default i18n
