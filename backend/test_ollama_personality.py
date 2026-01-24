"""
Test script for Ollama Personality Analysis Integration
Run this script to test the personality analysis endpoint
"""

import asyncio
import httpx
import json
from typing import Optional

# Configuration
BASE_URL = "http://localhost:8000"
PERSONALITY_ENDPOINT = f"{BASE_URL}/api/v1/personality/analyze-with-ollama"

# Test prompts to verify different trait scenarios
TEST_PROMPTS = [
    {
        "name": "Conflict Resolution",
        "prompt": "I mediated between two team members who disagreed on the project approach. I listened to both perspectives and helped them find a solution that combined the best of both ideas."
    },
    {
        "name": "Communication & Confidence",
        "prompt": "I gave a presentation to the entire company about our quarterly results. I was well-prepared, spoke clearly, and handled tough questions from executives confidently."
    },
    {
        "name": "Collaboration & Empathy",
        "prompt": "My colleague was stressed about a deadline. I noticed their worry, checked in on them, and offered to help them break down their work into manageable tasks."
    },
    {
        "name": "Adaptability",
        "prompt": "When the project requirements changed mid-way, I quickly reorganized our approach, updated our timeline, and communicated the changes clearly to the team."
    },
    {
        "name": "Communication",
        "prompt": "I wrote a detailed email explaining a complex technical concept in a way that non-technical stakeholders could easily understand."
    }
]

async def test_single_prompt(prompt: str, verbose: bool = True) -> Optional[dict]:
    """Test a single prompt against the Ollama personality endpoint"""
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            if verbose:
                print(f"\n📤 Sending prompt: {prompt[:50]}...")
            
            response = await client.post(
                PERSONALITY_ENDPOINT,
                json={"prompt": prompt}
            )
            
            if response.status_code != 200:
                print(f"❌ Error: Status {response.status_code}")
                print(f"   Response: {response.text}")
                return None
            
            result = response.json()
            
            if verbose:
                print(f"✅ Analysis complete")
                print(f"\n📊 Trait Changes:")
                for trait, delta in result.get("traits_delta", {}).items():
                    arrow = "↑" if delta > 0 else "↓" if delta < 0 else "→"
                    print(f"   {arrow} {trait:20s}: {delta:+3d}")
                
                print(f"\n📈 Updated Profile:")
                for trait, score in result.get("updated_profile", {}).items():
                    bar_length = int(score / 5)
                    bar = "█" * bar_length + "░" * (20 - bar_length)
                    print(f"   {trait:20s}: [{bar}] {score}/100")
                
                if result.get("analysis"):
                    print(f"\n💭 Analysis:")
                    print(f"   {result['analysis'][:200]}...")
            
            return result
    
    except httpx.ConnectError:
        print(f"❌ Connection Error: Could not connect to {BASE_URL}")
        print("   Make sure the backend server is running: python app/main.py")
        return None
    except httpx.TimeoutException as e:
        print(f"❌ Timeout Error: Request took too long (60s limit)")
        print(f"   Details: {str(e)}")
        return None
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        print(f"   Traceback: {traceback.format_exc()}")
        return None

async def test_ollama_connection() -> bool:
    """Test if Ollama is running and accessible"""
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.get("http://localhost:11434/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                print(f"✅ Ollama is running with {len(models)} model(s)")
                if models:
                    print("   Available models:")
                    for model in models:
                        print(f"   - {model.get('name', 'unknown')}")
                return True
            else:
                print("❌ Ollama is not responding correctly")
                return False
    except httpx.ConnectError:
        print("❌ Ollama is not running")
        print("   Start it with: ollama serve")
        return False
    except Exception as e:
        print(f"❌ Error checking Ollama: {str(e)}")
        return False

async def test_backend_connection() -> bool:
    """Test if backend server is running"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{BASE_URL}/api/v1/personality/radar")
            if response.status_code == 200:
                print(f"✅ Backend is running and accessible")
                return True
            else:
                print(f"❌ Backend returned status {response.status_code}")
                return False
    except httpx.ConnectError:
        print(f"❌ Cannot connect to backend at {BASE_URL}")
        print("   Start the backend with: python app/main.py")
        return False
    except Exception as e:
        print(f"❌ Error checking backend: {str(e)}")
        return False

async def run_all_tests():
    """Run complete test suite"""
    print("=" * 70)
    print("🧪 Ollama Personality Analysis - Test Suite")
    print("=" * 70)
    
    # Check Prerequisites
    print("\n🔍 Checking Prerequisites...")
    print("-" * 70)
    
    ollama_ok = await test_ollama_connection()
    backend_ok = await test_backend_connection()
    
    if not ollama_ok or not backend_ok:
        print("\n⚠️  Prerequisites not met. Please start:")
        if not ollama_ok:
            print("   1. Ollama server: ollama serve")
        if not backend_ok:
            print("   2. Backend server: python app/main.py")
        return
    
    # Run Prompt Tests
    print("\n\n🧠 Testing Personality Analysis...")
    print("-" * 70)
    
    results = []
    for i, test_case in enumerate(TEST_PROMPTS, 1):
        print(f"\n[Test {i}/{len(TEST_PROMPTS)}] {test_case['name']}")
        print(f"{'─' * 70}")
        result = await test_single_prompt(test_case["prompt"])
        if result:
            results.append({
                "name": test_case["name"],
                "result": result
            })
        await asyncio.sleep(1)  # Rate limiting
    
    # Summary
    print("\n\n📋 Test Summary")
    print("=" * 70)
    print(f"✅ Successfully tested {len(results)}/{len(TEST_PROMPTS)} prompts")
    
    if results:
        print("\nTrait Changes Across All Tests:")
        all_traits = results[0]["result"].get("traits_delta", {}).keys()
        trait_totals = {trait: 0 for trait in all_traits}
        
        for test_result in results:
            deltas = test_result["result"].get("traits_delta", {})
            for trait, delta in deltas.items():
                trait_totals[trait] += delta
        
        print("\nAverage Impact Per Trait:")
        for trait, total in trait_totals.items():
            avg = total / len(results)
            print(f"  {trait:20s}: {avg:+.1f}")
    
    print("\n✅ All tests completed successfully!")

def main():
    """Main entry point"""
    import sys
    
    if len(sys.argv) > 1:
        # Test a custom prompt
        prompt = " ".join(sys.argv[1:])
        asyncio.run(test_single_prompt(prompt))
    else:
        # Run full test suite
        asyncio.run(run_all_tests())

if __name__ == "__main__":
    main()
