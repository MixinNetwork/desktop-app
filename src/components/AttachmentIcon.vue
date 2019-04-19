<template>
  <div class="root" v-if="show" @click="$emit('mediaClick')">
    <ICDown v-if="!message.mediaUrl"></ICDown>
    <ICUp v-else></ICUp>
  </div>
</template>

<script>
import ICDown from '@/assets/images/arrow-down.svg'
import ICUp from '@/assets/images/arrow-up.svg'
import { MediaStatus } from '@/utils/constants.js'

export default {
  props: ['message'],
  components: {
    ICDown,
    ICUp
  },
  computed: {
    show: function() {
      return MediaStatus.CANCELED === this.message.mediaStatus
    }
  }
}
</script>

<style lang="scss" scoped>
.root {
  width: 40px;
  height: 40px;
  margin-right: 12px;
  border-radius: 20px;
  background: #f2f2f6;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3;
}
</style>
