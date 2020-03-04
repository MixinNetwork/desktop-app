<template>
  <transition name="modal">
    <div class="msgBox" v-if="show" @touchmove="notAllowTouchMove($event)">
      <div class="message">
        <div class="title" v-show="title.content">{{ title.content }}</div>
        <div class="msg" v-html="message.content"></div>
        <div class="options" v-if="options">
          <template v-for="(option,index) in options">
            <label :key="index">
              <input type="radio" name="mode" :value="index" v-model="picked" />
              <a>{{option}}</a>
            </label>
          </template>
        </div>
        <div class="buttons" v-if="buttons.positive || buttons.negative">
          <button
            class="button positive"
            v-if="buttons.positive"
            @click="buttons.positive.callback(picked)"
          >{{buttons.positive.title}}</button>
          <button
            class="button negative"
            v-if="buttons.negative"
            @click="buttons.negative.callback"
          >{{buttons.negative.title}}</button>
        </div>
      </div>
      <div class="mask sp" @click="dismiss($event)"></div>
    </div>
  </transition>
</template>
<script lang="ts">

import { Vue, Component } from 'vue-property-decorator'

@Component
export default class Dialog extends Vue {
  picked: any = 0
  show: any = false
  closable: any = true
  title: any = {
    content: ''
  }
  message: any = {
    content: '',
    cssClass: '',
    style: {}
  }
  buttons:any= {}
  options:any= []

  dismiss(event: any) {
    if (!this.closable && event.target.getAttribute('role') !== 'close-button') {
      return
    }
    this.show = false
    document.body.style.overflow = 'auto'
  }
  notAllowTouchMove(event: any) {
    event.preventDefault()
  }
}
</script>

<style lang="scss" scoped>
.msgBox {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.3s ease;
  z-index: 9999;
  font-size: 0.8rem;
}
.title {
  position: relative;
  font-size: 1rem;
  margin-bottom: 1rem;
}
.message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 17.5rem;
  background: #fff;
  padding: 0.4rem;
  z-index: 9999;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 0.2rem;
  box-shadow: 0 0.3rem 0.6rem rgba(0, 0, 0, 0.175);
  padding: 1.2rem;
}
.options {
  padding-bottom: 1rem;
  display: flex;
  flex-direction: column;
  label {
    cursor: pointer;
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    a {
      margin-left: 0.4rem;
    }
    input {
      cursor: pointer;
    }
  }
}
.buttons {
  display: flex;
  flex-direction: row-reverse;
  .button {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
    padding-left: 1.2rem;
    padding-right: 1.2rem;
    border: none;
    font-size: 0.7rem;
    border-radius: 0.2rem;
    transition: 0.1s all;
  }
  .positive {
    background: #3d75e3;
    cursor: pointer;
    color: white;
    margin-left: 0.15rem;
    &:hover,
    &.current {
      box-shadow: 0 0.1rem 0.6rem rgba(0, 0, 0, 0.15);
    }
  }
  .negative {
    border: 0.05rem solid #ddd;
    cursor: pointer;
    color: #3d75e3;
    &:hover,
    &.current {
      background: #f8f8f8;
      box-shadow: 0 0.1rem 0.3rem rgba(0, 0, 0, 0.05);
    }
  }
}
.msg {
  position: relative;
  overflow: hidden;
}
.mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #33333377;
}
.modal-enter {
  opacity: 0;
}
.modal-leave-active {
  opacity: 0;
}
.modal-enter .modal-container,
.modal-leave-active .modal-container {
  transform: scale(1.1);
}
</style>
