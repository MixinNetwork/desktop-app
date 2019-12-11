export default {
  messageFilteredText(e) {
    e.innerHTML = e.innerHTML
      .replace(/<br><br><\/div>/g, '<br></div>')
      .replace(/<div><br><\/div>/g, '<div>　</div>')
    // eslint-disable-next-line
    return e.innerText.replace(/\n　\n/g, '\n\n')
  }
}
