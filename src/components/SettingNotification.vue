<template>
  <main>
    <div class="setting">
      <div class="bar">
        <font-awesome-icon class="back" icon="arrow-left" @click="back" />
        <h3>{{$t('notification_confirmation')}}</h3>
      </div>

      <div class="select">
        <div
          class="select-item"
          @click="onSelected(key)"
          v-for="key in ['show_notification']"
          :key="key"
        >
          <span>{{$t(`${key}`)}}</span>
          <svg-icon
            :icon-class="!unselected[key] ? 'ic_choice_selected' : 'ic_choice'"
            :class="{unselected: unselected[key]}"
            class="choice-icon"
          />
        </div>
      </div>
    </div>
  </main>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'

@Component
export default class SettingNotification extends Vue {
  unselected: any = {}

  beforeMount() {
    const notificationSetting = localStorage.getItem('notificationSetting')
    if (notificationSetting) {
      this.unselected = JSON.parse(notificationSetting)
    }
  }

  onSelected(key: string) {
    this.unselected[key] = !this.unselected[key]
    const unselected = JSON.stringify(this.unselected)
    this.unselected = JSON.parse(unselected)
    localStorage.setItem('notificationSetting', unselected)
  }

  back() {
    this.$emit('back')
  }
}
</script>
<style lang="scss" scoped>
main {
  background: $bg-color;
  .setting {
    display: flex;
    flex-flow: column nowrap;
    height: 100%;
    .bar {
      padding-top: 2.6rem;
      width: 100%;
      display: flex;
      background: #ffffff;
      height: 2.5rem;
      align-items: center;
      flex-flow: row nowrap;
      .back {
        cursor: pointer;
        padding: 0.8rem 0.2rem 0.8rem 1.15rem;
      }
      h3 {
        padding: 0.4rem;
      }
    }
    .select {
      padding: 0.6rem 0rem 1.2rem;
      background: #ffffff;
      .select-item {
        cursor: pointer;
        padding: 0.5rem 0.8rem 0.1rem 1rem;
        display: flex;
        justify-content: space-between;
        .choice-icon {
          font-size: 1.5rem;
          margin-top: 0.1rem;
          &.unselected {
            margin-top: 0;
            margin-bottom: 0.1rem;
          }
        }
      }
    }
  }
}
</style>
