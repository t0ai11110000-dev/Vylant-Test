with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Match setEditServerIsPublic(.*) and append setEditServerAutoModEnabled
content = re.sub(r'(setEditServerIsPublic\(.*?\.isPublic \|\| false\);)', r'\1\n                              setEditServerAutoModEnabled(server.autoModEnabled || false);', content)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
