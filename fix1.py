with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad = "  is18Plus?: boolean;\n  isPublic?: boolean;"
good = "  is18Plus?: boolean;\n  isPublic?: boolean;\n  autoModEnabled?: boolean;"
content = content.replace(bad, good)

bad2 = "  const [editServerIsPublic, setEditServerIsPublic] = useState(false);"
good2 = "  const [editServerIsPublic, setEditServerIsPublic] = useState(false);\n  const [editServerAutoModEnabled, setEditServerAutoModEnabled] = useState(false);"
content = content.replace(bad2, good2)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
