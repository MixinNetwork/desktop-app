<template>
  <div id="app">
    <div class="drag-bar" />
    <router-view />
    <div class="app_time" v-show="showTime">
      <img src="./assets/ic_logo.webp" class="app_time_logo" />
      <span class="app_time_info">{{$t('time_wrong')}}</span>
      <span class="app_time_continue" @click="ping" v-show="!isLoading">{{$t('continue')}}</span>
      <spinner class="app_time_loding" v-if="isLoading" />
    </div>
  </div>
</template>
<script>
import spinner from '@/components/Spinner.vue'
import accountApi from '@/api/account'
import { mapGetters } from 'vuex'
export default {
  components: {
    spinner
  },
  data() {
    return { isLoading: false }
  },
  methods: {
    ping: function() {
      this.isLoading = true
      accountApi.checkPing().then(
        resp => {
          this.isLoading = false
        },
        err => {
          console.log(err.data)
          this.isLoading = false
        }
      )
    }
  },
  computed: {
    ...mapGetters({
      showTime: 'showTime'
    })
  }
}
</script>

<style lang="scss">
@import url('https://fonts.googleapis.com/css?family=Roboto+Condensed');

html,
body {
  padding: 0;
  margin: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', Arial, sans-serif;
  user-select: none;
  overflow: hidden;
  font-size: 16px;
}
button {
  -webkit-app-region: no-drag;
}
input:focus,
select:focus,
textarea:focus,
button:focus {
  outline: none;
}
a {
  color: #5252de;
  text-decoration: none;
}
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;

  .app_time {
    width: 100vw;
    height: 100vh;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: white;
    position: absolute;
    z-index: 100;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    .app_time_logo {
      width: 45vw;
      height: 33.6vw;
    }
    .app_time_info {
      margin-top: 10px;
    }
    .app_time_continue {
      margin-top: 16px;
      height: 2rem;
      color: #2cc3fa;
      &:hover,
      &.current {
        color: #0d94fc;
      }
    }
    .app_time_loding {
      margin-top: 16px;
      width: 2rem;
      height: 2rem;
    }
  }
}
.drag-bar {
  -webkit-app-region: drag;
  width: 100%;
  height: 48px;
  position: absolute;
  top: 0;
}
ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
audio,
video {
  outline: none;
}
b.highlight {
  font-weight: normal;
  &.default {
    color: #3d75e3;
  }
  &.in-bubble {
    background: #c4ed7a;
    border-radius: 4px;
  }
}
</style>
