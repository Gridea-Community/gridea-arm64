<template>
  <div id="monaco-markdown-editor" style="max-width: 728px; min-height: calc(100vh - 176px); margin: 0 auto;" :style="{
    width: isPostPage ? '728px' : 'auto'
  }">
  </div>
</template>

<script lang="ts">
import {
  Vue, Component, Prop, Watch, Model,
} from 'vue-property-decorator'
import * as monaco from 'monaco-editor'
;(window as any).MonacoEnvironment = { getWorkerUrl: () => new URL('editor.worker.js', window.location.href).toString() }
import * as MonacoMarkdown from 'monaco-markdown'
import theme from './theme'

@Component
export default class MonacoMarkdownEditor extends Vue {
  @Prop({ type: Boolean }) readonly isPostPage!: boolean

  @Model('change', { type: String }) readonly value!: string


  editor: any = null

  placeholderTimer: ReturnType<typeof setTimeout> | null = null

  updateAppearance() { monaco.editor.setTheme(document.documentElement.dataset.theme === 'dark' ? 'vs-dark' : 'GrideaLight') }

  beforeDestroy() {
    window.removeEventListener('gridea-appearance-changed', this.updateAppearance)
    if (this.placeholderTimer !== null) clearTimeout(this.placeholderTimer)
    if (this.editor) {
      const model = this.editor.getModel()
      this.editor.dispose()
      if (model) model.dispose()
      this.editor = null
    }
  }

  mounted() {
    monaco.editor.defineTheme('GrideaLight', theme as any)
    window.addEventListener('gridea-appearance-changed', this.updateAppearance)

    this.editor = monaco.editor.create(this.$el as HTMLElement, {
      language: 'markdown-math',
      value: this.value,
      fontSize: 15,
      theme: document.documentElement.dataset.theme === 'dark' ? 'vs-dark' : 'GrideaLight',
      lineNumbers: 'off',
      minimap: {
        enabled: false,
      },
      wordWrap: 'on',
      cursorWidth: 2,
      cursorSmoothCaretAnimation: true,
      cursorBlinking: 'smooth',
      colorDecorators: true,
      extraEditorClassName: 'gridea-editor',
      folding: false,
      highlightActiveIndentGuide: false,
      renderIndentGuides: false,
      renderLineHighlight: 'none',
      scrollbar: {
        vertical: 'auto',
        horizontal: 'hidden',
        verticalScrollbarSize: 4,
      },
      lineHeight: 26.25,
      scrollBeyondLastLine: false,
      wordBasedSuggestions: false,
      snippetSuggestions: 'none',
      lineDecorationsWidth: 0,
      occurrencesHighlight: false,
      automaticLayout: true,
      fontFamily: 'PingFang SC,-apple-system,SF UI Text,Lucida Grande,STheiti,Microsoft YaHei,sans-serif',
    })

    const extension = new MonacoMarkdown.MonacoMarkdownExtension()
    extension.activate(this.editor)

    this.schedulePlaceholderUpdate()

    this.editor.onDidChangeModelContent(() => {
      this.schedulePlaceholderUpdate()
      const value = this.editor.getValue()
      if (this.value !== value) {
        this.$emit('change', value)
      }
    })
    this.editor.onKeyDown(() => {
      this.$emit('keydown')
    })
  }

  schedulePlaceholderUpdate() {
    if (this.placeholderTimer !== null) clearTimeout(this.placeholderTimer)
    this.placeholderTimer = setTimeout(() => {
      this.placeholderTimer = null
      this.setEditorHeight()
    }, 0)
  }

  setEditorHeight() {
    if (!this.editor) return
    const lines = this.$el.querySelectorAll('.view-line') as NodeListOf<HTMLElement>
    if (!lines.length) return
    lines[0].classList.toggle('input-holder', lines.length === 1 && !lines[0].innerText.trim())
  }

  @Watch('value')
  onValueChanged(newValue: any) {
    if (this.editor && newValue !== this.editor.getValue()) {
      this.editor.setValue(newValue)
    }
  }
}
</script>

<style lang="less" scoped>
/deep/.context-view .monaco-scrollable-element {
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, .1), 0 1px 2px 0 rgba(0, 0, 0, .06) !important;
  border-radius: 4px;
}

/deep/ .monaco-menu .monaco-action-bar.vertical .action-item {
  border: none;
}

/deep/ .action-menu-item {
  color: #718096 !important;
  &:hover {
    color: #744210 !important;
    background: #FFFFF0 !important;
  }
}

/deep/ .decorationsOverviewRuler {
  display: none !important;
}

/deep/ .monaco-menu .monaco-action-bar.vertical .action-label.separator {
  border-bottom-color: #E2E8F0 !important;
}
/deep/ .input-holder {
  &:before {
    content: '开始写作...';
    color: rgba(208, 211, 217, 0.6);
  }
}

/deep/ .monaco-editor {
  .scrollbar {
    .slider {
      background: #eee;
    }
  }
  .scroll-decoration {
    box-shadow: #efefef 0 2px 2px -2px inset;
  }
}
</style>
