# OUTSURANCE - CLAUDE DESIGN PROMPTS
## Professional 2026 Awards-Styled Monochromatic UI/UX Flow

---

## DESIGN SYSTEM FOUNDATION

### Color Palette (Monochromatic Only)
- **Primary Black**: #000000
- **Secondary Black**: #1a1a1a
- **Charcoal**: #2d2d2d
- **Dark Grey**: #404040
- **Medium Grey**: #595959
- **Light Grey**: #808080
- **Lighter Grey**: #b3b3b3
- **Off-White**: #f5f5f5
- **Pure White**: #ffffff

### Typography
- **Headings**: Inter Bold, 32px (H1), 24px (H2), 18px (H3)
- **Body**: Inter Regular, 14px
- **Labels**: Inter Medium, 12px
- **Mono (data)**: IBM Plex Mono, 13px

### Spacing & Layout
- Base unit: 8px
- Padding: 16px (standard), 24px (large sections)
- Border radius: 2px (minimal, antidesign aesthetic)
- Line height: 1.6
- Letter spacing: -0.02em (headings)

### Animations (Smooth & Minimal)
- Micro-interactions: 200ms cubic-bezier(0.4, 0, 0.2, 1)
- Transitions: 300ms cubic-bezier(0.4, 0, 0.2, 1)
- Page transitions: 400ms ease-out
- Loading states: Fade in/out, no bounce
- Input focus: Subtle line thickness increase, no glow

---

## PROMPT 1: AUTH SCREENS (Login & Register)

### Prompt for Claude Design:

```
Design the authentication screens for Outsurance, a health insurance AI app.

SCREENS TO CREATE:
1. Login Screen
2. Register Screen

DESIGN REQUIREMENTS:
- Monochromatic (black, white, greys only)
- Professional 2026 awards-style minimalist antidesign
- Pure white background (#ffffff)
- All typography in black (#000000)
- Subtle grey borders (#f5f5f5) for input fields
- Zero decorative elements — typography and whitespace are the design
- Smooth 200ms transitions on all interactive states

LOGIN SCREEN LAYOUT:
- Header: "Outsurance" logotype (black, uppercase, 16px letter spacing)
- Tagline below: "AI-powered health insurance matching" (12px, light grey #808080)
- Vertical spacing: 48px
- Email input field: Full width, thin black border bottom (#000000, 1px), no rounded corners, placeholder text in light grey
- Password input field: Same styling, placeholder "Password"
- "Forgot password?" link: 12px, underlined, light grey, hover state turns dark grey
- Login button: Full width, black background, white text, "LOGIN" uppercase, 14px medium weight, no border radius, 4px height
- Hover state on button: Slightly lighter black (#1a1a1a background) with smooth 200ms transition
- Bottom spacing: 32px
- "Don't have an account?" text: 12px, grey, followed by "Create one" link in black underline
- No form validation error messages visible until submission
- Loading state on button: Text fades to 60% opacity, icon spinner (minimal, just rotating stroke)

REGISTER SCREEN LAYOUT:
- Header: "Outsurance" logotype
- Subheader: "Create your account" (16px, bold)
- Fields in order:
  1. Full Name input
  2. Email input
  3. Password input (show/hide toggle: eye icon, grey, 16px)
  4. Confirm Password input
- All inputs: Same styling as login (thin bottom border, no border radius)
- Spacing between fields: 24px
- Create Account button: Same styling as Login button, "CREATE ACCOUNT" text
- Terms checkbox at bottom: 12px text "I agree to Terms and Privacy Policy", links in black underlined
- Success state: Modal appears saying "Account created. Redirecting..." with fade-in 300ms, page transitions out with fade 400ms
- Back link at top: "← Back to login" (12px, underlined, light grey)

ANIMATION DETAILS:
- Input focus: Bottom border thickness increases from 1px to 2px smoothly over 200ms, text placeholder fades from 50% to 30% opacity
- Error state (if needed): 1px red-equivalent in monochrome (use #404040 with slight opacity shift instead) bottom border appears with subtle 150ms pulse
- Button press: Slight scale down 98% over 100ms, scale back up 100ms (total 200ms)
- Form submission: Button text opacity goes to 30%, subtle spinner rotates 200ms per revolution

INTERACTIVE BEHAVIORS:
- Typing in email field: Auto-focus to password field on Enter key
- Typing in password on register: Auto-focus to confirm password on Enter key
- All Enter key presses trigger next field focus or form submission
- Validation happens silently (no red errors) until form submit attempt
- On submit attempt: Fields with errors get a 2px bottom border (darker grey) and shake animation 200ms (±2px horizontal)
- Successful submission fades screen to white over 300ms, next screen fades in

RESPONSIVE:
- Desktop: Max width 420px centered, padding 48px sides
- Mobile: Full width, padding 16px sides, vertical spacing slightly reduced (24px instead of 32px)

STYLE NOTES:
- This is antidesign: every pixel exists for clarity, not decoration
- No shadows, gradients, or depth cues
- No icons except minimal reload/eye toggles
- Typography creates hierarchy and visual interest
- Whitespace is sacred — generous margins around inputs
- All borders are 1px black or 1px light grey (#f5f5f5)
- Hover states are subtle: slight opacity shift or border weight shift, never color change
```

---

## PROMPT 2: ONBOARDING STEP 1 (Personal Details)

### Prompt for Claude Design:

```
Design Onboarding Step 1 for Outsurance: Personal Details form.

SCREEN PURPOSE:
User enters full name, DOB (auto-calculates age), gender, city, annual income, and maximum monthly premium budget.

LAYOUT STRUCTURE:
- Top bar: "Outsurance" logotype + progress indicator (1 of 5) on right
- Progress bar: Thin black line, filled portion (#000000) represents 20% width, unfilled is light grey (#f5f5f5), height 2px
- Spacing below top bar: 48px
- Main heading: "Tell us about yourself" (28px bold black)
- Subheading: "This helps us find your perfect plan" (14px light grey #808080)
- Spacing before form: 32px

FORM FIELDS (in order, each 24px spacing between):

1. FULL NAME
   - Label: "Full Name" (12px bold, black)
   - Input: Thin bottom border (#000000 1px), height 40px, padding 12px 0, font 14px
   - Placeholder: "Enter your full name" (light grey)
   - Focus state: Border weight increases to 2px smoothly 200ms
   - Valid state (once filled): Border fades to medium grey (#808080)

2. DATE OF BIRTH
   - Label: "Date of Birth" (12px bold)
   - Input: Three inline fields (DD / MM / YYYY), each 60px wide, thin borders
   - Separators: "/" text in light grey between fields
   - Below fields: "Age: 35" appears in 12px light grey (auto-calculated)
   - Focus state: Focused field border turns thick (2px)
   - Tab between fields smoothly with 100ms focus shift animation

3. GENDER
   - Label: "Gender" (12px bold)
   - Radio buttons: Two options "Male" / "Female", horizontal layout, 40px spacing between
   - Unselected radio: 16px circle outline (1px black border)
   - Selected radio: 16px circle, filled black (#000000), smaller 6px circle inside (white #ffffff) centered
   - Selection animation: 150ms scale-up of selected radio (from 16px to 18px then back to 16px)

4. CITY
   - Label: "City" (12px bold)
   - Input: Searchable dropdown / autocomplete
   - Placeholder: "Search your city"
   - Focus state: Border thickness increases to 2px, dropdown list appears below with fade-in 200ms
   - List items: 12px text, 40px height each, hover state has slight background shade (#f5f5f5)
   - Selection: Item highlights briefly (200ms), dropdown closes with fade-out 150ms

5. ANNUAL INCOME
   - Label: "Annual Income" (12px bold)
   - Input with currency symbol: "₹" prefix (grey), followed by input field
   - Placeholder: "Enter annual income"
   - Number formatting: Auto-formats to comma-separated (e.g., 8,00,000) as user types
   - Formatting animation: Subtle opacity shift during re-render (50ms)

6. MAX MONTHLY PREMIUM BUDGET
   - Label: "Maximum Monthly Premium Budget" (12px bold)
   - Input: "₹" prefix, same formatting as income field
   - Helper text below: "We'll only show plans within this range" (11px light grey)
   - Input behavior: Real-time validation — if user enters ₹5,00,000 monthly (unrealistic), subtle warning appears below in light grey (not red): "This is higher than typical plans"

BUTTON & NAVIGATION:
- "Continue to Health Details" button: Full width, black background, white text, 14px medium, 44px height, smooth 200ms scale on press (98%-100%)
- Spacing above button: 48px
- Below button: "← Back" link (12px underlined, light grey) to previous page (if not first entry, fade in 200ms)
- Button hover: Background shifts to #1a1a1a over 200ms
- Button click: Slight scale-down 100ms, then navigate with page fade-out 300ms to next step

ANIMATION FLOW:
- Page load: Content fades in over 400ms cubic-bezier(0.4, 0, 0.2, 1)
- Form field focus: Label slightly shifts up 8px, border weight increases (both 200ms easing)
- Form field blur: Label stays up if field has content, shifts down if empty
- Input validation feedback: No visual feedback during typing. On blur: if empty, subtle 200ms pulse of border (±1px width)
- Progress bar fill: On page load, bar fills to 20% over 600ms ease-out (satisfying visual of progress)

RESPONSIVE LAYOUT:
- Desktop: Form max-width 480px, centered, padding 48px horizontal
- Tablet: Max-width 100%, padding 32px horizontal
- Mobile: Full width minus 16px padding, form fields full width

DETAILED STATES & BEHAVIORS:
- Incomplete form: Continue button is disabled (opacity 50%), cursor not-allowed, no hover effect
- Complete form: Button is fully opaque, hover state active
- Field with error on blur: Label text turns darker (#404040), border slightly thicker
- Success: On submission, button text fades, spinner appears (rotating line 200ms per rev), page transitions with 400ms fade-out to next step
- Keyboard navigation: Tab cycles through fields in order, Enter on last field submits form
- Form persistence: All data stays in state/localStorage during session, so back button doesn't erase entries

ANTIDESIGN PRINCIPLES APPLIED:
- Zero decorative icons or graphics
- Only essential elements: labels, inputs, buttons
- Whitespace guides the eye and creates breathing room
- Black typography on white creates maximum clarity
- Subtle grey tones create secondary information hierarchy (help text, labels)
- No drop shadows or layered depth
- Minimal borders (1px) create structure without visual clutter
```

---

## PROMPT 3: ONBOARDING STEP 3 (Document Upload with Agent Chat)

### Prompt for Claude Design:

```
Design Onboarding Step 3 for Outsurance: Document Upload with Conversational Agent Interface.

SCREEN PURPOSE:
User uploads a PDF lab report or takes a photo. A conversational AI agent (Gemma) asks clarifying questions if data is missing, suggests typical values, and extracts health metrics interactively.

LAYOUT STRUCTURE:
- Top bar: Logotype + progress indicator (3 of 5)
- Progress bar: 60% filled (#000000) / 40% light grey (#f5f5f5)
- Main heading: "Upload your health report" (28px bold)
- Subheading: "Or chat with our agent to enter manually" (14px light grey)

AGENT CHAT INTERFACE:
- Full-width chat container: White background, thin black border top (2px), height fills remaining screen
- Chat area above input: Scrollable, padding 24px, shows conversation history
- Initial state (first load): Agent message appears with fade-in 300ms:
  "Hey there! 👋 I'm here to help. You can upload a lab report (PDF or photo) or just tell me about your health. What works best for you?"
  (Note: Keep emoji minimal/professional, prefer text to icons)

AGENT MESSAGE STYLING:
- Message bubble: Light grey background (#f5f5f5), black text, padding 12px 16px, border-radius 2px, max-width 70%, margin-bottom 16px
- Timestamp: 10px light grey below message
- Fade-in animation: 300ms ease-out as message appears
- If agent asks multiple questions, each appears as separate bubble with 200ms delay between them

USER MESSAGE STYLING:
- Message bubble: Black background (#000000), white text, padding 12px 16px, border-radius 2px, max-width 70%, align right
- Fade-in animation: 200ms ease-out on send
- Message appears immediately on send, spinner beside agent avatar indicates agent is "typing"

UPLOAD BUTTONS (below initial agent message, before input field):
Two side-by-side buttons (48% width each, 16px gap):
1. "📎 Upload PDF" — Black background, white text, 14px
2. "📷 Take Photo" — Black background, white text, 14px
- Both: 44px height, thin 2px border in black, hover state #1a1a1a background
- Spacing above buttons: 24px
- Spacing below: 24px

UPLOAD FLOW:
- User taps "Upload PDF" → file picker opens → user selects file
- File name appears in chat as user message: "Uploaded: lab_report.pdf"
- Processing indicator: "Extracting data..." message appears from agent with subtle spinner (rotating line)
- Processing takes 3–5 seconds on-device
- Agent responds with extracted data:
  "Got it! I found these values in your report:
   • HbA1c: 6.2%
   • Blood Pressure: 128/84
   • BMI: 26.5
   • Conditions: Family history of diabetes
   
   Does this look right? Anything you'd like to change?"
- Confidence indicator below message: "Confidence: 94%" (12px light grey)
- If confidence < 70%: "Confidence: 62% — Some values might need double-checking" in slightly darker grey

MANUAL ENTRY FLOW (user types instead of uploading):
- User types in input: "My blood sugar is 6.2 and BP is 128/84"
- Agent parses and responds: "Thanks! So HbA1c 6.2% and BP 128/84. Do you have your BMI? And any known conditions like diabetes or hypertension?"
- User continues typing answers
- Agent collects data conversationally, validates each entry
- Once all 8 required fields are gathered, agent summarizes: "Perfect! Here's what I have..." with extracted values shown

INPUT FIELD (bottom of screen):
- Full-width message input box: Thin border (#f5f5f5) bottom only, height 44px, padding 12px 16px
- Placeholder: "Upload a file or type here..." (light grey)
- Right side: "Send" button (text, 12px bold black) or "⏎" icon indicator
- Focus state: Border bottom becomes 2px #000000 smoothly over 200ms
- As user types: Character count appears above input in 10px light grey (optional, only if field is long)
- On Enter key: Message sends, input clears with 150ms fade, new message appears in chat

EXTRACTED DATA CONFIRMATION (after upload):
- If all required fields extracted (8 total): Agent shows summary card in grey background (#f5f5f5), thin black border (1px)
- Summary layout: Simple key-value pairs, 12px text, monospace font for values
  "Age: 35 | BMI: 26.5 | HbA1c: 6.2% | BP: 128/84 | Smoker: No | Diabetes: No | Hypertension: No | Chronic Conditions: 0"
- Below summary: Agent message "Ready to verify these on the next screen?" with two inline buttons:
  → "Yes, continue" (black button)
  → "Edit here" (white button, black border)
- If "Edit here" clicked: Input field becomes editable, user types corrections like "BMI is actually 27.1" and agent updates the value real-time

SKIP OPTION:
- If user doesn't want to upload/chat: "Skip — I'll enter manually" button below agent first message
- Style: White background, black border (2px), black text, 14px
- Tapping this skips to Step 4 (Verify Vitals) with all fields empty
- Navigation animation: Page fades out 300ms, next page fades in

LOADING STATE (while extracting from PDF):
- Spinner: Simple rotating line (black #000000), 24px diameter, 2px stroke
- Text below: "Reading your report..." (14px grey)
- Spinner rotates 200ms per full rotation, smooth cubic-bezier timing
- If extraction takes >8 seconds: "This might take a moment..." text fades in (14px light grey)

ERROR HANDLING:
- Invalid PDF or unreadable text: Agent message "Hmm, I couldn't read that document clearly. Can you try a different file, or just tell me your values?"
- Missing critical fields after upload: "I found most values, but I'm missing [HbA1c, BMI]. Can you provide those?"
- User edits a field: Agent acknowledges "Updated! BMI is now 27.1. Thanks!"

NAVIGATION:
- "Continue to Verification" button: Appears below chat once data is confirmed, full-width, black, white text, 44px
- This button only enables after all 8 fields are present
- Spacing above: 24px
- Hover state: Background slightly darker (#1a1a1a) over 200ms

ANIMATION DETAILS:
- Chat messages fade in from bottom: Start at opacity 0, translate-Y 8px, animate to opacity 1, translate-Y 0 over 300ms
- Agent typing indicator: Three dots that appear, fade in/out with staggered timing (100ms each)
- User message send: Input field clears with fade-out 150ms, text appears in chat with fade-in 200ms
- Scroll behavior: Chat auto-scrolls to new messages smoothly over 200ms
- Page load: Chat container fades in 400ms, initial agent message appears after 200ms (staggered)

RESPONSIVE BEHAVIOR:
- Desktop: Chat area max-width 600px, centered, padding 24px
- Mobile: Full width, padding 12px sides, input field sticky at bottom with safe-area-inset

ANTIDESIGN NOTES:
- No profile avatars or decorative icons in chat (text-only, or minimal line icons)
- Message bubbles are simple: background color + text + padding, no drop shadows
- All borders 1px or 2px, no gradients
- Typography hierarchy: Agent questions slightly bolder than agent explanations
- Whitespace between messages: 16px, creates rhythm
- Chat feels like authentic conversation, not a form — agent speaks naturally
```

---

## PROMPT 4: ONBOARDING STEP 4 (Verify Vitals)

### Prompt for Claude Design:

```
Design Onboarding Step 4 for Outsurance: Verify Your Vitals (The Privacy Control Screen).

SCREEN PURPOSE:
User sees all extracted health metrics as editable fields before they're sent to the cloud. This is the critical privacy control and verification checkpoint.

LAYOUT STRUCTURE:
- Top bar: Logotype + progress indicator (4 of 5)
- Progress bar: 80% filled (#000000) / 20% light grey
- Main heading: "Verify your health data" (28px bold black)
- Subheading: "Review and edit any values before we send them to our servers" (13px light grey #808080)
- Spacing after subheading: 32px

PRIVACY ASSURANCE BANNER:
- Full-width banner below subheading: Light grey background (#f5f5f5), thin black top border (2px)
- Padding: 16px 20px
- Icon: Lock symbol (minimal, just outline, 16px)
- Text: "Your raw documents are never stored. Only these values will be sent to our servers." (12px black)
- Design note: Banner is informational, not alarming — calm, clear typography
- Fade-in animation: 300ms as page loads

CONFIDENCE INDICATOR (Optional, if extracted from document):
- Below privacy banner: "Confidence in extraction: 92%" (12px light grey)
- Visual: Thin horizontal bar, 200px width, filled portion in black (#000000) at 92%
- If confidence > 85%: Text stays grey
- If confidence 70-85%: Text shifts to slightly darker grey (#595959) with warning icon
- If confidence < 70%: Text darker grey with message "Some values may need checking — please review below"
- Bar height: 2px

FORM SECTION:
- Spacing above form: 24px
- Subheading above form: "Your Health Metrics" (14px bold black)
- Spacing below subheading: 16px

EDITABLE METRIC FIELDS (in two columns on desktop, one column on mobile):

Each field:
- Label: 12px bold black, margin-bottom 6px
- Input field: Full width, thin bottom border (#000000 1px), height 40px, padding 8px 0
- Value font: IBM Plex Mono 14px (monospace, emphasizes data)
- Placeholder: Light grey, shows expected format (e.g., "HbA1c: 4–6%")
- Unit/suffix: Light grey (10px), right-aligned within field (e.g., "%", "/mmHg")

FIELDS (8 total):
1. Age | Value: 35 | Unit: years | Read-only (derived from DOB) | Border in medium grey (#808080)
2. BMI | Value: 26.5 | Unit: kg/m² | Editable
3. HbA1c | Value: 6.2 | Unit: % | Editable
4. Systolic BP | Value: 128 | Unit: mmHg | Editable
5. Smoker Status | Dropdown: Yes / No | Editable
6. Has Diabetes | Dropdown: Yes / No | Editable
7. Has Hypertension | Dropdown: Yes / No | Editable
8. Chronic Conditions Count | Value: 0 | Unit: conditions | Editable (slider or number input)

FIELD INTERACTIONS:
- Focus state: Bottom border weight increases from 1px to 2px, text placeholder fades to 30% opacity
- Editable fields: User can tap to edit, field becomes active (border 2px)
- Placeholder guidance: On focus, small hint appears above field (9px light grey): "e.g., 6.2 for pre-diabetic range"
- Value validation: On blur, value is checked:
  - If out of realistic range: Subtle warning appears below field in light grey (not red): "Typical range: 4–6%" (no error state, just guidance)
  - If missing: Field border fades to medium grey but no error text (user can leave blank and proceed)
  - If valid: Border fades to light grey (#b3b3b3)
- Dropdown interactions (Smoker, Diabetes, Hypertension):
  - Closed state: Shows selected value, thin border bottom
  - Open state: Dropdown list appears below (fade-in 150ms), grey background, items are 40px tall
  - Selected item: Black background, white text
  - Unselected items: Black text on white
  - Hover: Light grey background on unselected items
  - Selection: Item animates highlight 150ms, dropdown closes fade-out 100ms
- Slider (Chronic Conditions):
  - Visual: Horizontal slider, track is light grey (#f5f5f5), thumb is black circle (16px diameter)
  - Range: 0–5
  - Interaction: Thumb can be dragged smoothly with 50ms update rate
  - Tooltip appears above thumb during drag: "3 conditions" (12px light grey)
  - On release: Tooltip fades out 200ms

TWO-COLUMN LAYOUT (Desktop):
- Column 1 (left): Age, HbA1c, Has Diabetes, Chronic Conditions
- Column 2 (right): BMI, Systolic BP, Smoker Status, Has Hypertension
- Column gap: 32px
- Each column: 45% width

SINGLE COLUMN LAYOUT (Mobile):
- All 8 fields stack vertically
- Field width: 100% minus padding
- Spacing between fields: 20px

SUMMARY CARD (Optional, below all fields):
- Only appears if form is >70% complete
- Full-width card: Light grey background (#f5f5f5), thin black border (1px), padding 16px 20px
- Title: "Health Profile Summary" (12px bold black)
- Content: Simplified text summary: "35-year-old, BMI 26.5, HbA1c 6.2% (pre-diabetic risk). Smoker: No. Diabetes: No (but family history). Will match you with plans for pre-diabetic risk."
- Font: 12px black
- Fade-in animation: 300ms as fields are filled

PRIMARY BUTTON:
- "Confirm and Get Recommendations" button: Full-width, black background, white text, 14px medium, 44px height
- Spacing above: 32px
- Disabled state (if required fields empty): Opacity 40%, cursor not-allowed, no hover effect
- Enabled state: Full opacity, hover #1a1a1a background
- Click behavior: Button scales down 98% over 100ms, text fades to 30%, spinner appears (rotating line)
- Submission: "Sending your data..." message appears above button in light grey (11px)
- Page transition: After server responds (2–3 sec), page fades out 300ms to Step 5

SECONDARY OPTION:
- Below primary button: "← Back to Document" link (12px underlined light grey)
- Hover: Darkens to medium grey (#595959)
- Click: Navigates back to Step 3 (upload) with fade-out/fade-in 300ms, form data retained

KEYBOARD NAVIGATION:
- Tab cycles through fields in reading order
- Shift+Tab reverses
- Enter on dropdown opens/closes
- Enter on slider accepts value
- Ctrl+Enter or Cmd+Enter submits form

ERROR HANDLING:
- Network error during submission: Spinner stops, message appears "Connection error. Please try again." (red-equivalent grey #404040), button re-enables
- Timeout (>10sec): "Taking longer than expected... Please refresh." message
- Server validation error: "One of your values is outside expected ranges. Please review: [field name]" in dark grey, relevant field border highlights

ANTIDESIGN PRINCIPLES:
- Zero decorative graphics — only a minimal lock icon in banner
- All information conveyed through typography and whitespace
- Field borders create the grid structure, no boxes
- Monospace font for data emphasizes that these are numbers, not prose
- Placeholder text and hints guide without instruction
- No asterisks or required/optional labels — form assumes all are required unless explicitly read-only
- Summary card is optional — some users won't need it

ANIMATION TIMELINE:
- Page load: Content fades in 400ms, privacy banner fades in 300ms (staggered 100ms after), confidence indicator fades in 200ms (staggered 200ms)
- Field focus: Border weight increases 200ms, placeholder opacity decreases 200ms
- Field edit: Input text color stays black (#000000), cursor is visible black line
- Summary card appears: Fade-in 400ms when form is 70% complete
- Submission flow: 300ms fade-out of current screen, followed by 300ms fade-in of next screen (total 600ms transition)

RESPONSIVE NOTES:
- Desktop: Form max-width 680px (accommodates two columns), padding 48px horizontal
- Tablet: Max-width 100%, padding 32px horizontal, single column for fields
- Mobile: Full width, padding 16px, single column, touch targets 44px minimum height
```

---

## PROMPT 5: ONBOARDING STEP 5 (Results Dashboard)

### Prompt for Claude Design:

```
Design Onboarding Step 5 for Outsurance: Results & Top 5 Recommended Plans.

SCREEN PURPOSE:
Display user's risk profile and top 5 insurance plans ranked by suitability. AI-generated reasoning populates as Gemma generates explanations on-device.

LAYOUT STRUCTURE:
- Top bar: Logotype + progress indicator (5 of 5 — complete!)
- Progress bar: 100% filled (#000000)
- No heading — results speak for themselves

RISK PROFILE CARD (Top Section):
- Full-width card: Black background (#000000), white text, padding 24px
- Layout grid:
  - Left side (60%): Text information
    - "Your Health Risk" (12px light grey, uppercase, letter-spacing 0.1em)
    - Large risk tier badge below: "MEDIUM RISK" (28px bold white)
    - Risk score below badge: "Score: 0.63 / 1.0" (16px light grey)
    - One-line description: "Your health metrics indicate pre-diabetic risk. Comprehensive plans will suit you best." (13px light grey)
  - Right side (40%): Visual risk meter
    - Vertical bar chart (or horizontal bar): 100px tall, divided into 4 zones
      - Zone 1 (0–0.25): Light grey (#b3b3b3) labeled "Low Risk"
      - Zone 2 (0.25–0.5): Medium grey (#808080) labeled "Medium Risk"
      - Zone 3 (0.5–0.75): Darker grey (#595959) labeled "High Risk"
      - Zone 4 (0.75–1): Black (#000000) labeled "Critical"
    - Indicator line: White (#ffffff), positioned at 0.63 mark (63%), 3px thickness
    - No hover state — purely informational
- Animation on load: Card slides in from top over 400ms, risk tier text has staggered character-by-character fade-in (30ms per character), meter bar fills upward 600ms cubic-bezier (satisfying progress animation)
- Spacing below card: 32px

PLAN CARDS SECTION:
- Section title: "Recommended Plans for You" (14px bold black)
- Subtitle: "Based on your health profile and budget" (12px light grey)
- Spacing before first plan card: 20px

PLAN CARD (x5 stacked):
- Full-width card: White background, thin black border (2px), padding 20px
- Internal layout:
  
  TOP ROW (3 columns):
  - Column 1 (40%): Plan header
    - Provider name: 11px light grey uppercase, letter-spacing 0.05em (e.g., "STAR HEALTH")
    - Plan name: 16px bold black (e.g., "Diabetes Safe")
  - Column 2 (30%): Center (blank space in most designs)
  - Column 3 (30%): Suitability score on right
    - Large number: "8.4" (24px bold black)
    - Text below: "Suitability Score" (10px light grey)
  
  SEPARATOR: 1px light grey line across card
  
  MIDDLE ROW (Key facts):
  - 3 inline fact items, space-between layout:
    1. "₹14,000 / year" (13px bold black) + label "Premium" (9px grey below)
    2. "₹5,00,000" (13px bold black) + label "Coverage" (9px grey)
    3. "Day 1" (13px bold black) + label "Diabetes Cover" (9px grey)
  
  SEPARATOR: 1px light grey line
  
  BOTTOM ROW (AI Reasoning):
  - Label: "Why this plan:" (11px bold black)
  - Reasoning text: 2 sentences, 13px black, line-height 1.6
    Example: "Your HbA1c of 6.2% indicates pre-diabetic risk. This plan covers diabetes from day one, ensuring no waiting period if your condition progresses."
  - Loading state (while Gemma generates): Placeholder skeleton text fades in/out (10px light grey): "Generating recommendation..."
  - Fade-in animation: As text generates, characters appear smoothly over 800ms (staggered character animation, not instant text appearance)
  
  ACTION BUTTONS (Bottom of card, 3 options):
  - "Details" button (left): 30% width, white background, black border (1px), black text
  - "Compare" button (center): 30% width, white background, black border (1px), black text
  - "Stress Test" button (right): 30% width, white background, black border (1px), black text
  - Button height: 40px
  - Hover state: Background shifts to light grey (#f5f5f5) over 200ms
  - Click animation: Scale down 98% over 100ms
  - Spacing between buttons: 8px
  - Spacing above buttons: 16px

PLAN CARD STAGGER ANIMATION:
- First card appears immediately with fade-in 300ms + slide-up 300ms from Y+20px
- Second card appears 300ms after first (while Gemma is generating)
- Third card appears 300ms after second
- And so on — staggered 300ms each
- This creates a flowing "results appearing" feeling as AI generates reasoning
- Each card: Fade-in 200ms + slide-up 200ms from Y+16px

SELECTION STATE:
- When user taps "Compare" on a card: Card border becomes thicker (3px black), subtle background tint (#f5f5f5) appears, checkmark icon appears top-right corner (minimal icon, just "✓" text in black)
- Tapping again deselects: Border returns to 2px, tint fades, checkmark disappears (all 150ms)
- Up to 3 cards can be selected simultaneously

STICKY FOOTER (when 2+ cards selected):
- Full-width sticky footer at bottom: Black background (#000000), white text, padding 16px
- Left side: "2 plans selected" (13px white)
- Right side: "Compare Plans" button (white background, black text, 40px height)
- Animation: Footer slides up from bottom 300ms when second card is selected, slides down when deselected
- Button click: Opens compare drawer (see Prompt 6)

LOADING STATE (while risk model runs):
- Before risk profile card loads: Grey skeleton card (light grey background #f5f5f5) appears with 1px border
- Skeleton layout matches real card but has subtle pulsing opacity (40%–100% over 1.2s)
- Text is replaced with grey bars (8px height, various widths)
- Below skeleton: "Calculating your recommendations..." (12px grey, centered)

EMPTY STATE (if risk assessment fails):
- Instead of plan cards: Message appears in 14px bold black
  "We couldn't calculate recommendations right now. Please try again."
- Button below: "Recalculate" (black background, white text)
- Generous spacing around message (48px top/bottom padding)

NAVIGATION:
- Top-right corner: "Modify Assessment" link (12px underlined grey)
  - Clicking this returns user to Step 1 with all data retained, allowing re-entry
  - Page transition: Fade-out 300ms, fade-in 300ms to Step 1
- After results load: "Save Assessment" button appears (optional, for registered users)
  - Style: White background, black border (2px), black text, 40px height
  - Placement: Below last plan card
  - Click: Assessment saves to Supabase, toast notification appears "Assessment saved ✓" (2s, fades out)

PAGINATION (if >5 plans):
- Below plan cards (if database has more than 5): "Show 5 more plans" button
- Click: Next 5 plans fade-in below with staggered animation (300ms per card)

RESPONSIVE LAYOUT:
- Desktop: Risk card full-width, plan cards max-width 680px centered, padding 48px horizontal
- Tablet: Risk card full-width, plan cards full-width minus 32px padding
- Mobile: Risk card full-width, plan cards full-width minus 16px padding, button layout on cards may shift to vertical (stack buttons)

ANTIDESIGN APPROACH:
- Risk card uses inverse (black background, white text) to signal importance
- Plan cards are simple: borders, typography, whitespace — no icons except minimal checkmark
- Suitability score is large number, no other visual — numeric hierarchy shows rank
- Reasoning text is human-readable, not technical
- Buttons are plain: borders only, no background until hover
- All spacing is deliberate: 20px padding inside cards creates breathing room

ANIMATION SUMMARY:
- Page load: Risk card + meter bar animate in 400ms + 600ms (staggered)
- Plan cards: Staggered fade-in + slide-up 300ms each, starting 300ms after page load
- Text generation: Reasoning text appears character-by-character 800ms smooth (simulating real-time generation)
- Selection: Card border thickens 150ms, checkmark fades in 100ms
- Sticky footer: Slides up from bottom 300ms when triggered
- All transitions use cubic-bezier(0.4, 0, 0.2, 1) for consistency
```

---

## PROMPT 6: Plan Detail Page & Compare Drawer

### Prompt for Claude Design:

```
Design the Plan Detail Page and Plan Comparison Drawer for Outsurance.

===== PLAN DETAIL PAGE =====

SCREEN PURPOSE:
User taps "Details" on a plan card to see full plan information: coverage, premiums, waiting periods, pros, cons, exclusions.

LAYOUT STRUCTURE:
- Top bar: Back button (← 12px underlined grey) + plan provider name (14px bold black, right-aligned)
- Below top bar: Plan name heading (28px bold black) + large suitability score badge floating right
  - Badge: Circular, 60px diameter, black background, white text, "8.4" in 24px bold, "Score" in 8px below
  - Spacing below heading: 24px

PLAN PREMIUM & COVERAGE SECTION (pinned card):
- Full-width card: Light grey background (#f5f5f5), padding 20px
- Two columns (desktop) or stacked (mobile):
  - Column 1: Annual premium
    - Label: "Annual Premium" (11px bold black)
    - Value: "₹14,000" (24px bold black)
    - Subtext: "₹1,167 per month" (12px grey)
  - Column 2: Coverage limit
    - Label: "Coverage Limit" (11px bold black)
    - Value: "₹5,00,000" (24px bold black)
    - Subtext: "Full family coverage" (12px grey)
- A vertical line separator (1px grey) between columns
- Sticky at top as user scrolls down (scroll offset animation)

KEY FACTS SECTION (below premium card):
- Grid of 4 fact boxes, 2 columns x 2 rows (or responsive to mobile)
- Each box: White background, thin border (1px), padding 16px
- Box 1: "Pre-existing Wait" label (11px bold) + value "2 years" (16px bold)
- Box 2: "Diabetes Cover" + "Day 1" (with check icon, or just text ✓)
- Box 3: "Hypertension Cover" + "Year 2"
- Box 4: "Maternity Cover" + "Yes" or "No"
- Spacing between boxes: 12px
- Spacing above section: 24px

PROS SECTION:
- Section title: "Pros" (14px bold black)
- Subtext: "What makes this plan good for you" (12px grey)
- Spacing below title: 12px
- List of pros (checkmarks + text):
  - Item format: ✓ text (11px black, using unicode or simple text)
  - Example items:
    "Only 2-year wait for pre-existing conditions (better than industry standard)"
    "Cashless hospitalisation at 9,800+ hospitals"
    "Includes OPD coverage up to ₹50,000/year"
    "Maternity coverage from year 1"
  - Spacing between items: 12px
  - Each item is 12px black text, line-height 1.5
- Spacing below section: 24px

CONS SECTION:
- Section title: "Cons" (14px bold black, same styling as Pros)
- Subtext: "Things to consider" (12px grey)
- List of cons (× symbols + text):
  - Item format: × text (11px black)
  - Example items:
    "High premium compared to basic plans"
    "Pre-existing conditions still have 2-year waiting period"
    "Limited annual OPD amount (₹50,000 cap)"
  - Spacing between items: 12px
- Spacing below section: 24px

COVERAGE HIGHLIGHTS SECTION:
- Section title: "Coverage Highlights" (14px bold black)
- Subtext: "What's covered under this plan" (12px grey)
- Breakdown of coverages as list items (no checkmarks, just text):
  - Format: "Category: Details" (12px black)
  - Example items:
    "Hospitalization: Up to ₹5,00,000"
    "Day-care procedures: Covered without hospitalization"
    "Maternity: Covered after 12 months"
    "Critical illness: 25% of sum insured"
    "Air ambulance: Yes"
    "Organ transplant: Covered"
  - Spacing between items: 12px
- Spacing below section: 24px

EXCLUSIONS SECTION:
- Section title: "Exclusions" (14px bold black)
- Subtext: "What's NOT covered" (12px grey)
- List format (no icons, just text):
  - "Cosmetic treatments"
  - "Alternative medicine (Ayurveda, Homeopathy) — not covered"
  - "Infertility treatments"
  - "Experimental treatments"
  - "Self-inflicted injuries"
  - "Routine checkups outside health center network"
  - Spacing between items: 12px
- Spacing below section: 24px

BOTTOM SECTION:
- Sticky footer with two buttons:
  1. "Save Plan" button: 48% width, white background, black border (2px), black text, 44px height
  2. "Add to Compare" button: 48% width, black background, white text, 44px height
- Gap between buttons: 4%
- Spacing above footer: 24px
- If plan is already saved: "Save Plan" button text changes to "✓ Saved" (greyed text #808080)
- If plan is already in compare: "Add to Compare" button text changes to "✓ Added" (greyed)

RESPONSIVE:
- Desktop: Max-width 680px, padding 48px horizontal
- Mobile: Full width, padding 16px, sections stack vertically, 2-column fact boxes shift to 1 column (2 rows become 4 rows), buttons stack vertically (100% width each)

ANTIDESIGN:
- All sections are white cards with borders, no colors except black/white/grey
- Section titles create hierarchy through bold weight and size
- Lists use minimal symbols (✓, ×) or just text
- Generous padding inside cards and between sections
- No decorative icons, imagery, or graphs
- Typography and whitespace are the only design elements

ANIMATIONS:
- Page load: Content fades in 400ms
- Premium card: Sticky positioning animates with 200ms transition when scrolling
- Section headings: Fade-in 300ms with 100ms stagger between sections
- Button hover: Background opacity shifts over 200ms
- Button click: Scale animation 100ms (98%-100%)

===== PLAN COMPARISON DRAWER =====

SCREEN PURPOSE:
User selects 2–3 plans and taps "Compare Plans" to see them side-by-side in a bottom sheet.

DRAWER LAYOUT:
- Full-width bottom sheet (mobile) or modal (desktop)
- Drawer height: 75vh on mobile, fixed 480px on desktop
- Background: White (#ffffff)
- Top bar: Title "Compare Plans" (18px bold black) + Close button (× symbol or ← back, 16px, top-right)
- Padding: 20px

COMPARISON TABLE:
- Horizontal scroll table (mobile) or fixed columns (desktop)
- Header row: 3 plan names side-by-side (each column ~140px mobile, ~200px desktop)
  - Plan 1 heading: Provider name (11px bold grey) + Plan name (13px bold black)
  - Plan 2 heading: Same formatting
  - Plan 3 heading: Same formatting
  - Spacing between columns: 12px
- Separator line below headers: 1px black

COMPARISON ROWS (each row is 40px tall):
- Row label (left, sticky, 100px width): Category name (12px bold black)
- Row data (3 columns):
  - Plan 1 value: 13px black, centered
  - Plan 2 value: 13px black, centered
  - Plan 3 value: 13px black, centered
  
ROWS TO COMPARE:
1. Monthly Premium: ₹1,167 | ₹683 | ₹1,400
   - If selected rows differ: Highlight lowest value with light grey background (#f5f5f5)
2. Coverage Limit: ₹5,00,000 | ₹10,00,000 | ₹25,00,000
   - Highlight highest coverage
3. Pre-existing Wait: 2 years | 1 year | Day 1
   - Highlight shortest wait (Day 1 = green equivalent in grey)
4. Covers Diabetes Day 1: Yes | No | Yes
   - Highlight "Yes" values
5. Covers Hypertension Day 1: Yes | No | Yes
6. Cashless Hospitals: 9,800+ | 5,200+ | 12,000+
   - Highlight highest number
7. Annual OPD Limit: ₹50,000 | ₹100,000 | ₹25,000
   - Highlight highest limit
8. Suitability Score: 8.4 | 6.2 | 7.1
   - Highlight highest score

ROW STYLING:
- Alternating row backgrounds: White, light grey (#f5f5f5)
- Row separator: 1px light grey between rows
- Highlighted cells: Background shifts to light grey (#f5f5f5) if value is best in that row
- Cell padding: 8px 12px
- Text alignment: Left for labels, centered for values
- Text color: Black (#000000), grey (#808080) for secondary info

STICKY ACTIONS (bottom of drawer):
- Two buttons side-by-side:
  1. "Select Plan" button: Black background, white text, 14px, 44px height
     (Note: This is disabled until user taps a specific plan to select it)
  2. "Clear" button: White background, black border (1px), black text, 44px height
- "Clear" removes the compare selection
- Spacing above buttons: 16px

MOBILE SCROLL BEHAVIOR:
- Drawer is horizontally scrollable (table continues beyond viewport)
- Left sticky label column stays fixed while plans scroll
- Scroll indicator (small line) shows at bottom: "Scroll to see all plans →"
- Smooth scroll snap to each plan column

DESKTOP BEHAVIOR:
- Table is full-width in modal
- All three plans visible at once (no scroll)
- Modal max-width 800px, centered

ANIMATIONS:
- Drawer slide-up: 300ms cubic-bezier(0.4, 0, 0.2, 1) from bottom
- Table rows fade-in: Staggered 100ms each, starting 150ms after drawer opens
- Cell highlights: Background color shift 300ms when table loads
- Close drawer: Slide-down 250ms
- Clear selection: Drawer closes with slide-down 250ms

ANTIDESIGN:
- Comparison is table-based (pure data structure), no graphs or visualizations
- Highlighting uses background tint only, not colors
- All text is monospace for values to emphasize numbers
- Rows alternate white/grey for readability, no borders between columns
- Buttons are minimal: text only or with thin borders
- Whitespace between rows creates rhythm

RESPONSIVE:
- Desktop: Modal 800px wide, centered, full table visible
- Tablet: Bottom sheet 70vh height, table scrolls horizontally
- Mobile: Bottom sheet 80vh height, table scrolls horizontally, sticky label column 80px width
```

---

## PROMPT 7: Stress Test Modal & Dashboard Home

### Prompt for Claude Design:

```
Design the Stress Test Modal and Main Dashboard (Home Tab) for Outsurance.

===== STRESS TEST MODAL =====

SCREEN PURPOSE:
User selects a medical emergency scenario and sees total cost, plan coverage, and out-of-pocket expense instantly.

MODAL LAYOUT:
- Overlay: Transparent black (rgba(0,0,0,0.2))
- Modal body: White background, padding 24px, max-width 500px (mobile full-width minus 16px)
- Centered on screen
- Border: 2px black top border (design flourish)

MODAL HEADER:
- Title: "Stress Test: [Plan Name]" (20px bold black)
- Subtext: "How much would you pay in this scenario?" (13px light grey)
- Spacing below: 24px
- Close button (×): Top-right corner, 16px, clickable, hover darkens

SCENARIO SELECTION:
- Subheading: "Select an emergency:" (12px bold black)
- Spacing below: 12px
- List of scenarios (radio button + text):
  - Option 1: "Appendix Surgery" → ₹3,00,000 estimated cost
  - Option 2: "5-Day ICU Stay" → ₹8,00,000
  - Option 3: "Cardiac Event" → ₹5,00,000
  - Option 4: "Knee Replacement" → ₹4,50,000
  - Option 5: "Maternity with Complications" → ₹2,50,000
- Radio button styling:
  - Unselected: 16px circle, black border (1px), white fill
  - Selected: 16px circle, black border (2px), black fill, white dot inside
- Scenario text: 12px black, positioned right of radio button
- Cost in light grey: 10px grey, positioned right of scenario text
- Spacing between options: 16px
- First option selected by default

CALCULATION SECTION (below scenarios):
- Spacing above: 24px
- Divider line: 1px black
- Spacing below: 16px
- Three calculation rows displayed (in monospace font):

  Row 1 — Total Emergency Cost:
  - Label: "Total Emergency Cost" (11px bold black)
  - Value: "₹5,00,000" (18px bold black, right-aligned)
  
  Row 2 — Plan Covers:
  - Label: "Plan Covers" (11px bold black)
  - Value: "₹5,00,000" (18px bold black, right-aligned, light grey if partial)
  
  Row 3 — You Pay (Out-of-Pocket):
  - Label: "You Pay (Out-of-Pocket)" (11px bold black)
  - Value: "₹0" (20px bold black, right-aligned)
  - Background color of this row based on amount:
    - ₹0–₹30,000: Light grey tint (#f5f5f5) + green-equivalent grey label "✓ Fully covered"
    - ₹30,000–₹1,00,000: Medium grey tint (#f5f5f5) + neutral label "Partial coverage"
    - ₹1,00,000+: Darker grey tint (#e8e8e8) + dark label "⚠ Large out-of-pocket"

SCENARIO SWITCH BEHAVIOR:
- When user selects a different scenario: Values recalculate instantly (no API call, all client-side)
- Calculation rows have brief fade-out 100ms, fade-in 100ms to show update
- Smooth number animation: Old value fades out, new value fades in over 200ms

RECOMMENDATION TEXT (if out-of-pocket is high):
- If "You Pay" exceeds ₹1,00,000: Warning message appears below calculation section
- Message: "Consider a plan with higher coverage. [Suggest Plan Name] would cover this scenario completely."
- Style: 12px black, padding 12px, light grey background (#f5f5f5), thin border (1px)
- Fade-in animation: 300ms when triggered

BOTTOM BUTTON:
- "Close" button: Black background, white text, 14px, full-width, 44px height
- Spacing above: 24px
- Click: Modal slides down and fades out 250ms
- Alternative: Modal can also close on backdrop click (overlay) with same animation

RESPONSIVE:
- Desktop: Modal max-width 500px, centered, padding 24px
- Mobile: Full-width minus 16px padding, positioned at bottom of screen (slight slide-up animation), padding 20px

ANTIDESIGN:
- Modal is minimal: title, scenarios, calculation, button
- No icons except simple circles for radio buttons
- Monospace font emphasizes financial calculations
- Colour coding (grey tints) signals financial impact without bright reds/greens
- Whitespace around calculation values creates emphasis

ANIMATIONS:
- Modal entry: Fade-in 300ms + slight scale (95%-100% from center)
- Scenario selection: Radio button highlights 150ms, values recalculate with fade 200ms
- Warning message: Slides up 300ms when triggered
- Modal close: Scale down + fade-out 250ms


===== DASHBOARD (HOME TAB) =====

SCREEN PURPOSE:
After onboarding, user's main entry point. Shows recent recommendation, top 5 plans, saved plans, and quick actions.

LAYOUT STRUCTURE:
- Top bar: "Outsurance" logotype (left) + profile icon or menu (right, 20px)
- Navigation bottom tab bar (mobile) or sidebar (desktop):
  - Tab 1: Home (current)
  - Tab 2: Explore (all plans)
  - Tab 3: Saved (bookmarked plans)
  - Tab 4: Profile

WELCOME SECTION (at top):
- Greeting: "Welcome back, [First Name]" (16px bold black)
- Date: "Last updated: 3 days ago" (11px light grey)
- Spacing below: 24px

CURRENT RISK PROFILE CARD (pinned):
- Full-width card: Black background (#000000), white text, padding 20px
- Layout: 2 columns (left text, right visual meter)
  - Left (60%):
    - "Your Health Risk" (11px light grey uppercase)
    - Risk tier: "MEDIUM RISK" (24px bold white)
    - Score: "0.63 / 1.0" (14px light grey)
    - Description: "Based on HbA1c 6.2%, age 35, pre-diabetic risk" (12px light grey)
  - Right (40%):
    - Vertical meter bar (same as Step 5 Results)
    - Risk indicator line at 0.63 mark
    - 90px height, 3px indicator width
- Spacing below: 24px
- "Regenerate Assessment" button: White text, underlined, 12px, positioned bottom-right of card
  - Click: Navigates to Onboarding Step 1, fade-out/fade-in 300ms

RECOMMENDED PLANS SECTION:
- Section title: "Your Top 5 Plans" (14px bold black)
- Subtext: "Last generated 3 days ago" (11px light grey)
- Spacing below: 12px
- Plan cards (simplified version, 5 cards stacked):
  - Each card: 90% width (margin auto), white background, border 1px, padding 16px
  - Top row: Plan name (13px bold) + suitability score (16px bold right)
  - Middle row: Premium + Coverage (two columns, 12px grey)
  - Bottom row: One action button "View Details" (full-width, white bg, border, 36px height)
  - No AI reasoning text here (simplified card)
  - Spacing between cards: 8px
  - Card click: Opens Plan Detail Page
- Spacing below section: 24px

SAVED PLANS SECTION:
- Section title: "Saved Plans" (14px bold black)
- If empty: "No saved plans yet" (12px grey), "Explore plans" link (underlined black)
- If populated: Horizontal scrollable carousel of saved plan cards
  - Card size: 140px width (mobile), 160px (desktop)
  - Card height: 180px
  - Content: Plan name + provider (top), key facts (middle), "View" button (bottom)
  - Spacing between cards: 8px
  - Scroll indication: "Swipe →" text (10px grey) fades in after 3 seconds
  - Card click: Opens Plan Detail Page
  - Card long-press (or × button): Option to remove from saved
  - Spacing below section: 24px

QUICK ACTION BUTTONS:
- Two buttons side-by-side (50% width each):
  1. "Compare Plans" button (if 2+ saved): Black background, white text
  2. "Explore All Plans" button: White background, black border (2px), black text
- Button height: 44px
- Spacing: 4% gap between them
- Spacing above section: 24px
- "Compare Plans" opens Compare Drawer (if saved plans selected)
- "Explore All Plans" navigates to Explore Tab (see Prompt 8)

BOTTOM SECTION (Optional):
- "Need Help?" link (12px underlined grey) → Opens FAQ or support chat
- Spacing above: 32px
- Or: "Your Next Steps" section with numbered list (optional, can omit):
  1. "Review plan details"
  2. "Compare with your current plan"
  3. "Get a quote"

RESPONSIVE LAYOUT:
- Desktop: Two-column layout (main content 70%, sidebar 30%)
  - Right sidebar can show: Quick stats, account info, logout
- Tablet: Single column, full-width cards, padding 24px
- Mobile: Single column, full-width minus 16px padding, tab bar at bottom

LOADING STATE:
- On page load: Skeleton cards appear (light grey backgrounds #f5f5f5 with pulsing opacity)
- Risk profile skeleton: Full-width grey box, 120px height
- Plan cards skeleton: 5 grey boxes stacked, each 80px height
- Loading text: "Loading your recommendations..." (12px grey, centered)
- Fade to real content: 300ms fade-in when data arrives

EMPTY STATE (first-time user after onboarding):
- Risk profile card still shows (just generated)
- Recommended plans show (just generated)
- Saved plans empty: "No saved plans yet. Start by exploring all plans." (12px black)
- "Explore All Plans" button prominent
- Spacing: Generous margins to avoid feeling sparse

REFRESH BEHAVIOR:
- Pull-to-refresh (mobile): Swipe down → spinner appears → refreshes recommendation (if needed)
- Refresh button (desktop): Top-right corner, 16px icon
- Refresh animates: Spinner rotates 200ms per revolution
- On completion: "Refreshed just now" message appears briefly (toast, fades out after 2s)

ANIMATIONS:
- Page load: Content fades in 400ms
- Risk card: Slide in from top 300ms
- Plan cards: Staggered fade-in 200ms each, starting 150ms after risk card
- Saved plans carousel: Fades in 300ms, scroll indicator fades in after 3s (subtle)
- Button hover: Background opacity shifts 200ms
- Navigation between tabs: Fade-out current 150ms, fade-in next 150ms

ANTIDESIGN:
- Dashboard is clean, spacious, minimal
- All information conveyed through typography and layout
- No decorative elements, no heavy graphics
- Card hierarchy through borders and spacing
- Monospace or regular font for numbers/data
- Whitespace is generous — breathing room around each section
- Subtle grey tones for secondary information

COLOR & STYLING SUMMARY:
- Risk profile card: Black background (#000000), white text (high contrast, priority signal)
- Recommended plans: White cards, black borders, black text
- Buttons: Black background (primary), white background + border (secondary)
- All text: Black (#000000) or light grey (#808080)
- Backgrounds: White (#ffffff) or light grey (#f5f5f5)
- Borders: 1px or 2px black, or 1px light grey
```

---

## PROMPT 8: Plan Explore Tab & Search/Filter

### Prompt for Claude Design:

```
Design the Plan Explore Tab for Outsurance: Searchable, filterable plan listing.

SCREEN PURPOSE:
User can search, filter, and browse all insurance plans in the database (10+ plans). Each plan shows a match score if user has completed assessment.

TOP BAR:
- Logotype (left) + Tab indicator (center) "Explore Plans" + Settings icon (right, 16px, links to filters)
- Spacing below: 20px

SEARCH BAR:
- Full-width search input: Thin bottom border (#000000 1px), height 40px, padding 12px 16px
- Placeholder: "Search plans by name or provider..." (light grey)
- Icon: Magnifying glass (minimal, 16px, left side of input)
- Clear button (×): Right side, appears after typing, grey
- Focus state: Border weight increases to 2px, placeholder fades
- Typing behavior: Autocomplete suggestions appear below in dropdown (fade-in 150ms)
  - Suggestion items: 12px black, 40px height, hover light grey background
  - Clicking suggestion: Input fills with suggestion, dropdown closes, results filter immediately
- Real-time search: As user types, plan list filters instantly (no API call, client-side filter)
- Spacing below search bar: 16px

FILTER BAR:
- Horizontal scrollable row of filter pills
- Pill styling: White background, 1px black border, padding 8px 12px, height 32px, 12px text
- Pill options:
  1. "Premium Range" → Opens range slider modal
  2. "Plan Type" → Dropdown: Basic / Standard / Comprehensive / Senior
  3. "Coverage Min" → Opens slider for minimum coverage amount
  4. "Providers" → Multi-select checklist
  5. "Clear All" → Resets all filters
- Unselected pill: Black border, black text
- Selected pill: Black background, white text, border still visible
- Click behavior: Pill expands or opens a filter menu below
- Scroll indication (if >5 pills): "Scroll →" text fades in after 2 seconds

ACTIVE FILTER DISPLAY:
- Below filter bar: Tag-like chips showing active filters
  - Example: "Premium: ₹5,000–₹10,000" (white bg, 1px border, × button to remove)
  - Example: "Type: Comprehensive" (same styling)
  - Spacing between chips: 8px
  - Fade-in animation: 200ms when filter applied
  - Click × on chip: Filter removes, chip fades out 200ms, list re-filters

PLAN LIST:
- Full-width cards stacked vertically (mobile) or responsive grid (desktop)
- Each plan card: White background, 1px border, padding 16px, margin-bottom 12px
- Card layout:
  - Top row:
    - Left: Provider name (11px bold grey) + Plan name (14px bold black)
    - Right: Match score (if assessment done) or "Learn more" link
      - Match score: Large number "8.4" (16px bold black) + small "Score" (9px grey)
      - No score: Just text "Not assessed" (11px light grey)
  - Divider: 1px light grey line
  - Middle row (3 columns):
    - Monthly premium (bold) + annual label
    - Coverage amount (bold) + label
    - Pre-existing wait period (bold) + label
  - Text size: 12px for values, 10px for labels
  - Spacing between columns: 16px
  - Bottom row:
    - Two action buttons: "Details" (white bg, border) + "Compare" (white bg, border)
    - Each button: 40px height, 12px text
    - Spacing: 4% gap between buttons
    - Button width: 48% each

CARD STATES:
- Hover: Subtle border color shift to darker grey (#595959) over 200ms, no background change
- Click on card (anywhere): Opens Plan Detail Page
- Button click: Prevents card click, fires respective action (Details or Compare)
- Selected for compare: Card border thickens (2px), checkmark appears top-right

SORTING OPTIONS:
- Sorting dropdown: "Sort by" label (11px black) + dropdown (12px black text, white bg, border)
- Dropdown options:
  1. "Match Score (Highest First)" — default if assessment done
  2. "Price (Low to High)"
  3. "Price (High to Low)"
  4. "Coverage Amount (High to Low)"
  5. "Pre-existing Wait (Shortest First)"
- Click dropdown: List reorders with smooth transition 300ms (cards fade-out, reorder, fade-in)
- Selected option: Bold text in dropdown, small checkmark beside it

PAGINATION / INFINITE SCROLL:
- If more than 10 plans: "Load More" button appears at bottom
  - Style: White bg, black border (2px), black text, 44px height
  - Spacing above: 24px
  - Click: Next 10 plans fade-in below with staggered animation (100ms each)
  - Loading state: Button shows spinner, text fades to 60%
  - Completion: Button fades out, new plans appear

EMPTY STATE (no results):
- Central message: "No plans match your filters" (14px bold black)
- Subtext: "Try adjusting your criteria" (12px grey)
- Spacing: Generous top/bottom padding (48px)
- Action: "Clear Filters" button below (white bg, border)

FILTER MODALS:

PREMIUM RANGE MODAL:
- Overlay: Transparent dark (rgba(0,0,0,0.2))
- Modal: White bg, 2px black top border, max-width 400px mobile, padding 24px
- Title: "Premium Range" (18px bold black)
- Dual slider: Min and Max inputs
  - Track: Light grey (#f5f5f5), height 4px
  - Thumbs: Black circles, 16px diameter
  - Min value input: ₹[input] (12px)
  - Max value input: ₹[input] (12px)
  - Validation: Max must be ≥ Min
  - Display: "₹[Min] – ₹[Max] per year" below sliders (13px bold black)
- Apply button: Black bg, white text, full-width, 44px
- Cancel button: White bg, border, black text, below Apply
- Close on backdrop click or Cancel

PLAN TYPE MODAL:
- Title: "Plan Type" (18px bold black)
- Checkbox list (not radio — user can select multiple):
  - ☐ Basic
  - ☐ Standard
  - ☐ Comprehensive
  - ☐ Senior
- Spacing between items: 12px
- Apply / Cancel buttons same as above
- Selected items have checked checkbox (filled black square with white ✓)

PROVIDERS MODAL:
- Title: "Insurance Providers" (18px bold black)
- Checkbox list (multiselect):
  - ☐ Star Health
  - ☐ HDFC ERGO
  - ☐ Niva Bupa
  - ☐ Care Health
  - ☐ LIC
  - ☐ Bajaj Allianz
  - ☐ ICICI Lombard
  - ☐ Aditya Birla
  - ☐ Manipal Cigna
- Searchable field at top: "Search providers..." (optional, for desktop)
- Apply / Cancel buttons

RESPONSIVE LAYOUT:
- Desktop: Main area 70%, filter sidebar 30% (filters always visible on left)
  - Plan cards: 2 columns or full-width list
  - Filters: Vertical pills, stacked
- Tablet: Full-width, filters collapsible, toggle shows/hides filter panel
- Mobile: Full-width, filters collapsible (hamburger menu), default hidden, tap to show, filter modals full-screen

ANIMATIONS:
- Page load: Search bar fades-in 300ms, filter pills fade-in staggered 100ms each, plan list fades-in 400ms
- Filter applied: Plan cards fade-out 150ms, list re-renders, cards fade-in 300ms (staggered 100ms)
- Card hover: Border shift 200ms
- Modal open: Fade-in + slight scale 300ms
- Sorting reorder: Cards fade-out 150ms, reorder (instant), fade-in 300ms staggered

ANTIDESIGN:
- List is pure: cards with clear information hierarchy
- No images or decorative graphics
- Filters are functional, not decorative
- Borders and spacing create structure
- Sorting and filtering are text-based, no visual indicators except checkmarks
- All interactive elements clearly labeled and visible
- Whitespace between cards aids readability

KEYBOARD & ACCESSIBILITY:
- Tab: Cycles through search, filters, cards, buttons
- Enter: Submits search, applies filter, opens modal
- Escape: Closes modals, clears search field
- Screen reader: All labels, values, and buttons announced
```

---

## SUMMARY: IMPLEMENTATION CHECKLIST FOR CLAUDE DESIGN

Use the 8 prompts in this order to build the complete Outsurance UI/UX flow:

1. **Auth Screens** (Login, Register) — Foundation
2. **Onboarding Step 1** (Personal Details) — Primary form
3. **Onboarding Step 3** (Document Upload + Agent Chat) — Conversational UX
4. **Onboarding Step 4** (Verify Vitals) — Privacy checkpoint
5. **Onboarding Step 5** (Results Dashboard) — Risk profile + plan cards
6. **Plan Detail & Compare** — Deep dive + comparison
7. **Stress Test & Home Dashboard** — What-if scenarios + main hub
8. **Plan Explore Tab** — Search, filter, discovery

---

## DESIGN TOKENS (Copy-Paste Reference)

```css
/* Colors */
--primary-black: #000000;
--secondary-black: #1a1a1a;
--charcoal: #2d2d2d;
--dark-grey: #404040;
--medium-grey: #595959;
--light-grey: #808080;
--lighter-grey: #b3b3b3;
--off-white: #f5f5f5;
--pure-white: #ffffff;

/* Typography */
--font-heading: 'Inter', sans-serif;
--font-body: 'Inter', sans-serif;
--font-mono: 'IBM Plex Mono', monospace;

--size-h1: 32px;
--size-h2: 24px;
--size-h3: 18px;
--size-body: 14px;
--size-label: 12px;
--size-small: 10px;

--weight-bold: 700;
--weight-medium: 500;
--weight-regular: 400;

--line-height-heading: 1.2;
--line-height-body: 1.6;

/* Spacing */
--spacing-xs: 8px;
--spacing-sm: 12px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;
--spacing-2xl: 48px;

/* Borders & Radius */
--border-width-thin: 1px;
--border-width-medium: 2px;
--border-width-thick: 3px;
--border-radius: 2px;

/* Animations */
--duration-micro: 100ms;
--duration-short: 150ms;
--duration-base: 200ms;
--duration-medium: 300ms;
--duration-long: 400ms;
--duration-xl: 600ms;

--easing: cubic-bezier(0.4, 0, 0.2, 1);
--easing-slow: cubic-bezier(0.25, 0.46, 0.45, 0.94);
```

---

## NOTES FOR DESIGNER

- **Antidesign Philosophy**: Every pixel serves clarity. No decorative elements, no gradients, no drop shadows. Typography and whitespace are your tools.
- **Monochromatic Strictness**: Only use greys, blacks, and whites. No brand colors. If you feel the need for color, use a darker or lighter grey instead.
- **2026 Awards Style**: Minimal, prestigious, professional. Think high-end tech product (Stripe, Linear, Vercel aesthetic).
- **Smooth Animations**: All transitions use the easing function cubic-bezier(0.4, 0, 0.2, 1). Durations: 200ms for micro (focus, hover), 300ms for medium (modals, navigation), 400ms for page loads.
- **Mobile-First**: Design responsive layouts with mobile as the base. Scale up for tablet/desktop.
- **Privacy as Design**: The Verify Vitals screen (Prompt 4) is the centerpiece of your privacy story. Make it feel safe and transparent.

---

End of Outsurance Design Prompts.
```