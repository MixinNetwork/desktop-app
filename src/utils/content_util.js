import URI from 'urijs'

export default {
  messageFilteredText(e) {
    e.innerHTML = e.innerHTML.replace(/<br><br><\/div>/g, '<br></div>').replace(/<div><br><\/div>/g, '<div>　</div>')
    // eslint-disable-next-line
    return e.innerText.replace(/\n　\n/g, '\n\n')
  },
  renderUrl(content) {
    const h = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    const result = URI.withinString(h, function(url) {
      let l = url
      if (!url.startsWith('http')) {
        l = 'https://' + url
      }
      return `<a href='${l}' target='_blank' rel='noopener noreferrer nofollow'>${url}</a>`
    })
    return result
  },
  highlight(content, keyword, highlight) {
    const segment = keyword.split(' ')
    let result = content
    highlight = highlight || 'default'
    segment.forEach(str => {
      if (str.trim()) {
        str = str.replace(/[.[*?+^$|()/]|\]|\\/g, '\\$&')
        const regx = new RegExp('(' + str + ')', 'ig')
        result = result.replace(regx, `<b class="highlight ${highlight}">$1</b>`)
      }
    })
    return result
  }
}
