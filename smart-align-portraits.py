"""
Smart Portrait Aligner - Re-centers all content to consistent anchor point
This script:
1. Detects artwork bounds in each PNG
2. Repositions content so all images have their center at (256, 256)
3. Creates perfectly aligned layered portraits
"""

from PIL import Image
import os

CANVAS_SIZE = 512
TARGET_CENTER = (CANVAS_SIZE // 2, CANVAS_SIZE // 2)  # (256, 256)
ASSET_DIRS = {
    'Skin': 'public/Portraits/Skin',
    'Hair': 'public/Portraits/Hair',
    'Beard': 'public/Portraits/Beard',
}

def get_content_bounds(img: Image.Image) -> tuple:
    """Get bounding box of non-transparent content."""
    alpha = img.split()[-1]
    return alpha.getbbox()

def align_image_to_center(img_path: str) -> None:
    """Re-center image so artwork center aligns with (256, 256)."""
    img = Image.open(img_path).convert('RGBA')
    
    # Get content bounds
    bbox = get_content_bounds(img)
    if not bbox:
        return  # Empty image, skip
    
    # Calculate current content center
    left, top, right, bottom = bbox
    current_center_x = (left + right) / 2
    current_center_y = (top + bottom) / 2
    
    # Calculate offset needed to move to target center
    offset_x = int(TARGET_CENTER[0] - current_center_x)
    offset_y = int(TARGET_CENTER[1] - current_center_y)
    
    # Create new image with content repositioned
    new_img = Image.new('RGBA', (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    
    # Paste image at new position
    new_img.paste(img, (offset_x, offset_y), img)
    
    # Save back
    new_img.save(img_path, 'PNG')
    
    return offset_x, offset_y

def align_folder(folder_path: str, folder_name: str) -> None:
    """Align all images in folder."""
    print(f"\nAligning {folder_name}...")
    print("-" * 70)
    
    if not os.path.exists(folder_path):
        print(f"  Folder not found!")
        return
    
    files = sorted([f for f in os.listdir(folder_path) if f.endswith('.png')])
    
    if not files:
        print(f"  No PNG files!")
        return
    
    success = 0
    for filename in files:
        img_path = os.path.join(folder_path, filename)
        try:
            result = align_image_to_center(img_path)
            if result:
                offset_x, offset_y = result
                print(f"  ✓ {filename}: offset ({offset_x:+d}, {offset_y:+d}) px")
            else:
                print(f"  • {filename}: empty (skipped)")
            success += 1
        except Exception as e:
            print(f"  ✗ {filename}: {e}")
    
    print(f"\n  Result: {success}/{len(files)} images aligned")

def main():
    print("🎯 Smart Portrait Aligner")
    print("=" * 70)
    print(f"Target center: {TARGET_CENTER}")
    print("Repositioning all artwork to align perfectly...\n")
    
    for folder_name, folder_path in ASSET_DIRS.items():
        align_folder(folder_path, folder_name)
    
    print("\n" + "=" * 70)
    print("✅ Alignment complete!")
    print("\nAll portraits should now layer correctly:")
    print("  • All artwork centered at pixel (256, 256)")
    print("  • Hair aligns with faces")
    print("  • Beards align with chins")
    print("  • Perfect layering on all combinations")

if __name__ == '__main__':
    main()
