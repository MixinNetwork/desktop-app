import Vue from 'vue'
import VueI18n from 'vue-i18n'
let transactions = {
  en: {
    ok: 'OK',
    cancel: 'Cancel',
    continue: 'Continue',
    confirm_remove: 'Are you sure that remove?',
    encryption: 'Messages to this conversation are encrypted end-to-end.',
    time_wrong: 'System time is unusual, please continue to use again after correction',
    not_connected_title: 'Not connected',
    connecting_title: 'Connecting...',
    not_connected_content: 'Make sure your computer has an active Internet connection.',
    drag_file: 'Drag and drop file into the here',
    file_unsupported: 'Sorry, this file type is not supported. Try uploading a .zip version of this file instead.',
    version: 'Version',
    check_update: 'Check Updates',
    privacy_policy: 'Privacy Policy',
    terms_service: 'Terms of Service',
    help_center: 'Help Center',
    editor_title: 'Editor',
    editor_hold: 'Markdown edit',
    menu: {
      conversation: {
        exit_group: 'Exit Group',
        pin_to_top: 'Pin to Top',
        clear_pin: 'Remove Pin',
        clear: 'Clear Chat',
        mute: 'Mute',
        cancel_mute: 'Cancel Mute'
      },
      chat: {
        contact_info: 'Contact Info',
        exit_group: 'Exit Group',
        add_contact: 'Add Contact',
        remove_contact: 'Remove Contact',
        clear: 'Clear Chat',
        mute: 'Mute',
        cancel_mute: 'Cancel Mute',
        create_post: 'Create post'
      },
      participant: {
        profile: 'Profile',
        send_message: 'Send Message',
        set_as_admin: 'Set As Administrator',
        remove: 'Remove'
      },
      personal: ['New Group', 'Profile', 'Settings', 'Logout'],
      chat_operation: {
        reply: 'Reply',
        forward: 'Forward',
        delete: 'Delete',
        recal: 'Recall'
      }
    },
    home: {
      search: 'Search',
      input: 'Say something ...',
      removed: "You can't send messages to this group because you're not a participant."
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
      new_conversation: 'New Conversation',
      title_participants: '{0} participants',
      keep_title: '',
      keep_des: 'No conversation selected',
      remove_contact: 'Remove contact? Chat will be retained',
      mute_title: 'Mute notifications for…',
      mute_menu: ['8 Hours', '1 Week', '1 Year'],
      mute_hours: 'Mute 8 hours',
      mute_week: 'Mute 1 week',
      mute_year: 'Mute 1 year',
      mute_cancel: 'Cancel mute',
      chat_mute_cancel: 'Cancel mute?',
      chat_clear: 'Clear all chat messages?',
      chat_group_create: '%{0} created group "{1}"',
      chat_group_add: '{0} added {1}',
      chat_group_remove: '{0} removed {1}',
      chat_group_exit: '{0} left',
      chat_group_join: '{0} joined the group via an invitation link',
      chat_group_role: "You're now an admin",
      chat_you_start: 'You',
      chat_you: 'you',
      chat_app_card: "[ You've received a card message. ]",
      chat_app_button: "[ You've received a button message. ]",
      chat_unknown: '[Unknown type of Message. View on phone. ]',
      chat_transfer: '[ Transfer ]',
      chat_create_group: 'Create group',
      chat_sticker: 'Sticker',
      chat_pic: 'Photo',
      chat_contact: 'Contact',
      chat_more: 'more',
      chat_file: 'File',
      chat_audio: 'Audio',
      chat_video: 'Video',
      chat_live: 'LIVE',
      chat_post: 'Post',
      chat_recall_delete: 'This message was deleted',
      chat_recall_me: 'You deleted this message',
      chat_file_invalid_size: 'File size must be less than 100MB',
      chat_contacts: 'Contacts',
      chat_chats: 'Chats',
      chat_messages: 'Messages',
      chat_records: '{0} Records',
      preview: 'Preview',
      sendMessage: 'Send',
      search: 'Search',
      searching: 'Searching for messages ...',
      search_empty: 'No related message found',
      search_notify: 'Search for messages related to {0}',
      search_group_notify: 'Search for messages in {0}',
      search_id_or_phone: 'Search Mixin ID or phone number:',
      recent_chat: 'Recent chat',
      share_with: 'Share with',
      admin: 'Admin',
      owner: 'Owner'
    },
    loading: {
      initializing: 'Initializing...Please wait a moment'
    },
    sign_in: {
      title: 'To use Mixin Messenger on your PC',
      desc: 'Open Mixin Messenger on your phone, capture the code',
      reload: 'Reload Code'
    },
    setting: {
      title: 'Settings'
    },
    profile: {
      title: 'Info',
      announcement: 'Announcement',
      user_biography: 'Biography'
    },
    unread_message: 'Unread messages',
    date: ['/', '/', ''],
    today: 'Today',
    yesterday: 'Yesterday',
    week_prefix: ['', ''],
    week: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    notification: {
      sendPhoto: 'send a photo',
      sendVideo: 'send a video',
      sendSticker: 'send a sticker',
      sendContact: 'shared a contact',
      sendFile: 'send a file',
      sendAudio: 'send an audio message',
      sendLive: 'send a live message'
    }
  },
  zh: {
    ok: '确定',
    cancel: '取消',
    continue: '继续',
    confirm_remove: '是否确认删除',
    encryption: '此对话中的消息使用端对端加密。',
    time_wrong: '检测到系统时间异常，请校正后再继续使用',
    not_connected_title: '未连接',
    connecting_title: '正在连接...',
    not_connected_content: '请确定电脑的网络链接有效',
    drag_file: '拖放文件到此处',
    file_unsupported: '抱歉，不支持此文件类型。请尝试上传此文件的.zip压缩包',
    version: '版本',
    check_update: '检测更新',
    privacy_policy: '隐私政策',
    terms_service: '服务条款',
    help_center: '帮助中心',
    editor_title: '编辑文章',
    editor_hold: '使用 Markdown 编辑文章',
    menu: {
      conversation: {
        exit_group: '退出群组',
        pin_to_top: '置顶对话',
        clear_pin: '取消置顶',
        clear: '删除',
        mute: '静音',
        cancel_mute: '取消静音'
      },
      chat: {
        contact_info: '联系人资料',
        exit_group: '退出群组',
        add_contact: '添加联系人',
        remove_contact: '删除联系人',
        clear: '清空聊天记录',
        mute: '静音',
        cancel_mute: '取消静音',
        create_post: '创建文章'
      },
      participant: {
        profile: '信息',
        send_message: '发送信息',
        set_as_admin: '设为管理员',
        remove: '从群组中移除'
      },
      personal: ['新建群组', '个人信息', '设置', '登出'],
      chat_operation: {
        reply: '回复',
        forward: '转发',
        delete: '删除',
        recal: '撤回'
      }
    },
    home: {
      search: '搜索',
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
      keep_title: '',
      keep_des: '尚未选择对话。',
      remove_contact: '删除好友？聊天记录将会保留',
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
      chat_app_card: '[你收到一条 card 消息]',
      chat_app_button: '[你收到一条 button 消息]',
      chat_transfer: '[转账]',
      chat_unknown: '[未知类型消息，请在手机查看]',
      chat_create_group: '创建群组',
      chat_sticker: '贴纸',
      chat_pic: '照片',
      chat_contact: '联系人',
      chat_more: '更多',
      chat_file: '文件',
      chat_audio: '语音',
      chat_video: '视频',
      chat_live: '直播',
      chat_post: '文章',
      chat_recall_delete: '此消息已撤回',
      chat_recall_me: '你撤回了一条消息',
      chat_file_invalid_size: '不支持大于 100MB 的文件',
      chat_contacts: '联系人',
      chat_chats: '会话',
      chat_messages: '消息',
      chat_records: '{0} 条相关消息',
      preview: '预览',
      sendMessage: '发送',
      search: '搜索聊天记录',
      searching: '正在搜索聊天 ...',
      search_empty: '未搜索到相关消息',
      search_notify: '搜索和 {0} 相关的消息',
      search_group_notify: '在 {0} 中搜索消息',
      search_id_or_phone: '搜索 Mixin ID 或手机号码：',
      recent_chat: '最近聊天',
      share_with: '分享给',
      admin: '管理员',
      owner: '群主'
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
      title: '联系人资料',
      announcement: '公告',
      user_biography: '个人简介'
    },
    unread_message: '未读消息',
    date: ['年', '月', '日'],
    today: '今天',
    yesterday: '昨天',
    week_prefix: ['星期', '周'],
    week: ['日', '一', '二', '三', '四', '五', '六'],
    notification: {
      sendPhoto: '发送了一个图片',
      sendVideo: '发送了一个视频',
      sendSticker: '发送了一个贴纸',
      sendContact: '分享了一个联系人',
      sendFile: '发送了一个文件',
      sendAudio: '发送了一条语音',
      sendLive: '发送了一个直播'
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
