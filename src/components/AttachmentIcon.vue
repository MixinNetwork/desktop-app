<template>
  <div class="accachment" @click="$emit('mediaClick')">
    <svg-icon icon-class="arrow-up" v-if="isMe && message.mediaUrl" />
    <svg-icon icon-class="arrow-down" v-else />
  </div>
</template>

<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'

@Component
export default class AttachmentIcon extends Vue {
  @Prop(Object) readonly message: any
  @Prop(Object) readonly me: any

  get isMe() {
    return this.message.userId === this.me.user_id
  }
}
</script>

<style lang="scss" scoped>
.accachment {
  cursor: pointer;
  width: 2rem;
  height: 2rem;
  margin-right: 0.6rem;
  border-radius: 1rem;
  background: #f2f2f6;
  display: flex;
  font-size: 1.2rem;
  justify-content: center;
  align-items: center;
  z-index: 3;
  color: #4E80CF;
}
</style>
