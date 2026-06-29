# 🏢 Mini ERP System

A production-ready Enterprise Resource Planning (ERP) system built with React, TypeScript, Tailwind CSS, Shadcn UI, and Supabase.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Quick Setup](#quick-setup)
- [Supabase Setup](#supabase-setup)
- [Running Locally](#running-locally)
- [Deployment](#deployment)
- [AI Development Workflow](#ai-development-workflow)

---

## ✅ Features

| Module | Features |
|--------|----------|
| **Auth** | Login, Register, Protected Routes, JWT via Supabase |
| **Dashboard** | KPI cards, revenue charts, sales volume, top products, recent activity |
| **Products** | Full CRUD, SKU generator, category, stock tracking, low-stock alerts, stock filters |
| **Customers** | Full CRUD, total purchases tracking, contact management |
| **Suppliers** | Full CRUD, total supplied tracking, contact person |
| **Purchases** | Full CRUD, multi-item orders, **auto stock increment** on Complete, status filters |
| **Sales** | Full CRUD, multi-item invoices, **auto stock deduction**, discount/tax calc, **edit support** |
| **Invoices** | Professional printable invoice with all details |
| **Reports** | Sales, Purchase, Product, Customer, Supplier reports with **CSV and PDF export** |

---

## 🛠 Tech Stack

```
Frontend:   React 18 + Vite + TypeScript
Styling:    Tailwind CSS + Shadcn UI (Radix primitives)
State:      Zustand (auth) + React Hook Form
Database:   Supabase (PostgreSQL + Auth + RLS)
Charts:     Recharts
Routing:    React Router v6
Validation: Zod
PDF Export: jsPDF + html2canvas
```

---

## 🏗 Architecture

```
src/
├── components/
│   ├── ui/              # Shadcn UI components (button, input, dialog, etc.)
│   ├── common/          # Reusable business components
│   │   ├── StatsCards.tsx      # Clickable stat filters
│   │   ├── DataTable.tsx       # Reusable table with pagination
│   │   ├── PageHeader.tsx      # Page header with add button
│   │   ├── SearchBar.tsx       # Search input
│   │   ├── FilterDropdown.tsx  # Sort/filter dropdown
│   │   ├── StatCard.tsx        # Individual stat card
│   │   ├── AlertBanner.tsx     # Notification banners
│   │   ├── RevenueChart.tsx    # Revenue chart
│   │   ├── SalesChart.tsx      # Sales volume chart
│   │   ├── TopProductsChart.tsx # Top products pie chart
│   │   └── RecentSalesList.tsx # Recent sales list
│   ├── forms/           # Reusable forms
│   │   ├── SaleForm.tsx
│   │   ├── PurchaseForm.tsx
│   │   ├── ProductForm.tsx
│   │   ├── CustomerForm.tsx
│   │   └── SupplierForm.tsx
│   └── modals/          # Reusable modals
│       ├── DeleteModal.tsx
│       └── ViewModal.tsx
├── hooks/
│   ├── use-toast.ts     # Toast notification hook
│   ├── useTable.ts      # Table operations (search, pagination)
│   ├── useStats.ts      # Statistics calculations
│   ├── useCRUD.ts       # CRUD operations
│   ├── useDashboard.ts  # Dashboard data fetching
│   ├── useFilters.ts    # Filter state management
│   └── useSort.ts       # Sort state management
├── services/            # API services layer
│   ├── saleService.ts
│   ├── purchaseService.ts
│   ├── productService.ts
│   ├── customerService.ts
│   └── supplierService.ts
├── lib/
│   ├── supabase.ts      # Supabase client + TypeScript types
│   └── utils.ts         # formatCurrency, formatDate, generateInvoiceNumber, etc.
├── pages/               # Page components (100-150 lines each)
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── ProductsPage.tsx
│   ├── CustomersPage.tsx
│   ├── SuppliersPage.tsx
│   ├── PurchasesPage.tsx
│   ├── SalesPage.tsx
│   └── ReportsPage.tsx
├── store/
│   └── authStore.ts     # Zustand auth store with persistence
└── types/
    └── index.ts         # All TypeScript interfaces
```

### Key Architectural Decisions

- **Reusable Component Architecture**: Common components like `DataTable`, `StatsCards`, and forms are reused across pages, reducing code duplication from 500+ lines to ~100-150 lines per page.
- **Custom Hooks**: Business logic extracted into reusable hooks (`useTable`, `useStats`, `useCRUD`).
- **Service Layer**: API calls separated from UI components for better testability.
- **Supabase RLS (Row Level Security)**: Every table is protected — only authenticated users can read/write.
- **Zustand for auth**: Lightweight, persisted auth state. No Redux overhead.
- **React Hook Form + Zod**: Type-safe forms with schema validation.
- **Stock Auto-Update**: When a Purchase is marked `completed`, stock increments automatically. When a Sale is saved, stock decrements immediately. Deletions reverse these operations.
- **Invoice Generation**: Print-friendly invoice dialog using `window.print()`.
- **CSV & PDF Export**: Client-side CSV and PDF generation for reports.

---

## ⚡ Quick Setup

### Step 1: Clone & Install

```bash
git clone <your-repo-url>
cd mini-erp
npm install
```

### Step 2: Set Up Supabase

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI globally
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (get PROJECT_REF from Supabase Dashboard → Settings → API)
supabase link --project-ref YOUR_PROJECT_REF

# Push the migration (creates all tables and seed data)
supabase db push
```

#### Option B: Using Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire content of `supabase/migrations/20260628215201_initial_schema.sql`
6. Paste it into the SQL Editor
7. Click **Run**

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

> **Where to find these:** Supabase Dashboard → Project Settings → API

### Step 4: Run the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Step 5: Register Your Account

- Click **Register here** on the login page
- Create your admin account
- You'll be redirected to the dashboard automatically

---

## 🗄 Supabase Setup Details

### Migration File Location

```
supabase/migrations/20260628215201_initial_schema.sql
```

### Tables Created

| Table | Description |
|-------|-------------|
| `profiles` | Extends auth.users with role and name |
| `products` | Product catalog with stock tracking |
| `customers` | Customer directory |
| `suppliers` | Supplier directory |
| `purchases` | Purchase orders (header) |
| `purchase_items` | Line items for each purchase |
| `sales` | Sales orders / invoices (header) |
| `sale_items` | Line items for each sale |

### Seed Data

The migration includes seed data for:

- **10 Products** with different stock levels (In Stock, Low Stock, Out of Stock)
- **5 Customers** with real purchase totals
- **4 Suppliers** with real supply totals

### Auto-triggers

- **`on_auth_user_created`**: Automatically creates a `profiles` row when a user signs up

### RPC Functions

- **`update_product_stock(product_id, quantity_change)`**: Helper for stock adjustments

### Row Level Security

All tables are protected with RLS policies. Only authenticated users can access data.

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel --prod
```

Set environment variables in Vercel dashboard:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Deploy to Netlify

```bash
npm run build
# Drag & drop the `dist/` folder to Netlify
```

Add environment variables in Netlify → Site settings → Environment variables.

### Build for Production

```bash
npm run build
# Output in dist/
```

---

## 🤖 AI Development Workflow

**Total Active Development Time:** ~5.5 Hours  
**Project Timeline:** June 23 - June 29, 2026  
**AI Tools Used:** Claude (Anthropic)

### Time Breakdown

| Activity | Time | Notes |
|----------|------|-------|
| Initial code generation | 30 min | Active coding with Claude |
| Supabase setup & learning | 1.5 hours | Learning CLI, fixing migrations |
| RLS policy fixes | 30 min | Debugging security policies |
| Sorting & filtering fixes | 30 min | Fixing sort logic across pages |
| UI improvements | 30 min | Stats cards, filters, layout |
| PDF export | 20 min | Adding chart exports |
| Deployment | 30 min | Vercel setup & env vars |
| Documentation | 20 min | README updates |
| **Total** | **~5.5 hours** | |

> **Note:** ~1.5 hours were spent learning Supabase CLI and fixing database migration issues, as this was the first time using Supabase migrations. With prior experience, this time would be significantly shorter.

### Prompting Strategy

1. **Architecture First**: Started by prompting for full project structure, stack decisions, and database schema design before writing any code.

2. **Schema-Driven Development**: Defined TypeScript types and Supabase schema first, then built UI components that match the data model.

3. **Reusable Components**: Prompted for extracting common patterns into reusable components (DataTable, StatsCards, Forms).

4. **Custom Hooks**: Explicitly requested hooks for table operations, statistics, and CRUD operations.

5. **Component-by-Component**: Each page was generated with a clear prompt specifying module name, required operations, business rules, and UI requirements.

6. **Business Logic Emphasis**: Explicitly prompted for stock auto-deduction on sales, stock increment on purchase completion, and reversal on deletion.

7. **Production Patterns**: Prompted for RLS policies, error handling, loading states, empty states, and form validation on every component.

### What Was AI-Generated

- ~95% of code was AI-generated
- Database schema and SQL migrations
- All React components and pages
- Reusable components and hooks
- TypeScript types and interfaces
- Utility functions and helpers
- This README

### Challenges & Solutions

| Challenge | Time Spent | Solution |
|-----------|------------|----------|
| Supabase migration issues | 1.5 hours | Used `db push` with proper repair commands |
| RLS policies blocking inserts | 30 min | Fixed policies with `WITH CHECK` conditions |
| Sorting not working | 30 min | Implemented local sort state with "Default" option |
| Form default values showing 0 | 15 min | Used `undefined` instead of `0` for number fields |
| PDF export with charts | 20 min | Used `html2canvas` to capture charts as images |
| Invoice header hover issue | 10 min | Fixed CSS with `[&>th]:hover:text-white` |

---

## 📦 Key Dependencies

```json
{
  "@supabase/supabase-js": "^2.39.7",
  "react-hook-form": "^7.51.0",
  "zod": "^3.22.4",
  "zustand": "^4.5.2",
  "recharts": "^2.12.2",
  "react-router-dom": "^6.22.3",
  "@radix-ui/*": "various",
  "tailwindcss": "^3.4.1",
  "class-variance-authority": "^0.7.0",
  "jspdf": "^2.5.1",
  "jspdf-autotable": "^3.8.2",
  "html2canvas": "^1.4.1"
}
```

---

## 📄 License

MIT — Free to use and modify.

---

## 📊 Project Submission Summary

### Live Demo

🔗 **Production URL**: [https://mini-erp-drab.vercel.app](https://mini-erp-drab.vercel.app)

### Repository

🔗 **GitHub Repository**: [https://github.com/EkhtiarUddin/mini-erp](https://github.com/EkhtiarUddin/mini-erp)

### AI Developer Assessment Criteria

| Criteria | How It Was Met |
|----------|----------------|
| **Prompt Engineering** | Used structured prompts for architecture, components, and business logic |
| **AI Tool Usage** | Leveraged Claude for 95% of code generation |
| **Software Architecture** | Implemented reusable components, custom hooks, and service layer |
| **Problem Solving** | Overcame sorting, RLS, and PDF export challenges |
| **Speed of Delivery** | Completed in ~5.5 active hours |
| **Production Readiness** | Deployed to Vercel with proper environment variables |

---

### 🚀 Quick Links

- [Live Demo](https://mini-erp-xxxx.vercel.app) *(Replace with your actual URL)*
- [GitHub Repository](https://github.com/EkhtiarUddin/mini-erp)
