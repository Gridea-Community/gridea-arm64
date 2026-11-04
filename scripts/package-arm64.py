"""Package the compiled app with the verified official ARM64 Electron runtime."""
import pathlib,shutil,json,plistlib,subprocess,argparse,hashlib
root=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--output',type=pathlib.Path)
args=parser.parse_args();out=args.output or root/'release';out.mkdir(parents=True,exist_ok=True);app=out/'Gridea for ARM64.app'
if app.exists():shutil.rmtree(app)
shutil.copytree(root/'node_modules/electron/dist/Electron.app',app,symlinks=True)
resources=app/'Contents/Resources';dest=resources/'app';shutil.copytree(root/'dist_electron/bundled',dest,dirs_exist_ok=True)
shutil.copy(root/'scripts/startup.cjs',dest/'startup.cjs')
pkg=json.loads((root/'package.json').read_text());(dest/'package.json').write_text(json.dumps(pkg,indent=2));seen=set()
def resolve(name,start):
 p=start
 while p!=p.parent:
  q=p/'node_modules'/name
  if (q/'package.json').exists():return q
  p=p.parent
 raise FileNotFoundError(name+' from '+str(start))
def copy(name,start,optional=False):
 try:src=resolve(name,start)
 except FileNotFoundError:
  if optional:return
  raise
 if src in seen:return
 seen.add(src);target=dest/src.relative_to(root);target.parent.mkdir(exist_ok=True,parents=True)
 shutil.copytree(src,target,symlinks=True,ignore=shutil.ignore_patterns('.DS_Store','node_modules','.git','test','tests','__tests__'),dirs_exist_ok=True)
 d=json.loads((src/'package.json').read_text());opts=d.get('optionalDependencies',{})
 for dep in d.get('dependencies',{}):copy(dep,src,dep in opts)
 for dep in opts:copy(dep,src,True)
for name in pkg['dependencies']:copy(name,root)
notices=[]
for source in sorted(seen):
 metadata=json.loads((source/'package.json').read_text())
 notices.append({key:metadata.get(key) for key in ['name','version','license','repository']})
(resources/'THIRD-PARTY-NOTICES.json').write_text(json.dumps(notices,indent=2,ensure_ascii=False))
patches=[]
for name,file in pkg.get('pnpm',{}).get('patchedDependencies',{}).items():
 source=root/file;patches.append({'package':name,'file':source.name,'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
shutil.copytree(root/'patches',resources/'build-patches',dirs_exist_ok=True)
(resources/'BUILD-PATCHES.json').write_text(json.dumps(patches,indent=2))
shutil.copytree(root/'public/default-files',resources/'sample-blog',dirs_exist_ok=True)
shutil.copy(root/'public/app-icons/gridea.icns',resources/'gridea.icns')
# Replace Electron's fallback icon as well as the explicit bundle icon.
shutil.copy(root/'public/app-icons/gridea.icns',resources/'electron.icns')
shutil.copy(root/'LICENSE',resources/'LICENSE-Gridea')
shutil.copytree(root/'licenses',resources/'third-party-licenses',dirs_exist_ok=True)
plist=app/'Contents/Info.plist';d=plistlib.loads(plist.read_bytes());d.update(CFBundleName='Gridea for ARM64',CFBundleDisplayName='Gridea for ARM64',CFBundleIdentifier='dev.gridea.arm-preview',CFBundleShortVersionString='0.9.3',CFBundleVersion='0.9.3.14',CFBundleIconFile='gridea.icns');d.pop('CFBundleIconName',None);plist.write_bytes(plistlib.dumps(d))
print(app);print('Production packages:',len(seen))
