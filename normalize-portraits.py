"""
Normalize all portrait assets to consistent dimensions with centered content.
This script:
1. Ensures all images are exactly CANVAS_SIZE x CANVAS_SIZE
2. Centers content (resize content and pad with transparent background)
3. Saves normalized versions
"""

from PIL import Image
import os
import sys

# Configuration
CANVAS_SIZE = 512  # All images will be 512x512
ASSET_DIRS = {
    'Skin': 'public/Portraits/Skin',
    'Hair': 'public/Portraits/Hair',
    'Beard': 'public/Portraits/Beard',
}

def normalize_image(img_path: str, output_path: str, canvas_size: int = CANVAS_SIZE) -> None:
    """Normalize a single image to canvas_size x canvas_size with centered content."""
    try:
        # Open image and convert to RGBA (preserve transparency)
        img = Image.open(img_path).convert('RGBA')
        
        # Get current dimensions
        current_width, current_height = img.size
        
        # If already correct size, just save
        if current_width == canvas_size and current_height == canvas_size:
            img.save(output_path, 'PNG')
            return True
        
        # Calculate dimensions to fit within canvas while maintaining aspect ratio
        img.thumbnail((canvas_size, canvas_size), Image.Resampling.LANCZOS)
        
        # Create transparent canvas
        canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
        
        # Paste resized image centered on canvas
        new_w, new_h = img.size
        offset_x = (canvas_size - new_w) // 2
        offset_y = (canvas_size - new_h) // 2
        canvas.paste(img, (offset_x, offset_y), img)
        
        # Save normalized image
        canvas.save(output_path, 'PNG')
        return True
        
    except Exception as e:
        print(f"  ERROR: {e}")
        return False

def normalize_folder(folder_name: str, folder_path: str) -> None:
    """Normalize all PNG files in a folder."""
    print(f"\nProcessing {folder_name}...")
    print("-" * 60)
    
    if not os.path.exists(folder_path):
        print(f"  Folder not found: {folder_path}")
        return
    
    files = sorted([f for f in os.listdir(folder_path) if f.endswith('.png')])
    
    if not files:
        print(f"  No PNG files found")
        return
    
    success_count = 0
    for filename in files:
        img_path = os.path.join(folder_path, filename)
        print(f"  {filename}...", end=' ')
        
        if normalize_image(img_path, img_path):
            success_count += 1
            print("✓")
        else:
            print("✗")
    
    print(f"\n  Summary: {success_count}/{len(files)} images normalized")

def main():
    print(f"🎨 Portrait Asset Normalizer")
    print(f"Target canvas size: {CANVAS_SIZE}x{CANVAS_SIZE}px")
    print("=" * 60)
    
    for folder_name, folder_path in ASSET_DIRS.items():
        normalize_folder(folder_name, folder_path)
    
    print("\n" + "=" * 60)
    print("✓ Normalization complete!")
    print("\nAll images are now:")
    print(f"  • {CANVAS_SIZE}x{CANVAS_SIZE}px canvas")
    print("  • Content centered and scaled to fit")
    print("  • PNG with transparency preserved")

if __name__ == '__main__':
    main()
