import requests

BASE_URL = "http://localhost:8000"

def run_smoke_test():
    print("Starting Dashboard Smoke Test (Expecting 401 Unauthorized)...")
    
    endpoints = [
        "/api/v1/dashboard/stats",
        "/api/v1/dashboard/activity",
        "/api/v1/dashboard/summary"
    ]
    
    headers = {"Authorization": "Bearer invalid_token"}
    
    all_passed = True
    
    for endpoint in endpoints:
        print(f"Testing {endpoint}...")
        try:
            resp = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
            if resp.status_code == 401:
                print(f"   PASS: Got 401 (Protected endpoint exists)")
            elif resp.status_code == 404:
                print(f"   FAIL: Got 404 (Endpoint not found)")
                all_passed = False
            else:
                print(f"   WARN: Got {resp.status_code} (Unexpected status)")
                # 200 would be weird with invalid token
                if resp.status_code == 200:
                    print("   FAIL: Endpoint is not protected!")
                    all_passed = False
        except Exception as e:
            print(f"   Error: {e}")
            all_passed = False

    if all_passed:
        print("\nSmoke Test PASSED: All endpoints registered and protected.")
    else:
        print("\nSmoke Test FAILED.")

if __name__ == "__main__":
    try:
        run_smoke_test()
    except ImportError:
        print("Please install requests: pip install requests")
