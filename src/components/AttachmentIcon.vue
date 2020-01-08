<template>
  <div class="accachment" @click="$emit('mediaClick')">
    <svg-icon icon-class="arrow-up" v-if="isMe" />
    <svg-icon icon-class="arrow-down" v-else />
  </div>
</template>

<script lang="ts">
import { Vue, Prop } from 'vue-property-decorator'

export default class App extends Vue {
  @Prop(Object) message: any
  @Prop(Object) me: any

  get isMe() {
    return this.message.userId === this.me.user_id
  }
}
</script>

<style lang="scss" scoped>
.accachment {
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
