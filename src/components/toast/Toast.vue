<template>
  <div class="wrap" v-if="showWrap" :class="showContent ?'fadein':'fadeout'">{{text}}</div>
</template>

<style scoped>
.wrap {
  position: fixed;
  z-index: 9999;
  left: 0.8rem;
  bottom: 0.8rem;
  background: rgba(0, 0, 0, 0.8);
  padding: 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
  color: #fff;
}
.fadein {
  animation: animate_in 0.25s;
}
.fadeout {
  animation: animate_out 0.25s;
  opacity: 0;
}
@keyframes animate_in {
  0% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
@keyframes animate_out {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}
</style>
