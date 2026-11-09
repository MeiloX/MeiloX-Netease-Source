import './tools/write-manifest.mjs';
import {readFileSync, writeFileSync} from 'node:fs';
const parts=['protocol','core','projections','history','effects','shuffle','features','plugin'].map(name=>readFileSync(new URL(`src/${name}.js`,import.meta.url),'utf8'));
writeFileSync(new URL('index.js',import.meta.url),`/* MeiloX NetEase source. GPL-3.0-only; see LICENSE and NOTICE. */\n(function(){'use strict';\n${parts.join('\n')}\n})();\n`);
