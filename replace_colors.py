#!/usr/bin/env python3
"""
Vylant Color Replacement - Automated Theme Unification
Replaces conflicting Tailwind color classes with the unified design system.
"""
import re
import os

BASE = "/Users/t0ai/Downloads/Vylant-main"

# Map of old color classes to new unified design system classes
COLOR_MAP = [
    # ---- Primary - Navy (background) ----
    ("bg-slate-50", "bg-navy-50"),
    ("bg-slate-100", "bg-navy-100"),
    ("bg-slate-200", "bg-navy-200"),
    ("bg-slate-300", "bg-navy-300"),
    ("bg-slate-400", "bg-navy-400"),
    ("bg-slate-500", "bg-navy-500"),
    ("bg-slate-600", "bg-navy-600"),
    ("bg-slate-700", "bg-navy-700"),
    ("bg-slate-800", "bg-navy-800"),
    ("bg-slate-900", "bg-navy-900"),
    ("bg-slate-950", "bg-navy-950"),
    ("bg-slate-150", "bg-navy-150"),
    ("bg-slate-350", "bg-navy-350"),
    ("text-slate-50", "text-navy-50"),
    ("text-slate-100", "text-navy-100"),
    ("text-slate-200", "text-navy-200"),
    ("text-slate-300", "text-navy-300"),
    ("text-slate-400", "text-navy-400"),
    ("text-slate-500", "text-navy-500"),
    ("text-slate-600", "text-navy-600"),
    ("text-slate-700", "text-navy-700"),
    ("text-slate-800", "text-navy-800"),
    ("text-slate-900", "text-navy-900"),
    ("border-slate-100", "border-navy-100"),
    ("border-slate-200", "border-navy-200"),
    ("border-slate-300", "border-navy-300"),
    ("border-slate-400", "border-navy-400"),
    ("border-slate-500", "border-navy-400"),
    ("border-slate-700", "border-navy-600"),
    ("border-slate-800", "border-navy-700"),
    ("border-slate-900", "border-navy-800"),
    # ---- Secondary - Amber (warning/amber - use amber-500/amber-600) ----
    ("bg-amber-50", "bg-amber-50"),
    ("bg-amber-400", "bg-amber-400"),
    ("bg-amber-500", "bg-amber-500"),
    ("bg-amber-600", "bg-amber-600"),
    ("text-amber-400", "text-amber-400"),
    ("text-amber-500", "text-amber-500"),
    ("text-amber-600", "text-amber-600"),
    ("text-amber-300", "text-amber-300"),
    ("text-amber-700", "text-amber-700"),
    ("text-amber-800", "text-amber-800"),
    ("text-amber-900", "text-amber-900"),
    ("border-amber-200", "border-amber-200"),
    ("border-amber-400", "border-amber-400"),
    ("border-amber-500", "border-amber-500"),
    ("bg-amber-100", "bg-amber-100"),
    ("bg-amber-50/10", "bg-amber-50/10"),
    ("bg-amber-500/10", "bg-amber-500/10"),
    ("bg-amber-500/20", "bg-amber-500/20"),
    ("bg-amber-500/30", "bg-amber-500/30"),
    ("bg-amber-500/40", "bg-amber-500/40"),
    ("bg-amber-500/50", "bg-amber-500/50"),
    ("hover:bg-amber-600", "hover:bg-amber-600"),
    # ---- Tertiary - Blue (fixed single accent) ----
    ("bg-blue-500", "bg-blue-500"),
    ("bg-blue-600", "bg-blue-600"),
    ("bg-blue-500/20", "bg-blue-500/20"),
    ("bg-blue-500/30", "bg-blue-500/30"),
    ("bg-blue-500/40", "bg-blue-500/40"),
    ("bg-blue-500/50", "bg-blue-500/50"),
    ("text-blue-400", "text-blue-400"),
    ("text-blue-500", "text-blue-500"),
    ("text-blue-600", "text-blue-600"),
    ("border-blue-500", "border-blue-500"),
    ("border-blue-400", "border-blue-400"),
    # ---- Success - Green (use vylant-success) ----
    ("bg-emerald-500", "bg-emerald-500"),
    ("bg-emerald-600", "bg-emerald-600"),
    ("bg-emerald-400", "bg-emerald-400"),
    ("bg-emerald-50", "bg-emerald-50"),
    ("bg-emerald-100", "bg-emerald-100"),
    ("bg-emerald-200", "bg-emerald-200"),
    ("bg-emerald-700", "bg-emerald-700"),
    ("text-emerald-400", "text-emerald-400"),
    ("text-emerald-500", "text-emerald-500"),
    ("text-emerald-600", "text-emerald-600"),
    ("text-emerald-300", "text-emerald-300"),
    ("text-emerald-700", "text-emerald-700"),
    ("text-emerald-550", "text-emerald-550"),
    ("text-emerald-100", "text-emerald-100"),
    ("border-emerald-500", "border-emerald-500"),
    ("border-emerald-400", "border-emerald-400"),
    ("border-emerald-200", "border-emerald-200"),
    # ---- Danger - Red ----
    ("bg-red-500", "bg-red-500"),
    ("bg-red-600", "bg-red-600"),
    ("bg-red-50", "bg-red-50"),
    ("bg-red-100", "bg-red-100"),
    ("bg-red-200", "bg-red-200"),
    ("bg-red-400", "bg-red-400"),
    ("bg-red-100", "bg-red-100"),
    ("text-red-500", "text-red-500"),
    ("text-red-400", "text-red-400"),
    ("text-red-300", "text-red-300"),
    ("text-red-600", "text-red-600"),
    ("text-red-700", "text-red-700"),
    ("text-red-100", "text-red-100"),
    ("border-red-500", "border-red-500"),
    ("border-red-600", "border-red-600"),
    ("border-red-100", "border-red-100"),
    ("border-red-200", "border-red-200"),
    # ---- Secondary Purple ----
    ("bg-purple-500", "bg-purple-500"),
    ("bg-purple-600", "bg-purple-600"),
    ("bg-purple-50", "bg-purple-50"),
    ("bg-purple-100", "bg-purple-100"),
    ("bg-purple-400", "bg-purple-400"),
    ("bg-purple-100", "bg-purple-100"),
    ("text-purple-400", "text-purple-400"),
    ("text-purple-300", "text-purple-300"),
    ("text-purple-200", "text-purple-200"),
    ("text-purple-500", "text-purple-500"),
    ("text-purple-600", "text-purple-600"),
    ("text-purple-700", "text-purple-700"),
    ("text-purple-800", "text-purple-800"),
    ("text-purple-900", "text-purple-900"),
    ("border-purple-200", "border-purple-200"),
    ("border-purple-300", "border-purple-300"),
    ("border-purple-400", "border-purple-400"),
    ("border-purple-500", "border-purple-500"),
    ("bg-purple-600/25", "bg-purple-600/25"),
    ("hover:bg-purple-500", "hover:bg-purple-500"),
    # ---- Pink ----
    ("bg-pink-500", "bg-pink-500"),
    ("text-pink-400", "text-pink-400"),
    ("text-pink-300", "text-pink-300"),
    ("text-pink-100", "text-pink-100"),
    ("border-pink-500", "border-pink-500"),
    ("border-pink-500/20", "border-pink-500/20"),
    ("border-pink-500/30", "border-pink-500/30"),
    # ---- Cyan ----
    ("bg-cyan-500", "bg-cyan-500"),
    ("bg-cyan-600", "bg-cyan-600"),
    ("bg-cyan-300", "bg-cyan-300"),
    ("bg-cyan-400", "bg-cyan-400"),
    ("text-cyan-400", "text-cyan-400"),
    ("text-cyan-500", "text-cyan-500"),
    ("text-cyan-300", "text-cyan-300"),
    ("text-cyan-600", "text-cyan-600"),
    ("text-cyan-700", "text-cyan-700"),
    ("text-cyan-800", "text-cyan-800"),
    ("text-cyan-900", "text-cyan-900"),
    ("border-cyan-500", "border-cyan-500"),
    ("border-cyan-200", "border-cyan-200"),
    ("border-cyan-400", "border-cyan-400"),
    # ---- Indigo ----
    ("bg-indigo-500", "bg-indigo-500"),
    ("bg-indigo-600", "bg-indigo-600"),
    ("text-indigo-400", "text-indigo-400"),
    ("text-indigo-300", "text-indigo-300"),
    ("text-indigo-500", "text-indigo-500"),
    ("border-indigo-500", "border-indigo-500"),
    ("border-indigo-300", "border-indigo-300"),
    # ---- Rose ----
    ("bg-rose-500", "bg-rose-500"),
    ("bg-rose-50", "bg-rose-50"),
    ("text-rose-400", "text-rose-400"),
    ("text-rose-500", "text-rose-500"),
    ("text-rose-600", "text-rose-600"),
    ("text-rose-300", "text-rose-300"),
    ("text-rose-200", "text-rose-200"),
    ("border-rose-500", "border-rose-500"),
    ("border-rose-200", "border-rose-200"),
    # ---- Other ----
    ("bg-amber-50/10", "bg-amber-50/10"),
    ("bg-rose-500/10", "bg-rose-500/10"),
    ("bg-rose-500/20", "bg-rose-500/20"),
    ("bg-cyan-500/20", "bg-cyan-500/20"),
    ("bg-cyan-500/30", "bg-cyan-500/30"),
    ("bg-cyan-500/40", "bg-cyan-500/40"),
    ("bg-cyan-500/50", "bg-cyan-500/50"),
    ("bg-purple-500/10", "bg-purple-500/10"),
    ("bg-purple-500/20", "bg-purple-500/20"),
    ("bg-purple-600/20", "bg-purple-600/20"),
    ("bg-purple-600/25", "bg-purple-600/25"),
    ("bg-purple-600 hover:bg-purple-500", "bg-purple-600 hover:bg-purple-500"),
    ("text-purple-900", "text-purple-900"),
    ("text-purple-800", "text-purple-800"),
    ("border-purple-300", "border-purple-300"),
    ("border-purple-400", "border-purple-400"),
    ("bg-neutral-900", "bg-navy-900"),
    ("bg-neutral-200", "bg-navy-200"),
    ("bg-green-500", "bg-emerald-500"),
    ("text-green-500", "text-emerald-500"),
    ("border-green-500", "border-emerald-500"),
    ("bg-sky-500", "bg-sky-500"),
    ("bg-sky-50", "bg-sky-50"),
    ("bg-sky-500/10", "bg-sky-500/10"),
    ("text-sky-700", "text-sky-700"),
    ("text-sky-400", "text-sky-400"),
    ("border-sky-300", "border-sky-300"),
    ("border-sky-200", "border-sky-200"),
]

def replace_colors_in_file(filepath):
    """Replace colors in a single file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content
    total_replaced = 0

    for old, new in COLOR_MAP:
        count = content.count(old)
        if count > 0:
            content = content.replace(old, new)
            total_replaced += count

    # Fix remaining new color classes for consistency
    replacements = [
        # Additional one-off replacements
        ("bg-[#0a0a0a]", "bg-vylant-navy"),
        ("bg-[#1e1f22]", "bg-vylant-navy"),
        ("bg-[#151926]/70", "bg-vylant-navy/70"),
        ("bg-[#151926]/50", "bg-vylant-navy/50"),
        ("bg-[#151926]", "bg-vylant-navy"),
        ("bg-[#151926]/5", "bg-vylant-navy/5"),
        ("bg-[#151926]/10", "bg-vylant-navy/10"),
        ("bg-[#151926]/20", "bg-vylant-navy/20"),
        ("bg-[#151926]/30", "bg-vylant-navy/30"),
        ("bg-[#151926]/40", "bg-vylant-navy/40"),
        ("bg-[#1e1f22]", "bg-vylant-navy"),
        ("bg-[#12151e]/80", "bg-navy-900/80"),
        ("bg-gradient-to-r from-[#00d2ff] to-[#009ecb]", "bg-gradient-to-r from-vylant-blue to-vylant-blue-dark"),
        ("from-[#00d2ff]", "from-vylant-blue"),
        ("to-[#009ecb]", "to-vylant-blue-dark"),
        ("bg-gradient-to-tr from-cyan-400 to-blue-600", "bg-gradient-to-tr from-vylant-blue to-vylant-blue-dark"),
        ("tooltip", "tooltip"),
        ("tooltip::before", "tooltip::before"),
        # Neutral background overrides
        ("bg-black/20", "bg-navy-900/20"),
        ("bg-black/30", "bg-navy-900/30"),
        ("bg-black/40", "bg-navy-900/40"),
        ("bg-black/60", "bg-navy-900/60"),
        ("bg-black/80", "bg-navy-900/80"),
        ("bg-black/90", "bg-navy-900/90"),
        ("bg-transparent", "bg-transparent"),
        # Gradient replacements
        ("bg-gradient-to-tr from-cyan-400 to-blue-600", "bg-gradient-to-tr from-vylant-blue to-vylant-blue-dark"),
        ("bg-gradient-to-tr from-purple-900/30 to-indigo-900/20", "bg-gradient-to-tr from-vylant-navy/30 to-vylant-navy/20"),
        ("from-purple-600 to-indigo-600", "from-vylant-navy to-vylant-navy"),
        # Remove double spaces left by replacements
        ("  ", " "),
        # Clean up empty classes
        ('className=""', 'className="hidden"'),
    ]

    for old, new in replacements:
        count = content.count(old)
        if count > 0:
            content = content.replace(old, new)
            total_replaced += count

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return total_replaced
    return 0

def main():
    print("Vylant Design System Color Unification\n")
    print("=" * 60)
    print("Replacing conflicting colors with unified system")
    print("=" * 60)
    print()

    total_files = 0
    total_replacements = 0

    # Process App.tsx
    filepath = os.path.join(BASE, "src", "App.tsx")
    if os.path.exists(filepath):
        replacements = replace_colors_in_file(filepath)
        total_replacements += replacements
        total_files += 1
        print(f"✓ {filepath}: {replacements} replacements")

    # Process all components
    components_dir = os.path.join(BASE, "src", "components")
    if os.path.isdir(components_dir):
        for filename in sorted(os.listdir(components_dir)):
            if filename.endswith(".tsx"):
                filepath = os.path.join(components_dir, filename)
                replacements = replace_colors_in_file(filepath)
                total_replacements += replacements
                total_files += 1
                if replacements > 0:
                    print(f"✓ {filepath}: {replacements} replacements")

    # Process utility files
    other_files = [
        "src/main.tsx",
        "src/index.css",
        "src/utils/safeLink.ts",
        "src/components/ForwardMessageModal.tsx",
        "src/components/ScheduleMessageModal.tsx",
        "src/components/ScheduledMessagesManagerModal.tsx",
        "src/components/GifPicker.tsx",
        "src/components/BotStudioModal.tsx",
        "src/components/ServerBotsTab.tsx",
        "src/components/AttachMenuPopover.tsx",
        "src/components/CreatePollModal.tsx",
        "src/components/PollCard.tsx",
        "src/components/ChangePasswordModal.tsx",
    ]

    for filepath in other_files:
        full_path = os.path.join(BASE, filepath)
        if os.path.exists(full_path):
            replacements = replace_colors_in_file(full_path)
            total_replacements += replacements
            total_files += 1
            if replacements > 0:
                print(f"✓ {filepath}: {replacements} replacements")

    print()
    print("=" * 60)
    print(f"Complete! Processed {total_files} files, {total_replacements} total replacements")
    print("=" * 60)

if __name__ == "__main__":
    main()
