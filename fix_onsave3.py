with open('src/App.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad1 = """                          isPublic: editServerIsPublic,
                          auditLog"""
good1 = """                          isPublic: editServerIsPublic,
                          autoModEnabled: editServerAutoModEnabled,
                          auditLog"""
content = content.replace(bad1, good1)

bad2 = """                    is18Plus: editServerIs18Plus,
                    isPublic: editServerIsPublic 
                  },"""
good2 = """                    is18Plus: editServerIs18Plus,
                    isPublic: editServerIsPublic,
                    autoModEnabled: editServerAutoModEnabled
                  },"""
content = content.replace(bad2, good2)

with open('src/App.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
