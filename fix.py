with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad_str = "customTheme === 'glass' ? 'backdrop-blur-2xl' : ''"
good_str = "customTheme === 'glass' ? 'backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.12)]' : ''"

content = content.replace(bad_str, good_str)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
