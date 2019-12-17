<template>
  <main>
    <div class="group">
      <div class="bar">
        <font-awesome-icon class="back" icon="arrow-left" @click="$emit('profile-back')" />
        <h3>{{$t('chat.personal_info')}}</h3>
      </div>
      <mixin-scrollbar>
        <div class="ul">
          <Avatar class="avatar" :user="me" />
          <div class="item-wrap">
            <div class="item">
              <a>{{$t('chat.user_name')}}</a>
              <label>{{me.full_name}}</label>
            </div>
            <div class="item">
              <a>Mixin ID</a>
              <label>{{me.identity_number}}</label>
            </div>
            <div class="item">
              <a>{{$t('profile.user_biography')}}</a>
              <label>{{me.biography}}</label>
            </div>
          </div>
        </div>
      </mixin-scrollbar>
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
  background: #f7f7f7;
  .group {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    height: 100%;
    .bar {
      padding-top: 60px;
      width: 100%;
      display: flex;
      background: #2cbda5;
      height: 60px;
      color: white;
      align-items: center;
      flex-flow: row nowrap;
      .back {
        padding: 16px;
      }
      h3 {
        padding: 8px;
      }
    }
    .avatar {
      width: 160px;
      height: 160px;
      margin: 40px auto;
    }
    .item-wrap {
      background: #fff;
      padding: 15px 0 20px;
    }
    .item {
      width: 100%;
      padding-top: 10px;
      padding-bottom: 10px;
      display: flex;
      flex-direction: column;
      a {
        color: #268b7d;
        margin-left: 20px;
        margin-right: 20px;
        font-weight: bold;
      }
      label {
        margin-top: 10px;
        margin-left: 20px;
        font-weight: bold;
        user-select: text;
      }
    }
  }
}
</style>
