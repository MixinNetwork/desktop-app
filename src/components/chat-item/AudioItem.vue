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
              <ICDown v-if="audioStatus === 'wait'" @click="downloadAudio" />
              <spinner class="loading" v-if="audioStatus === 'loading'"></spinner>
              <ICPlay v-if="audioStatus === 'play'" @click="playAudio" />
              <ICPause v-if="audioStatus === 'pause'" @click="playAudio" />
            </span>
            <span class="audio-time">{{time}}</span>
            <div
              class="audio-progress"
              ref="audioProgress"
              @mousedown="controlAudioProgress($event)"
            >
              <!-- <span class="progress-dot" :style="dotStyle"></span> -->
              <span class="bar" :style="progressStyle"></span>
            </div>
            <span class="audio-duration">{{duration}}</span>

            <audio
              ref="mixinAudio"
              @canplay="canPlay"
              @timeupdate="timeUpdate"
              @ended="onEnded"
              :src="message.mediaUrl"
            ></audio>
          </div>
          <div class="time">
            {{message.lt}}
            <ICSending
              v-if="message.userId === me.user_id && (message.status === MessageStatus.SENDING)"
              class="icon"
            />
            <ICSend
              v-else-if="message.userId === me.user_id && message.status === MessageStatus.SENT"
              class="icon"
            />
            <ICRead
              v-else-if="message.userId === me.user_id && message.status === MessageStatus.DELIVERED"
              class="icon wait"
            />
            <ICRead
              v-else-if="message.userId === me.user_id && message.status === MessageStatus.READ"
              class="icon"
            />
          </div>
        </div>
      </BadgeItem>
    </div>
  </div>
</template>
<script>
import ICSending from '@/assets/images/ic_status_clock.svg'
import ICSend from '@/assets/images/ic_status_send.svg'
import ICRead from '@/assets/images/ic_status_read.svg'
import ICDown from '@/assets/images/arrow-down.svg'
import ICPlay from '@/assets/images/ic_audio_play.svg'
import ICPause from '@/assets/images/ic_audio_pause.svg'
import spinner from '@/components/Spinner.vue'
import BadgeItem from './BadgeItem'
import { MessageStatus, MediaStatus } from '@/utils/constants.js'
import { mapGetters } from 'vuex'
import { getNameColorById } from '@/utils/util.js'
export default {
  props: ['conversation', 'message', 'me', 'showName'],
  components: {
    ICSending,
    ICSend,
    ICRead,
    ICDown,
    ICPlay,
    ICPause,
    spinner,
    BadgeItem
  },
  data: function() {
    return {
      MessageStatus: MessageStatus,
      MediaStatus: MediaStatus,
      time: '00:00',
      duration: '00:00',
      progressStyle: { width: '' },
      dotStyle: { left: '' },
      audioStatus: 'wait'
    }
  },
  created() {
    if (this.message.mediaStatus === MediaStatus.DONE) {
      this.audioStatus = 'play'
    }
  },
  watch: {
    message(data) {
      if (data.mediaStatus === MediaStatus.DONE) {
        this.audioStatus = 'play'
      }
    }
  },
  methods: {
    messageOwnership: function() {
      let { message, me } = this
      return {
        send: message.userId === me.user_id,
        receive: message.userId !== me.user_id
      }
    },
    getColor: function(id) {
      return getNameColorById(id)
    },
    downloadAudio() {
      this.audioStatus = 'loading'
      this.$emit('mediaClick')
    },
    playAudio() {
      let mixinAudio = this.$refs.mixinAudio
      if (mixinAudio.paused) {
        this.audioStatus = 'pause'
        mixinAudio.play()
      } else {
        this.audioStatus = 'play'
        mixinAudio.pause()
      }
    },
    timeUpdate() {
      this.duration = this.transTime(this.$refs.mixinAudio.duration)
      let timeStr = parseInt(this.$refs.mixinAudio.currentTime)
      this.time = this.transTime(timeStr)
      let scales = this.$refs.mixinAudio.currentTime / this.$refs.mixinAudio.duration
      this.progressStyle.width = scales * 100 + '%'
      this.dotStyle.left = scales * 100 + '%'
    },
    onEnded() {
      this.audioStatus = 'play'
      this.time = '00:00'
      this.progressStyle.width = 0
      this.dotStyle.left = 0
    },
    canPlay() {
      this.duration = this.transTime(this.$refs.mixinAudio.duration)
    },
    controlAudioProgress(event) {
      let audio = this.$refs.mixinAudio
      let audioProgress = this.$refs.audioProgress
      if (!audio.paused || audio.currentTime !== 0) {
        let pgsWidth = parseFloat(window.getComputedStyle(audioProgress, null).width.replace('px', ''))
        let rate = event.offsetX / pgsWidth
        audio.currentTime = audio.duration * rate
        this.timeUpdate()
      }
    },
    transTime(value) {
      return this.$moment(value * 1000).format('mm:ss')
    }
  },
  computed: {
    loading: function() {
      return this.attachment.includes(this.message.messageId)
    },
    ...mapGetters({
      attachment: 'attachment'
    })
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
    padding: 0.6rem 2.5rem 0.6rem 0.6rem;
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
        width: 30px;
        height: 30px;
        border-radius: 20px;
        background: #f2f2f6;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-right: 0.6rem;
      }
      .audio-progress {
        width: 10rem;
        height: 2px;
        background-color: #e6e5eb;
        border-radius: 2px;
        margin-left: 0.4rem;
        margin-right: 0.5rem;
        position: relative;
      }
      .bar {
        height: 100%;
        background-color: #c6c9d3;
        border-radius: 2px;
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
    .time {
      color: #8799a5;
      font-size: 0.75rem;
      position: absolute;
      bottom: 0.3rem;
      right: 0.2rem;
      .icon {
        padding-left: 0.2rem;
      }
      .wait {
        path {
          fill: #859479;
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
