<template>
  <div class="chat-search">
    <header class="title-bar">
      <div @click="$emit('close')">
        <svg-icon style="font-size: 1.2rem; cursor: pointer" icon-class="ic_close" />
      </div>
      <div class="title-content">{{$t('chat.search')}}</div>
    </header>
    <header class="search-bar">
      <Search
        id="chatSearch"
        :autofocus="true"
        class="input"
        v-if="show && !searchingBefore.replace(/^key:/, '')"
        @input="onInput"
      />
    </header>
    <mixin-scrollbar v-if="show" @scroll="onScroll">
      <div class="ul" ref="messagesUl">
        <div v-if="resultList.length" :class="{scrolling}">
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
import contentUtil from '@/utils/content_util'
import { mapGetters } from 'vuex'
import { messageType } from '@/utils/constants'

import { Vue, Prop, Watch, Component } from 'vue-property-decorator'
import { Getter } from 'vuex-class'

@Component({
  components: {
    SearchItem,
    Search
  }
})
export default class ChatSearch extends Vue {
  @Prop(Boolean) readonly show: any

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

  @Watch('show')
  onShowChanged() {
    this.resultList = []
  }

  renderMdToText(content: string) {
    return contentUtil.renderMdToText(content)
  }

  scrolling: boolean = false
  scrollingTimer: any = null
  onScroll(obj: any) {
    let list: any = this.$refs.messagesUl
    if (!list) return

    this.scrolling = true
    clearTimeout(this.scrollingTimer)
    this.scrollingTimer = setTimeout(() => {
      this.scrolling = false
    }, 200)

    if (list.scrollHeight < list.scrollTop + 1.5 * list.clientHeight) {
      if (!this.nextPageLock) {
        this.nextPageLock = true
        this.nextPage()
      }
    }
  }

  nextPageLock: boolean = false
  nextPage() {
    clearTimeout(this.timeoutListener)
    const waitTime = this.resultList.length ? 0 : 150
    this.timeoutListener = setTimeout(() => {
      this.searching = false
      this.nextPageLock = false
      const data = messageDao.ftsMessageQuery(
        this.conversation.conversationId,
        this.keyword,
        this.prePageMessageCount,
        this.resultList.length
      )
      if (data) {
        const list: any = []
        const keys: any = []
        data.forEach((item: any) => {
          if (keys.indexOf(item.message_id) === -1) {
            if (messageType(item.category) === 'post') {
              item.content = this.renderMdToText(item.content)
            }
            list.push(item)
          }
          keys.push(item.message_id)
        })
        this.resultList.push(...list)
      }
    }, waitTime)
  }

  prePageMessageCount: number = 50
  onInput(keyword: any) {
    this.keyword = keyword
    if (this.keyword.length > 0) {
      this.searching = true
      this.resultList = []
      this.nextPage()
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
  contain: layout;
  .title-bar {
    background: #ffffff;
    height: 2.85rem;
    display: flex;
    align-items: center;
    padding: 0 0.8rem 0 0.8rem;
    line-height: 0;

    .title-content {
      margin-left: 0.8rem;
      font-weight: 500;
      font-size: 0.8rem;
    }
  }
  .search-bar {
    background: $hover-bg-color;
    border-top: 0.05rem solid #f0f0f0;
    .input {
      padding: 0.2rem 0;
      border-bottom: 0.05rem solid #f0f0f0;
    }
  }
  .ul {
    padding-bottom: 1.5rem;
  }
  .scrolling {
    /deep/ .search-item {
      &:hover {
        background: initial;
      }
    }
  }
  .notify {
    text-align: center;
    color: #ccc;
    margin-top: 1.5rem;
  }
}
</style>
