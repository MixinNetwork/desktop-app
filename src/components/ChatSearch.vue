<template>
  <div class="chat-search">
    <header class="title-bar">
      <div @click="$emit('close')">
        <svg-icon style="font-size: 1.5rem" icon-class="ic_close" />
      </div>
      <div class="title-content">{{$t('chat.search')}}</div>
    </header>
    <header class="search-bar">
      <Search class="input" v-if="!searchingBefore.replace(/^key:/, '')" @input="onInput" />
    </header>
    <mixin-scrollbar>
      <div class="ul">
        <div v-if="resultList.length">
          <SearchItem
            v-for="item in resultList"
            :key="item.message_id"
            :item="item"
            :keyword="keyword"
            @search-click="onSearchClick"
          ></SearchItem>
        </div>
        <div
          class="notify"
          v-else-if="keyword"
        >{{$t(searching ? 'chat.searching' : 'chat.search_empty')}}</div>
        <div
          class="notify"
          v-else-if="conversation.category === 'GROUP'"
        >{{$t('chat.search_group_notify', { 0: conversation.groupName })}}</div>
        <div class="notify" v-else>{{$t('chat.search_notify', { 0: conversation.name })}}</div>
      </div>
    </mixin-scrollbar>
  </div>
</template>
<script lang="ts">
import Search from '@/components/Search.vue'
import SearchItem from '@/components/SearchItem.vue'
import messageDao from '@/dao/message_dao'
import { mapGetters } from 'vuex'

import { Vue, Prop, Watch, Component } from 'vue-property-decorator'
import { Getter } from 'vuex-class'

@Component({
  components: {
    SearchItem,
    Search
  }
})
export default class ChatSearch extends Vue {
@Getter('searching') readonly searchingBefore: any
@Getter('currentConversation') readonly conversation: any

  timeoutListener: any = null
  keyword: any = ''
  searching: any = false
  resultList: any = []

  @Watch('conversation')
  onConversationChanged() {
    this.resultList = []
    this.searching = true
    const keyword = this.searchingBefore.replace(/^key:/, '')
    this.onInput(keyword)
  }

  onInput(keyword: any) {
    this.keyword = keyword
    if (this.keyword.length > 0) {
      this.searching = true
      clearTimeout(this.timeoutListener)
      this.timeoutListener = setTimeout(() => {
        this.searching = false
        const data = messageDao.ftsMessageQuery(this.conversation.conversationId, this.keyword)
        if (data) {
          this.resultList = data
        }
      }, 200)
    } else {
      this.resultList = []
      this.searching = false
    }
  }
  onSearchClick(item: any) {
    this.$emit('search', item, this.keyword)
    this.searching = false
  }
}
</script>
<style lang="scss" scoped>
.chat-search {
  background: #fff;
  display: flex;
  flex-flow: column nowrap;
  .title-bar {
    background: #ffffff;
    height: 3.6rem;
    display: flex;
    align-items: center;
    padding: 0px 1rem 0px 1rem;
    line-height: 0;

    .title-content {
      margin-left: 1rem;
      font-weight: 500;
      font-size: 1rem;
    }
  }
  .search-bar {
    background: #f5f7fa;
    border-top: 1px solid #f0f0f0;
    .input {
      padding: 0.2rem 0;
      border-bottom: 1px solid #f0f0f0;
      width: calc(100% - 1.875rem);
    }
  }
  .notify {
    text-align: center;
    color: #ccc;
    margin-top: 1.875rem;
  }
}
</style>
