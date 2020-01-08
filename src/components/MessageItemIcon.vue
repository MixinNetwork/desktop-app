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
  width: 40px;
  height: 40px;
  margin-right: 12px;
  border-radius: 20px;
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
