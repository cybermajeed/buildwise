Upgrade the existing construction cost calculator into a complete “BUILDWISE – Smart Construction Cost & Quantity Management Platform”.

IMPORTANT:
Do not remove or break the existing features. Improve the current UI and functionality while keeping it simple, clean and mobile-friendly.

TARGET USERS:
1. Rural/homeowners with little or no construction knowledge
2. Civil engineers
3. Quantity surveyors
4. Contractors
5. Builders

CREATE TWO MODES:

1. SIMPLE USER MODE
Make it extremely easy for normal and rural users. Avoid technical terms wherever possible. Use simple questions, icons, dropdowns and guided steps.
Allow users to calculate approximate requirements and costs for:
- Cement
- Sand
- Aggregate
- Bricks/blocks
- Concrete
- Steel
- Tiles
- Paint
- Plaster
- Flooring
- Other common construction materials

Users should enter simple dimensions and get:
- Approximate quantity
- Required material
- Current estimated price
- Total estimated cost

Clearly show that these are APPROXIMATE ESTIMATES and not structural design advice.

2. PROFESSIONAL / ENGINEER MODE
Create a separate professional dashboard for engineers, quantity surveyors and contractors.

Include:
- Project creation and project history
- Building plan upload
- Quantity takeoff
- BOQ generation
- Material cost estimation
- Labour cost estimation
- Total project cost
- Cost comparison
- Estimate revision
- PDF and Excel report export

QUANTITY TAKEOFF:
Allow users to upload building plans in common formats such as:
- PDF
- JPG
- JPEG
- PNG
and design the system so future support can be added for CAD/BIM formats such as DWG, DXF and IFC.

After uploading a plan, analyze the available dimensions and extract measurable information wherever possible, such as:
- Floor area
- Room dimensions
- Wall lengths
- Wall areas
- Door openings
- Window openings
- Concrete quantities
- Brick/block work
- Plastering
- Flooring
- Other measurable construction items

Generate a clear BOQ table containing:
Item | Description | Quantity | Unit | Rate | Amount

IMPORTANT:
Allow the engineer/user to REVIEW AND EDIT all extracted quantities before final calculation. Never assume an extracted quantity is perfectly accurate.

MATERIAL PRICE MANAGEMENT:
Create a dedicated “Material Prices” section.

Include common materials such as:
- Cement
- Steel
- Sand
- Aggregate
- Bricks
- Blocks
- Concrete
- Tiles
- Paint
- Other construction materials

Allow authorized users/admin to update market prices whenever prices change.

Each material should have:
- Material name
- Unit
- Current price
- Last updated date
- Previous price

When a material price is updated, automatically recalculate affected project estimates.

Show price changes such as:
Previous Price → Current Price → Difference

Also create a “Price Impact” feature showing how material price changes affect the total project cost.

Example:
Steel price increased → total project cost increased by ₹XX,XXX.

DO NOT claim prices are automatically live unless a real price API/data source is connected. For the MVP, allow manual price updates through the admin/material-price dashboard.

COST ESTIMATION:
Calculate:
- Material cost
- Labour cost
- Other expenses
- Subtotal
- Contingency if applicable
- Total estimated project cost

Allow users to change rates and quantities manually.

BOQ & REPORTS:
Generate professional reports containing:
- Project name
- Client name
- Project location
- Date
- Material quantities
- Rates
- Amounts
- Total cost
- Price update information

Allow PDF and Excel export.

PROJECT DASHBOARD:
For every project show:
- Total estimated cost
- Material cost
- Labour cost
- Major materials
- Quantity summary
- Latest material prices
- Previous estimate
- Current estimate
- Cost difference

Add estimate version/history so engineers can compare:
Estimate V1 vs V2 vs latest estimate.

BUSINESS / REVENUE MODEL:
Implement a subscription-based structure.

FREE PLAN:
- Basic calculators
- Limited projects
- Basic estimates

PRO PLAN:
- More projects
- Plan upload
- Quantity takeoff
- BOQ
- PDF/Excel reports
- Estimate history
- Advanced calculations

BUSINESS/ENGINEER PLAN:
- Large projects
- Unlimited/large plan processing subject to fair usage
- Multiple projects
- Team members
- Advanced reports
- Project management features

Create attractive subscription/pricing pages with monthly and yearly options.

Also provide opportunities for future revenue:
- Construction material supplier listings
- Supplier advertisements
- Contractor lead generation
- Premium professional tools

Do not make payment functionality fake. Build the subscription UI and architecture so a real payment gateway can be integrated later.

ENGINEER TIME-SAVING FEATURES:
Make the main value proposition:
“Upload Plan → Review Quantities → Generate BOQ → Apply Current Material Prices → Get Cost Estimate.”

Allow engineers to:
- Save projects
- Duplicate projects
- Edit quantities
- Update rates
- Quickly regenerate estimates
- Export reports
- Compare old and new estimates

UI/UX:
Keep the design professional but very simple.
Use separate navigation for:
- Home
- Simple Calculator
- Projects
- Plan Upload
- Quantity Takeoff
- BOQ
- Material Prices
- Cost Estimate
- Reports
- Subscription
- Profile/Settings

For rural/non-technical users, use simple language and guided steps.
For engineers, provide a professional dashboard with detailed controls.

Add proper validation, loading states, error handling and empty states.

MOST IMPORTANT:
The application should feel like ONE complete construction cost management platform, not a collection of unrelated calculators.

Core workflow:
Building Plan
→ Quantity Takeoff
→ User Review/Edit
→ BOQ
→ Current Material Prices
→ Material + Labour Cost
→ Total Estimate
→ Save Project
→ Export Report
→ Update Prices Later
→ Automatically revise project cost.

Build this as a realistic MVP that can actually be developed and expanded later. Prioritize working core functionality over unnecessary complex features.