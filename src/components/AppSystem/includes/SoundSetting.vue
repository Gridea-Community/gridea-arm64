<template>
  <div class="mb-4 py-4 border-b border-gray-200">
    <div class="text-base font-medium mb-4">{{ $t('soundSettings') }}</div>
    <label class="preview-sound-setting">
      <a-switch v-model="enabled" @change="save" :aria-label="$t('previewSound')" />
      <span>{{ $t('previewSound') }}</span>
    </label>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import { ipcRenderer } from '@/helpers/renderer-bridge'

@Component
export default class SoundSetting extends Vue {
  enabled = localStorage.getItem('previewSound') === 'true'

  save() {
    localStorage.setItem('previewSound', String(this.enabled))
    ipcRenderer.send('app-preview-sound', this.enabled)
  }
}
</script>

<style scoped>
.preview-sound-setting {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
