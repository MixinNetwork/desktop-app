<template>
  <div class="root" @click="$emit('mediaClick')">
    <ICUp v-if="isMe"></ICUp>
    <ICDown v-else></ICDown>
  </div>
</template>

<script>
import ICDown from '@/assets/images/arrow-down.svg'
import ICUp from '@/assets/images/arrow-up.svg'

export default {
  props: ['message', 'me'],
  components: {
    ICDown,
    ICUp
  },
  computed: {
    isMe() {
      return this.message.userId === this.me.user_id
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
