<template>
  <div class="search">
    <div class="layout" :style="layoutStyle">
      <div class="icon" @click="back">
        <transition name="fade-rote">
          <font-awesome-icon icon="arrow-left" id="ic_arrow" v-show="focus" />
        </transition>
        <transition name="fade">
          <font-awesome-icon icon="search" id="ic_search" v-show="!focus" />
        </transition>
      </div>
      <keep-alive>
        <input
          class="box"
          ref="box"
          type="text"
          placeholder="Search"
          @keyup="keyup"
          @focus="onFocus"
          @blur="onBlur"
          @compositionstart="inputFlag = true"
          @compositionend="inputFlag = false"
          v-model="keyword"
        />
      </keep-alive>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Watch, Prop, Component } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'

@Component
export default class Search extends Vue {
  @Prop(String) readonly id: any

  focus: any = false
  keyword: any = ''
  inputFlag: any = false
  layoutStyle: any = {
    width: '100%',
    display: 'flex',
    background: '#f5f7fa',
    'align-items': 'center',
    'padding-left': '1rem',
    'padding-right': '1rem',
    'padding-top': '8px',
    'padding-bottom': '8px',
    'border-width': '1px',
    'border-radius': '1.25rem'
  }

  @Watch('keyword')
  onKeywordChanged(value: any) {
    if (!this.inputFlag) {
      this.$emit('input', value)
    }
  }

  @Watch('focus')
  onFocusChanged(newFocus: any, oldFocus: any) {
    if (newFocus) {
      // this.searchColor = '#FFFFFF'
      this.layoutStyle['border-color'] = '#cccccc'
    } else {
      // this.searchColor = '#FBFBFB'
      this.layoutStyle['border-color'] = '#f5f7fa'
    }
  }

  @Getter('inputFocusing') inputFocusing: any

  @Action('setInputFocusing') actionSetInputFocusing: any

  onFocus() {
    this.focus = true
    this.actionSetInputFocusing({ focusing: this.id })
  }
  onBlur() {
    setTimeout(() => {
      if (this.keyword === '') {
        this.focus = false
        this.actionSetInputFocusing({ focusing: '' })
      } else if (this.inputFocusing === this.id && this.$refs.box) {
        // @ts-ignore
        this.$refs.box.focus()
      }
    }, 30)
  }
  back() {
    this.focus = false
    this.keyword = ''
    this.$emit('input', '')
    // @ts-ignore
    this.$refs.box.blur()
  }
  keyup(e: any) {
    if (e.keyCode === 27 && this.focus) {
      this.back()
      setTimeout(() => {
        // @ts-ignore
        this.$refs.box.blur()
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.box {
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  border: none;
  flex-grow: 19;
  font-size: 1rem;
  &::-webkit-input-placeholder {
    color: #bbbec3;
  }
}

.icon {
  justify-content: center;
  align-items: center;
  display: flex;
  width: 1.125rem;
  height: 1.125rem;
}
.layout {
  input {
    background: transparent;
  }
}

#ic_arrow,
#ic_search {
  position: absolute;
  color: #bbbec3;
}
#ic_arrow {
  cursor: pointer;
}
.fade-rote-enter-active,
.fade-rote-leave-active {
  transition: all 0.5s;
}
.fade-rote-enter,
.fade-rote-leave-to {
  opacity: 0;
  transform: rotate(-90deg);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
