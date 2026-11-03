import pathlib,plistlib,subprocess,argparse
root=pathlib.Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser();parser.add_argument('--app',type=pathlib.Path);args=parser.parse_args()
app=args.app or root/'release/Gridea for ARM64.app';res=app/'Contents/Resources'
p=plistlib.loads((app/'Contents/Info.plist').read_bytes())
assert p['CFBundleIconFile']=='gridea.icns'
assert p['CFBundleName']=='Gridea for ARM64'
assert p['CFBundleDisplayName']=='Gridea for ARM64'
for name in ['gridea.icns','electron.icns']:
 assert (res/name).read_bytes()==(root/'public/app-icons/gridea.icns').read_bytes(),name
for name in ['background.js','preload.js','editor.worker.js','startup.cjs']:
 assert (res/'app'/name).is_file(),name
assert {p.name for p in (res/'sample-blog/themes').iterdir()}=={'fly','notes','paper','simple'}
assert not (res/'app/node_modules/typescript').exists()
assert (res/'THIRD-PARTY-NOTICES.json').is_file()
architecture=subprocess.check_output(['file',str(app/'Contents/MacOS/Electron')],text=True)
assert 'arm64' in architecture and 'x86_64' not in architecture
subprocess.run(['codesign','--verify','--deep','--strict',str(app)],check=True)
print('PASS ARM64 package, signature, icon, isolated bridge, worker, clean samples and production dependencies; build '+p['CFBundleVersion'])
