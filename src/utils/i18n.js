import Vue from 'vue'
import VueI18n from 'vue-i18n'
let transactions = {
  en: {
    ok: 'OK',
    cancel: 'Cancel',
    continue: 'Continue',
    time_wrong: 'System time is unusual, please continue to use again after correction',
    signal_no_title: 'Phone not connected',
    signal_no_content: 'Make sure your phone has an active Internet connection.',
    not_connected_title: 'Not connected',
    not_connected_content: 'Make sure has an active Internet connection.',
    drag_file: 'Drag and drop images into the here',
    menu: {
      conversation: {
        0: 'Exit Group',
        1: 'Pin to top',
        2: 'Clear Pin',
        3: 'Clear'
      },
      chat: {
        0: 'Contact info',
        1: 'Exit group',
        2: 'Clear'
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
      keep_title: 'Mix all blockchain in one network',
      keep_des: '',
      mute_title: 'Mute notifications for…',
      mute_menu: ['8 Hours', '1 Week', '1 Year'],
      mute_hours: 'Mute 8 hours',
      mute_week: 'Mute 1 week',
      mute_year: 'Mute 1 year',
      chat_clear: 'Clear message ?',
      chat_group_create: '%{0} created group "{1}"',
      chat_group_add: '{0} added {1}',
      chat_group_remove: '{0} removed {1}',
      chat_group_exit: '{0} left',
      chat_group_join: "{0} joined using this group's invite link",
      chat_group_role: "You' re now an admin",
      chat_group_unknown: 'Unknown type of Message, please upgrade the APP',
      chat_no_support_title: 'Unknown type of Message',
      chat_you_start: 'You',
      chat_you: 'you',
      chat_no_support: 'Unsupported message type, please check on your phone',
      chat_create_group: 'Create group',
      chat_sticker: 'Sticker',
      chat_pic: 'Photo',
      chat_contact: 'Contact'
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
      sendContact: 'shared a contact'
    }
  },
  zh: {
    ok: '确定',
    cancel: '取消',
    continue: '继续',
    time_wrong: '检测到系统时间异常，请校正后再继续使用',
    signal_no_title: '手机未连接',
    signal_no_content: '请确定手机有较好的网络讯号',
    not_connected_title: '未连接',
    not_connected_content: '请确定电脑的网络链接有效',
    drag_file: '拖放图片到此处',
    menu: {
      conversation: {
        0: '退出群组',
        1: '置顶对话',
        2: '取消置顶',
        3: '删除'
      },
      chat: {
        0: '联系人资料',
        1: '退出群组',
        2: '清除消息'
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
      keep_title: 'Mix all blockchain in one network',
      keep_des: '',
      mute_title: '静音通知',
      mute_menu: ['8 小时', '1 星期', '1 年'],
      mute_hours: '静音 8 小时',
      mute_week: '静音 1 周',
      mute_year: '静音 1 年',
      chat_clear: '确认清除消息？',
      chat_group_create: '%{0}创建了群组"{1}"',
      chat_group_add: '{0} 添加了 {1}',
      chat_group_remove: '{0} 移除了 {1}',
      chat_group_exit: '{0} 离开了群组',
      chat_group_join: '{0}通过邀请链接加入群组',
      chat_group_role: '您现在成为管理员',
      chat_group_unknown: '未知类型，请升级APP',
      chat_you_start: '您',
      chat_you: '您',
      chat_no_support: '暂不支持消息类型，请在手机上查看',
      chat_no_support_title: '暂不支持消息类型',
      chat_create_group: '创建群组',
      chat_sticker: '贴纸',
      chat_pic: '照片',
      chat_contact: '联系人'
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
      sendContact: '分享了一个联系人'
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
