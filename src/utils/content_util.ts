// @ts-ignore
import URI from 'urijs'
import moment from 'moment'
import i18n from '@/utils/i18n'
// @ts-ignore
import MarkdownIt from 'markdown-it'
const md = new MarkdownIt()

export default {
  messageFilteredText(e: { innerHTML: string; innerText: string }) {
    e.innerHTML = e.innerHTML.replace(/<br><br><\/div>/g, '<br></div>').replace(/<div><br><\/div>/g, '<div>　</div>')
    // eslint-disable-next-line
    return e.innerText.replace(/\n　\n/g, '\n\n')
  },
  renderUrl(content: string) {
    const h = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    const result = URI.withinString(h, function(url: string) {
      let l = url
      if (!url.startsWith('http')) {
        l = 'https://' + url
      }
      return `<a href='${l}' target='_blank' rel='noopener noreferrer nofollow'>${url}</a>`
    })
    return result
  },
  renderMdToText(content: string) {
    const html = md.render(content)
    return html.replace(/<\/?[^>]*>/g, '')
  },
  renderTime(timeStr: any, showDetail: any) {
    const t = moment(timeStr)
    const td = t.format('YYYY-MM-DD')
    const n = moment()
    const nd = n.format('YYYY-MM-DD')
    const daySeconds = 86400000
    if (nd === td) {
      if (showDetail) {
        return t.format('HH:mm')
      }
      return i18n.t('today')
    } else if (moment(nd).diff(moment(td)) <= n.get('day') * daySeconds) {
      // @ts-ignore
      return `${i18n.t('week_prefix')[0]}${i18n.t('week')[t.get('day')]}`
    } else {
      const dateObj: any = i18n.t('date')
      let yearStr = dateObj[0]
      const monthStr = dateObj[1]
      const dayStr = dateObj[2]
      if (n.get('year') === t.get('year') || !showDetail) {
        yearStr = ''
      } else {
        yearStr = t.get('year') + yearStr
      }
      const dateStr = `${yearStr}${t.format('MM')}${monthStr}${t.format('DD')}${dayStr}`
      // @ts-ignore
      let weekStr = ` ${i18n.t('week_prefix')[1]}${i18n.t('week')[t.get('day')]}`
      if (showDetail) {
        weekStr = ''
      }
      return `${dateStr}${weekStr}`
    }
  },
  fts5KeywordFilter(text: string) {
    text = text.trim()
    text = text.replace(/[' ']+/g, '.')
    let keyword = ''
    const preventList = [
      [33, 47],
      [58, 64],
      [91, 96],
      [123, 126]
    ]
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i)
      let temp = text[i]
      if (!/[a-zA-Z0-9]/.test(temp)) {
        temp = `${text[i]} `
      }
      for (let j = 0; j < preventList.length; j++) {
        if (preventList[j][0] <= code && code <= preventList[j][1]) {
          temp = '* '
          break
        }
      }
      keyword = keyword + temp
    }
    keyword = keyword.trim()
    if (keyword[keyword.length - 1] !== '*') {
      keyword += '*'
    }
    keyword = keyword.replace(/['* ']+/g, '* ').replace(/^\* /, '')
    return keyword
  },
  fts5ContentFilter(text: string) {
    text = text.trim()
    let i = 0
    let content = ''
    while (i < text.length) {
      const spFlag = !/[a-zA-Z0-9]/.test(text[i])
      if (spFlag) {
        content += ` `
      }
      content += text[i]
      if (spFlag) {
        content += ` `
      }
      i++
    }
    return content.replace(/ {2}/g, ' ').trim()
  },
  highlight(content: any, keyword: string, highlight: string) {
    if (!keyword) return content
    let result: any = content
    highlight = highlight || 'default'
    keyword = keyword.trim().replace(/[.[*?+^$|()/]|\]|\\/g, '\\$&').replace(/ /g, '')
    const regx = new RegExp('(' + keyword + ')', 'ig')
    if (result) {
      const regxLink = new RegExp(`<a(.*?)href=(.*?)>(.*?)</a>`, 'ig')
      result = result.replace(regx, `<b class="highlight ${highlight}">$1</b>`)
      let resultTemp = ''
      let linkArr
      while ((linkArr = regxLink.exec(content)) !== null) {
        const temp = linkArr[3].replace(regx, `<b class="highlight ${highlight}">$1</b>`)
        resultTemp += `<a${linkArr[1]}href=${linkArr[2]}>${temp}</a>`
      }
      if (resultTemp) {
        result = resultTemp
      }
    }
    return result
  }
}
