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
      <div class="mask" @click="dismiss($event)"></div>
    </div>
  </transition>
</template>
<script>
export default {
  data() {
    return {
      picked: 0,
      show: false,
      closable: true,
      title: {
        content: ''
      },
      message: {
        content: '',
        cssClass: '',
        style: {}
      },
      buttons: {},
      options: []
    }
  },
  methods: {
    dismiss(event) {
      if (!this.closable && event.target.getAttribute('role') !== 'close-button') {
        return
      }
      this.show = false
      document.body.style.overflow = 'auto'
    },
    notAllowTouchMove(event) {
      event.preventDefault()
    }
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
}
.title {
  position: relative;
  font-size: 20px;
  margin-bottom: 20px;
}
.message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 22rem;
  background: #fff;
  padding: 8px;
  z-index: 9999;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.175);
  padding: 24px;
}
.options {
  padding-bottom: 20px;
  display: flex;
  flex-direction: column;
  label {
    cursor: pointer;
    padding-top: 10px;
    padding-bottom: 10px;
    a {
      margin-left: 8px;
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
    padding-top: 10px;
    padding-bottom: 10px;
    padding-left: 24px;
    padding-right: 24px;
    border: none;
    font-size: 14px;
    border-radius: 4px;
    &:hover,
    &.current {
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.175);
    }
  }
  .positive {
    background: #3d75e3;
    cursor: pointer;
    color: white;
    margin-left: 3px;
  }
  .negative {
    border: 1px solid #eaeaea;
    cursor: pointer;
    color: #3d75e3;
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
  background: rgba(255, 255, 255, 0.6);
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
