import sys
from google import genai
from PIL import Image

def check_key(api_key):
    try:
        client = genai.Client(api_key=api_key)

        # load image from same directory
        image = Image.open("1.png")

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                "Evaluate this image and describe what you see.",
                image
            ]
        )

        print("✅ VALID KEY (working)")
        print("Response:")
        print(response.text)

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