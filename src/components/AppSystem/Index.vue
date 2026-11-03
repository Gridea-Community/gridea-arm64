<template>
  <div>
    <appearance-setting></appearance-setting>
    <language-setting></language-setting>
    <source-folder-setting></source-folder-setting>
    <version></version>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import AppearanceSetting from './includes/AppearanceSetting.vue'
import LanguageSetting from './includes/LanguageSetting.vue'
import SourceFolderSetting from './includes/SourceFolderSetting.vue'
import Version from './includes/Version.vue'

@Component({
  components: {
    AppearanceSetting,
    LanguageSetting,
    SourceFolderSetting,
    Version,
  },
})
export default class System extends Vue {

}
</script>

<style lang="less" scoped>
</style>
