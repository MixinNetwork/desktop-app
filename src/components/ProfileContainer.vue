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
              <label class="desc">{{me.biography}}</label>
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
  }
}
</script>
<style lang="scss" scoped>
main {
  background: #f2f3f3;
  .group {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    height: 100%;
    .bar {
      padding-top: 3rem;
      width: 100%;
      display: flex;
      background: #ffffff;
      height: 3rem;
      align-items: center;
      flex-flow: row nowrap;
      .back {
        cursor: pointer;
        padding: 0.8rem 0.2rem 0.8rem 1rem;
      }
      h3 {
        padding: 0.4rem;
      }
    }
    .avatar {
      width: 8rem;
      height: 8rem;
      margin: 2rem auto;
    }
    .item-wrap {
      background: #fff;
      padding: 0.6rem 0 1rem;
    }
    .item {
      width: 100%;
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
      display: flex;
      flex-direction: column;
      a {
        color: #333;
        margin: 0 1rem;
        font-weight: bold;
        font-size: 0.7rem;
      }
      label {
        margin: 0.5rem 1rem 0;
        font-size: 0.85rem;
        user-select: text;
        &.desc {
          font-size: 0.75rem;
        }
      }
    }
  }
}
</style>
