<template>
  <div class="group">
    <div class="bar">
      <font-awesome-icon class="back" icon="arrow-left" @click="$emit('setting-back')"/>
      <h3>{{$t('setting.title')}}</h3>
    </div>
    <div class="layout">
      <Avatar id="avatar" :user="me"/>
      <div id="name">
        <label>{{me.full_name}}</label>
      </div>
    </div>
  </div>
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
.group {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  background: white;
  .bar {
    padding-top: 60px;
    width: 100%;
    display: flex;
    height: 60px;
    color: white;
    background: #2cbda5;
    align-items: center;
    flex-flow: row nowrap;
    .back {
      padding: 16px;
    }
    h3 {
      padding: 8px;
    }
  }
  .layout {
    background: white;
    flex: 1;
    display: flex;
    width: 100%;
    padding-top: 16px;
    padding-bottom: 16px;
    #avatar {
      width: 80px;
      height: 80px;
      margin-left: 20px;
    }
    #name {
      display: flex;
      flex-direction: column;

      label {
        margin-top: 20px;
        margin-left: 20px;
        font-weight: 500;
      }
    }
  }
}
</style>
