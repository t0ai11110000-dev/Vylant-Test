#!/usr/bin/env python3
"""
Vylant - Unified Color System Replacer
Replaces all conflicting Tailwind color classes with a single unified design system.
"""
import os
import re
import sys

BASE = "/Users/t0ai/Downloads/Vylant-main"

def apply_replacements(content, replacements):
    """Apply a list of (old, new) replacements to content."""
    total = 0
    for old, new in replacements:
        count = content.count(old)
        if count > 0:
            content = content.replace(old, new)
            total += count
    return content, total

def replace_colors_in_file(filepath):
    """Read a file, replace colors, write back. Returns count of replacements."""

    # Fix hex background overrides
    content = content.replace("bg-[#151926]", "bg-vylant-navy")
    content = content.replace("bg-[#151926]/50", "bg-vylant-navy/50")
    content = content.replace("bg-[#151926]/20", "bg-vylant-navy/20")
    content = content.replace("bg-[#151926]/30", "bg-vylant-navy/30")
    content = content.replace("bg-[#151926]/40", "bg-vylant-navy/40")
    content = content.replace("bg-[#0a0a0a]", "bg-vylant-navy")
    content = content.replace("bg-[#1e1f22]", "bg-vylant-navy")

    # Also fix for gradient definitions
    content = content.replace("from-[#00d2ff]", "from-vylant-blue")
    content = content.replace("to-[#009ecb]", "to-vylant-blue-dark")
    content = content.replace("bg-gradient-to-tr from-cyan-400 to-blue-600",
                              "bg-gradient-to-tr from-vylant-blue to-vylant-blue-dark")

    # Replace hex values with design system classes
    content = content.replace("bg-[#12151e]/80", "bg-navy-900/80")

    # Apply the color map
    total = 0
    for old, new in COLOR_MAP:
        count = content.count(old)
        if count > 0:
            content = content.replace(old, new)
            total += count

    if total > 0:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
    return total


def main():
    print("Vylant - Unified Color System Replacer\n")
    print("=" * 60)
    print("Replacing conflicting Tailwind colors with unified design system")
    print("=" * 60)
    print()

    total_files = 0
    total_replacements = 0

    # List of files to process
    files = [
        "src/App.tsx",
        "src/main.tsx",
        "src/components/ServerMarketplaceView.tsx",
        "src/components/BotStudioModal.tsx",
        "src/components/BotAnalyticsView.tsx",
        "src/components/BotProfileModal.tsx",
        "src/components/InstallAppModal.tsx",
        "src/components/LoginPage.tsx",
        "src/components/SignUpPage.tsx",
        "src/components/LandingPage.tsx",
        "src/components/ChangePasswordModal.tsx",
        "src/components/EmailVerificationPage.tsx",
        "src/components/ServerDiscovery.tsx",
        "src/utils/downloadHelpers.ts",
    ]

    for filepath in files:
        full_path = os.path.join(BASE, filepath)
        if os.path.exists(full_path):
            replacements = replace_colors_in_file(full_path)
            total_replacements += replacements
            total_files += 1
            if replacements > 0:
                print(f"  ✓ {filepath}: {replacements} replacements")

    # Also process all component files dynamically
    components_dir = os.path.join(BASE, "src", "components")
    if os.path.isdir(components_dir):
        for filename in sorted(os.listdir(components_dir)):
            if filename.endswith(".tsx"):
                filepath = os.path.join(components_dir, filename)
                replacements = replace_colors_in_file(filepath)
                total_replacements += replacements
                total_files += 1
                if replacements > 0:
                    print(f"  ✓ {filename}: {replacements} replacements")

    # Remove backup files
    for backup_file in os.listdir(BASE):
        if backup_file.endswith(".bak"):
            os.remove(os.path.join(BASE, backup_file))
            print(f"  ✗ Removed backup: {backup_file}")

    print()
    print("=" * 60)
    print(f"Complete! Processed {total_files} files, {total_replacements} total replacements")
    print("=" * 60)


if __name__ == "__main__":
    main()
