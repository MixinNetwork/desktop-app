export default {
  messageFilteredText(e) {
    e.innerHTML = e.innerHTML.replace(/<br><br><\/div>/g, '<br></div>').replace(/<div><br><\/div>/g, '<div>　</div>')
    // eslint-disable-next-line
    return e.innerText.replace(/\n　\n/g, '\n\n')
  },
  renderUrl(content) {
    const re = /(https?:\/\/)((\w|=|\?|\.|:|;|#|%|\[|\]|\+|\/|&|-)+)/g
    return content.replace(re, "<a href='$1$2' target='_blank' rel='noopener noreferrer nofollow'>$1$2</a>")
  }
}
