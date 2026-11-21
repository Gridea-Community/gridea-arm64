<template>
  <div class="mb-4 py-4 border-b border-gray-200">
    <div class="text-base font-medium mb-4">{{ $t('version') }}</div>
    <div>{{ version }}</div>
    <a href="https://gridea.dev" target="_blank"> Gridea</a>
    <div class="mt-4">
      <a-button :loading="checking" :disabled="checking" @click="checkUpdate">{{ $t('checkUpdates') }}</a-button>
      <a class="ml-4" href="https://github.com/Gridea-Community/gridea-arm64/releases" @click.prevent="openReleaseList">{{ $t('viewRelease') }}</a>
      <p class="mt-2" role="status" aria-live="polite">{{ status }}</p>
    </div>
    <a-modal :title="$t('updateAvailable')" :visible="Boolean(update)" :footer="null" @cancel="update = null">
      <template v-if="update">
        <h3>{{ update.version }}</h3>
        <pre class="release-notes">{{ update.body }}</pre>
        <a-button type="primary" @click="openRelease">{{ $t('viewRelease') }}</a-button>
      </template>
    </a-modal>
  </div>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator'
import pkg from '../../../../package.json'
import { checkForUpdate, isUpdateRateLimited } from '@/helpers/app-update'
import shell from '@/helpers/renderer-link'

@Component
export default class System extends Vue {
  version = `v${pkg.version.replace(/^(\d+\.\d+\.\d+-arm64\.\d+)\.(alpha|beta)\.(.+)$/, '$1 $2 $3')}`
  checking = false
  status = ''
  update: Awaited<ReturnType<typeof checkForUpdate>> = null

  async checkUpdate() {
    if (this.checking) return
    this.checking = true
    this.status = String(this.$t('checkingUpdates'))
    this.update = null
    try {
      this.update = await checkForUpdate(pkg.version)
      this.status = String(this.$t(this.update ? 'updateAvailable' : 'noUpdateAvailable'))
    } catch (error) {
      this.status = String(this.$t(isUpdateRateLimited(error) ? 'updateCheckLimited' : 'updateCheckFailed'))
    } finally {
      this.checking = false
    }
  }

  openReleaseList() {
    shell.openExternal('https://github.com/Gridea-Community/gridea-arm64/releases')
  }

  openRelease() {
    if (this.update) shell.openExternal(this.update.url)
  }
}
</script>

<style lang="less" scoped>
.release-notes { white-space: pre-wrap; overflow-wrap: anywhere; max-height: 50vh; overflow-y: auto; font: inherit; }
</style>
