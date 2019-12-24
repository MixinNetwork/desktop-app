<template>
  <transition name="fade">
    <div class="time-divide fixed" v-if="timeDivideShow" v-show="scrolling">
      <span>{{timeDivide}}</span>
    </div>
  </transition>
</template>

<script>
export default {
  data() {
    return {
      timeDivide: '',
      timeDivideShow: false,
      timeDivideCurrentIndex: 0,
      scrollTimeout: null,
      scrolling: false
    }
  },
  props: ['messageTime', 'scrollTop', 'isBottom'],
  watch: {
    scrollTop(data) {
      this.scrolling = true
      clearTimeout(this.scrollTimeout)
      this.scrollTimeout = setTimeout(() => {
        this.scrolling = false
      }, 500)
      if (!this.isBottom && this.scrollTop > 130) {
        this.timeDivideShow = true
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
            this.timeDivide = currentDivide.innerText
          }
        }
      } else {
        this.timeDivideShow = false
      }
    }
  }
}
</script>

<style lang="scss">
.time-divide {
  color: #333;
  font-size: 0.75rem;
  text-align: center;
  margin-bottom: 0.6rem;
  span {
    min-width: 5rem;
    background: #d5d3f3;
    border-radius: 0.8rem;
    display: inline-block;
    padding: 0.1rem 0.6rem;
  }
  &.fixed {
    position: absolute;
    top: 0.6rem;
    z-index: 9999;
    left: 0;
    right: 0;
    span {
      box-shadow: 0px 1px 1px #aaaaaa33;
    }
  }
}
</style>