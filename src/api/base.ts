import axios from 'axios'
import Url from 'url-parse'
import { getToken } from '@/utils/util'
import { clearDb } from '@/persistence/db_util'
import { API_URL } from '@/utils/constants'
import store from '@/store/store'
// @ts-ignore
import router from '@/router'
import Vue from 'vue'

axios.defaults.headers.post['Content-Type'] = 'application/json'

const axiosApi = axios.create({
  baseURL: API_URL.HTTP[0],
  timeout: 8000
})

axiosApi.interceptors.request.use(
  (config: any) => {
    const url = new Url(config.url)
    const token = getToken(config.method.toUpperCase(), url.pathname, config.data)
    config.retry = 2 ** 31
    config.headers.common['Authorization'] = 'Bearer ' + token
    // @ts-ignore
    config.headers.common['Accept-Language'] = navigator.language || navigator.userLanguage
    return config
  },
  (error: any) => {
    return Promise.reject(error)
  }
)

axiosApi.interceptors.response.use(
  function(response: any) {
    if (response.data.error && response.data.error.code === 500) {
      const config: any = response.config
      if (!config || !config.retry) {
        return Promise.reject(response)
      }
      config.__retryCount = config.__retryCount || 0
      if (config.__retryCount >= config.retry) {
        return Promise.reject(response)
      }
      config.__retryCount += 1
      const backOff = new Promise(resolve => {
        setTimeout(() => {
          resolve()
        }, 1500)
      })
      return backOff.then(() => {
        config.baseURL = API_URL.HTTP[config.__retryCount % API_URL.HTTP.length]
        return axiosApi(config)
      })
    }
    // @ts-ignore
    const timeLag = Math.abs(response.headers['x-server-time'] / 1000000 - Date.parse(new Date()))
    if (timeLag > 600000) {
      store.dispatch('showTime')
      return Promise.reject(response)
    } else {
      store.dispatch('hideTime')
    }
    if (response.data.error) {
      switch (response.data.error.code) {
        case 401:
          Vue.prototype.$blaze.closeBlaze()
          clearDb()
          router.push('/sign_in')
          break
      }
      return Promise.reject(response)
    }
    return response
  },
  function(error: any) {
    const config = error.config
    if (!config || !config.retry) {
      return Promise.reject(error)
    }
    config.__retryCount = config.__retryCount || 0
    if (config.__retryCount >= config.retry) {
      return Promise.reject(error)
    }
    config.__retryCount += 1
    const backOff = new Promise(resolve => {
      setTimeout(() => {
        resolve()
      }, 2000)
    })
    return backOff.then(() => {
      config.baseURL = API_URL.HTTP[config.__retryCount % API_URL.HTTP.length]
      return axiosApi(config)
    })
  }
)

export default axiosApi
