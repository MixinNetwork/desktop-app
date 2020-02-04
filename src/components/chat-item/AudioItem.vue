<template>
  <div class="layout" :class="messageOwnership()">
    <div>
      <span
        class="username"
        v-if="showName"
        :style="{color: getColor(message.userId)}"
        @click="$emit('user-click')"
      >{{message.userFullName}}</span>
      <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
        <div class="content">
          <div class="mixin-audio" onselectstart="return false">
            <span class="audio-status">
              <spinner class="loading" v-if="loading"></spinner>
              <svg-icon class="arrow" icon-class="arrow-down" v-else-if="waitStatus && (message.userId !== me.user_id || !message.mediaUrl)" @click="downloadOrUploadAudio" />
              <svg-icon class="arrow" icon-class="arrow-up" v-else-if="waitStatus && message.userId === me.user_id" @click="downloadOrUploadAudio" />
              <svg-icon icon-class="ic_audio_play" v-else-if="audioStatus === 'play'" @click="playAudio" />
              <svg-icon icon-class="ic_audio_pause" v-else-if="audioStatus === 'pause'" @click="playAudio" />
            </span>
            <!-- <span class="audio-time">{{time}}</span> -->
            <div class="progress-box">
              <div
                class="audio-progress"
                ref="audioProgress"
                @mousedown="controlAudioProgress($event)"
              >
                <!-- <span class="progress-dot" :style="dotStyle"></span> -->
                <span class="bar" :style="progressStyle"></span>
              </div>
              <span class="audio-duration">{{duration}}</span>
            </div>

            <audio
              ref="mixinAudio"
              @canplay="canPlay"
              @timeupdate="timeUpdate"
              @ended="onEnded"
              :src="message.mediaUrl"
            ></audio>
          </div>
          <TimeAndStatus :message="message" />
        </div>
      </BadgeItem>
    </div>
  </div>
</template>
<script lang="ts">
import spinner from '@/components/Spinner.vue'
import BadgeItem from './BadgeItem.vue'
import TimeAndStatus from './TimeAndStatus.vue'
import { MessageStatus, MediaStatus } from '@/utils/constants'
import { getNameColorById } from '@/utils/util'

import { Vue, Prop, Watch, Component } from 'vue-property-decorator'
import { Getter } from 'vuex-class'

@Component({
  components: {
    spinner,
    BadgeItem,
    TimeAndStatus
  }
})
export default class AudioItem extends Vue {
  @Prop(Object) readonly conversation: any
  @Prop(Object) readonly message: any
  @Prop(Object) readonly me: any
  @Prop(Boolean) readonly showName: any

  MessageStatus: any = MessageStatus
  MediaStatus: any = MediaStatus
  time: string= '00:00'
  duration: string= '00:00'
  progressStyle: any = { width: '' }
  dotStyle: any = { left: '' }
  audioStatus: string = 'play'
  $moment: any

  @Getter('attachment') attachment: any
  @Getter('currentAudio') currentAudio: any
  @Getter('currentMessages') currentMessages: any

  @Watch('currentAudio')
  onCurrentAudioChange(data: any) {
    const mixinAudio: any = this.$refs.mixinAudio
    if (!mixinAudio) return
    if (data.messageId !== this.message.messageId) {
      if (!mixinAudio.paused) {
        mixinAudio.pause()
        mixinAudio.currentTime = 0
        this.audioStatus = 'play'
      }
    } else {
      if (mixinAudio.paused) {
        this.audioStatus = 'pause'
        mixinAudio.play()
      }
    }
  }

  @Watch('message')
  onMessageChange(data: any) {
    if (data.mediaStatus === MediaStatus.DONE) {
      this.audioStatus = 'play'
    }
  }

  created() {
    if (this.message.mediaStatus === MediaStatus.DONE) {
      this.audioStatus = 'play'
    }
  }

  messageOwnership() {
    let { message, me } = this
    return {
      send: message.userId === me.user_id,
      receive: message.userId !== me.user_id
    }
  }
  getColor(id: string) {
    return getNameColorById(id)
  }
  downloadOrUploadAudio() {
    this.$emit('mediaClick')
  }
  playAudio() {
    const mixinAudio: any = this.$refs.mixinAudio
    if (!mixinAudio) return
    if (mixinAudio.paused) {
      this.audioStatus = 'pause'
      this.$store.dispatch('setCurrentAudio', this.message)
      mixinAudio.play()
    } else {
      this.audioStatus = 'play'
      mixinAudio.pause()
    }
  }
  timeUpdate() {
    const audio: any = this.$refs.mixinAudio
    if (!audio) return
    this.duration = this.transTime(audio.duration)
    let timeStr = parseInt(audio.currentTime)
    this.time = this.transTime(timeStr)
    let scales = audio.currentTime / audio.duration
    this.progressStyle.width = scales * 100 + '%'
    this.dotStyle.left = scales * 100 + '%'
    if (scales === 1) {
      const messages = this.currentMessages
      let nextAudioMessage = null
      let currentAudioId = ''
      for (let i = 0; i < messages.length; i++) {
        if (messages[i].type.endsWith('_AUDIO') && this.message.mediaUrl) {
          if (currentAudioId) {
            nextAudioMessage = messages[i]
            break
          }
          if (this.currentAudio.messageId === messages[i].messageId) {
            currentAudioId = messages[i].messageId
          }
        }
      }
      if (nextAudioMessage) {
        this.$store.dispatch('setCurrentAudio', nextAudioMessage)
      }
    }
  }
  onEnded() {
    this.audioStatus = 'play'
    this.time = '00:00'
    this.progressStyle.width = 0
    this.dotStyle.left = 0
  }
  canPlay() {
    const audio: any = this.$refs.mixinAudio
    if (!audio) return
    this.duration = this.transTime(audio.duration)
  }
  controlAudioProgress(event: any) {
    const audio: any = this.$refs.mixinAudio
    if (!audio) return
    if (!audio.paused || audio.currentTime !== 0) {
      const audioProgress = this.$refs.audioProgress
      // @ts-ignore
      let pgsWidth = parseFloat(window.getComputedStyle(audioProgress, null).width.replace('px', ''))
      let rate = event.offsetX / pgsWidth
      audio.currentTime = audio.duration * rate
      this.timeUpdate()
    }
  }
  transTime(value: any) {
    return this.$moment((Math.round(value - 0) || 1) * 1000).format('mm:ss')
  }

  get waitStatus() {
    const { message } = this
    return (MediaStatus.CANCELED === message.mediaStatus || MediaStatus.EXPIRED === message.mediaStatus)
  }
  get loading() {
    return this.attachment.includes(this.message.messageId)
  }
}
</script>
<style lang="scss" scoped>
.layout {
  display: flex;
  margin-left: 0.4rem;
  margin-right: 0.4rem;
  .username {
    margin-left: 0.4rem;
    display: inline-block;
    font-size: 0.85rem;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    margin-bottom: 0.2rem;
    min-width: 2rem;
    min-height: 0.85rem;
  }
  .content {
    display: flex;
    flex: 1;
    flex-direction: column;
    text-align: start;
    overflow: hidden;
    background: rgba(255, 255, 255, 1);
    border-radius: 0.2rem;
    padding: 0.6rem 1.5rem 0.6rem 0.6rem;
    box-shadow: 0px 1px 1px #aaaaaa33;
    .name {
      font-size: 1rem;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .mixin-audio {
      display: flex;
      align-items: center;
      .audio-status {
        .arrow {
          font-size: 1.5rem;
        }
        cursor: pointer;
        width: 1.875rem;
        height: 1.875rem;
        border-radius: 1.25rem;
        font-size: 2rem;
        background: #f2f2f6;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-right: 0.6rem;
      }
      .audio-progress {
        cursor: pointer;
        width: 11rem;
        height: 0.125rem;
        margin: 0.3rem 0 0.1rem;
        background-color: #e6e5eb;
        border-radius: 0.125rem;
        position: relative;
      }
      .bar {
        height: 100%;
        background-color: #c6c9d3;
        border-radius: 0.125rem;
        display: inline-block;
        position: absolute;
      }
      .audio-time,
      .audio-duration {
        font-size: 0.8rem;
        font-weight: 400;
        color: #777;
      }
    }
  }
}
.layout.send {
  flex-direction: row-reverse;
}
.layout.receive {
  flex-direction: row;
}
</style>
