<template>
  <main>
    <div class="group">
      <div class="bar">
        <font-awesome-icon class="back" icon="arrow-left" @click="$emit('profile-back')" />
        <h3>{{$t('chat.personal_info')}}</h3>
      </div>
      <mixin-scrollbar>
        <div class="ul">
          <Avatar class="avatar" :user="me" />
          <div class="item-wrap">
            <div class="item">
              <a>{{$t('chat.user_name')}}</a>
              <label>
                <span v-if="!nameEditing">{{me.full_name}}</span>
                <div v-else class="inputbox">
                  <input type="text" v-model="fullname" required />
                </div>
                <svg-icon
                  class="edit"
                  v-if="!nameEditing"
                  @click="nameEditing = true"
                  icon-class="ic_edit_pen"
                />
                <svg-icon
                  class="edit"
                  v-else
                  @click="fullname ? nameEditing = false : ''"
                  icon-class="ic_edit_check"
                />
              </label>
            </div>
            <div class="item">
              <a>Mixin ID</a>
              <label>{{me.identity_number}}</label>
            </div>
            <div class="item">
              <a>{{$t('profile.user_biography')}}</a>
              <label class="desc">
                <span v-if="!descEditing">{{me.biography}}</span>
                <div v-else class="inputbox">
                  <pre><span>{{biography}}</span><br></pre>
                  <textarea type="text" v-model="biography" required />
                </div>
                <svg-icon
                  class="edit"
                  v-if="!descEditing"
                  @click="descEditing = true"
                  icon-class="ic_edit_pen"
                />
                <svg-icon
                  class="edit"
                  v-else
                  @click="biography ? descEditing = false : ''"
                  icon-class="ic_edit_check"
                />
              </label>
            </div>
          </div>
        </div>
      </mixin-scrollbar>
    </div>
  </main>
</template>
<script lang="ts">
import { Vue, Prop, Watch, Component } from 'vue-property-decorator'
import { Getter } from 'vuex-class'
import Avatar from '@/components/Avatar.vue'
import userApi from '@/api/user'
import { updateAccount } from '@/utils/util'

@Component({
  components: {
    Avatar
  }
})
export default class ProfileContainer extends Vue {
  @Getter('me') me: any

  nameEditing: boolean = false
  descEditing: boolean = false
  fullname: string = ''
  biography: string = ''
  group: boolean = false
  title: string = ''

  @Watch('nameEditing')
  onNameEditingChanged(val: boolean) {
    if (!val) {
      const payload = {
        full_name: this.fullname
      }
      if (this.me.full_name === this.fullname) return
      this.me.full_name = this.fullname
      userApi.updateProfile(payload).then((res) => {
        this.$toast(this.$t('profile.saved'))
        if (res.data.data) {
          updateAccount(res.data.data)
        }
      })
    } else {
      this.fullname = this.me.full_name
    }
  }

  @Watch('descEditing')
  onDescEditingChanged(val: boolean) {
    if (!val) {
      const payload = {
        biography: this.biography
      }
      if (this.me.biography === this.biography) return
      this.me.biography = this.biography
      userApi.updateProfile(payload).then((res) => {
        this.$toast(this.$t('profile.saved'))
        if (res.data.data) {
          updateAccount(res.data.data)
        }
      })
    } else {
      this.biography = this.me.biography
    }
  }
}
</script>
<style lang="scss" scoped>
main {
  background: $bg-color;
  .group {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    height: 100%;
    .bar {
      padding-top: 3rem;
      width: 100%;
      display: flex;
      background: #ffffff;
      height: 3rem;
      align-items: center;
      flex-flow: row nowrap;
      .back {
        cursor: pointer;
        padding: 0.8rem 0.2rem 0.8rem 1rem;
      }
      h3 {
        padding: 0.4rem;
      }
    }
    .avatar {
      width: 8rem;
      height: 8rem;
      margin: 2rem auto;
    }
    .item-wrap {
      background: #fff;
      padding: 0.6rem 0 1rem;
    }
    .item {
      width: 100%;
      padding-top: 0.5rem;
      padding-bottom: 0.5rem;
      display: flex;
      flex-direction: column;
      a {
        color: #333;
        margin: 0 1rem;
        font-weight: bold;
        font-size: 0.7rem;
      }
      label {
        margin: 0.5rem 1rem 0;
        font-size: 0.85rem;
        user-select: text;
        line-height: 1rem;
        display: flex;
        justify-content: space-between;
        &.desc {
          word-wrap: break-word;
          white-space: pre-wrap;
          font-size: 0.75rem;
          span {
            width: calc(100% - 1rem);
          }
        }
        .edit {
          flex-shrink: 0;
          user-select: none;
          cursor: pointer;
          font-size: 0.9rem;
          margin-top: 0.05rem;
        }
      }
      .inputbox {
        pre, input, textarea {
          line-height: 1.2rem;
          width: 11rem;
        }
      }
    }
  }
}
</style>
