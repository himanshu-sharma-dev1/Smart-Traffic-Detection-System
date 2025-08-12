from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Navigate to the locally served frontend build
    page.goto("http://localhost:8080")

    # Wait for the main heading to be visible to ensure the page has loaded
    heading = page.get_by_role("heading", name="Navigate Smarter, Drive Safer.")
    expect(heading).to_be_visible(timeout=10000) # Increased timeout for initial load

    # Take a screenshot of the redesigned homepage
    page.screenshot(path="jules-scratch/verification/redesign_homepage.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
