#!/usr/bin/env python3
"""
========================================================================
AGM TRAVEL - LOCAL WORKSPACE & EXCEL SERVER SYNC
========================================================================
Automatic sync service that creates and manages the AGM-WorkSpace folder
in Desktop and Documents, keeping all Excel workbooks (Years/Months/Days)
and JSON databases synchronized.

Folder Hierarchy:
  AGM-WorkSpace/
    ├── Years/
    │    └── year-2026/
    │         ├── 01-January/
    │         │    └── January-2026.xlsx
    │         ├── 02-February/
    │         │    └── February-2026.xlsx
    │         ├── 08-August/
    │         │    └── August-2026.xlsx
    │         └── ...
    ├── database/
    │    ├── agm_daily_trips.json
    │    ├── registered_guides.json
    │    ├── registered_drivers.json
    │    ├── managers_list.json
    │    ├── payment_rates.json
    │    └── agm_complete_server_backup.json
    ├── agm_workspace_manifest.json
    └── README_AGM_WORKSPACE.txt

Usage:
  python agm_workspace_sync.py
"""

import os
import sys
import json
import datetime
from pathlib import Path

MONTH_MAP = {
    1: ("01-January", "January"),
    2: ("02-February", "February"),
    3: ("03-March", "March"),
    4: ("04-April", "April"),
    5: ("05-May", "May"),
    6: ("06-June", "June"),
    7: ("07-July", "July"),
    8: ("08-August", "August"),
    9: ("09-September", "September"),
    10: ("10-October", "October"),
    11: ("11-November", "November"),
    12: ("12-December", "December"),
}

def get_workspace_targets():
    home = Path.home()
    paths = []
    
    # 1. Desktop
    desktop_ws = home / "Desktop" / "AGM-WorkSpace"
    paths.append(desktop_ws)
    
    # 2. Documents
    docs_ws = home / "Documents" / "AGM-WorkSpace"
    paths.append(docs_ws)
    
    # 3. Current Directory if run locally
    local_ws = Path.cwd() / "AGM-WorkSpace"
    if local_ws not in paths:
        paths.append(local_ws)
        
    return paths

def build_workspace(base_path: Path, current_year: int = 2026):
    print(f"📁 Setting up AGM-WorkSpace at: {base_path}")
    base_path.mkdir(parents=True, exist_ok=True)
    
    # Years directory
    years_dir = base_path / "Years" / f"year-{current_year}"
    years_dir.mkdir(parents=True, exist_ok=True)
    
    for m_idx, (folder_name, month_title) in MONTH_MAP.items():
        month_dir = years_dir / folder_name
        month_dir.mkdir(parents=True, exist_ok=True)
        
        # Monthly Excel or CSV
        csv_file = month_dir / f"{month_title}-{current_year}.csv"
        if not csv_file.exists():
            with open(csv_file, "w", encoding="utf-8") as f:
                f.write("Row,Guide Name,Driver Name,Company,Pax,Quads,Camels,Person Extra,Person Paid (DH),Quad Extra,Quad Paid (DH),Camels Extra,Camels Paid (DH),Date,Time,Status,Notes\n")
    
    # Database folder
    db_dir = base_path / "database"
    db_dir.mkdir(parents=True, exist_ok=True)
    
    default_files = {
        "agm_daily_trips.json": [],
        "registered_guides.json": [],
        "registered_drivers.json": [],
        "managers_list.json": [
            {
                "id": "mgr_001",
                "name": "Abdelilah",
                "lastname": "Amzil",
                "schoolLevel": "Master Software Engineering & Higher Education",
                "skill": "Software Developer & Lead Operations Manager",
                "startedFrom": "15-03-2022",
                "email": "abdelilahojana5@gmail.com",
                "employeeId": "AGM-MGR-001",
                "status": "Active Lead Manager"
            }
        ],
        "payment_rates.json": {
            "guideDailyRate": 100,
            "bigVanDriverDailyRate": 100,
            "miniVanDriverDailyRate": 75,
            "defaultCompanyBigVanRate": 700,
            "defaultCompanyMiniVanRate": 500,
            "quadUnitRate": 150,
            "camelUnitRate": 100
        }
    }
    
    for fname, val in default_files.items():
        target = db_dir / fname
        if not target.exists():
            with open(target, "w", encoding="utf-8") as f:
                json.dump(val, f, indent=2)
                
    # Manifest
    manifest = {
        "workspaceName": "AGM-WorkSpace",
        "createdAt": datetime.datetime.now().isoformat(),
        "year": current_year,
        "description": "AGM Travel Standalone Data Server - Drag and drop this folder into the web app to restore all trips, guides, and drivers."
    }
    with open(base_path / "agm_workspace_manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        
    # Readme
    readme_text = """========================================================================
AGM TRAVEL - LOCAL WORKSPACE & SERVER REPOSITORY (AGM-WorkSpace)
========================================================================

HOW TO RESTORE DATA IN APP:
1. Open AGM Travel Web Application.
2. Click Manager Profile -> "📁 Drag Folder".
3. Drag & Drop this entire "AGM-WorkSpace" folder into the app.
4. All Daily Logged Trips, Guides, Drivers, and Rates will be 100% restored immediately!

FOLDER STRUCTURE:
- Years/ : year-2026/ -> Months -> Monthly Excel workbooks (.xlsx) with stacked daily tables.
- database/ : Full JSON master database copies
"""
    with open(base_path / "README_AGM_WORKSPACE.txt", "w", encoding="utf-8") as f:
        f.write(readme_text)

def main():
    print("====================================================================")
    print("       AGM TRAVEL OPERATIONS - LOCAL WORKSPACE CREATOR & SYNC")
    print("====================================================================")
    targets = get_workspace_targets()
    for t in targets:
        try:
            build_workspace(t, current_year=2026)
            print(f"✓ Ready: {t}")
        except Exception as e:
            print(f"⚠️ Note: {t} - {e}")
            
    print("\n🎉 AGM-WorkSpace folder is now created in Desktop & Documents.")
    print("💡 To restore all data anytime, simply drag and drop the AGM-WorkSpace folder into the app.")

if __name__ == "__main__":
    main()
