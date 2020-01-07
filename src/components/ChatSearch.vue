<template>
  <div class="chat-search">
    <header class="title-bar">
      <div @click="$emit('close')">
        <ICClose />
      </div>
      <div class="title-content">{{$t('chat.search')}}</div>
    </header>
    <header class="search-bar">
      <Search class="input" v-model="keyword" />
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
        <div class="notify" v-else-if="keyword">{{searching?'正在搜索聊天 ...':'未搜索到相关记录'}}</div>
        <div class="notify" v-else>{{`搜索和 ${conversation.name} 相关的记录`}}</div>
      </div>
    </mixin-scrollbar>
  </div>
</template>
<script>
import Search from '@/components/Search.vue'
import SearchItem from '@/components/SearchItem.vue'
import ICClose from '@/assets/images/ic_close.svg'
import messageDao from '@/dao/message_dao'
import { mapGetters } from 'vuex'

export default {
  components: {
    ICClose,
    SearchItem,
    Search
  },
  data() {
    return {
      timeoutListener: null,
      keyword: '',
      searching: false,
      resultList: []
    }
  },
  watch: {
    keyword() {
      this.onInput()
    }
  },
  methods: {
    onInput() {
      if (this.keyword.length > 0) {
        this.searching = true
        clearTimeout(this.timeoutListener)
        this.timeoutListener = setTimeout(() => {
          this.searching = false
          const data = messageDao.ftsMessageQuery(this.conversation.conversationId, this.keyword)
          if (data) {
            this.resultList = data
          }
        }, 500)
      } else {
        this.resultList = []
        this.searching = false
      }
    },
    onSearchClick(item) {
      this.$emit('search', item, this.keyword)
      this.searching = false
    }
  },
  computed: {
    ...mapGetters({
      conversation: 'currentConversation'
    })
  },
  mounted: async function() {}
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
    padding: 0px 16px 0px 16px;
    line-height: 0;

    .title-content {
      margin-left: 16px;
      font-weight: 500;
      font-size: 16px;
    }
  }
  .search-bar {
    background: #f5f7fa;
    padding: 3px 0;
    .input {
      width: calc(100% - 30px);
    }
  }
  .notify {
    text-align: center;
    color: #ccc;
    margin-top: 30px;
  }
}
</style>
