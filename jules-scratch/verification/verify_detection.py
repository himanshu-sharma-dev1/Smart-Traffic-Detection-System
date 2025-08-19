import re
from playwright.sync_api import sync_playwright, expect

def run(playwright):
    def handle_console(msg):
        print(f"Browser Console: {msg.text}")

    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Listen for console events
    page.on("console", handle_console)

    # Go to the application and disable the welcome modal before proceeding
    page.goto("http://localhost:3000/")
    page.evaluate("localStorage.setItem('hasVisited', 'true')")
    page.reload()

    # Navigate to the detection page
    page.get_by_role("link", name="Detection", exact=True).click()
    expect(page).to_have_url(re.compile(".*detect"))

    # Upload an image
    # The button is not directly an input, it triggers a hidden input.
    # We need to listen for the file chooser event that is triggered by the button click.
    with page.expect_file_chooser() as fc_info:
        page.get_by_role("button", name=re.compile("Upload Image", re.IGNORECASE)).click()
    file_chooser = fc_info.value
    file_chooser.set_files("frontend/public/speedlimit60.png")

    # Wait for navigation to the results page
    expect(page).to_have_url(re.compile(".*results"))

    # Wait for the results to be displayed
    # We can wait for the "Detected Objects" heading to be visible
    expect(page.get_by_role("heading", name="Detected Objects:")).to_be_visible()

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/detection_results.png")

    # Close browser
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
