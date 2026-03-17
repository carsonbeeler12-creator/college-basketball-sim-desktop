"""
Center each portrait image by its own content bounds.
Each image's content gets repositioned to center at (256, 256).
"""

from PIL import Image
import os

CANVAS_SIZE = 512
TARGET_CENTER = CANVAS_SIZE // 2  # 256

ASSET_DIRS = {
    'Skin': 'public/Portraits/Skin',
    'Hair': 'public/Portraits/Hair',
    'Beard': 'public/Portraits/Beard',
}

def get_content_bounds(img: Image.Image) -> tuple:
    """Get bounding box of non-transparent content."""
    alpha = img.split()[-1]
    return alpha.getbbox()

def center_image_content(img_path: str) -> bool:
    """
    Center an image's content at (256, 256).
    - Detects content bounds
    - Repositions so content center = (256, 256)
    - Preserves content within canvas
    """
    img = Image.open(img_path).convert('RGBA')
    
    bbox = get_content_bounds(img)
    if not bbox:
        return False  # Empty image
    
    left, top, right, bottom = bbox
    
    # Current content center
    content_w = right - left
    content_h = bottom - top
    content_cx = left + content_w / 2
    content_cy = top + content_h / 2
    
    # Calculate offset to move content center to target
    offset_x = int(TARGET_CENTER - content_cx)
    offset_y = int(TARGET_CENTER - content_cy)
    
    # Check if repositioning would clip content
    new_left = left + offset_x
    new_right = right + offset_x
    new_top = top + offset_y
    new_bottom = bottom + offset_y
    
    # Clamp offsets to keep all content within bounds
    if new_left < 0:
        offset_x -= new_left
    if new_right > CANVAS_SIZE:
        offset_x -= (new_right - CANVAS_SIZE)
    if new_top < 0:
        offset_y -= new_top
    if new_bottom > CANVAS_SIZE:
        offset_y -= (new_bottom - CANVAS_SIZE)
    
    # Create new image with repositioned content
    new_img = Image.new('RGBA', (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    new_img.paste(img, (offset_x, offset_y), img)
    
    new_img.save(img_path, 'PNG')
    
    return (offset_x, offset_y)

def process_folder(folder_name: str, folder_path: str) -> None:
    """Process all images in folder."""
    print(f"\n{folder_name}:")
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
        result = center_image_content(img_path)
        
        if result:
            offset_x, offset_y = result
            print(f"  {filename}: centered at (256, 256), offset ({offset_x:+d}, {offset_y:+d})")
            success += 1
        else:
            print(f"  {filename}: EMPTY (skipped)")
    
    print(f"\n  Result: {success}/{len(files)} images centered")

def main():
    print("🎯 Portrait Content Centering")
    print("=" * 70)
    print(f"Target center: ({TARGET_CENTER}, {TARGET_CENTER})")
    print("Centering each image's content individually...\n")
    
    for folder_name, folder_path in ASSET_DIRS.items():
        process_folder(folder_name, folder_path)
    
    print("\n" + "=" * 70)
    print("✅ Centering complete!")
    print("\nEach layer type now has content centered at (256, 256):")
    print("  • All faces centered at same point")
    print("  • All hair centered at same point")
    print("  • All beards centered at same point")
    print("  • Layering should now align correctly")

if __name__ == '__main__':
    main()
