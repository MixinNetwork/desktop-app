<template>
  <div class="search">
    <div class="layout" :style="layoutStyle">
      <div class="icon" @click="back">
        <transition name="fade-rote">
          <font-awesome-icon icon="arrow-left" id="ic_arrow" v-show="focus || keyword" />
        </transition>
        <transition name="fade">
          <font-awesome-icon icon="search" id="ic_search" v-show="!focus && !keyword" />
        </transition>
      </div>
      <input
        class="box"
        ref="box"
        type="text"
        :id="id"
        :placeholder="placeholder"
        @keyup="keyup"
        @focus="onFocus"
        @blur="onBlur"
        @compositionstart="inputFlag = true"
        @compositionend="inputFlag = false"
        v-model="keyword"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Watch, Prop, Component } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'

@Component
export default class Search extends Vue {
  @Prop(String) readonly id: any
  @Prop(Boolean) readonly autofocus: any

  focus: any = false
  keyword: any = ''
  inputFlag: any = false
  layoutStyle: any = {
    width: '100%',
    display: 'flex',
    'align-items': 'center',
    'padding-left': '0.8rem',
    'padding-right': '0.8rem',
    'padding-top': '0.4rem',
    'padding-bottom': '0.4rem',
    'border-width': '0.05rem',
    'border-radius': '1rem'
  }
  $t: any

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
      this.layoutStyle['border-color'] = '#f2f3f3'
    }
  }

  @Action('setSearching') actionSetSearching: any

  get placeholder() {
    return this.$t('home.search')
  }

  mounted() {
    if (this.autofocus) {
      setTimeout(() => {
        // @ts-ignore
        this.$refs.box.focus()
      }, 100)
    }
    this.$root.$on('resetSearch', () => {
      this.back()
    })
  }

  beforeDestroy() {
    this.$root.$off('resetSearch')
  }

  onFocus() {
    this.focus = true
  }
  onBlur() {
    this.focus = false
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
      if (this.autofocus) {
        this.keyword = ''
        this.$emit('input', '')
        return this.actionSetSearching('')
      }
      this.back()
    }
  }
}
</script>

<style lang="scss" scoped>
.box {
  margin-left: 0.3rem;
  margin-right: 0.3rem;
  border: none;
  width: calc(100% - 1.6rem);
  font-size: 0.8rem;
  &::-webkit-input-placeholder {
    color: #bbbec3;
  }
}

.icon {
  justify-content: center;
  align-items: center;
  display: flex;
  width: 0.9rem;
  height: 0.9rem;
}
.layout {
  width: 100%;
  box-sizing: border-box;
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
