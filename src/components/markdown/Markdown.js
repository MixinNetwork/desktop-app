import MarkdownIt from 'markdown-it'
import emoji from 'markdown-it-emoji'
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
      default: true
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
        return '<pre class="hljs"><code>' + str + '</code></pre>'
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
      .use(emoji)

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
    let defaultLinkRenderer =
      this.md.renderer.rules.link_open ||
      function(tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options)
      }
    this.md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const anchorAttributes = {
        target: '_blank',
        rel: 'noopener noreferrer nofollow',
        onclick: 'linkClick(this.href)'
      }
      Object.keys(anchorAttributes).map(attribute => {
        let aIndex = tokens[idx].attrIndex(attribute)
        let value = anchorAttributes[attribute]
        if (aIndex < 0) {
          tokens[idx].attrPush([attribute, value])
        } else {
          tokens[idx].attrs[aIndex][1] = value
        }
      })
      return defaultLinkRenderer(tokens, idx, options, env, self)
    }

    let outHtml = this.show ? this.md.render(this.prerender(this.sourceData)) : ''
    outHtml = this.postrender(outHtml)

    return createElement('div', {
      domProps: {
        innerHTML: filter(outHtml)
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
