<template>
  <div class="layout" :class="messageOwnership()">
    <div>
      <span
        class="username"
        v-if="showName"
        :style="{color: getColor(message.userId)}"
        @click.stop="$emit('user-click')"
      >{{message.userFullName}}</span>
      <BadgeItem @handleMenuClick="$emit('handleMenuClick')" :type="message.type">
        <div class="content">
          <ReplyMessageItem
            v-if="message.quoteContent"
            :message="JSON.parse(message.quoteContent)"
            :me="me"
            class="reply"
          ></ReplyMessageItem>
          <div
            class="mixin-audio"
            :class="{ played: audioPlayedMap[message.messageId] || messageOwnership().send }"
            onselectstart="return false"
          >
            <span class="audio-status">
              <LoadingIcon
                v-if="loading && fetchPercentMap[message.messageId] !== 100"
                class="loading"
                color="rgb(75, 126, 210)"
                :percent="fetchPercentMap[message.messageId]"
                @userClick="stopLoading"
              />
              <svg-icon
                class="arrow"
                icon-class="arrow-down"
                v-else-if="waitStatus && (message.userId !== me.user_id || !message.mediaUrl)"
                @click.stop="downloadOrUploadAudio"
              />
              <svg-icon
                class="arrow"
                icon-class="arrow-up"
                v-else-if="waitStatus && message.userId === me.user_id"
                @click.stop="downloadOrUploadAudio"
              />
              <svg-icon
                icon-class="ic_audio_play"
                v-else-if="audioStatus === 'play'"
                @click.stop="playAudio"
              />
              <svg-icon
                icon-class="ic_audio_pause"
                v-else-if="audioStatus === 'pause'"
                @click.stop="playAudio"
              />
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

          </div>
          <TimeAndStatus :message="message" />
        </div>
      </BadgeItem>
    </div>
  </div>
</template>
<script lang="ts">
import ReplyMessageItem from './ReplyMessageItem.vue'
import LoadingIcon from '@/components/LoadingIcon.vue'
import BadgeItem from './BadgeItem.vue'
import TimeAndStatus from './TimeAndStatus.vue'
import { MessageStatus, MediaStatus, messageType } from '@/utils/constants'
import { getNameColorById } from '@/utils/util'

import { Vue, Prop, Watch, Component } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'

@Component({
  components: {
    ReplyMessageItem,
    LoadingIcon,
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
  time: string = '00:00'
  duration: string = '00:00'
  progressStyle: any = { width: '' }
  dotStyle: any = { left: '' }
  audioStatus: string = 'play'
  $moment: any
  audioPlayedMap: any = {}

  @Getter('attachment') attachment: any
  @Getter('currentAudio') currentAudio: any
  @Getter('currentMessages') currentMessages: any
  @Getter('fetchPercentMap') fetchPercentMap: any

  @Action('stopLoading') actionStopLoading: any
  @Action('setCurrentAudio') actionSetCurrentAudio: any

  @Watch('currentAudio.messageId')
  onCurrentAudioChange(messageId: any) {
    this.updateCurrentAudio(messageId)
  }

  @Watch('audioStatus')
  onAudioStatus(status: string) {
    const { messageId } = this.message
    this.audioPlayedMap = this.getAudioPlayedMap()
    this.audioPlayedMap[messageId] = true
    localStorage.audioPlayedMap = JSON.stringify(this.audioPlayedMap)
  }

  @Watch('message')
  onMessageChange(data: any) {
    if (data.mediaStatus === MediaStatus.DONE) {
      this.audioStatus = 'play'
    }
  }

  mounted() {
    this.audioPlayedMap = this.getAudioPlayedMap()
    if (this.message.mediaStatus === MediaStatus.DONE) {
      this.audioStatus = 'play'
    }
    this.duration = this.transTime(this.message.mediaDuration / 1000)
    this.timeUpdate()

    this.$root.$on('audioTimeupdate', () => {
      this.timeUpdate()
    })
    this.$root.$on('audioEnded', () => {
      this.onEnded()
    })
  }

  beforeDestroy() {
    this.$root.$off('audioTimeupdate')
    this.$root.$off('audioEnded')
  }

  stopLoading() {
    this.actionStopLoading(this.message.messageId)
  }

  updateCurrentAudio(curMessageId: string) {
    const mixinAudio: any = document.getElementById('mixinAudio')
    if (!mixinAudio) return
    if (curMessageId !== this.message.messageId) {
      this.timeReset()
    } else {
      if (mixinAudio.paused) {
        this.audioStatus = 'pause'
        mixinAudio.volume = 1
        mixinAudio.play()
      } else {
        this.audioStatus = 'play'
        mixinAudio.pause()
      }
    }
  }

  getAudioPlayedMap() {
    const AudioPlayedMapSrc = localStorage.audioPlayedMap || '{}'
    return JSON.parse(AudioPlayedMapSrc)
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
    if (this.currentAudio && this.message.messageId === this.currentAudio.messageId) {
      this.updateCurrentAudio(this.message.messageId)
    } else {
      this.actionSetCurrentAudio(this.message)
    }
  }
  timeReset() {
    this.audioStatus = 'play'
    this.time = '00:00'
    this.progressStyle.width = 0
    this.dotStyle.left = 0
  }
  timeUpdate() {
    const audio: any = document.getElementById('mixinAudio')
    if (!audio || (this.currentAudio && this.message.messageId !== this.currentAudio.messageId)) return
    let timeStr = parseInt(audio.currentTime)
    this.time = this.transTime(timeStr)
    let scales = audio.currentTime / audio.duration
    this.progressStyle.width = scales * 100 + '%'
    this.dotStyle.left = scales * 100 + '%'
    if (scales >= 1) {
      this.timeReset()
    }
  }
  onEnded() {
    if (this.message.messageId !== this.currentAudio.messageId) return
    const messages = this.currentMessages
    let nextAudioMessage = null
    let currentAudioId = ''
    for (let i = 0; i < messages.length; i++) {
      if (messageType(messages[i].type) === 'audio' && this.message.mediaUrl) {
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
      this.actionSetCurrentAudio(nextAudioMessage)
    }
  }
  controlAudioProgress(event: any) {
    const audio: any = document.getElementById('mixinAudio')
    if (!audio) return
    if (!audio.paused || audio.currentTime !== 0) {
      const audioProgress = this.$refs.audioProgress
      // @ts-ignore
      let pgsWidth = parseFloat(getComputedStyle(audioProgress, null).width)
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
    return (
      this.fetchPercentMap[message.messageId] !== 100 &&
      (MediaStatus.CANCELED === message.mediaStatus || MediaStatus.EXPIRED === message.mediaStatus)
    )
  }
  get loading() {
    return this.attachment.includes(this.message.messageId)
  }
}
</script>
<style lang="scss" scoped>
.layout {
  display: flex;
  margin-left: 0.3rem;
  margin-right: 0.3rem;
  .username {
    margin-left: 0.3rem;
    display: inline-block;
    font-size: 0.65rem;
    max-width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    margin-bottom: 0.1rem;
    min-width: 1.6rem;
    min-height: 0.65rem;
  }
  .content {
    display: flex;
    flex: 1;
    flex-direction: column;
    text-align: start;
    overflow: hidden;
    background: rgba(255, 255, 255, 1);
    border-radius: 0.1rem;
    box-shadow: 0 0.05rem 0.05rem #aaaaaa33;
    .reply {
      max-width: 12.5rem;
    }
    .name {
      font-size: 0.8rem;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .mixin-audio {
      padding: 0.45rem 1.2rem 0.45rem 0.45rem;
      display: flex;
      align-items: center;
      .loading {
        position: relative;
        width: 2rem;
        height: 2rem;
        .stop {
          width: 100%;
          height: 100%;
          left: 0;
          z-index: 0;
          position: absolute;
          line-height: 100%;
          cursor: pointer;
        }
        .circle {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }
      }
      .audio-status {
        .arrow {
          font-size: 1.2rem;
          color: rgb(75, 126, 210);
        }
        cursor: pointer;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 1rem;
        font-size: 1.6rem;
        background: #f2f2f6;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-right: 0.45rem;
      }
      .audio-progress {
        cursor: pointer;
        width: 8.8rem;
        height: 0.1rem;
        margin: 0.2rem 0 0.1rem;
        background-color: #4b7ed2dd;
        border-radius: 0.1rem;
        position: relative;
      }
      .bar {
        height: 100%;
        background-color: #c6c9d3;
        border-radius: 0.1rem;
        display: inline-block;
        position: absolute;
      }
      .audio-duration {
        color: #4b7ed2;
        font-weight: 400;
        font-size: 0.6rem;
      }
      .audio-time {
        color: #777;
      }

      &.played {
        .audio-progress {
          background-color: #dddddd;
        }
        .audio-duration {
          color: #9b9b9b;
        }
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
