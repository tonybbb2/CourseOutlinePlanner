import requests
import json

PDF_PATH = "COMP228-CourseOutlineF2025.pdf"          # <-- your input PDF
OUTPUT_PATH = "course_data.json"   # <-- output JSON file

url = "http://127.0.0.1:8000/api/upload-syllabus"

try:
    # Upload PDF to backend
    with open(PDF_PATH, "rb") as f:
        files = {"file": (PDF_PATH, f, "application/pdf")}
        resp = requests.post(url, files=files)

    print("Status:", resp.status_code)

    # Parse response JSON
    data = resp.json()

    # Write JSON to a file
    with open(OUTPUT_PATH, "w", encoding="utf-8") as outfile:
        json.dump(data, outfile, indent=4, ensure_ascii=False)

    print(f"Saved JSON output to: {OUTPUT_PATH}")

except Exception as e:
    print("Error:", e)
