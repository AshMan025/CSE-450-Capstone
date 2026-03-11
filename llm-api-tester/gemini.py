import sys
from google import genai

def check_key(api_key):
    try:
        client = genai.Client(api_key=api_key)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents="in a single word say which model are u?"
        )

        print("✅ VALID KEY (working)")
        print("Response:", response.text)

    except Exception as e:
        err = str(e)

        if "RESOURCE_EXHAUSTED" in err:
            print("⚠️ Key is VALID but quota exhausted / disabled")

        elif "UNAUTHENTICATED" in err:
            print("❌ INVALID API KEY")

        else:
            print("❌ Request failed")
            print(err)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python gemini.py API_KEY")
        sys.exit()

    check_key(sys.argv[1])