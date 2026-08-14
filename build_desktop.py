import subprocess
import sys
import os

def build():
    print("=== AGM Travel - CustomTkinter Desktop App Builder ===")
    print("This script compiles 'style.py' and 'backPro.py' into a standalone native executable using PyInstaller.")
    
    # Check/install pyinstaller and dependencies
    dependencies = ["pyinstaller", "customtkinter", "openpyxl"]
    print("Checking/installing required packaging tools...")
    
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", *dependencies])
        print("All packaging dependencies are successfully verified.")
    except Exception as e:
        print(f"Notice: Could not automatically run pip. Please ensure you have customtkinter, openpyxl, and pyinstaller installed. ({e})")

    # Construct PyInstaller build arguments
    # --onefile: Bundles all code and dependencies into a single file
    # --noconsole: Suppresses the background terminal window when launched
    # --name: Name of the output executable
    cmd = [
        "pyinstaller",
        "--onefile",
        "--noconsole",
        "--name=AGMTravelManager",
        "style.py"
    ]
    
    print(f"Running build command: {' '.join(cmd)}")
    try:
        subprocess.check_call(cmd)
        print("\n=======================================================")
        print("🎉 SUCCESS! Standalone desktop app compiled successfully!")
        print("Your native application is located at:")
        print("👉 ./dist/AGMTravelManager (or AGMTravelManager.exe on Windows)")
        print("=======================================================")
    except Exception as e:
        print(f"\n❌ Compilation failed: {e}")
        print("Please ensure pyinstaller is in your PATH and Python is configured properly.")

if __name__ == "__main__":
    build()
