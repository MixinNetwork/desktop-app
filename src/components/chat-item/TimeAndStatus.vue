<template>
  <span class="time" :class="{absolute: !relative, relative}">
    <svg-icon icon-class="ic_status_lock" v-if="/^SIGNAL_/.test(message.type)" class="icon lock" />
    <span>{{message.lt}}</span>
    <svg-icon icon-class="ic_status_clock" v-if="message.status === MessageStatus.SENDING" class="icon" />
    <svg-icon icon-class="ic_status_send" v-else-if="message.status === MessageStatus.SENT" class="icon" />
    <svg-icon icon-class="ic_status_delivered" v-else-if="message.status === MessageStatus.DELIVERED" class="icon" />
    <svg-icon icon-class="ic_status_read" v-else-if="message.status === MessageStatus.READ" class="icon" />
  </span>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'

import {
  MessageStatus
} from '@/utils/constants'

@Component
export default class App extends Vue {
  @Prop(Object) readonly message: any
  @Prop(Boolean) readonly relative: any

  MessageStatus: any = MessageStatus
}
</script>

<style lang="scss" scoped>
.time {
  color: #8799a5;
  font-size: 0.75rem;
  &.absolute {
    display: flex;
    float: right;
    position: absolute;
    bottom: 0.3rem;
    right: 0.2rem;
    align-items: flex-end;
  }
  &.relative {
    text-align: right;
  }
  .icon {
    width: .875rem;
    height: .875rem;
    padding-left: 0.2rem;
    &.lock {
      width: .55rem;
      margin-right: 0.2rem;
    }
  }
}
.receive {
  .icon {
    display: none;
    &.lock {
      display: inline;
    }
  }
}
</style>
