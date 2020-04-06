<template>
  <transition name="modal">
    <div class="root" v-if="visible">
      <div class="bg"></div>
      <div class="circles">
        <div class="header">
          <svg-icon
            v-if="optionName === 'edit'"
            class="go-back"
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
          <a
            v-else-if="optionName === 'edit' && !currentCircle"
            class="save"
            @click="createCircleAction"
          >OK</a>
          <a v-else-if="optionName === 'edit'" class="save" @click="saveCircle">save</a>
        </div>
        <div class="list">
          <mixin-scrollbar>
            <div class="ul">
              <div class="edit" v-if="optionName === 'edit'">
                <div v-if="currentCircle">
                  like forward
                  {{currentCircle}}
                </div>
                <div v-else>
                  <input
                    class="input"
                    type="text"
                    placeholder="Circle Name"
                    v-model="cirlceName"
                    required
                  />
                </div>
              </div>
              <div
                v-else
                v-for="item in circles"
                :key="item.circleId"
                class="circle-item"
                @click="editCircle(item)"
              >
                <div class="avatar">
                  <svg-icon icon-class="ic_circles" class="circles-icon" />
                </div>
                <div class="content">
                  <div class="name">
                    <span>{{item.name}}</span>
                    <div class="desc">{{item.desc}}</div>
                  </div>
                  <div class="options">
                    <span @click.stop="editCircle(item)">Edit</span>
                    <span @click.stop="deleteCircle(item.circleId)">Delete</span>
                  </div>
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
import { Vue, Component, Watch } from 'vue-property-decorator'
import circleApi from '@/api/circle'
import i18n from '@/utils/i18n'

@Component({
  components: {}
})
export default class Circles extends Vue {
  visible: boolean = false

  currentCircle: any = null
  cirlceName: any = ''

  // TODO getter
  circles: any = []
  circleName: string = ''

  optionName: string = 'list'

  $Dialog: any

  @Watch('visible')
  onVisibleChanged(val: boolean) {
    if (val) {
      this.circles = [{ circleId: 'c1', name: 'circle demo', desc: 'desc' }]
    }
  }

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
    this.cirlceName = ''
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

  deleteCircle(circleId: string) {
    this.$Dialog.alert(
      i18n.t('chat.remove_circle'),
      i18n.t('ok'),
      () => {
        let index = -1
        this.circles.forEach((item: any, i: number) => {
          if (item.circleId === circleId) {
            index = i
          }
        })
        this.circles.splice(index, 1)
      },
      i18n.t('cancel'),
      () => {}
    )
  }

  createCircleAction() {
    if (!this.cirlceName) return
    const payload = { name: this.cirlceName }
    circleApi.createCircle(payload).then(res => {
      console.log(res)
    })
    this.currentCircle = payload
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
    line-height: 1.2rem;
    .svg-icon {
      font-size: 1.45rem;
      cursor: pointer;
    }
    .save {
      float: right;
      cursor: pointer;
    }
    .go-back {
      font-size: 0.8rem;
      margin-top: 0.2rem;
      padding: 0 0.15rem;
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
      display: flex;
      user-select: none;
      padding: 0.6rem 1.25rem;
      align-items: center;
      cursor: pointer;
      &:hover {
        background: $hover-bg-color;
      }
      .avatar {
        border-radius: 2rem;
        width: 2rem;
        height: 2rem;
        background: #aaaaaa33;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-right: 0.6rem;
        /deep/ .circles-icon {
          font-size: 0.9rem;
          margin-top: -0.05rem;
          stroke: #2f3032;
        }
      }

      .content {
        flex: 1;
        display: flex;
        justify-content: space-between;
        .name {
          flex: 1;
          .desc {
            font-size: 0.7rem;
            color: #aaa;
          }
        }
        .options {
          display: flex;
          align-items: center;
          span {
            margin: 0 0.2rem;
          }
        }
      }
    }
  }
}
.edit {
  padding: 0.4rem 1.25rem;
  .input {
    padding: 0.5rem 0.8rem;
    box-sizing: border-box;
    border: 0.05rem solid #ddd;
    border-radius: 0.3rem;
    font-size: 0.7rem;
    width: 100%;
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
