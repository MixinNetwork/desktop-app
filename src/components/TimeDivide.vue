<template>
  <transition name="fade">
    <div class="time-divide fixed" v-show="scrolling">
      <span>{{timeDivide}}</span>
    </div>
  </transition>
</template>

<script lang="ts">
import { Vue, Prop, Component } from 'vue-property-decorator'

@Component
export default class TimeDivide extends Vue {
  @Prop(String) readonly messageTime: any

  timeDivide: any = ''
  timeDivideCurrentIndex: any = 0
  scrollTimeout: any = null
  scrolling: any = false

  action(data: any) {
    this.scrolling = true
    clearTimeout(this.scrollTimeout)
    this.scrollTimeout = setTimeout(() => {
      this.scrolling = false
    }, 500)
    const divideList = document.querySelectorAll('.time-divide.inner')
    this.timeDivide = this.messageTime
    if (divideList.length) {
      let index = divideList.length - 1 - this.timeDivideCurrentIndex
      const currentDivide = divideList[index]
      const nextDivide = divideList[index + 1]
      if (currentDivide) {
        if (this.timeDivideCurrentIndex < divideList.length - 1 && currentDivide.getBoundingClientRect().top > 65) {
          this.timeDivideCurrentIndex += 1
        }
        if (nextDivide && nextDivide.getBoundingClientRect().top < 66) {
          this.timeDivideCurrentIndex -= 1
        }
        // @ts-ignore
        this.timeDivide = currentDivide.innerText
      }
    }
  }
}
</script>

<style lang="scss">
.time-divide {
  color: #333;
  font-size: 0.6rem;
  text-align: center;
  margin-bottom: 0.45rem;
  span {
    min-width: 4rem;
    background: #d5d3f3;
    border-radius: 0.6rem;
    display: inline-block;
    padding: 0.1rem 0.45rem;
  }
  &.fixed {
    position: absolute;
    top: 0.45rem;
    z-index: 9999;
    left: 0;
    right: 0;
    span {
      box-shadow: 0 0.05rem 0.05rem #aaaaaa33;
    }
  }
}
</style>