import Vue from 'vue'
import Vuex from 'vuex'

import mutations from './mutations'
import actions from './actions'
import getters from './getters'
import { LinkStatus } from '@/utils/constants.js'

Vue.use(Vuex)

const state = {
  me: {},
  currentConversationId: null,
  conversations: {},
  conversationKeys: [],
  messages: {},
  friends: [],
  currentUser: {},
  search: null,
  showTime: false,
  linkStatus: LinkStatus.CONNECTED
}

export default new Vuex.Store({
  state: state,
  getters: getters,
  actions: actions,
  mutations: mutations
})
