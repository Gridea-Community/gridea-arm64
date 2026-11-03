<template>
  <div>
    <a-upload
      action=""
      listType="picture-card"
      class="feature-uploader"
      :showUploadList="false"
      :beforeUpload="beforeUpload"
    >
      <div v-if="avatarPath">
        <img class="favicon-image" :src="avatarPath" width="88px" height="88px" />
      </div>
      <div v-else>
        <a-icon type="plus" />
        <div class="ant-upload-text">Upload</div>
      </div>
    </a-upload>
    <div class="tip-text" v-if="file">
      {{ file.path }}
    </div>
    <footer-box>
      <div class="flex justify-end">
        <a-button type="primary" @click="submit">{{ $t('save') }}</a-button>
      </div>
    </footer-box>
  </div>
</template>

<script lang="ts">
import localFilePath from '@/helpers/local-file'
import { ipcRenderer, IpcRendererEvent } from '@/helpers/renderer-bridge'
import { Vue, Component } from 'vue-property-decorator'
import { State } from 'vuex-class'
import { localAssetURL } from '@/helpers/local-file'
import FooterBox from '../../../components/FooterBox/Index.vue'

@Component({
  components: {
    FooterBox,
  },
})
export default class AvatarSetting extends Vue {
  @State('site') site!: any

  file: any = null

  avatarPath = ''

  mounted() {
    this.avatarPath = localAssetURL(`file://${this.site.appDir}/images/avatar.png`)
  }

  beforeUpload(file: any) {
    if (!file) {
      return
    }
    const isImage = file.type.indexOf('image') !== -1
    if (!isImage) {
      return
    }
    if (file && isImage) {
      this.file = { name: file.name, path: localFilePath(file), type: file.type }
    }
    return false
  }

  submit() {
    if (!this.file) {
      return
    }
    console.log('click avatar upload', this.file)
    ipcRenderer.send('avatar-upload', this.file.path)
    ipcRenderer.once('avatar-uploaded', (event: IpcRendererEvent, result: any) => {
      if (!result) { this.$message.error(String(this.$t('saveError'))); return }
      this.file = null
      this.$bus.$emit('site-reload')
      this.avatarPath = localAssetURL(`file://${this.site.appDir}/images/avatar.png?v=${Date.now()}`)
      this.$message.success(String(this.$t('avatarSettingSuccess')))
    })
  }
}
</script>


<style lang="less" scoped>
.file-name {
  margin-bottom: 8px;
}
</style>
