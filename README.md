# Gridea for ARM64

简体中文 | [English](README.en.md)

基于 [Gridea](https://github.com/getgridea/gridea) 的第三方 Apple Silicon macOS 维护版本，采用 Electron，原生运行于 ARM64，无需 Rosetta。非上游官方发行版，也不是 SwiftUI 客户端。

当前基线：Gridea 0.9.3，内部构建号 0.9.3.13。状态为测试版，尚未公开稳定发布。

[下载测试版](https://github.com/Gridea-Community/gridea-arm64/releases) · [安装与备份说明](docs/INSTALL.md)

## 改动

- Apple Silicon 原生运行时与 Gridea 应用图标。
- 跟随系统、浅色、深色外观；保留原有 Gridea 工作流程与主题接口。
- webpack 5 构建、完整 Vue/TypeScript 检查。
- 渲染器隔离、受限 IPC、本地文件与预览边界加固。
- 文章与 JSON 原子写入，以及 Vue 2 编译器本地防护与回归测试。

## 构建与测试

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

产物为 `release/Gridea for ARM64.app`。这里的签名是本地 ad-hoc 签名，不是 Developer ID 或 Apple 公证。公开安装包前另行完成分发签名与安装验收；公开源码不需要公证。

`pnpm electron:serve` 使用仓库内忽略提交的 dev-profile。`pnpm test:sites` 默认在临时目录测试四个内置主题并清理副本；如需额外站点，设置 `GRIDEA_SITE_FIXTURES` 为仅含站点子目录的路径。该命令只生成副本，不部署。

## 数据与兼容性

测试前备份整个站点目录，先使用副本。不要让原版与本版同时编辑同一目录。更换应用名称后，为兼容已有预览用户，保留 `dev.gridea.arm-preview` bundle identifier 和 `~/Library/Application Support/Gridea ARM Preview` 资料目录；这不是遗漏的旧品牌。

只使用可信主题：主题保留 Gridea 原有 Node/EJS 能力。不同主题、部署服务、升级与恢复尚未完整验收，深色模式也仍需更广泛的人工验证。

Vue 2 已结束官方支持。上游安全审计仍有两个版本公告；实际编译路径已做本地防护，不宣称所有 Vue 2 分发文件获得全面修复。参见 [补丁范围](patches/README.md) 和 [安全说明](SECURITY.md)。

## 来源与许可

保留上游 MIT 许可与 `Copyright (c) 2019 EryouHao`，见 [LICENSE](LICENSE)。第三方依赖及素材按各自许可使用。项目来源和本地导入方式见 [PROVENANCE.md](PROVENANCE.md)。

本仓库不包含个人站点、部署凭据、依赖安装目录、构建产物或工作日志。请勿在 issue 中上传令牌、私钥或未脱敏的站点备份。
