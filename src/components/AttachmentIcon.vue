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
  width: 2.5rem;
  height: 2.5rem;
  margin-right: 0.75rem;
  border-radius: 1.25rem;
  background: #f2f2f6;
  display: flex;
  font-size: 1.5rem;
  justify-content: center;
  align-items: center;
  z-index: 3;
}
</style>
