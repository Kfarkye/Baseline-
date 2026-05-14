with open("src/App.tsx", "r") as f:
    content = f.read()

# Replace light mode tokens with Obsidian Weissach tokens
replacements = [
    ('bg-[#FAFAFA]', 'bg-transparent'),
    ('bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-zinc-900/5', 'liquid-glass'),
    ('bg-white', 'bg-transparent'),
    ('text-zinc-900', 'text-white'),
    ('text-ink', 'text-white'),
    ('text-brand', 'text-white'),
    ('text-zinc-700', 'text-zinc-300'),
    ('text-zinc-800', 'text-zinc-300'),
    ('text-zinc-600', 'text-zinc-400'),
    ('text-zinc-500', 'text-zinc-500'),
    ('bg-zinc-50/50', 'bg-white/[0.02]'),
    ('bg-zinc-50', 'bg-white/[0.02]'),
    ('bg-zinc-100/50', 'bg-white/[0.04]'),
    ('bg-zinc-100', 'bg-white/[0.04]'),
    ('border-zinc-100', 'border-white/[0.08]'),
    ('border-zinc-200/50', 'border-white/[0.04]'),
    ('border-zinc-200', 'border-white/[0.08]'),
    ('border-black/[0.04]', 'border-white/[0.04]'),
    ('border-black/[0.08]', 'border-white/[0.08]'),
    ('border-black/[0.08]/60', 'border-white/[0.04]'),
    ('bg-transparent/95', 'bg-black/90'),
    ('bg-transparent/50', 'bg-black/50'),
    ('bg-transparent/70', 'bg-black/70'),
    ('bg-transparent/80', 'bg-white/10'),
    ('hover:bg-transparent', 'hover:bg-white/10'),
    ('bg-[#D95B30]', 'bg-amber-400'),
]

for old, new in replacements:
    content = content.replace(old, new)

with open("src/App.tsx", "w") as f:
    f.write(content)

