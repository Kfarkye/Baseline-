import re
import os

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Make directories
os.makedirs('src/types', exist_ok=True)
os.makedirs('src/services', exist_ok=True)
os.makedirs('src/hooks', exist_ok=True)
os.makedirs('src/components', exist_ok=True)
os.makedirs('src/components/layout', exist_ok=True)
os.makedirs('src/components/board', exist_ok=True)
os.makedirs('src/components/chat', exist_ok=True)
os.makedirs('src/components/market', exist_ok=True)

print("Directories created.")
