import errorMessage from '../../../helpers/error-message'
import * as fse from 'fs-extra'
import path from 'path'
import { randomUUID } from 'node:crypto'
import SftpClient from 'ssh2-sftp-client'
import { NodeSSH as NodeSsh } from 'node-ssh'
import normalizePath from 'normalize-path'
import Model from '../../model'

type sftpConnectConfig = {
  host: string;
  port: number;
  type?: string;
  username: string;
  password?: string;
  privateKey?: string | Buffer;
}

export default class SftpDeploy extends Model {
  // connect: SftpClient
  constructor(appInstance: any) {
    super(appInstance)
    // this.connect = new SftpClient()
    console.log('instance sftp deploy')
  }

  async remoteDetect() {
    const result = {
      success: true,
      message: '',
    }

    const client = new SftpClient()

    const { setting } = this.db

    const connectConfig: sftpConnectConfig = {
      host: setting.server,
      port: Number(setting.port),
      username: setting.username,
    }

    if (setting.privateKey) {
      try {
        connectConfig.privateKey = fse.readFileSync(setting.privateKey)
      } catch (e) {
        console.error('SFTP Test Remote Error: ', errorMessage(e))
        result.success = false
        result.message = errorMessage(e)
        return result
      }
    } else {
      connectConfig.password = setting.password
    }

    const testFilename = `gridea-test-${randomUUID()}.txt`
    let localFileCreated = false
    const localTestFilePath = normalizePath(path.join(this.appDir, testFilename))
    const remoteTestFilePath = normalizePath(path.join(setting.remotePath, testFilename))

    try {
      await client.connect(connectConfig)
      await client.list('/')

      try {
        fse.writeFileSync(localTestFilePath, 'Gridea connection test', { flag: 'wx' })
        localFileCreated = true

        await client.put(localTestFilePath, remoteTestFilePath)
        await client.delete(remoteTestFilePath)
      } catch (e) {
        console.error('SFTP Test Remote Error: ', errorMessage(e))
        result.success = false
        result.message = errorMessage(e)
      } finally {
        if (localFileCreated && fse.existsSync(localTestFilePath)) {
          fse.unlinkSync(localTestFilePath)
        }
      }
    } catch (e) {
      console.error('SFTP Test Remote Error: ', errorMessage(e))
      result.success = false
      result.message = errorMessage(e)
    } finally {
      await client.end()
    }

    return result
  }

  async publish() {
    const result = {
      success: true,
      message: '',
    }

    const client = new NodeSsh()

    const { setting } = this.db

    const connectConfig: sftpConnectConfig = {
      host: setting.server,
      port: Number(setting.port),
      type: 'sftp',
      username: setting.username,
    }

    const localPath = normalizePath(path.join(this.buildDir))
    const configuredPath = typeof setting.remotePath === 'string' ? setting.remotePath : ''
    const remotePath = path.posix.normalize(normalizePath(configuredPath))

    try {
      if (!configuredPath.trim() || ['/', '.', '..', '~'].includes(remotePath) || /[\0\r\n]/.test(remotePath)) {
        throw new Error('SFTP remote path must identify a site directory, not a root or home directory')
      }
      if (setting.privateKey) {
        connectConfig.privateKey = fse.readFileSync(setting.privateKey)
      } else {
        connectConfig.password = setting.password
      }
      await client.connect(connectConfig)
      try {
        // Let node-ssh quote arguments so spaces and shell metacharacters stay literal.
        const cleanup = await client.exec('rm', ['-rf', '--', remotePath], { stream: 'both' })
        if (cleanup.code !== 0) throw new Error(cleanup.stderr || 'Could not clear the remote site directory')
        await client.mkdir(remotePath)
        let transferError = ''
        const res = await client.putDirectory(localPath, remotePath, {
          recursive: true,
          tick: (_local, _remote, error) => { if (error && !transferError) transferError = errorMessage(error) },
          concurrency: 1, // 解决同步丢失js、css、图片文件问题
          validate: function (itemPath: string) {
            const baseName = path.basename(itemPath)
            return baseName.substr(0, 1) !== '.' // do not allow dot files
                   && baseName !== 'node_modules' // do not allow node_modules
          },
        })
        if (!res) throw new Error(transferError || 'Some site files could not be uploaded')
      } catch (e) {
        console.error('SFTP Publish Error: ', errorMessage(e))
        result.success = false
        result.message = errorMessage(e)
      }
    } catch (e) {
      console.error('SFTP Publish Error: ', errorMessage(e))
      result.success = false
      result.message = errorMessage(e)
    } finally {
      await client.dispose()
    }

    return result
  }
}
