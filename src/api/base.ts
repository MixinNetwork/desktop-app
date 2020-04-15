import axios from 'axios'
import Url from 'url-parse'
// @ts-ignore
import jwt from 'jsonwebtoken'
import { getToken } from '@/utils/util'
import { clearDb } from '@/persistence/db_util'
import { API_URL } from '@/utils/constants'
import store from '@/store/store'
// @ts-ignore
import router from '@/router'
// @ts-ignore
import Vue from 'vue'

axios.defaults.headers.post['Content-Type'] = 'application/json'

const axiosApi = axios.create({
  baseURL: API_URL.HTTP[0],
  timeout: 8000
})

function newToken(config: any) {
  let { url, method, data } = config
  if (typeof data === 'string') {
    data = JSON.parse(data)
  }
  const urlObj = new Url(url)
  const token = getToken(method.toUpperCase(), urlObj.pathname + urlObj.query, data)
  return 'Bearer ' + token
}

const backOff = () => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, 1500)
  })
}

async function retry(config: any, response: any) {
  if (!config || !config.retry) {
    return Promise.reject(response)
  }
  config.__retryCount = config.__retryCount || 0
  if (config.__retryCount >= config.retry) {
    return Promise.reject(response)
  }
  config.__retryCount += 1
  await backOff()
  config.baseURL = API_URL.HTTP[config.__retryCount % API_URL.HTTP.length]
  config.headers.Authorization = newToken(config)
  return axiosApi(config)
}

axiosApi.interceptors.request.use(
  (config: any) => {
    config.retry = 2 ** 31
    config.headers.common['Authorization'] = newToken(config)
    config.headers.common['Accept-Language'] = navigator.language
    return config
  },
  (error: any) => {
    return Promise.reject(error)
  }
)

axiosApi.interceptors.response.use(
  function(response: any) {
    if (response.data.error && response.data.error.code === 500) {
      return retry(response.config, response)
    }
    // @ts-ignore
    const timeLag = Math.abs(response.headers['x-server-time'] / 1000000 - Date.parse(new Date()))
    if (timeLag > 600000) {
      store.dispatch('showTime')
      return Promise.reject(response)
    } else {
      store.dispatch('hideTime')
    }

    if (response.data.error && response.data.error.code === 401) {
      const tokenStr = response.config.headers.Authorization
      if (tokenStr) {
        const tokenJson = jwt.decode(tokenStr.split(' ')[1])
        if (tokenJson && tokenJson.iat * 1000 < new Date().getTime() - 60000) {
          return retry(response.config, response)
        }
      }
      Vue.prototype.$blaze.closeBlaze()
      clearDb()
      router.push('/sign_in')
      return Promise.reject(response)
    }
    return response
  },
  function(error: any) {
    const config = error.config
    return retry(config, error)
  }
)

export default axiosApi
