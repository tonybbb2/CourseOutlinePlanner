import requests
import json
import os

BASE_URL = "http://127.0.0.1:8000"
PDF_PATH = "plan.pdf"            # syllabus PDF
OUTPUT_PATH = "course_data.json"

def main():
    print("📄 Checking that the PDF exists...")
    if not os.path.exists(PDF_PATH):
        print(f"❌ PDF file not found at: {PDF_PATH}")
        return

    print(f"📤 Uploading {PDF_PATH} to {BASE_URL}/api/upload-syllabus ...")

    try:
        with open(PDF_PATH, "rb") as f:
            files = {"file": (os.path.basename(PDF_PATH), f, "application/pdf")}
            resp = requests.post(
                f"{BASE_URL}/api/upload-syllabus",
                files=files,
                timeout=300,   # plenty of time for OpenAI
            )

        print("✅ Response status:", resp.status_code)

        try:
            data = resp.json()
        except Exception as e:
            print("❌ Failed to parse JSON from response:", e)
            print("Raw response text (first 500 chars):")
            print(resp.text[:500])
            return

        with open(OUTPUT_PATH, "w", encoding="utf-8") as outfile:
            json.dump(data, outfile, indent=4, ensure_ascii=False)

        print(f"💾 Saved JSON output to: {OUTPUT_PATH}")
        print("📚 Course ID:", data.get("id"))

    except Exception as e:
        print("❌ Error during upload:", e)

if __name__ == "__main__":
    main()
