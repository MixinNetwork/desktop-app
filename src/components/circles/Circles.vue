<template>
  <transition name="modal">
    <div class="root" v-if="visible">
      <div class="bg"></div>
      <div class="circles">
        <div class="header">
          <svg-icon
            v-if="optionName === 'edit'"
            style="font-size: 1rem"
            @click="back"
            icon-class="ic_back"
          />
          <svg-icon v-else style="font-size: 1.2rem" @click="close" icon-class="ic_close" />
          <span class="header-name">{{optionName === 'edit' ? circleName : 'Circles'}}</span>
          <svg-icon
            v-if="optionName === 'list'"
            style="font-size: 1.15rem; float: right"
            @click="createCircle"
            icon-class="ic_add"
          />
          <a v-else-if="optionName === 'edit' && currentCircle" class="save" @click="saveCircle">save</a>
        </div>
        <div class="list">
          <mixin-scrollbar>
            <div class="ul">
              <Edit :circle="currentCircle" v-if="optionName === 'edit'" />
              <div
                v-else
                v-for="item in circles"
                :key="item.circleId"
                :item="item"
                class="circle-item"
                @click="editCircle(item)"
              >
                {{item.name}}
                <div class="options">
                  <span @click.stop="editCircle(item)">Edit</span>
                  <span @click.stop="deleteCircle(item.circleId)">Delete</span>
                </div>
              </div>
            </div>
          </mixin-scrollbar>
        </div>
      </div>
    </div>
  </transition>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import Edit from './Edit.vue'

@Component({
  components: {
    Edit
  }
})
export default class Circles extends Vue {
  visible: boolean = false

  currentCircle: any = null

  // TODO getter
  circles: any = [{ circleId: '', name: 'circle demo' }]
  circleName: string = '12'

  optionName: string = 'list'

  close() {
    if (this.optionName === 'list') {
      this.visible = false
    } else {
      this.optionName = 'list'
    }
  }

  back() {
    this.optionName = 'list'
  }

  createCircle() {
    this.currentCircle = null
    this.circleName = 'New circle'
    this.optionName = 'edit'
  }

  saveCircle() {
    this.optionName = 'list'
  }

  editCircle(circle: any) {
    this.currentCircle = circle
    const { circleId, name } = circle
    // TODO get circleDetail
    this.optionName = 'edit'
    this.circleName = name
  }

  deleteCircle(circleId: string) {}

  createEnd() {
    this.optionName = 'list'
  }
}
</script>

<style lang="scss" scoped>
.root {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  transition: opacity 0.3s ease;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: text;
}
.bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #33333377;
}
.circles {
  position: relative;
  z-index: 1000;
  width: 22.4rem;
  padding: 0.2rem 0 0.8rem;
  max-height: 72vh;
  overflow: hidden;
  list-style: none;
  font-size: 0.8rem;
  background-color: #fff;
  border-radius: 0.2rem;
  box-shadow: 0 0.2rem 0.6rem rgba(0, 0, 0, 0.195);
  .header,
  .title {
    padding: 0.8rem 1.25rem;
    font-size: 0.8rem;
    font-weight: 500;
    line-height: 1.1rem;
    .svg-icon {
      font-size: 1.45rem;
      cursor: pointer;
    }
    .save {
      float: right;
      cursor: pointer;
    }
    .header-name {
      padding: 0 0.5rem;
      user-select: none;
    }
  }
  .list {
    font-size: 0.8rem;
    height: calc(72vh - 6.4rem);
    .circle-item {
      padding: 0.6rem 1.25rem;
      cursor: pointer;
      &:hover {
        background: $hover-bg-color;
      }
      .options {
        float: right;
      }
    }
  }
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
