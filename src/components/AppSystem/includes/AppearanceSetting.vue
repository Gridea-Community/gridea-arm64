<template>
  <div class="mb-4 py-4 border-b border-gray-200">
    <div class="text-base font-medium mb-4">{{ $t('appearance') }}</div>
    <a-radio-group v-model="mode" @change="change" :aria-label="$t('appearance')">
      <a-radio-button value="system">{{ $t('appearanceSystem') }}</a-radio-button>
      <a-radio-button value="light">{{ $t('appearanceLight') }}</a-radio-button>
      <a-radio-button value="dark">{{ $t('appearanceDark') }}</a-radio-button>
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
