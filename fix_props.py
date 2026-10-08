with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad1 = "  serverIsPublic?: boolean;\n  setServerIsPublic?: (val: boolean) => void;"
good1 = "  serverIsPublic?: boolean;\n  setServerIsPublic?: (val: boolean) => void;\n  serverAutoModEnabled?: boolean;\n  setServerAutoModEnabled?: (val: boolean) => void;"
content = content.replace(bad1, good1)

bad2 = "  serverIsPublic,\n  setServerIsPublic,"
good2 = "  serverIsPublic,\n  setServerIsPublic,\n  serverAutoModEnabled,\n  setServerAutoModEnabled,"
content = content.replace(bad2, good2)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
