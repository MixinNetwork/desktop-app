// @ts-ignore
import URI from 'urijs'
import moment from 'moment'
import i18n from '@/utils/i18n'
// @ts-ignore
import MarkdownIt from 'markdown-it'
import userDao from '@/dao/user_dao'
const md = new MarkdownIt()
URI.findUri.end = /[\s\r\n，。；]|[\uFF00-\uFFEF]|$/
const botNumberReg = /@7000\d*\s/

class ContentUtil {
  getBotNumber(content: string) {
    if (content.startsWith('@7000')) {
      const result = content.match(botNumberReg)
      if (result && result.length > 0) {
        return result[0].substring(1, result[0].length - 1)
      }
    }
    return ''
  }
  messageFilteredText(e: { innerHTML: string; innerText: string }) {
    e.innerHTML = e.innerHTML.replace(/<br><br><\/div>/g, '<br></div>').replace(/<div><br><\/div>/g, '<div>　</div>')
    // eslint-disable-next-line
    return e.innerText.replace(/\n　\n/g, '\n\n')
  }
  renderUrl(content: string) {
    content = content.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

    if (/highlight mention/.test(content)) {
      const mentionRegx = new RegExp(`&lt;b class=&quot;highlight mention id-(.+?)?&quot;&gt;(.+?)?&lt;/b&gt;`, 'g')
      content = content.replace(mentionRegx, '<b class="highlight mention id-$1">$2</b>')
    }

    return URI.withinString(content, function(url: string) {
      let l = url
      if (!url.startsWith('http')) {
        l = 'https://' + url
      }
      return `<a href='${l}' target='_blank' rel='noopener noreferrer nofollow'>${url}</a>`
    })
  }
  renderMdToText(content: string) {
    const html = md.render(content)
    return html.replace(/<\/?[^>]*>/g, '')
  }
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
  }
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
  }
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
  }
  highlight(content: any, keyword: string, highlight: string) {
    if (!keyword) return content
    let result: any = content
    highlight = highlight || 'default'
    keyword = keyword.trim().replace(/[.[*?+^$|()/]|\]|\\/g, '\\$&')
    const regx = new RegExp('(' + keyword + ')', 'ig')
    if (result) {
      const regxLink = new RegExp(`<a(.*?)href=(.*?)>(.*?)</a>`, 'ig')
      result = result.replace(regx, `<b class="highlight ${highlight}">$1</b>`)
      let linkTemp = []
      let linkArr
      while ((linkArr = regxLink.exec(content)) !== null) {
        const temp = linkArr[3].replace(regx, `<b class="highlight ${highlight}">$1</b>`)
        linkTemp.push([linkArr[0], `<a${linkArr[1]}href=${linkArr[2]}>${temp}</a>`])
      }
      if (linkTemp.length > 0) {
        linkTemp.forEach(item => {
          result = result.replace(item[0], item[1])
        })
      }
    }
    return result
  }
  parseMention(content: string, conversationId: string, messageId: string, messageMentionDao: any, ignore: boolean = true) {
    if (!content) return null
    const account = localStorage.getItem('account')!!
    const accountId = JSON.parse(account).user_id

    // eslint-disable-next-line no-irregular-whitespace
    content = content.replace(/ /g, ' ')
    const regx = new RegExp('@(.*?)? ', 'g')
    const mentionIds: any = []
    let pieces: any = []
    let remind = 0
    while ((pieces = regx.exec(`${content} `)) !== null) {
      mentionIds.push(pieces[1].trim())
    }
    if (mentionIds.length === 0) {
      return null
    }
    mentionIds.forEach((id: any) => {
      const user = userDao.findUserByIdentityNumber(id)
      if (user) {
        if (!ignore && user.user_id === accountId) {
          remind = 1
        }
        const mentionName = `@${user.full_name}`
        const regx = new RegExp(`@${id}`, 'g')
        const hl = this.highlight(mentionName, mentionName, `mention id-${id}`)
        content = content.replace(regx, hl)
      }
    })
    messageMentionDao.insert(conversationId, messageId, content, remind)
  }
}

export default new ContentUtil()
