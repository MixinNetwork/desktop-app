import MarkdownIt from 'markdown-it'
import subscript from 'markdown-it-sub'
import superscript from 'markdown-it-sup'
import footnote from 'markdown-it-footnote'
import deflist from 'markdown-it-deflist'
import abbreviation from 'markdown-it-abbr'
import insert from 'markdown-it-ins'
import mark from 'markdown-it-mark'
import katex from 'markdown-it-katex'
import tasklists from 'markdown-it-task-lists'
import hljs from 'highlight.js'
import filter from './filter'

const md = new MarkdownIt()

const regx = /<a href=(.+?)>(.+?)<\/a>/g
function renderUrl(content) {
  content = content.replace(regx, '<a href=$1 target="_blank" rel="noopener noreferrer nofollow">$2</a>')
  return content
}

export default {
  template: '<div><slot></slot></div>',

  data() {
    return {
      sourceData: this.source
    }
  },

  props: {
    watches: {
      type: Array,
      default: () => ['source', 'show']
    },
    source: {
      type: String,
      default: ``
    },
    show: {
      type: Boolean,
      default: true
    },
    highlight: {
      type: Boolean,
      default: true
    },
    html: {
      type: Boolean,
      default: true
    },
    xhtmlOut: {
      type: Boolean,
      default: true
    },
    breaks: {
      type: Boolean,
      default: true
    },
    linkify: {
      type: Boolean,
      default: false
    },
    typographer: {
      type: Boolean,
      default: true
    },
    langPrefix: {
      type: String,
      default: 'language-'
    },
    quotes: {
      type: String,
      default: '“”‘’'
    },
    tableClass: {
      type: String,
      default: 'table'
    },
    taskLists: {
      type: Boolean,
      default: true
    },
    prerender: {
      type: Function,
      default: sourceData => {
        return sourceData
      }
    },
    postrender: {
      type: Function,
      default: htmlData => {
        return htmlData
      }
    }
  },

  render(createElement) {
    this.md = new MarkdownIt({
      highlight: function(str, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return '<pre class="hljs"><code>' + hljs.highlight(lang, str, true).value + '</code></pre>'
          } catch (__) {}
        }
        return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>'
      }
    })
      .use(subscript)
      .use(superscript)
      .use(footnote)
      .use(deflist)
      .use(abbreviation)
      .use(insert)
      .use(mark)
      .use(katex, { throwOnError: false, errorColor: ' #cc0000' })
      .use(tasklists, { enabled: this.taskLists })

    this.md.set({
      html: this.html,
      xhtmlOut: this.xhtmlOut,
      breaks: this.breaks,
      linkify: this.linkify,
      typographer: this.typographer,
      langPrefix: this.langPrefix,
      quotes: this.quotes
    })
    this.md.renderer.rules.table_open = () => `<table class="${this.tableClass}">\n`

    let outHtml = this.show ? this.md.render(this.prerender(this.sourceData)) : ''
    outHtml = this.postrender(outHtml)
    outHtml = renderUrl(outHtml)
    outHtml = filter(outHtml)
    outHtml = outHtml.replace(
      / rel="noopener noreferrer nofollow">/g,
      ' onclick=linkClick(this.href) rel="noopener noreferrer nofollow">'
    )

    return createElement('div', {
      domProps: {
        innerHTML: outHtml
      }
    })
  },

  beforeMount() {
    if (this.$slots.default) {
      this.sourceData = ''
      for (let slot of this.$slots.default) {
        this.sourceData += slot.text
      }
    }

    this.$watch('source', () => {
      this.sourceData = this.prerender(this.source)
    })
  }
}
