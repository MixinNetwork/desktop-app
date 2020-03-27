<template>
  <span class="time" :class="{absolute: !relative, relative}">
    <svg-icon
      icon-class="ic_status_lock"
      v-if="message.type.startsWith('SIGNAL_')"
      class="icon lock"
    />
    <span>{{message.lt}}</span>
    <span v-if="status === 'hide'"></span>
    <svg-icon
      icon-class="ic_status_clock"
      v-else-if="message.status === MessageStatus.FAILED"
      class="failed"
    />
    <svg-icon
      icon-class="ic_status_clock"
      v-else-if="message.status === MessageStatus.SENDING"
      class="icon"
    />
    <svg-icon
      icon-class="ic_status_send"
      v-else-if="message.status === MessageStatus.SENT"
      class="icon"
    />
    <svg-icon
      icon-class="ic_status_delivered"
      v-else-if="message.status === MessageStatus.DELIVERED"
      class="icon"
    />
    <svg-icon
      icon-class="ic_status_read"
      v-else-if="message.status === MessageStatus.READ"
      class="icon"
    />
  </span>
</template>
<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'

import { MessageStatus } from '@/utils/constants'

@Component
export default class TimeAndStatus extends Vue {
  @Prop(Object) readonly message: any
  @Prop(Boolean) readonly relative: any
  @Prop(String) readonly status: any

  MessageStatus: any = MessageStatus
}
</script>

<style lang="scss" scoped>
.time {
  user-select: none;
  color: #8799a5;
  font-size: 0.6rem;
  &.absolute {
    display: flex;
    float: right;
    position: absolute;
    bottom: 0.2rem;
    right: 0.4rem;
    align-items: flex-end;
  }
  &.relative {
    text-align: right;
  }
  .icon {
    font-size: 0.7rem;
    width: 0.7rem;
    height: 0.7rem;
    padding-left: 0.1rem;
    &.lock {
      width: 0.45rem;
      margin-right: 0.1rem;
      vertical-align: top;
    }
  }
}
.receive {
  .icon {
    font-size: 0.7rem;
    display: none;
    &.lock {
      display: inline;
    }
  }
  .failed {
    font-size: 0.7rem;
    margin-left: 0.1rem;
  }
}
</style>
