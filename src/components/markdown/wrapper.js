import xss from 'xss'

export default {
  install: function(Vue) {
    Object.defineProperty(Vue.prototype, '$w', {
      value: function(html) {
        return xss(html, {
          whiteList: {
            input: ['type', 'src', 'disabled', 'checked', 'class'],
            img: ['src', 'alt', 'title', 'width', 'max-width', 'style', 'height'],
            math: [],
            semantics: [],
            mrow: [],
            mtext: [],
            annotation: ['encoding'],
            msub: [],
            mi: [],
            mo: [],
            mn: [],
            span: ['class', 'title', 'aria-hidden', 'style'],
            code: [],
            li: ['class', 'id'],
            td: ['style', 'class'],
            p: ['style', 'class'],
            div: ['style', 'class'],
            a: ['style', 'class', 'id', 'target', 'href', 'title']
          },
          stripIgnoreTag: true,
          stripIgnoreTagBody: ['script', 'style']
        })
      }
    })
  }
}
