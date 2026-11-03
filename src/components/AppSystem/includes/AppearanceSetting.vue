<template>
  <div class="mb-4 py-4 border-b border-gray-200">
    <div class="text-base font-medium mb-4">外观 / Appearance</div>
    <a-radio-group v-model="mode" @change="change" aria-label="外观">
      <a-radio-button value="system">跟随系统</a-radio-button>
      <a-radio-button value="light">浅色</a-radio-button>
      <a-radio-button value="dark">深色</a-radio-button>
    </a-radio-group>
  </div>
</template>
<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import { getAppearance, setAppearance } from '../../../helpers/appearance'
@Component
export default class AppearanceSetting extends Vue {
  mode = getAppearance()
  change() { setAppearance(this.mode) }
}
</script>
