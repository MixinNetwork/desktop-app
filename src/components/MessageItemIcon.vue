<template>
  <div class="message-item">
    <img v-if="url" :src="url" />
  </div>
</template>

<script>
export default {
  props: ['url'],
  components: {},
  computed: {}
}
</script>

<style lang="scss" scoped>
.message-item {
  width: 2.5rem;
  height: 2.5rem;
  margin-right: 0.75rem;
  border-radius: 1.25rem;
  background: #f2f2f6;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 3;
  img {
    width: 100%;
  }
}
</style>
