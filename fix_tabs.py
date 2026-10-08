with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad = "    { id: 'overview', label: 'Overview', icon: LayoutGrid },"
good = "    { id: 'overview', label: 'Overview', icon: LayoutGrid },\n    { id: 'automod', label: 'Safety & Auto-Mod', icon: ShieldAlert },"
content = content.replace(bad, good)

# also need to import ShieldAlert from lucide-react
import re
content = re.sub(r'Shield,', r'Shield, ShieldAlert,', content, count=1)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
