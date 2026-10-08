import re

with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace UI container classes
bad_str = "customTheme === 'glass' ? 'backdrop-blur-xl border-t border-l border-white/20 border-r border-b border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.2)]' : ''"
good_str = "customTheme === 'glass' ? 'backdrop-blur-[40px] backdrop-saturate-[1.5] border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.3)]' : ''"

content = content.replace(bad_str, good_str)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
