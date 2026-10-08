with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad = "        serverIsPublic={editServerIsPublic}\n        setServerIsPublic={setEditServerIsPublic}"
good = "        serverIsPublic={editServerIsPublic}\n        setServerIsPublic={setEditServerIsPublic}\n        serverAutoModEnabled={editServerAutoModEnabled}\n        setServerAutoModEnabled={setEditServerAutoModEnabled}"
content = content.replace(bad, good)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
