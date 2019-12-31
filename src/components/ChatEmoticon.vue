<template>
  <div class="chat-emoticon">
    <div class="title-bar">
      <div>
        <ICHistory />
      </div>
      <div>
        <ICLike />
      </div>
      <div>
        <ICGif />
      </div>
    </div>
    <div class="content">
      <mixin-scrollbar>
        <div class="ul"></div>
      </mixin-scrollbar>
    </div>
  </div>
</template>
<script>
import { mapGetters } from 'vuex'
import ICHistory from '@/assets/images/ic_history.svg'
import ICLike from '@/assets/images/ic_like.svg'
import ICGif from '@/assets/images/ic_gif.svg'

export default {
  components: {
    ICHistory,
    ICLike,
    ICGif
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
  methods: {},
  computed: {
    ...mapGetters({
      conversation: 'currentConversation'
    })
  },
  mounted: async function() {}
}
</script>
<style lang="scss" scoped>
.chat-emoticon {
  background: #f5f7fa;
  display: flex;
  flex-flow: column nowrap;
  height: 15rem;
  left: 18rem;
  bottom: calc(3.6rem - 10px);
  right: 0;
  position: absolute;

  .title-bar {
    overflow-x: auto;
    &::-webkit-scrollbar {
      height: 0;
    }
    height: 3.6rem;
    display: flex;
    align-items: center;
    padding: 0 0.6rem;
    div {
      padding-right: 1rem;
      svg {
        cursor: pointer;
      }
    }
  }
  .content {
    padding: 0.4rem 0.6rem;
  }
}
</style>
