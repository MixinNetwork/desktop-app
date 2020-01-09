<template>
  <div class="chat-sticker" @click.stop>
    <div class="title-bar">
      <div>
        <div class="album" :class="{on: 'history' === currentAlbumId}">
          <svg-icon icon-class="ic_history" @click="changeTab('history')" />
        </div>
      </div>
      <div>
        <div class="album" :class="{on: 'like' === currentAlbumId}">
          <svg-icon icon-class="ic_like" @click="changeTab('like')" />
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
          <img :src="item.asset_url" @click="sendSticker(item.sticker_id)" />
        </span>
        <i v-for="i in 30" :key="i"></i>
      </div>
    </mixin-scrollbar>
  </div>
</template>
<script>
import { mapGetters } from 'vuex'

import stickerDao from '@/dao/sticker_dao'
import stickerApi from '@/api/sticker'

export default {
  data() {
    return {
      albums: [],
      stickers: [],
      lastUseStickers: [],
      currentAlbumId: 'history'
    }
  },
  beforeCreate() {
    const findAlbums = stickerDao.getStickerAlbums()
    if (findAlbums.length) {
      setTimeout(() => {
        this.albums = JSON.parse(JSON.stringify(findAlbums))
        this.albumPos()
      })
    } else {
      stickerApi.getStickerAlbums().then(res => {
        if (res.data.data) {
          this.albums = res.data.data
          this.albums.forEach(item => {
            stickerDao.insertAlbum(item)
          })
          this.albums = stickerDao.getStickerAlbums()
          this.albumPos()
        }
      })
    }
  },
  created() {
    this.changeTab('history')
  },
  methods: {
    albumPos() {
      const list = stickerDao.getLastUseStickers()
      if (!list || (list && list.length === 0)) {
        setTimeout(() => {
          const albumId = this.albums[0].album_id
          this.getStickers(albumId)
          this.changeTab(albumId)
        })
      }
    },
    getStickers(id) {
      let stickers = stickerDao.getStickersByAlbumId(id)
      if (stickers && stickers.length) {
        this.stickers = stickers
      } else {
        stickerApi.getStickersByAlbumId(id).then(res => {
          if (res.data.data) {
            this.stickers = res.data.data
            this.stickers.forEach(item => {
              stickerDao.insertUpdate(item)
            })
          }
        })
      }
    },
    changeTab(id) {
      this.currentAlbumId = id
      if (id === 'history') {
        const list = stickerDao.getLastUseStickers()
        if (list && list.length) {
          this.lastUseStickers = list
          this.stickers = list
        } else {
          this.stickers = []
        }
      } else if (id === 'like') {
        const albums = stickerDao.getStickerAlbums('PERSONAL')
        this.getStickers(albums[0].album_id)
      } else if (id) {
        this.getStickers(id)
      }
    },
    sendSticker(id) {
      this.$emit('send', id)
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
    font-size: 1.125rem;
    & > div {
      padding-right: 0.5rem;
      svg,
      img {
        cursor: pointer;
      }
      img {
        width: 1.25rem;
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
