#!/usr/bin/env python3
import os
import sys
import argparse
from pygments import highlight
from pygments.lexers import get_lexer_for_filename, get_lexer_by_name
from pygments.formatters import ImageFormatter

def generate_code_image(input_file, output_path, theme="monokai", font_size=16):
    if not os.path.exists(input_file):
        print(f"Error: Input file '{input_file}' not found.")
        sys.exit(1)
        
    with open(input_file, "r", encoding="utf-8") as f:
        code_content = f.read()
        
    try:
        lexer = get_lexer_for_filename(input_file)
    except Exception:
        # Fallback to plain text if language not recognized
        lexer = get_lexer_by_name("text")
        
    print(f"Using lexer: {lexer.name} for {input_file}")
    
    # Find standard monospace fonts on different platforms
    import platform
    font_name = "Courier New"
    if platform.system() == "Darwin": # macOS
        font_name = "Menlo"
    elif platform.system() == "Windows":
        font_name = "Consolas"
    else: # Linux/other
        font_name = "DejaVu Sans Mono"

    # Configure style and formatting (uses Pillow internally)
    formatter = ImageFormatter(
        font_name=font_name,
        font_size=font_size,
        style=theme,
        line_numbers=True,
        line_pad=6
    )
    
    print(f"Rendering code to {output_path} using theme '{theme}'...")
    image_data = highlight(code_content, lexer, formatter)
    
    # Save output image
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "wb") as f:
        f.write(image_data)
        
    print(f"✅ Success! Saved highlighted code image to {output_path} ({len(image_data)} bytes)")

def main():
    parser = argparse.ArgumentParser(description="Convert source code files to highlighted PNG images (like Carbon)")
    parser.add_argument("input", help="Source code file path")
    parser.add_argument("-o", "--output", required=True, help="Output PNG file path")
    parser.add_argument("-t", "--theme", default="monokai", help="Pygments color theme (monokai, dracula, colorful, solarized-dark)")
    parser.add_argument("-f", "--font-size", type=int, default=16, help="Font size in pt")
    args = parser.parse_args()
    
    generate_code_image(args.input, args.output, args.theme, args.font_size)

if __name__ == "__main__":
    main()
