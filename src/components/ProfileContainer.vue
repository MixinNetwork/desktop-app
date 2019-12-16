<template>
  <main>
    <div class="group">
      <div class="bar">
        <font-awesome-icon class="back" icon="arrow-left" @click="$emit('profile-back')" />
        <h3>{{$t('chat.personal_info')}}</h3>
      </div>
      <Avatar id="avatar" :user="me" />
      <div id="name">
        <a>{{$t('chat.user_name')}}</a>
        <label>{{me.full_name}}</label>
      </div>
      <div id="name">
        <a>Mixin ID</a>
        <label>{{me.identity_number}}</label>
      </div>
    </div>
  </main>
</template>
<script>
import Avatar from '@/components/Avatar.vue'
import { mapGetters } from 'vuex'
export default {
  components: { Avatar },
  data: function() {
    return {
      group: false,
      title: ''
    }
  },
  computed: {
    ...mapGetters({ me: 'me' })
  },
  methods: {}
}
</script>
<style lang="scss" scoped>
main {
  background: #f5f7fa;
  .group {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    .bar {
      padding-top: 60px;
      width: 100%;
      display: flex;
      background: #ffffff;
      height: 60px;
      align-items: center;
      flex-flow: row nowrap;
      .back {
        padding: 16px;
      }
      h3 {
        padding: 8px;
      }
    }
    #avatar {
      margin-top: 40px;
      margin-bottom: 40px;
      width: 160px;
      height: 160px;
    }
    #name {
      background: white;
      width: 100%;
      padding-top: 10px;
      padding-bottom: 10px;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
      a {
        color: #333;
        margin-left: 20px;
        margin-right: 20px;
        font-weight: bold;
      }
      label {
        margin-top: 20px;
        margin-left: 20px;
        user-select: text;
      }
    }
  }
}
</style>
