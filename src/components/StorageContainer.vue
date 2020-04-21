<template>
  <main>
    <div class="storage">
      <div class="bar">
        <font-awesome-icon class="back" icon="arrow-left" @click="$emit('back')" />
        <h3>{{$t('storage_usage')}}</h3>
      </div>
      <!-- <Search id="storageContainerSearch" class="nav" @input="onInput" /> -->
      <mixin-scrollbar>
        <ul class="list" v-show="conversations.length">
          <div v-for="(item, i) in conversations" :key="i">
            <div class="conversation" v-if="getStorage(item.conversationId)">
              <Avatar :conversation="item" />
              <div class="content">
                <span class="name">{{item.groupName?item.groupName:item.name}}</span>
                <span class="size">{{getStorage(item.conversationId)}} MB</span>
              </div>
            </div>
          </div>
        </ul>
      </mixin-scrollbar>
    </div>
  </main>
</template>
<script lang="ts">
import Search from '@/components/Search.vue'
import Avatar from '@/components/Avatar.vue'
import conversationDao from '@/dao/conversation_dao'
import participantDao from '@/dao/participant_dao'

import { Vue, Component, Prop } from 'vue-property-decorator'

@Component({
  components: {
    Search,
    Avatar
  }
})
export default class StorageContainer extends Vue {
  @Prop(Object) readonly storages: any

  keyword: any = ''
  $toast: any
  conversations: any = []

  mounted() {
    Object.keys(this.storages).forEach((id: any) => {
      const conversation = conversationDao.getConversationItemByConversationId(id)
      const participants = participantDao.getParticipantsByConversationId(id)
      conversation.participants = participants
      this.conversations.push(conversation)
    })
  }

  getStorage(id: string) {
    const storages: any = this.storages[id]
    let storage = 0
    Object.keys(storages).forEach(key => {
      storage += storages[key]
    })
    if (storage < 0.0001) {
      return 0
    }
    return storage.toFixed(4)
  }

  onInput(text: string) {
    this.keyword = text
  }
}
</script>
<style lang="scss" scoped>
main {
  background: $bg-color;
  .storage {
    display: flex;
    flex-flow: column nowrap;
    height: 100%;
    .bar {
      padding-top: 2.6rem;
      width: 100%;
      display: flex;
      background: #ffffff;
      height: 2.5rem;
      align-items: center;
      flex-flow: row nowrap;
      .back {
        cursor: pointer;
        padding: 0.8rem 0.2rem 0.8rem 1.35rem;
      }
      h3 {
        padding: 0.4rem;
      }
    }
    .nav {
      z-index: 10;
      background: $hover-bg-color;
      border-top: 0.05rem solid $border-color;
      box-shadow: 0 0.05rem 0.05rem #99999933;
      padding: 0.35rem 0.6rem;
      display: flex;
      align-items: center;
    }
    .conversation {
      cursor: pointer;
      background: #ffffff;
      padding: 0.6rem 1rem;
      &:hover {
        background: $hover-bg-color;
      }
      display: flex;
      .content {
        display: flex;
        flex-direction: column;
        padding-left: 0.6rem;
        .name {
          white-space: nowrap;
          overflow: hidden;
          max-width: 9.5rem;
          text-overflow: ellipsis;
        }
        .size {
          font-size: 0.7rem;
          color: $light-font-color;
        }
      }
    }
  }
}
</style>
