from PIL import Image
import os

def check_dimensions(folder_path, folder_name):
    """Check dimensions of all PNG files in a folder."""
    print(f"\n{folder_name}:")
    print("-" * 50)
    
    if not os.path.exists(folder_path):
        print(f"  Folder not found: {folder_path}")
        return
    
    files = sorted([f for f in os.listdir(folder_path) if f.endswith('.png')])
    
    if not files:
        print(f"  No PNG files found")
        return
    
    dimensions = {}
    for filename in files:
        try:
            img_path = os.path.join(folder_path, filename)
            with Image.open(img_path) as img:
                size = img.size
                dimensions.setdefault(size, []).append(filename)
                print(f"  {filename}: {size[0]}x{size[1]}")
        except Exception as e:
            print(f"  {filename}: ERROR - {e}")
    
    print(f"\n  Summary for {folder_name}:")
    for size, files_list in sorted(dimensions.items()):
        print(f"    {size[0]}x{size[1]}: {len(files_list)} file(s)")

# Check all three portrait folders
check_dimensions("public/Portraits/Skin", "Skin Tones")
check_dimensions("public/Portraits/Hair", "Hairstyles")
check_dimensions("public/Portraits/Beard", "Beards")
