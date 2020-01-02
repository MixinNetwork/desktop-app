<template>
  <div class="chat-sticker" @click.stop>
    <div class="title-bar">
      <div>
        <div class="album" :class="{on: 'history' === currentAlbumId}">
          <ICHistory @click="changeTab('history')" />
        </div>
      </div>
      <div>
        <div class="album" :class="{on: 'like' === currentAlbumId}">
          <ICLike @click="changeTab('like')" />
        </div>
      </div>
      <div>
        <div class="album" :class="{on: 'gif' === currentAlbumId}">
          <ICGif @click="changeTab('gif')" />
        </div>
      </div>
      <div
        v-show="item.icon_url"
        v-for="item in albums"
        :key="item.album_id"
        @click="changeTab(item.album_id)"
      >
        <div class="album" :class="{on: item.album_id === currentAlbumId}">
          <img :src="item.icon_url" />
        </div>
      </div>
    </div>
    <mixin-scrollbar>
      <div class="ul">
        <span class="sticker" v-for="item in stickers" :key="item.sticker_id">
          <img :src="item.asset_url" />
        </span>
        <i v-for="i in 30" :key="i"></i>
      </div>
    </mixin-scrollbar>
  </div>
</template>
<script>
import { mapGetters } from 'vuex'
import ICHistory from '@/assets/images/ic_history.svg'
import ICLike from '@/assets/images/ic_like.svg'
import ICGif from '@/assets/images/ic_gif.svg'

import stickerApi from '@/api/sticker'

export default {
  components: {
    ICHistory,
    ICLike,
    ICGif
  },
  data() {
    return {
      albums: [],
      stickers: [],
      currentAlbumId: ''
    }
  },
  beforeCreate() {
    stickerApi.getStickerAlbums().then(res => {
      if (res.data.data) {
        this.albums = res.data.data
      }
    })
  },
  methods: {
    getStickers(id) {
      stickerApi.getStickersByAlbumId(id).then(res => {
        if (res.data.data) {
          this.stickers = res.data.data
        }
      })
    },
    changeTab(id) {
      this.currentAlbumId = id

      if (id === 'history') {
      } else if (id === 'like') {
        this.getStickers(this.albums[0].album_id)
      } else if (id === 'gif') {
      } else if (id) {
        this.getStickers(id)
      }
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
.chat-sticker {
  background: #f5f7fa;
  display: flex;
  flex-flow: column nowrap;
  height: 15rem;
  left: 18rem;
  bottom: 3rem;
  right: 0;
  position: absolute;
  z-index: 1;

  .title-bar {
    overflow-x: auto;
    &::-webkit-scrollbar {
      height: 0;
    }
    height: 3.6rem;
    display: flex;
    align-items: center;
    padding: 0 0.6rem;
    & > div {
      padding-right: 0.5rem;
      svg,
      img {
        cursor: pointer;
      }
      img {
        width: 20px;
      }
    }
    .album {
      width: 2rem;
      height: 2rem;
      border-radius: 0.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      &.on {
        background: #e5e7ec;
      }
    }
  }
  .ul {
    padding: 0 0.6rem 0.8rem;
    height: 10.5rem;
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;

    i {
      width: 5rem;
      margin: 0 0.5rem;
    }
    .sticker {
      cursor: pointer;
      width: 5rem;
      height: 5rem;
      display: inline-flex;
      margin: 0.3rem 0.5rem;
      align-items: center;
      justify-content: center;
      img {
        max-height: 100%;
        max-width: 100%;
      }
    }
  }
}
</style>
