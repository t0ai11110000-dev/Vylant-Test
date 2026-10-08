with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

bad = """                    is18Plus: editServerIs18Plus,
                    isPublic: editServerIsPublic,"""
good = """                    is18Plus: editServerIs18Plus,
                    isPublic: editServerIsPublic,
                    autoModEnabled: editServerAutoModEnabled,"""
content = content.replace(bad, good)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
