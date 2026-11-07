from pathlib import Path
import zipfile
root=Path(__file__).resolve().parent
with zipfile.ZipFile(root/'netease.meisource','w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as package:
    for name in ('manifest.json','index.js','LICENSE','NOTICE'):
        info=zipfile.ZipInfo(name,date_time=(2026,11,7,0,0,0))
        info.compress_type=zipfile.ZIP_DEFLATED
        info.external_attr=0o100644<<16
        package.writestr(info,(root/name).read_bytes())
