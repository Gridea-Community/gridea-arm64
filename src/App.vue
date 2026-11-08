<template>
  <div id="app">
    <a-config-provider :locale="componentLocale">
      <router-view />
    </a-config-provider>
  </div>
</template>

<script lang="ts">
import shell from '@/helpers/renderer-link'
import Vue from 'vue'
import Component from 'vue-class-component'
import { AppLanguage, isAppLanguage } from './helpers/app-language'

const traditionalChinese = require('ant-design-vue/lib/locale-provider/zh_TW').default
const componentLocales: Record<AppLanguage, any> = {
  zhHans: require('ant-design-vue/lib/locale-provider/zh_CN').default,
  zh_TW: traditionalChinese,
  zh_HK: traditionalChinese, // Ant Design Vue has no dedicated Hong Kong locale.
  en: require('ant-design-vue/lib/locale-provider/en_US').default,
  fr_FR: require('ant-design-vue/lib/locale-provider/fr_FR').default,
  ru: require('ant-design-vue/lib/locale-provider/ru_RU').default,
  ja_JP: require('ant-design-vue/lib/locale-provider/ja_JP').default,
}

@Component
export default class App extends Vue {
  get componentLocale() {
    const language = this.$i18n.locale
    return componentLocales[isAppLanguage(language) ? language : 'en']
  }

  mounted() {
    document.addEventListener('click', (event: any) => {
      if (event.target.tagName === 'A' && event.target.href.startsWith('http')) {
        event.preventDefault()
        shell.openExternal(event.target.href)
      }
    })
  }
}
</script>

<style lang="less" scoped>

</style>


<style>

  /* Global CSS */
  body {
    background: #fff;
    color: #555;
  }

  ::-webkit-scrollbar{
    width: 4px;
    height: 4px;
    border-radius: 4px;
    background-color: #fff;

  }
    /*滚动条两端的箭头*/
  ::-webkit-scrollbar-button{
    display: none;
  }
  ::-webkit-scroll-track{
    display: none;
  }
  ::-webkit-scrollbar-track-piece {
    display: none;
  }

  ::-webkit-scrollbar-thumb{
    background-color: #eee;
    opacity: 0.7;
    border-radius: 4px;
  }

  ::-webkit-scrollbar-corner {
    display: none;
  }
  ::-webkit-resizer{
    display: none;
  }

  .github {
    font-size: 16px;
    margin-left: 16px;
    cursor: pointer;
  }

  .logo {
    user-select: none;
  }

  .application {
    font-family: PingFang SC,-apple-system,SF UI Text,Lucida Grande,STheiti,Microsoft YaHei,sans-serif !important;
  }
</style>
