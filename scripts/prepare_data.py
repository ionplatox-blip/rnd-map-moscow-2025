import json
import glob
import os
import re

# Paths
CENTERS_DIR = "app/public/data/centers"

OUTPUT_METADATA = "projects_metadata.jsonl"
OUTPUT_SEARCH_TEXT = "projects_search_text.jsonl"

def normalize_text(text):
    if not text:
        return ""
    # Remove excessive whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def main():
    print(f"Scanning {CENTERS_DIR}...")
    files = glob.glob(os.path.join(CENTERS_DIR, "*.json"))
    print(f"Found {len(files)} center files.")

    metadata_file = open(OUTPUT_METADATA, "w", encoding="utf-8")
    search_text_file = open(OUTPUT_SEARCH_TEXT, "w", encoding="utf-8")
    search_index = {}

    project_count = 0
    
    for filepath in files:
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                center_data = json.load(f)
            
            center_id = center_data.get("ogrn", "")
            center_name = normalize_text(center_data.get("name", ""))
            
            projects = center_data.get("projects", [])
            rids = center_data.get("rids", [])
            
            # Store in search index for accurate frontend counts
            search_index[center_id] = {
                "projects": [normalize_text(p.get("name", "")) + " " + normalize_text(p.get("abstract", "")) for p in projects],
                "rids": [normalize_text(r.get("name", "")) + " " + normalize_text(r.get("abstract", "")) for r in rids]
            }

            for proj in projects:
                # ... same as before
                reg_number = proj.get("registration_number", "")
                if not reg_number:
                    continue
                
                title = normalize_text(proj.get("name", ""))
                abstract = normalize_text(proj.get("abstract", ""))
                keywords = proj.get("keywords", [])
                keywords_str = ", ".join(keywords) if keywords else ""
                year = proj.get("stage_end_date", "")[:4] if proj.get("stage_end_date") else ""
                
                search_text = f"{title}. {keywords_str}. {abstract}"
                
                metadata = {
                    "project_id": reg_number,
                    "center_id": center_id,
                    "center_name": center_name,
                    "title": title,
                    "year": year,
                }
                
                metadata_file.write(json.dumps(metadata, ensure_ascii=False) + "\n")
                search_text_file.write(json.dumps({
                    "project_id": reg_number,
                    "search_text": search_text
                }, ensure_ascii=False) + "\n")
                
                project_count += 1
                
        except Exception as e:
            print(f"Error processing {filepath}: {e}")

    metadata_file.close()
    search_text_file.close()
    
    # Write the search index for frontend
    with open("app/public/data/search_index.json", "w", encoding="utf-8") as f:
        json.dump(search_index, f, ensure_ascii=False)
        
    print(f"Done. Processed {project_count} projects. Search index saved.")


if __name__ == "__main__":
    main()
