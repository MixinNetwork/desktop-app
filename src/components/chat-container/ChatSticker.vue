<template>
  <div class="chat-sticker" :style="{ height: `${height}rem`}" @click.stop>
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
        :key="item && item.album_id"
        @click="changeTab(item.album_id)"
      >
        <div class="album" :class="{on: item.album_id === currentAlbumId}">
          <img :src="item.icon_url" />
        </div>
      </div>
    </div>
    <mixin-scrollbar v-if="stickers">
      <div class="ul">
        <span
          class="sticker"
          :style="{width: `${stickerStyle.w}px`, height: `${stickerStyle.w}px`, margin: `${stickerStyle.m}px`}"
          v-for="item in stickers"
          :key="item && item.sticker_id"
        >
          <Lottie
            v-if="item.asset_type === 'json'"
            :path="item.asset_url"
            @click="sendSticker(item.sticker_id)"
          />
          <img v-else :src="item.asset_url" @click="sendSticker(item.sticker_id)" />
        </span>
        <i
          v-for="i in 30"
          :style="{width: `${stickerStyle.w}px`, margin: `0 ${stickerStyle.m}px`}"
          :key="i"
        ></i>
      </div>
    </mixin-scrollbar>
  </div>
</template>
<script lang="ts">
import stickerDao from '@/dao/sticker_dao'
import stickerApi from '@/api/sticker'
import { downloadSticker, updateStickerAlbums } from '@/utils/attachment_util'

import { Vue, Component, Prop } from 'vue-property-decorator'
import { Getter } from 'vuex-class'

import Lottie from '@/components/lottie/Lottie.vue'

@Component({
  components: {
    Lottie
  }
})
export default class ChatSticker extends Vue {
  @Prop(Number) readonly height: any

  @Getter('currentConversation') conversation: any

  albums: any = []
  stickers: any = []
  lastUseStickers: any = []
  currentAlbumId: any = 'history'
  stickerStyle: any = {
    w: 80,
    h: 80,
    m: 5
  }
  resizeStickerTimeout: any

  async created() {
    const res = await stickerApi.getStickerAlbums()
    if (res.data.data) {
      this.albums = res.data.data
      this.albums.forEach((item: any) => {
        stickerDao.insertAlbum(item)
      })
    }
    const findAlbums = stickerDao.getStickerAlbums()
    if (findAlbums.length) {
      setTimeout(() => {
        this.albums = JSON.parse(JSON.stringify(findAlbums))
        updateStickerAlbums(this.albums)
        this.albumPos()
      })
    }
    setTimeout(() => {
      this.changeTab('history')
      window.onresize = () => {
        this.resizeSticker()
      }
    })
  }

  resizeSticker() {
    clearTimeout(this.resizeStickerTimeout)
    this.resizeStickerTimeout = setTimeout(() => {
      const element = document.querySelector('.container')
      if (!element) return
      let { m } = this.stickerStyle
      // @ts-ignore
      const width = element.offsetWidth - 20
      // @ts-ignore
      const size = parseInt(width / (80 + 2 * m))
      const fit = (width - size * (80 + m * 2)) / size
      if (fit < 80) {
        this.stickerStyle = {
          w: 80 + fit,
          h: 80 + fit,
          m
        }
      }
    }, 50)
  }

  albumPos() {
    const list = stickerDao.getLastUseStickers()
    if ((!list || list.length === 0) && this.albums && this.albums.length > 0) {
      setTimeout(() => {
        const albumId = this.albums[0].album_id
        this.getStickers(albumId)
        this.changeTab(albumId)
      })
    }
  }
  forceGetStickersMap: any = {}
  async getStickers(id: string, force?: boolean) {
    let stickersData: any = []
    let getStickersMap: any = {}
    try {
      getStickersMap = JSON.parse(localStorage.getItem('getStickersMap') || '{}')
    } catch (error) {}
    if (this.forceGetStickersMap[id] > new Date().getTime() - 3600000) {
      force = false
    }
    if (!getStickersMap[id] || force) {
      this.forceGetStickersMap[id] = new Date().getTime()
      const stickersRet = await stickerApi.getStickersByAlbumId(id)
      if (stickersRet.data.data) {
        stickersData = stickersRet.data.data
      }
      getStickersMap[id] = true
      localStorage.setItem('getStickersMap', JSON.stringify(getStickersMap))
    }
    stickersData.forEach((item: any) => {
      stickerDao.insertUpdate(item)
    })
    let stickers = stickerDao.getStickersByAlbumId(id)
    stickers.forEach((sticker: any) => {
      if (!sticker.asset_url.startsWith('file://')) {
        const stickerId = sticker.sticker_id
        downloadSticker(stickerId, sticker.created_at).then(filePath => {
          sticker.asset_url = 'file://' + filePath
        })
      }
    })
    this.stickers = stickers
    this.resizeSticker()
  }
  changeTab(id: string) {
    this.stickers = ''
    setTimeout(() => {
      this.currentAlbumId = id
      if (id === 'history') {
        const list = stickerDao.getLastUseStickers()
        if (list && list.length) {
          this.lastUseStickers = list
          this.stickers = list
        } else {
          this.stickers = []
        }
        this.resizeSticker()
      } else if (id === 'like') {
        const albums = stickerDao.getStickerAlbums('PERSONAL')
        if (albums[0]) {
          this.getStickers(albums[0].album_id, true)
        } else {
          stickerApi.getStickerAlbums().then((res: any) => {
            if (res.data.data) {
              const albums = res.data.data
              albums.forEach((item: any) => {
                stickerDao.insertAlbum(item)
              })
              this.getStickers(albums[0].album_id, true)
            }
          })
        }
      } else if (id) {
        this.getStickers(id)
      }
    })
  }
  sendSticker(id: string) {
    this.$emit('send', id)
  }
}
</script>
<style lang="scss" scoped>
.chat-sticker {
  background: $bg-color;
  border-top: 0.05rem solid #f0f0f0;
  display: flex;
  flex-flow: column nowrap;
  height: 12rem;
  padding-bottom: 0.05rem;
  left: 14.4rem;
  bottom: 2.4rem;
  right: 0;
  position: absolute;
  z-index: 1;
  contain: layout;

  .title-bar {
    overflow-x: auto;
    &::-webkit-scrollbar {
      height: 0;
    }
    height: 2.85rem;
    display: flex;
    align-items: center;
    padding: 0 0.45rem;
    font-size: 0.9rem;
    & > div {
      padding-right: 0.4rem;
      svg,
      img {
        cursor: pointer;
      }
      img {
        width: 1rem;
      }
    }
    .album {
      width: 1.6rem;
      height: 1.6rem;
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
    padding: 0 0.5rem 0.6rem;
    height: 9.1rem;
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;

    .sticker {
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      img {
        transition: 0.1s all ease;
        max-height: 100%;
        max-width: 100%;
      }
      &:hover {
        img {
          transform: scale(1.065);
        }
      }
    }
  }
  &.box-message {
    margin-bottom: 2.4rem;
  }
}
</style>
