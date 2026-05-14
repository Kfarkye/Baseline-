import re
import os

with open('src/App.tsx', 'r') as f:
    content = f.read()

def extract_function(name):
    # Find start of function
    match = re.search(r'^(export\s+)?(default\s+)?function\s+' + name + r'\s*\(.*', content, re.MULTILINE)
    if not match:
        print(f"Could not find {name}")
        return None
    start_idx = match.start()
    
    # Simple brace matching
    brace_count = 0
    in_function = False
    idx = start_idx
    
    while idx < len(content):
        if content[idx] == '{':
            brace_count += 1
            in_function = True
        elif content[idx] == '}':
            brace_count -= 1
        
        if in_function and brace_count == 0:
            return content[start_idx:idx+1]
        idx += 1
        
    return None

def write_component(path, name, imports=""):
    code = extract_function(name)
    if code:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            f.write(imports + "\n" + code)
        print(f"Written {path}")

# Common imports for now
common_imports = """import React from 'react';
import { cn } from '../../lib/utils';
"""

write_component('src/components/board/PitcherDisplay.tsx', 'PitcherDisplay', common_imports)
write_component('src/components/layout/AuthLanding.tsx', 'AuthLanding', common_imports)
write_component('src/components/layout/SideNavIcon.tsx', 'SideNavIcon', common_imports)
write_component('src/components/chat/DeployDocumentBtn.tsx', 'DeployDocumentBtn', common_imports)
write_component('src/components/chat/ChatMessageItem.tsx', 'ChatMessageItem', common_imports)
write_component('src/components/board/OddsCard.tsx', 'OddsCard', common_imports)
write_component('src/components/board/PriceTag.tsx', 'PriceTag', common_imports)
write_component('src/components/board/GameDetailView.tsx', 'GameDetailView', common_imports)

