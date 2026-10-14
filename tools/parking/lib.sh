#!/bin/bash
# Node-runnable copies of the game's DOM-free parking modules (Node needs the .ts extensions the app's imports leave out)
cd "$(dirname "$0")"
mkdir -p .lib out
for f in engine generator progress; do sed "s#from './engine'#from './engine.ts'#" ../../src/land/parking/$f.ts > .lib/$f.ts; done
sed "s#from './adventures'#from './adventures.ts'#; s#from './parking/progress'#from './progress.ts'#" ../../src/land/rules.ts > .lib/rules.ts
sed "s#from './rules'#from './rules.ts'#" ../../src/land/adventures.ts > .lib/adventures.ts
