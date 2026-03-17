"""
Remove white backgrounds from portrait images
Convert white/near-white pixels to transparent
"""

from PIL import Image
import os

ASSET_DIRS = {
    'Skin': 'public/Portraits/Skin',
    'Hair': 'public/Portraits/Hair',
    'Beard': 'public/Portraits/Beard',
}

def remove_white_bg(img_path: str) -> bool:
    """Replace near-white pixels with transparency."""
    img = Image.open(img_path).convert('RGBA')
    
    # Get image data
    data = img.getdata()
    new_data = []
    
    WHITE_THRESHOLD = 230  # Pixels with RGB > 230 become transparent
    
    for r, g, b, a in data:
        # If nearly white, make transparent
        if r > WHITE_THRESHOLD and g > WHITE_THRESHOLD and b > WHITE_THRESHOLD:
            new_data.append((r, g, b, 0))  # Transparent
        else:
            new_data.append((r, g, b, a))  # Keep original
    
    img.putdata(new_data)
    img.save(img_path, 'PNG')
    return True

def process_folder(folder_name: str, folder_path: str) -> None:
    """Process all PNG files in folder."""
    print(f"\n{folder_name}:")
    
    if not os.path.exists(folder_path):
        print(f"  Folder not found!")
        return
    
    files = sorted([f for f in os.listdir(folder_path) if f.endswith('.png')])
    
    for filename in files:
        img_path = os.path.join(folder_path, filename)
        print(f"  {filename}...", end=' ')
        try:
            remove_white_bg(img_path)
            print("✓")
        except Exception as e:
            print(f"✗ ({e})")

def main():
    print("🎨 Removing white backgrounds...")
    print("=" * 60)
    
    for folder_name, folder_path in ASSET_DIRS.items():
        process_folder(folder_name, folder_path)
    
    print("\n" + "=" * 60)
    print("✅ Done! White backgrounds converted to transparent.")

if __name__ == '__main__':
    main()
