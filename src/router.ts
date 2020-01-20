import Vue from 'vue'
import Router from 'vue-router'
import Home from './views/Home.vue'
import SignIn from './views/SignIn.vue'
import Loading from './views/Loading.vue'
import Player from './views/Player.vue'
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
    }
  ]
})

const publicPages: any = {
  '/sign_in': true
}

router.beforeEach((to, from, next) => {
  // @ts-ignore
  const account = JSON.parse(localStorage.getItem('account'))
  if (!publicPages[to.path] && !account) {
    return next('/sign_in')
  }
  next()
})

export default router
