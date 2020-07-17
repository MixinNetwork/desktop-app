import Vue from 'vue'
import Router from 'vue-router'
import Home from './views/Home.vue'
import SignIn from './views/SignIn.vue'
import Loading from './views/Loading.vue'
import Player from './views/Player.vue'
import Task from './views/Task.vue'
import { getAccount } from '@/utils/util'
const originalPush = Router.prototype.push
// @ts-ignore
Router.prototype.push = function push(location, onResolve, onReject) {
  if (onResolve || onReject) return originalPush.call(this, location, onResolve, onReject)
  // @ts-ignore
  return originalPush.call(this, location).catch(err => err)
}
Vue.use(Router)
const router = new Router({
  base: process.env.BASE_URL,
  routes: [
    {
      path: '/',
      name: 'loading',
      component: Loading
    },
    {
      path: '/home',
      name: 'home',
      component: Home
    },
    {
      path: '/sign_in',
      name: 'sign_in',
      component: SignIn
    },
    {
      path: '/player',
      name: 'player',
      component: Player
    },
    {
      path: '/task',
      name: 'task',
      component: Task
    }
  ]
})

const publicPages: any = {
  '/sign_in': true
}

router.beforeEach((to, from, next) => {
  const account: any = getAccount()
  if (!publicPages[to.path] && !account.user_id) {
    return next('/sign_in')
  }
  next()
})

export default router
