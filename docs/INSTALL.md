# 安装测试版 / Installing test builds

## 简体中文

要求 Apple Silicon（M 系列）Mac、macOS 13+，无需 Rosetta。下载 ZIP 与 SHA256SUMS.txt，核对 SHA-256 后解压，把 Gridea for ARM64.app 放入应用程序。当前是 ad-hoc 签名，尚无 Developer ID 与 Apple 公证，首次打开可能被 Gatekeeper 拦截。仅在确信来源可信、校验一致后，按 [Apple 官方说明](https://support.apple.com/en-us/102445)处理；不要关闭全局安全保护。提示损坏时先重新下载并核对校验和。

首次启动使用独立示例目录。为兼容旧预览版，资料仍在 `~/Library/Application Support/Gridea ARM Preview`，bundle identifier 仍为 `dev.gridea.arm-preview`。这不是自动导入原版站点。

使用前退出原版，完整备份每个站点，包括 config、posts、post-images、themes、static 等。先选择副本，测试编辑、图片、保存后重开、生成与预览；不要并行编辑同一目录。副本可能保留生产部署凭据，测试同步前必须改为独立测试目标并确认仓库、分支、域名。远程覆盖不能靠本地备份自动撤回。

升级前备份应用资料和整个站点，退出应用后替换 .app。回退时使用旧应用与升级前站点备份，不要覆盖唯一的数据副本。没有自动更新；完整升级恢复与所有部署平台仍未验收。

反馈请附内部构建号、系统/芯片、主题及复现步骤。删除日志、截图中的令牌、密码、私钥和私人内容。仅使用可信主题。

## English

Requires Apple Silicon macOS 13+; no Rosetta needed. Download the ZIP and SHA256SUMS.txt, verify SHA-256, extract and move Gridea for ARM64.app to Applications. The build is ad-hoc signed, without Developer ID or Apple notarization, so Gatekeeper may block first launch. Only if you trust the source and have verified integrity, follow [Apple guidance](https://support.apple.com/en-us/102445). Do not disable system-wide protection. If reported as damaged, re-download and verify first.

The app starts with isolated sample data. The previous preview data folder `~/Library/Application Support/Gridea ARM Preview` and bundle identifier `dev.gridea.arm-preview` remain for compatibility. Upstream sites are not automatically imported.

Quit upstream Gridea and back up the entire source site, including config, posts, images, themes and static assets. Test copies first. Copies may retain production deployment credentials: change them to a disposable deployment destination before syncing, and verify repository, branch and domain. Local backups do not automatically undo remote overwrites.

Back up app data and source sites before upgrades. Quit before replacing the app. To roll back, use the older app with a pre-upgrade site backup; preserve the current copy separately. Automatic updates are not provided. Full deployment and upgrade/recovery acceptance is incomplete.

For reports include build number, macOS/chip, theme and reproduction steps. Remove tokens, passwords, private keys and personal content from logs/screenshots. Use trusted themes only.
