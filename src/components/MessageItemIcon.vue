<template>
  <div class="message-item">
    <img v-if="url" :src="url" />
  </div>
</template>

<script>
export default {
  props: ['url']
}
</script>

<style lang="scss" scoped>
.message-item {
  width: 2rem;
  height: 2rem;
  margin-right: 0.6rem;
  border-radius: 1rem;
  border-radius: 0.2rem;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3;
  img {
    width: 100%;
  }
}
</style>
