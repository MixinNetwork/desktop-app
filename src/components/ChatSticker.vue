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
    <mixin-scrollbar v-if="stickers">
      <div class="ul">
        <span
          class="sticker"
          :style="{width: `${stickerStyle.w}px`, height: `${stickerStyle.w}px`, margin: `${stickerStyle.m}px`}"
          v-for="item in stickers"
          :key="item.sticker_id"
        >
          <img :src="item.asset_url" @click="sendSticker(item.sticker_id)" />
        </span>
        <i v-for="i in 30"
          :style="{width: `${stickerStyle.w}px`, margin: `0 ${stickerStyle.m}px`}"
          :key="i"></i>
      </div>
    </mixin-scrollbar>
  </div>
</template>
<script lang="ts">
import { mapGetters } from 'vuex'

import stickerDao from '@/dao/sticker_dao'
import stickerApi from '@/api/sticker'

import { Vue, Component } from 'vue-property-decorator'
import { Getter } from 'vuex-class'

@Component
export default class ChatSticker extends Vue {
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
  resezeStickerTimeout: any

  created() {
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
          this.albums.forEach((item: any) => {
            stickerDao.insertAlbum(item)
          })
          this.albums = stickerDao.getStickerAlbums()
          this.albumPos()
        }
      })
    }
    setTimeout(() => {
      this.changeTab('history')
      window.onresize = () => {
        this.resezeSticker()
      }
    })
  }

  resezeSticker() {
    clearTimeout(this.resezeStickerTimeout)
    this.resezeStickerTimeout = setTimeout(() => {
      const element = document.querySelector('.container')
      let { m } = this.stickerStyle
      // @ts-ignore
      const width = element.offsetWidth - 20
      // @ts-ignore
      const size = parseInt(width / (80 + 2 * m))
      const fit = (width - size * (80 + m * 2)) / size
      if (fit < 80) {
        this.stickerStyle = {
          w: 80 + fit, h: 80 + fit, m
        }
      }
    }, 50)
  }

  albumPos() {
    const list = stickerDao.getLastUseStickers()
    if (!list || (list && list.length === 0)) {
      setTimeout(() => {
        const albumId = this.albums[0].album_id
        this.getStickers(albumId)
        this.changeTab(albumId)
      })
    }
  }
  getStickers(id: string) {
    let stickers = stickerDao.getStickersByAlbumId(id)
    if (stickers && stickers.length) {
      this.stickers = stickers
      this.resezeSticker()
    } else {
      stickerApi.getStickersByAlbumId(id).then(res => {
        if (res.data.data) {
          this.stickers = res.data.data
          this.resezeSticker()
          this.stickers.forEach((item: any) => {
            stickerDao.insertUpdate(item)
          })
        }
      })
    }
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
        this.resezeSticker()
      } else if (id === 'like') {
        const albums = stickerDao.getStickerAlbums('PERSONAL')
        this.getStickers(albums[0].album_id)
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
  background: #f5f7fa;
  display: flex;
  flex-flow: column nowrap;
  height: 15.1rem;
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
    padding: 0 10px 0.8rem;
    height: 11.4rem;
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
}
</style>
