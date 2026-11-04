# Gridea for ARM64

简体中文 | [English](README.en.md)

Gridea for ARM64 是原版 Gridea 的社区维护版本，可以在搭载 Apple 芯片的 Mac 上直接运行，无需 Rosetta。它基于 Electron，沿用原版的写作、主题和发布流程，支持浅色、深色和跟随系统三种外观。

当前测试版基于 Gridea 0.9.3，内部构建号为 0.9.3.9。

[下载测试版](https://github.com/Gridea-Community/gridea-arm64/releases) · [安装与备份说明](docs/INSTALL.md)

## 从源码构建

需要 Apple Silicon Mac、macOS 13+、Node.js 22+、pnpm 10.20.0 和 Python 3。首次安装需要联网下载依赖和 Electron。

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm test:build
pnpm test:sites
pnpm build:arm64
python3 scripts/package-arm64.py
codesign --force --deep --sign - 'release/Gridea for ARM64.app'
python3 scripts/verify-arm64-package.py
```

构建完成后，应用位于 `release/Gridea for ARM64.app`。上述命令使用 ad-hoc 签名，公开的测试安装包目前也采用这种签名方式，尚未经过 Apple 公证。

`pnpm electron:serve` 使用仓库内忽略提交的 dev-profile。`pnpm test:sites` 默认在临时目录测试四个内置主题并清理副本；如需额外站点，设置 `GRIDEA_SITE_FIXTURES` 为仅含站点子目录的路径。该命令只生成副本，不部署。

## 使用现有站点

测试前备份整个站点目录，先使用副本。不要让原版与本版同时编辑同一目录。更换应用名称后，为兼容已有预览用户，保留 `dev.gridea.arm-preview` bundle identifier 和 `~/Library/Application Support/Gridea ARM Preview` 资料目录。

只使用可信主题：主题保留 Gridea 原有 Node/EJS 能力。不同主题、部署服务、升级与恢复尚未完整验收，深色模式也仍需更广泛的人工验证。

Vue 2 已结束官方支持。上游安全审计仍有两个版本公告；实际编译路径已做本地防护，不宣称所有 Vue 2 分发文件获得全面修复。参见 [补丁范围](patches/README.md) 和 [安全说明](SECURITY.md)。

## 来源与许可

保留上游 MIT 许可与 `Copyright (c) 2019 EryouHao`，见 [LICENSE](LICENSE)。第三方依赖及素材按各自许可使用。项目来源和本地导入方式见 [PROVENANCE.md](PROVENANCE.md)。

本仓库不包含个人站点、部署凭据、依赖安装目录、构建产物或工作日志。请勿在 issue 中上传令牌、私钥或未脱敏的站点备份。
