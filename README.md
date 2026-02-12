# Event Recap Builder

A web application for outreach teams to efficiently create and manage event recap forms, with automatic export to client-ready Excel format.

## Features

- **Project Management**: Create projects for different outreach campaigns
- **Event Forms**: Add events with standardized recap questions
- **Auto-Calculations**: Total fields automatically calculate from sub-fields
- **Excel Export**: Generate professionally formatted Excel files matching client requirements
  - Transposed layout (questions as rows, events as columns)
  - Color-coded rows by category
  - Formulas for totals
  - Aggregate summary sheet

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone or download the project
cd event-recap-builder

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build for Production

```bash
npm run build
npm run start
```

## Deploying to Vercel

1. Push the code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project" and import your repository
4. Vercel will auto-detect Next.js and configure the build
5. Click "Deploy"

Or use the Vercel CLI:

```bash
npm i -g vercel
vercel
```

## Project Structure

```
src/
├── app/
│   ├── api/export/      # Excel export API endpoint
│   ├── globals.css      # Global styles
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Main page
├── components/
│   ├── CreateProjectModal.tsx
│   ├── EventForm.tsx
│   ├── EventList.tsx
│   ├── ProjectCard.tsx
│   └── ProjectView.tsx
├── lib/
│   ├── excel.ts         # Excel generation logic
│   └── storage.ts       # LocalStorage utilities
└── types/
    └── index.ts         # TypeScript types & default template
```

## Customizing the Form Template

Edit the `DEFAULT_TEMPLATE` in `src/types/index.ts` to modify form fields:

```typescript
{
  id: 'field_id',           // Unique identifier
  label: 'Field Label',     // Display name
  type: 'number',           // text, number, longtext, url, calculated
  required: false,          // Is field required?
  category: 'metrics',      // header, metrics, totals, other
  formula: 'field1 + field2', // For calculated fields
  order: 1                  // Display order
}
```

## Data Storage

Data is stored in the browser's localStorage. For production use with multiple users or data persistence, consider integrating:

- A database (PostgreSQL, MongoDB)
- Notion API
- Google Sheets API

## Tech Stack

- **Framework**: Next.js 14
- **Styling**: Tailwind CSS
- **Excel Generation**: ExcelJS
- **State**: React hooks + localStorage

## License

MIT
