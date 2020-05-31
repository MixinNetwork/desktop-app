<template>
  <Dropdown :menus="menus" @onItemClick="onItemClick"></Dropdown>
</template>

<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'
import Dropdown from '@/components/menu/Dropdown.vue'
import { Getter, Action } from 'vuex-class'

import userApi from '@/api/user'
import conversationApi from '@/api/conversation'
import { ConversationStatus, ConversationCategory, MuteDuration } from '@/utils/constants'

@Component({
  components: {
    Dropdown
  }
})
export default class ChatContainerMenu extends Vue {
  @Prop(Object) readonly conversation: any

  @Getter('currentUser') user: any
  @Getter('me') me: any

  @Action('toggleEditor') actionToggleEditor: any
  @Action('exitGroup') actionExitGroup: any
  @Action('setCurrentUser') actionSetCurrentUser: any
  @Action('conversationClear') actionConversationClear: any
  @Action('updateConversationMute') actionUpdateConversationMute: any

  $t: any
  $toast: any
  $Dialog: any
  $moment: any
  menus: any = []

  created() {
    this.$root.$on('updateMenu', (conversation: any) => {
      this.updateMenu(conversation)
    })
  }
  beforeDestroy() {
    this.$root.$off('updateMenu')
  }

  isMute(conversation: any) {
    if (conversation.category === ConversationCategory.CONTACT && conversation.ownerMuteUntil) {
      if (this.$moment().isBefore(conversation.ownerMuteUntil)) {
        return true
      }
    }
    if (conversation.category === ConversationCategory.GROUP && conversation.muteUntil) {
      if (this.$moment().isBefore(conversation.muteUntil)) {
        return true
      }
    }
    return false
  }
  updateMenu(newC: any) {
    const chatMenu = this.$t('menu.chat')
    let menu = []
    if (newC.category === ConversationCategory.CONTACT) {
      menu.push(chatMenu.contact_info)
      if (this.user.relationship !== 'FRIEND') {
        menu.push(chatMenu.add_contact)
      } else {
        menu.push(chatMenu.remove_contact)
      }
      menu.push(chatMenu.clear)
      this.$emit('menuCallback', {
        identity: newC.ownerIdentityNumber,
        participant: true
      })
    } else {
      if (newC.status !== ConversationStatus.QUIT) {
        menu.push(chatMenu.exit_group)
      }
      menu.push(chatMenu.clear)
      this.$emit('menuCallback', {
        identity: this.$t('chat.title_participants', { '0': newC.participants.length }),
        participant: newC.participants.some((item: any) => {
          return item.user_id === this.me.user_id
        })
      })
    }

    if (newC.status !== ConversationStatus.QUIT) {
      if (this.isMute(newC)) {
        menu.push(chatMenu.cancel_mute)
      } else {
        menu.push(chatMenu.mute)
      }
    }
    if (process.env.NODE_ENV !== 'production') {
      menu.push(chatMenu.create_post)
    }
    this.menus = menu
  }

  updateMenuDelay() {
    setTimeout(() => {
      this.updateMenu(this.conversation)
    }, 200)
  }

  changeContactRelationship(action: string) {
    userApi
      .updateRelationship({ user_id: this.user.user_id, full_name: this.user.full_name, action })
      .then((res: any) => {
        if (res.data) {
          const user = res.data.data
          this.actionSetCurrentUser(user)
          this.updateMenuDelay()
        }
      })
  }

  onItemClick(index: number) {
    const chatMenu = this.$t('menu.chat')
    const option = this.menus[index]
    const key = Object.keys(chatMenu).find(key => chatMenu[key] === option)

    if (key === 'contact_info') {
      this.$emit('showDetails', '')
    } else if (key === 'exit_group') {
      this.actionExitGroup(this.conversation.conversationId)
    } else if (key === 'add_contact') {
      this.changeContactRelationship('ADD')
    } else if (key === 'remove_contact') {
      const userId = this.user.user_id
      this.$Dialog.alert(
        this.$t('chat.remove_contact'),
        this.$t('ok'),
        () => {
          this.changeContactRelationship('REMOVE')
        },
        this.$t('cancel'),
        () => {}
      )
    } else if (key === 'clear') {
      this.$Dialog.alert(
        this.$t('chat.chat_clear'),
        this.$t('ok'),
        () => {
          this.actionConversationClear(this.conversation.conversationId)
        },
        this.$t('cancel'),
        () => {
          console.log('cancel')
        }
      )
    } else if (key === 'mute') {
      let ownerId = this.conversation.ownerId
      this.$Dialog.options(
        this.$t('chat.mute_title'),
        this.$t('chat.mute_menu'),
        this.$t('ok'),
        (picked: any) => {
          let duration = MuteDuration.HOUR
          if (picked === 0) {
            duration = MuteDuration.HOUR
          } else if (picked === 1) {
            duration = MuteDuration.HOURS
          } else if (picked === 2) {
            duration = MuteDuration.WEEK
          } else {
            duration = MuteDuration.YEAR
          }
          const { category, conversationId, participants } = this.conversation
          const payload: any = {
            duration,
            category
          }
          if (category === ConversationCategory.CONTACT) {
            payload.participants = participants
          }
          conversationApi.mute(conversationId, payload).then((resp: any) => {
            if (resp.data.data) {
              const c = resp.data.data
              this.actionUpdateConversationMute({ conversation: c, ownerId: ownerId })
              if (picked === 0) {
                this.$toast(this.$t('chat.mute_hour'))
              } else if (picked === 1) {
                this.$toast(this.$t('chat.mute_hours'))
              } else if (picked === 2) {
                this.$toast(this.$t('chat.mute_week'))
              } else {
                this.$toast(this.$t('chat.mute_year'))
              }
              this.updateMenuDelay()
            }
          })
        },
        this.$t('cancel'),
        () => {
          console.log('cancel')
        }
      )
    } else if (key === 'cancel_mute') {
      let ownerId = this.conversation.ownerId
      this.$Dialog.alert(
        this.$t('chat.chat_mute_cancel'),
        this.$t('ok'),
        () => {
          const { category, conversationId, participants } = this.conversation
          const payload: any = {
            duration: 0,
            category
          }
          if (category === ConversationCategory.CONTACT) {
            payload.participants = participants
          }
          conversationApi.mute(conversationId, payload).then((resp: any) => {
            if (resp.data.data) {
              const c = resp.data.data
              this.actionUpdateConversationMute({ conversation: c, ownerId: ownerId })
              this.$toast(this.$t('chat.mute_cancel'))
              this.updateMenuDelay()
            }
          })
        },
        this.$t('cancel'),
        () => {
          console.log('cancel')
        }
      )
    } else if (key === 'create_post') {
      this.actionToggleEditor()
    }
  }
}
</script>
